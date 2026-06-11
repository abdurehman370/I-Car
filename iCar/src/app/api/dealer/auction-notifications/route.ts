import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import prisma from "@/lib/db";


export async function GET(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const notifications = await prisma.auctionNotification.findMany({
      where: { dealerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
          }
        }
      }
    });

    const unreadCount = await prisma.auctionNotification.count({
      where: { dealerId: session.user.id, isRead: false }
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
