import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import prisma from "@/lib/db";


export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        images: true,
      }
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.status === 'DRAFT') {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Fetch user's own bids
    const myBids = await prisma.auctionBid.findMany({
      where: { auctionId: id, dealerId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate minimum next bid
    const highestBidVal = auction.currentHighestBid ? auction.currentHighestBid.toNumber() : 0;
    const minNextBid = highestBidVal > 0 
      ? highestBidVal + auction.minIncrement.toNumber() 
      : auction.startingBid.toNumber();

    // Sanitize auction object
    const safeAuction = {
      id: auction.id,
      title: auction.title,
      make: auction.make,
      model: auction.model,
      year: auction.year,
      mileage: auction.mileage,
      variant: auction.variant,
      region: auction.region,
      city: auction.city,
      description: auction.description,
      startingBid: auction.startingBid,
      minIncrement: auction.minIncrement,
      currentHighestBid: auction.currentHighestBid,
      currency: auction.currency,
      status: auction.status,
      startAt: auction.startAt,
      endAt: auction.endAt,
      images: auction.images,
      minNextBid
    };

    return NextResponse.json({ auction: safeAuction, myBids });
  } catch (error: any) {
    console.error("Error fetching auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
