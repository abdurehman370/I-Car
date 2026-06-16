import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { canAccessAuctions } from "@/lib/portal-access";
import { sendAuctionOutbidEmail } from "@/lib/mail";


export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dealer = await prisma.dealer.findUnique({ where: { id: session.user.id } });
    if (!dealer || !canAccessAuctions(dealer)) {
      return NextResponse.json({ error: "Account not approved to bid" }, { status: 403 });
    }

    const body = await req.json();
    const { amount } = body;
    const bidAmount = parseFloat(amount);

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-read auction inside transaction
      const auction = await tx.auction.findUnique({
        where: { id },
        include: {
          bids: {
            where: { status: 'active' },
            orderBy: { amount: 'desc' },
            take: 1
          }
        }
      });

      if (!auction) {
        throw new Error("Auction not found");
      }

      if (auction.status !== "LIVE") {
        throw new Error("Auction is not live");
      }

      const now = new Date();
      if (now < auction.startAt) {
        throw new Error("Auction has not started yet");
      }

      if (now > auction.endAt) {
        throw new Error("Auction has ended");
      }

      // 2. Calculate minimum allowed bid
      const currentHighestVal = auction.currentHighestBid ? auction.currentHighestBid.toNumber() : 0;
      const minNextBid = currentHighestVal > 0 
        ? currentHighestVal + auction.minIncrement.toNumber()
        : auction.startingBid.toNumber();

      if (bidAmount < minNextBid) {
        throw new Error(`Bid must be at least ${minNextBid} ${auction.currency}`);
      }

      // Optional: Check if the current user is already the highest bidder
      const previousHighestBid = auction.bids.length > 0 ? auction.bids[0] : null;
      if (previousHighestBid && previousHighestBid.dealerId === dealer.id) {
        throw new Error("You are already the highest bidder");
      }

      // 3. Insert new bid
      const newBid = await tx.auctionBid.create({
        data: {
          auctionId: id,
          dealerId: dealer.id,
          userId: dealer.id, // For legacy / public users mapping
          userType: dealer.role,
          bidderName: dealer.dealershipName || dealer.contactPerson,
          bidderEmail: dealer.email,
          amount: new Prisma.Decimal(bidAmount),
          currency: auction.currency,
          status: 'active'
        }
      });

      // 4. Mark previous active bids as outbid
      await tx.auctionBid.updateMany({
        where: { 
          auctionId: id, 
          id: { not: newBid.id },
          status: 'active'
        },
        data: { status: 'outbid' }
      });

      // 5. Update auction
      const updatedAuction = await tx.auction.update({
        where: { id },
        data: {
          currentHighestBid: new Prisma.Decimal(bidAmount),
          winnerDealerId: dealer.id, // Temporarily hold the winner
        }
      });

      return { updatedAuction, previousHighestBid, newBid };
    });

    // Send Outbid notification asynchronously
    if (result.previousHighestBid && result.previousHighestBid.dealerId) {
      Promise.resolve().then(async () => {
        const previousBidderId = result.previousHighestBid!.dealerId as number;
        if (previousBidderId !== dealer.id) { // Should always be true based on the check above
          const previousBidder = await prisma.dealer.findUnique({ where: { id: previousBidderId } });
          if (previousBidder) {
            await sendAuctionOutbidEmail(
              previousBidder.email, 
              previousBidder.contactPerson || 'User', 
              result.updatedAuction, 
              bidAmount.toString()
            ).catch(console.error);

            await prisma.auctionNotification.create({
              data: {
                auctionId: id,
                dealerId: previousBidder.id,
                type: 'auction_outbid',
                title: 'You have been outbid!',
                message: `Someone placed a higher bid of ${bidAmount} ${result.updatedAuction.currency} on ${result.updatedAuction.year} ${result.updatedAuction.make}.`,
              }
            });
          }
        }
      });
    }

    return NextResponse.json({ 
      message: "Bid placed successfully", 
      currentHighestBid: bidAmount 
    });

  } catch (error: any) {
    console.error("Error placing bid:", error);
    // Determine if it's a known error from the transaction
    if (error.message.includes("Auction") || error.message.includes("Bid") || error.message.includes("already")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
