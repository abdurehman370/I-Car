import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";


export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bids: true }
          }
        }
      }),
      prisma.auction.count()
    ]);

    return NextResponse.json({ auctions, total, page, limit });
  } catch (error: any) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      title, make, model, year, mileage, variant, region, city, description, 
      startingBid, reservePrice, minIncrement, currency, startAt, endAt, 
      images // Array of {url, isPrimary, order}
    } = body;

    // Validation
    if (!title || !make || !model || !year || !mileage || !region || !description || !startingBid || !minIncrement || !startAt || !endAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    const auction = await prisma.auction.create({
      data: {
        createdByAdminId: session.user.id,
        title,
        make,
        model,
        year: parseInt(year),
        mileage: parseInt(mileage),
        variant,
        region,
        city,
        description,
        startingBid: parseFloat(startingBid),
        reservePrice: reservePrice ? parseFloat(reservePrice) : null,
        minIncrement: parseFloat(minIncrement),
        currency: currency || "AED",
        startAt: start,
        endAt: end,
        status: "DRAFT"
      }
    });

    if (images && Array.isArray(images) && images.length > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "auctions", auction.id.toString());
      await fs.mkdir(uploadDir, { recursive: true });

      const imageRecords = await Promise.all(images.map(async (imageData: string, index: number) => {
        if (!imageData.startsWith("data:image")) return null;
        const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const type = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const extension = type.split("/")[1] || "jpeg";
        const filename = `${uuidv4()}.${extension}`;
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        return {
          auctionId: auction.id,
          url: `/uploads/auctions/${auction.id}/${filename}`,
          isPrimary: index === 0,
          order: index,
        };
      }));

      const validImageRecords = imageRecords.filter((record: any) => record !== null);

      if (validImageRecords.length > 0) {
        await prisma.auctionImage.createMany({
          data: validImageRecords,
        });
      }
    }

    return NextResponse.json({ auction, message: "Auction created successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
