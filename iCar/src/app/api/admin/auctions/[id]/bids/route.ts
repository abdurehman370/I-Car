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
    const bids = await prisma.auctionBid.findMany({
      where: { auctionId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        dealer: {
          select: {
            id: true,
            email: true,
            dealershipName: true,
            contactPerson: true,
            role: true
          }
        }
      }
    });

    return NextResponse.json({ bids });
  } catch (error: any) {
    console.error("Error fetching bids:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
