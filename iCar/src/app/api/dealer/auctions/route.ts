import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import { runAuctionScheduler } from "@/lib/auction-scheduler";
import prisma from "@/lib/db";
import { canAccessAuctions } from "@/lib/portal-access";


export async function GET(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check dealer status
  const dealer = await prisma.dealer.findUnique({ where: { id: session.user.id } });
  if (!dealer || !canAccessAuctions(dealer)) {
    return NextResponse.json({ error: "Account not approved" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    await runAuctionScheduler();

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where: {
          status: { in: ['SCHEDULED', 'LIVE', 'CLOSED'] }
        },
        skip,
        take: limit,
        orderBy: [
          { status: 'asc' }, // LIVE usually before CLOSED if alphabetical? Actually we might want LIVE first, then SCHEDULED, then CLOSED.
          { startAt: 'desc' }
        ],
        include: {
          images: {
            where: { isPrimary: true },
            take: 1
          }
        }
      }),
      prisma.auction.count({
        where: {
          status: { in: ['SCHEDULED', 'LIVE', 'CLOSED'] }
        }
      })
    ]);

    // Omit bidder identity or sensitive admin data
    const safeAuctions = auctions.map(a => ({
      id: a.id,
      title: a.title,
      make: a.make,
      model: a.model,
      year: a.year,
      mileage: a.mileage,
      region: a.region,
      startingBid: a.startingBid,
      currentHighestBid: a.currentHighestBid,
      currency: a.currency,
      status: a.status,
      startAt: a.startAt,
      endAt: a.endAt,
      images: a.images
    }));

    return NextResponse.json({ auctions: safeAuctions, total, page, limit });
  } catch (error: any) {
    console.error("Error fetching auctions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
