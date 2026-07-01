import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendAuctionPublishedEmail } from "@/lib/mail";
import { sendPushToDealer } from "@/lib/web-push";


export async function POST(req: NextRequest, context: any) {
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

    if (auction.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT auctions can be published" }, { status: 400 });
    }

    const now = new Date();
    let newStatus: string;
    if (auction.startAt <= now && auction.endAt > now) {
      newStatus = "LIVE";
    } else if (auction.endAt <= now) {
      newStatus = "CLOSED";
    } else {
      newStatus = "SCHEDULED";
    }

    const updatedAuction = await prisma.auction.update({
      where: { id },
      data: { status: newStatus }
    });

    // Notify approved dealers
    const approvedDealers = await prisma.dealer.findMany({
      where: { approvalStatus: 'approved' }
    });

    // Notify standard users (assuming username is email)
    const users = await prisma.user.findMany({
      where: { role: 'user' } // Assuming 'user' is the role for regular users
    });

    // Await notifications to prevent serverless premature termination
    await Promise.all([
      ...approvedDealers.map(async (dealer) => {
        await sendAuctionPublishedEmail(dealer.email, dealer.contactPerson || 'Dealer', updatedAuction).catch(console.error);
        await prisma.auctionNotification.create({
          data: {
            auctionId: updatedAuction.id,
            dealerId: dealer.id,
            type: 'auction_published',
            title: 'New Auction Published',
            message: `A new auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} is now scheduled.`,
          }
        }).catch(console.error);

        await sendPushToDealer(dealer.id, {
          title: 'New auction published',
          body: `${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} is scheduled.`,
          url: `/auctions/${updatedAuction.id}`,
          tag: `auction-${updatedAuction.id}-published`,
        }).catch(console.error);
      }),
      ...users.map(async (user) => {
        if (user.username.includes('@')) {
          await sendAuctionPublishedEmail(user.username, 'User', updatedAuction).catch(console.error);
          await prisma.auctionNotification.create({
            data: {
              auctionId: updatedAuction.id,
              userId: user.id,
              userType: 'user',
              type: 'auction_published',
              title: 'New Auction Published',
              message: `A new auction for ${updatedAuction.year} ${updatedAuction.make} ${updatedAuction.model} is now scheduled.`,
            }
          }).catch(console.error);
        }
      })
    ]);

    return NextResponse.json({ auction: updatedAuction, message: "Auction published successfully" });
  } catch (error: any) {
    console.error("Error publishing auction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
