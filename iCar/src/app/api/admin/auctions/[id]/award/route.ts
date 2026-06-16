import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";

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

    return NextResponse.json({ message: "Winner selected and auction closed successfully" });
  } catch (error: any) {
    console.error("Error awarding auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
