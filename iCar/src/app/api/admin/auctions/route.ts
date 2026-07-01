import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAdminSession } from "@/lib/auth";
import { parseAuctionDateTime } from "@/lib/auction-datetime";
import prisma from "@/lib/db";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

type AuctionImageRecord = Prisma.AuctionImageCreateManyInput;

export async function GET(req: NextRequest) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const skip = (page - 1) * limit;

  try {
    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
      }),

      prisma.auction.count(),
    ]);

    return NextResponse.json({
      auctions,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error("Error fetching auctions:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch auctions",
      },
      { status: 500 }
    );
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
      title,
      make,
      model,
      year,
      mileage,
      variant,
      region,
      city,
      description,
      startingBid,
      reservePrice,
      minIncrement,
      currency,
      startAt,
      endAt,
      images,
    } = body;

    if (
      !title ||
      !make ||
      !model ||
      !year ||
      mileage === undefined ||
      mileage === null ||
      !region ||
      !description ||
      startingBid === undefined ||
      startingBid === null ||
      minIncrement === undefined ||
      minIncrement === null ||
      !startAt ||
      !endAt
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedYear = Number.parseInt(String(year), 10);
    const parsedMileage = Number.parseInt(String(mileage), 10);
    const parsedStartingBid = Number.parseFloat(String(startingBid));
    const parsedMinIncrement = Number.parseFloat(String(minIncrement));
    const parsedReservePrice =
      reservePrice !== undefined && reservePrice !== null && reservePrice !== ""
        ? Number.parseFloat(String(reservePrice))
        : null;

    if (Number.isNaN(parsedYear)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (Number.isNaN(parsedMileage)) {
      return NextResponse.json({ error: "Invalid mileage" }, { status: 400 });
    }

    if (Number.isNaN(parsedStartingBid)) {
      return NextResponse.json(
        { error: "Invalid starting bid" },
        { status: 400 }
      );
    }

    if (Number.isNaN(parsedMinIncrement)) {
      return NextResponse.json(
        { error: "Invalid minimum increment" },
        { status: 400 }
      );
    }

    if (parsedReservePrice !== null && Number.isNaN(parsedReservePrice)) {
      return NextResponse.json(
        { error: "Invalid reserve price" },
        { status: 400 }
      );
    }

    const start = parseAuctionDateTime(String(startAt), region);
    const end = parseAuctionDateTime(String(endAt), region);

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time" },
        { status: 400 }
      );
    }

    if (Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid end time" },
        { status: 400 }
      );
    }

    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const auction = await prisma.auction.create({
      data: {
        createdByAdminId: Number(session.user.id),
        title,
        make,
        model,
        year: parsedYear,
        mileage: parsedMileage,
        variant: variant || null,
        region,
        city: city || null,
        description,
        startingBid: parsedStartingBid,
        reservePrice: parsedReservePrice,
        minIncrement: parsedMinIncrement,
        currency: currency || "AED",
        startAt: start,
        endAt: end,
        status: "DRAFT",
      },
    });

    if (images && Array.isArray(images) && images.length > 0) {
      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "auctions",
        auction.id.toString()
      );

      await fs.mkdir(uploadDir, { recursive: true });

      const imageRecords = await Promise.all(
        images.map(async (imageData: string, index: number) => {
          if (typeof imageData !== "string") return null;

          if (!imageData.startsWith("data:image")) return null;

          const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

          if (!matches || matches.length !== 3) return null;

          const mimeType = matches[1];
          const base64Data = matches[2];

          const buffer = Buffer.from(base64Data, "base64");
          const extension = mimeType.split("/")[1] || "jpeg";

          const safeExtension = extension === "svg+xml" ? "svg" : extension;
          const filename = `${uuidv4()}.${safeExtension}`;
          const filePath = path.join(uploadDir, filename);

          await fs.writeFile(filePath, buffer);

          return {
            auctionId: auction.id,
            url: `/uploads/auctions/${auction.id}/${filename}`,
            isPrimary: index === 0,
            order: index,
          };
        })
      );

      const validImageRecords = imageRecords.filter(
        (record) => record !== null
      ) as AuctionImageRecord[];

      if (validImageRecords.length > 0) {
        await prisma.auctionImage.createMany({
          data: validImageRecords,
        });
      }
    }

    const createdAuction = await prisma.auction.findUnique({
      where: {
        id: auction.id,
      },
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        auction: createdAuction,
        message: "Auction created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating auction:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to create auction",
      },
      { status: 500 }
    );
  }
}