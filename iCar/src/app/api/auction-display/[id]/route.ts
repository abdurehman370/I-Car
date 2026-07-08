import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { syncAuctionById } from "@/lib/auction-scheduler";

/**
 * Public, token-protected feed for the big-screen broadcast page at a
 * physical auction venue. Exposes only public-safe data: no dealer names,
 * emails, or reserve price values. Bidders are anonymized ("Bidder #2",
 * "Floor · Paddle 14").
 */
export async function GET(req: NextRequest, context: any) {
    const params = await context.params;
    const id = parseInt(params.id);
    const token = req.nextUrl.searchParams.get("token") || "";

    if (isNaN(id) || !token) {
        return NextResponse.json({ error: "Invalid display link" }, { status: 401 });
    }

    try {
        // Keep status transitions fresh even if the cron is between ticks
        await syncAuctionById(id);

        const auction = await prisma.auction.findUnique({
            where: { id },
            include: {
                images: { orderBy: { order: "asc" } },
                bids: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
            },
        });

        if (!auction || !auction.displayToken || auction.displayToken !== token) {
            return NextResponse.json({ error: "Invalid display link" }, { status: 401 });
        }

        // Anonymize bidders: each unique dealer gets a stable "Bidder #N" label
        // in order of first appearance; floor bids show their paddle number.
        const dealerLabels = new Map<number, string>();
        for (const bid of auction.bids) {
            if (bid.dealerId && !dealerLabels.has(bid.dealerId)) {
                dealerLabels.set(bid.dealerId, `Bidder #${dealerLabels.size + 1}`);
            }
        }

        const highestActive = [...auction.bids]
            .filter((b) => b.status === "active" || b.status === "winning")
            .sort((a, b) => b.amount.toNumber() - a.amount.toNumber())[0] ?? null;

        const bids = [...auction.bids]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
            .slice(0, 10)
            .map((bid) => ({
                id: bid.id,
                label: bid.source === "floor"
                    ? (bid.paddleNumber ? `Floor · Paddle ${bid.paddleNumber}` : "Floor Bidder")
                    : (bid.dealerId ? dealerLabels.get(bid.dealerId) : "Online Bidder"),
                amount: bid.amount.toNumber(),
                source: bid.source,
                createdAt: bid.createdAt,
                isHighest: highestActive ? bid.id === highestActive.id : false,
            }));

        const currentHighest = auction.currentHighestBid ? auction.currentHighestBid.toNumber() : null;
        const minIncrement = auction.minIncrement.toNumber();
        const startingBid = auction.startingBid.toNumber();
        const reserve = auction.reservePrice ? auction.reservePrice.toNumber() : null;

        return NextResponse.json({
            serverTime: new Date().toISOString(),
            auction: {
                id: auction.id,
                title: auction.title,
                make: auction.make,
                model: auction.model,
                year: auction.year,
                mileage: auction.mileage,
                variant: auction.variant,
                region: auction.region,
                city: auction.city,
                venue: auction.venue,
                auctionType: auction.auctionType,
                status: auction.status,
                outcome: auction.outcome,
                startAt: auction.startAt,
                endAt: auction.endAt,
                currency: auction.currency,
                startingBid,
                minIncrement,
                currentHighestBid: currentHighest,
                minNextBid: currentHighest ? currentHighest + minIncrement : startingBid,
                hasReserve: reserve !== null,
                reserveMet: reserve !== null ? (currentHighest !== null && currentHighest >= reserve) : null,
                image: auction.images[0]?.url ?? null,
                totalBids: auction.bids.length,
            },
            bids,
        });
    } catch (error: any) {
        console.error("Auction display feed error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
