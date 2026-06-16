import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionCancelledEmail } from "@/lib/mail";


export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auction = await prisma.auction.findUnique({ where: { id } });
    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.status === "CLOSED" || auction.status === "CANCELLED") {
      return NextResponse.json({ error: "Auction is already closed or cancelled" }, { status: 400 });
    }

    const updatedAuction = await prisma.auction.update({
      where: { id },
      data: { status: "CANCELLED", closedAt: new Date(), outcome: "cancelled" }
    });

    // Invalidate bids
    await prisma.auctionBid.updateMany({
      where: { auctionId: id },
      data: { status: "rejected" }
    });

    // Notify bidders who placed bids
    const bidders = await prisma.auctionBid.findMany({
      where: { auctionId: id },
      select: { dealerId: true },
      distinct: ['dealerId']
    });

    Promise.resolve().then(async () => {
      for (const bidder of bidders) {
        if (bidder.dealerId) {
          const dealer = await prisma.dealer.findUnique({ where: { id: bidder.dealerId } });
          if (dealer) {
            await sendAuctionCancelledEmail(dealer.email, dealer.contactPerson || 'User', updatedAuction).catch(console.error);
            await prisma.auctionNotification.create({
              data: {
                auctionId: updatedAuction.id,
                dealerId: dealer.id,
                type: 'auction_cancelled',
                title: 'Auction Cancelled',
                message: `The auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} has been cancelled.`,
              }
            });
          }
        }
      }
    });

    return NextResponse.json({ auction: updatedAuction, message: "Auction cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
