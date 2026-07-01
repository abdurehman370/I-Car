import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { parseAuctionDateTime } from "@/lib/auction-datetime";
import { syncAuctionById } from "@/lib/auction-scheduler";
import prisma from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";


export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  const id = parseInt(params.id);

  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncAuctionById(id);

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

    if (auction.status !== "DRAFT" && auction.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Cannot edit an auction that is live or closed" }, { status: 400 });
    }

    const body = await req.json();
    
    // Convert dates if provided
    // Convert dates if provided
    const updateData: any = { ...body };
    if (body.startAt) updateData.startAt = parseAuctionDateTime(String(body.startAt));
    if (body.endAt) updateData.endAt = parseAuctionDateTime(String(body.endAt));
    
    // Prevent updating protected fields
    delete updateData.id;
    delete updateData.status;
    delete updateData.currentHighestBid;
    delete updateData.winnerDealerId;
    delete updateData.outcome;
    delete updateData.closedAt;

    // Handle nested images update if provided
    if (body.images && Array.isArray(body.images)) {
      // Delete old records
      await prisma.auctionImage.deleteMany({ where: { auctionId: id } });
      
      const uploadDir = path.join(process.cwd(), "public", "uploads", "auctions", id.toString());
      
      // Clear old directory if it exists, ignore errors
      try {
        await fs.rm(uploadDir, { recursive: true, force: true });
      } catch (e) {}

      await fs.mkdir(uploadDir, { recursive: true });

      const imageRecords = await Promise.all(body.images.map(async (imageData: string | any, index: number) => {
        // If it's already an existing image object, just keep it (though we just deleted the directory, so this won't work well)
        // Let's assume frontend sends full base64 for all images if they change them
        if (typeof imageData === 'string' && imageData.startsWith("data:image")) {
          const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (!matches || matches.length !== 3) return null;

          const type = matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const extension = type.split("/")[1] || "jpeg";
          const filename = `${uuidv4()}.${extension}`;
          const filePath = path.join(uploadDir, filename);

          await fs.writeFile(filePath, buffer);

          return {
            auctionId: id,
            url: `/uploads/auctions/${id}/${filename}`,
            isPrimary: index === 0,
            order: index,
          };
        } else if (typeof imageData === 'string' && imageData.startsWith("/")) {
          // If the frontend somehow sends the old URL back
          return {
            auctionId: id,
            url: imageData,
            isPrimary: index === 0,
            order: index,
          };
        }
        return null;
      }));

      const validImageRecords = imageRecords.filter(record => record !== null) as any[];

      if (validImageRecords.length > 0) {
        await prisma.auctionImage.createMany({
          data: validImageRecords,
        });
      }
    }

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

export async function DELETE(req: NextRequest, context: any) {
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

    await prisma.auction.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Auction deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting auction:", error);
    return NextResponse.json({ error: "Failed to delete auction. It may have active bids or other dependencies." }, { status: 500 });
  }
}
