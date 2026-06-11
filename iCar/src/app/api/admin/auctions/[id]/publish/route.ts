import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionPublishedEmail } from "@/lib/mail";


export async function POST(req: NextRequest, context: any) {
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

    if (auction.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT auctions can be published" }, { status: 400 });
    }

    const now = new Date();
    const newStatus = auction.startAt <= now ? (auction.endAt > now ? "LIVE" : "CLOSED") : "SCHEDULED";

    const updatedAuction = await prisma.auction.update({
      where: { id },
      data: { status: newStatus }
    });

    // Notify approved dealers
    const approvedDealers = await prisma.dealer.findMany({
      where: { approvalStatus: 'approved' }
    });

    // We do this asynchronously to avoid blocking the response
    Promise.resolve().then(async () => {
      for (const dealer of approvedDealers) {
        await sendAuctionPublishedEmail(dealer.email, dealer.contactPerson || 'User', updatedAuction).catch(console.error);
        await prisma.auctionNotification.create({
          data: {
            auctionId: updatedAuction.id,
            dealerId: dealer.id,
            type: 'auction_published',
            title: 'New Auction Published',
            message: `A new auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} is now scheduled.`,
          }
        });
      }
    });

    return NextResponse.json({ auction: updatedAuction, message: "Auction published successfully" });
  } catch (error: any) {
    console.error("Error publishing auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
