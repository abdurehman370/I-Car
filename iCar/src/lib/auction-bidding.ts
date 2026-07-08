import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { sendAuctionOutbidEmail } from "@/lib/mail";
import { sendPushToDealer } from "@/lib/web-push";

/**
 * Anti-sniping: any bid placed while less than this much time remains
 * extends the auction so the other side (floor or online) can respond.
 */
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

/** Validation / business-rule failure — safe to show to the client (HTTP 400). */
export class BidError extends Error {}

export type PlaceBidInput =
    | {
        source: "online";
        amount: number;
        dealer: {
            id: number;
            role: string;
            dealershipName: string | null;
            contactPerson: string;
            email: string;
        };
    }
    | {
        source: "floor";
        amount: number;
        paddleNumber?: string | null;
        bidderName?: string | null;
    };

export type PlaceBidResult = {
    updatedAuction: Prisma.AuctionGetPayload<{}>;
    newBid: Prisma.AuctionBidGetPayload<{}>;
    previousHighestBid: { id: number; dealerId: number | null; amount: Prisma.Decimal } | null;
    extended: boolean;
};

/**
 * Places a bid (online dealer bid or admin-entered floor bid) inside a single
 * transaction: validates auction state and amount, records the bid, marks the
 * previous highest bid as outbid, updates the auction, and applies the
 * anti-sniping extension when the bid lands near the end time.
 */
export async function placeBid(auctionId: number, input: PlaceBidInput): Promise<PlaceBidResult> {
    return prisma.$transaction(async (tx) => {
        // 1. Re-read auction inside the transaction
        const auction = await tx.auction.findUnique({
            where: { id: auctionId },
            include: {
                bids: {
                    where: { status: "active" },
                    orderBy: { amount: "desc" },
                    take: 1,
                },
            },
        });

        if (!auction) throw new BidError("Auction not found");
        if (auction.status !== "LIVE") throw new BidError("Auction is not live");

        const now = new Date();
        if (now < auction.startAt) throw new BidError("Auction has not started yet");
        if (now > auction.endAt) throw new BidError("Auction has ended");

        // 2. Minimum allowed bid
        const currentHighestVal = auction.currentHighestBid ? auction.currentHighestBid.toNumber() : 0;
        const minNextBid = currentHighestVal > 0
            ? currentHighestVal + auction.minIncrement.toNumber()
            : auction.startingBid.toNumber();

        if (input.amount < minNextBid) {
            throw new BidError(`Bid must be at least ${minNextBid} ${auction.currency}`);
        }

        const previousHighestBid = auction.bids.length > 0 ? auction.bids[0] : null;

        // Online bidders cannot outbid themselves
        if (
            input.source === "online" &&
            previousHighestBid &&
            previousHighestBid.dealerId === input.dealer.id
        ) {
            throw new BidError("You are already the highest bidder");
        }

        // 3. Insert new bid
        const newBid = await tx.auctionBid.create({
            data: {
                auctionId,
                amount: new Prisma.Decimal(input.amount),
                currency: auction.currency,
                status: "active",
                ...(input.source === "online"
                    ? {
                        dealerId: input.dealer.id,
                        userId: input.dealer.id, // legacy / public users mapping
                        userType: input.dealer.role,
                        bidderName: input.dealer.dealershipName || input.dealer.contactPerson,
                        bidderEmail: input.dealer.email,
                        source: "online",
                    }
                    : {
                        dealerId: null,
                        bidderName:
                            input.bidderName?.trim() ||
                            (input.paddleNumber ? `Paddle ${input.paddleNumber}` : "Floor Bidder"),
                        paddleNumber: input.paddleNumber?.trim() || null,
                        source: "floor",
                    }),
            },
        });

        // 4. Mark previous active bids as outbid
        await tx.auctionBid.updateMany({
            where: {
                auctionId,
                id: { not: newBid.id },
                status: "active",
            },
            data: { status: "outbid" },
        });

        // 5. Anti-sniping — extend the end time if the bid landed near the end
        const msRemaining = auction.endAt.getTime() - now.getTime();
        const extended = msRemaining < ANTI_SNIPE_WINDOW_MS;
        const newEndAt = extended ? new Date(now.getTime() + ANTI_SNIPE_WINDOW_MS) : undefined;

        // 6. Update auction
        const updatedAuction = await tx.auction.update({
            where: { id: auctionId },
            data: {
                currentHighestBid: new Prisma.Decimal(input.amount),
                // Temporarily hold the leading dealer (null for floor bids)
                winnerDealerId: input.source === "online" ? input.dealer.id : null,
                ...(newEndAt ? { endAt: newEndAt } : {}),
            },
        });

        return { updatedAuction, newBid, previousHighestBid, extended };
    });
}

/**
 * Fire-and-forget outbid notifications (email + in-app + push) to the dealer
 * who held the previous highest bid. Floor bidders are notified by the
 * auctioneer in the room, so only dealer-owned bids are notified.
 */
export function notifyOutbidAsync(result: PlaceBidResult, bidAmount: number) {
    const prev = result.previousHighestBid;
    if (!prev || !prev.dealerId) return;
    // If the same dealer somehow re-bid, skip
    if (result.newBid.dealerId && result.newBid.dealerId === prev.dealerId) return;

    const auction = result.updatedAuction;
    const auctionId = auction.id;
    const previousBidderId = prev.dealerId;

    Promise.resolve().then(async () => {
        const previousBidder = await prisma.dealer.findUnique({ where: { id: previousBidderId } });
        if (!previousBidder) return;

        await sendAuctionOutbidEmail(
            previousBidder.email,
            previousBidder.contactPerson || "User",
            auction,
            bidAmount.toString()
        ).catch(console.error);

        await prisma.auctionNotification.create({
            data: {
                auctionId,
                dealerId: previousBidder.id,
                type: "auction_outbid",
                title: "You have been outbid!",
                message: `Someone placed a higher bid of ${bidAmount} ${auction.currency} on ${auction.year} ${auction.make}.`,
            },
        }).catch(console.error);

        await sendPushToDealer(previousBidder.id, {
            title: "You have been outbid",
            body: `New highest bid: ${bidAmount} ${auction.currency} on ${auction.make} ${auction.model}.`,
            url: `/auctions/${auctionId}`,
            tag: `auction-${auctionId}-outbid`,
        }).catch(console.error);
    }).catch(console.error);
}
