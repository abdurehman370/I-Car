import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionClosedEmail, sendAuctionWonEmail } from "@/lib/mail";


export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1
        }
      }
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.status === "CLOSED" || auction.status === "CANCELLED") {
      return NextResponse.json({ error: "Auction is already closed or cancelled" }, { status: 400 });
    }

    let outcome = 'no_bids';
    let winnerDealerId = null;
    let highestBid = null;

    if (auction.bids.length > 0) {
      highestBid = auction.bids[0];
      if (auction.reservePrice && highestBid.amount.toNumber() < auction.reservePrice.toNumber()) {
        outcome = 'reserve_not_met';
      } else {
        outcome = 'sold';
        winnerDealerId = highestBid.dealerId;
      }
    }

    const updatedAuction = await prisma.$transaction(async (tx) => {
      const updated = await tx.auction.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          outcome,
          winnerDealerId,
        }
      });

      if (highestBid) {
        await tx.auctionBid.updateMany({
          where: { auctionId: id },
          data: { status: 'outbid' }
        });

        if (outcome === 'sold') {
          await tx.auctionBid.update({
            where: { id: highestBid.id },
            data: { status: 'winning' }
          });
        }
      }
      return updated;
    });

    // Notifications
    Promise.resolve().then(async () => {
      if (outcome === 'sold' && winnerDealerId && highestBid) {
        const winner = await prisma.dealer.findUnique({ where: { id: winnerDealerId } });
        if (winner) {
          await sendAuctionWonEmail(winner.email, winner.contactPerson || 'User', updatedAuction, highestBid.amount.toString()).catch(console.error);
          await prisma.auctionNotification.create({
            data: {
              auctionId: updatedAuction.id,
              dealerId: winner.id,
              type: 'auction_won',
              title: 'You Won!',
              message: `Congratulations! You won the auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} with a bid of ${highestBid.amount.toString()} ${updatedAuction.currency}.`,
            }
          });
        }
      }
      // We could also notify all other bidders that the auction is closed.
    });

    return NextResponse.json({ auction: updatedAuction, message: "Auction closed successfully" });
  } catch (error: any) {
    console.error("Error closing auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
