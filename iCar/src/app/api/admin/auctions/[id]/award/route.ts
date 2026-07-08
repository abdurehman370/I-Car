import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionWonEmail } from "@/lib/mail";
import { sendPushToDealer } from "@/lib/web-push";

export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bidId } = await req.json();

    if (!bidId) {
      return NextResponse.json({ error: "Missing bidId" }, { status: 400 });
    }

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { bids: true }
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.status === "CLOSED" || auction.status === "CANCELLED") {
      return NextResponse.json({ error: "Auction is already closed or cancelled" }, { status: 400 });
    }

    const winningBid = auction.bids.find(b => b.id === bidId);
    if (!winningBid) {
      return NextResponse.json({ error: "Bid not found in this auction" }, { status: 404 });
    }

    // Transaction to update auction and bids
    await prisma.$transaction([
      // Close the auction and set winner
      prisma.auction.update({
        where: { id },
        data: {
          status: "CLOSED",
          outcome: "sold",
          winnerDealerId: winningBid.dealerId,
          closedAt: new Date(),
        }
      }),
      // Set all bids to outbid
      prisma.auctionBid.updateMany({
        where: { auctionId: id },
        data: { status: "outbid" }
      }),
      // Set the selected bid to winning
      prisma.auctionBid.update({
        where: { id: bidId },
        data: { status: "winning" }
      })
    ]);

    // Notify the winning dealer (floor winners are handled in the room)
    if (winningBid.dealerId) {
      const winnerDealerId = winningBid.dealerId;
      Promise.resolve().then(async () => {
        const winner = await prisma.dealer.findUnique({ where: { id: winnerDealerId } });
        if (!winner) return;

        await sendAuctionWonEmail(
          winner.email,
          winner.contactPerson || winner.dealershipName || "User",
          auction,
          winningBid.amount.toString()
        ).catch(console.error);

        await prisma.auctionNotification.create({
          data: {
            auctionId: id,
            dealerId: winner.id,
            type: "auction_won",
            title: "🎉 You Won the Auction!",
            message: `Congratulations! You won the auction for ${auction.year} ${auction.make} ${auction.model} with a final bid of ${winningBid.amount.toString()} ${auction.currency}.`,
          },
        }).catch(console.error);

        await sendPushToDealer(winner.id, {
          title: "You won the auction!",
          body: `You won ${auction.year} ${auction.make} ${auction.model}.`,
          url: `/auctions/${id}`,
          tag: `auction-${id}-won`,
        }).catch(console.error);
      }).catch(console.error);
    }

    return NextResponse.json({ message: "Winner selected and auction closed successfully" });
  } catch (error: any) {
    console.error("Error awarding auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
