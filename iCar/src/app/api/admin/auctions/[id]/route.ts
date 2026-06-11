import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";


export async function GET(req: NextRequest, context: any) {
  const { params } = context;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        images: true,
        winnerDealer: { select: { dealershipName: true, contactPerson: true, email: true } },
        _count: { select: { bids: true } }
      }
    });

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    return NextResponse.json({ auction });
  } catch (error: any) {
    console.error("Error fetching auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: any) {
  const { params } = context;
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

    if (auction.status !== "DRAFT" && auction.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Cannot edit an auction that is live or closed" }, { status: 400 });
    }

    const body = await req.json();
    
    // Convert dates if provided
    const updateData: any = { ...body };
    if (body.startAt) updateData.startAt = new Date(body.startAt);
    if (body.endAt) updateData.endAt = new Date(body.endAt);
    
    // Prevent updating protected fields
    delete updateData.id;
    delete updateData.status;
    delete updateData.currentHighestBid;
    delete updateData.winnerDealerId;
    delete updateData.outcome;
    delete updateData.closedAt;

    const updatedAuction = await prisma.auction.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ auction: updatedAuction, message: "Auction updated successfully" });
  } catch (error: any) {
    console.error("Error updating auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
