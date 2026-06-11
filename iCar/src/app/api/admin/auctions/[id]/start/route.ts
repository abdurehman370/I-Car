import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionStartedEmail } from "@/lib/mail";


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

    if (auction.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Only SCHEDULED auctions can be manually started" }, { status: 400 });
    }

    const updatedAuction = await prisma.auction.update({
      where: { id },
      data: { status: "LIVE", startAt: new Date() } // Update start time to now if forced
    });

    // Notify approved dealers
    const approvedDealers = await prisma.dealer.findMany({
      where: { approvalStatus: 'approved' }
    });

    Promise.resolve().then(async () => {
      for (const dealer of approvedDealers) {
        await sendAuctionStartedEmail(dealer.email, dealer.contactPerson || 'User', updatedAuction).catch(console.error);
        await prisma.auctionNotification.create({
          data: {
            auctionId: updatedAuction.id,
            dealerId: dealer.id,
            type: 'auction_started',
            title: 'Auction Started!',
            message: `The auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} is now live!`,
          }
        });
      }
    });

    return NextResponse.json({ auction: updatedAuction, message: "Auction started successfully" });
  } catch (error: any) {
    console.error("Error starting auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
