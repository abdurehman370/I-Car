import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/auth";
import prisma from "@/lib/db";


export async function POST(req: NextRequest, context: any) {
  const { params } = context;
  const id = parseInt(params.id);

  const session = await getDealerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notification = await prisma.auctionNotification.findUnique({ where: { id } });
    if (!notification || notification.dealerId !== session.user.id) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const updated = await prisma.auctionNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });

    return NextResponse.json({ notification: updated });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
