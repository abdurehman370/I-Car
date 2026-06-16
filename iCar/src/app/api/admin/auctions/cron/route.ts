import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import {
  sendAuctionStartedEmail,
  sendAuctionWonEmail,
} from "@/lib/mail";

// Secure the endpoint so only an admin or cron secret can call it
export async function GET(req: NextRequest) {
  // You can optionally add an Authorization header check here if calling via Vercel Cron
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  console.log('[API Cron] Running push:auctions at', new Date().toISOString());

  try {
    const now = new Date();
    let startedCount = 0;
    let closedCount = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Auto-start: SCHEDULED → LIVE when startAt has passed
    // ─────────────────────────────────────────────────────────────────────────
    const auctionsToStart = await prisma.auction.findMany({
      where: {
        status: 'SCHEDULED',
        startAt: { lte: now },
        endAt: { gt: now },
      },
    });

    if (auctionsToStart.length > 0) {
      for (const auction of auctionsToStart) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'LIVE' },
        });

        // Notify all approved dealers
        const dealers = await prisma.dealer.findMany({
          where: { approvalStatus: 'approved' },
        });

        await Promise.all(dealers.map(async (dealer) => {
          await sendAuctionStartedEmail(
            dealer.email,
            dealer.contactPerson || dealer.dealershipName || 'User',
            auction
          ).catch(console.error);

          await prisma.auctionNotification.create({
            data: {
              auctionId: auction.id,
              dealerId: dealer.id,
              type: 'auction_started',
              title: 'Auction Started!',
              message: `The auction for ${auction.year} ${auction.make} ${auction.model} is now live! Place your bids before time runs out.`,
            },
          });
        }));
        startedCount++;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Auto-close: LIVE → CLOSED when endAt has passed
    // ─────────────────────────────────────────────────────────────────────────
    const auctionsToClose = await prisma.auction.findMany({
      where: {
        status: 'LIVE',
        endAt: { lte: now },
      },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    });

    if (auctionsToClose.length > 0) {
      for (const auction of auctionsToClose) {
        let outcome = 'no_bids';
        let winnerDealerId: number | null = null;
        const highestBid = auction.bids[0] ?? null;

        if (highestBid) {
          const bidVal = highestBid.amount.toNumber();
          const reserve = auction.reservePrice ? auction.reservePrice.toNumber() : null;
          if (reserve && bidVal < reserve) {
            outcome = 'reserve_not_met';
          } else {
            outcome = 'sold';
            winnerDealerId = highestBid.dealerId;
          }
        }

        // Atomic close
        await prisma.$transaction(async (tx) => {
          await tx.auction.update({
            where: { id: auction.id },
            data: {
              status: 'CLOSED',
              closedAt: new Date(),
              outcome,
              winnerDealerId,
            },
          });

          if (highestBid) {
            await tx.auctionBid.updateMany({
              where: { auctionId: auction.id },
              data: { status: 'outbid' },
            });
            if (outcome === 'sold') {
              await tx.auctionBid.update({
                where: { id: highestBid.id },
                data: { status: 'winning' },
              });
            }
          }
        });

        // Notify winner
        if (outcome === 'sold' && winnerDealerId && highestBid) {
          const winner = await prisma.dealer.findUnique({ where: { id: winnerDealerId } });
          if (winner) {
            await sendAuctionWonEmail(
              winner.email,
              winner.contactPerson || winner.dealershipName || 'User',
              auction,
              highestBid.amount.toString()
            ).catch(console.error);

            await prisma.auctionNotification.create({
              data: {
                auctionId: auction.id,
                dealerId: winner.id,
                type: 'auction_won',
                title: '🎉 You Won the Auction!',
                message: `Congratulations! You won the auction for ${auction.year} ${auction.make} ${auction.model} with a final bid of ${highestBid.amount.toString()} ${auction.currency}.`,
              },
            });
          }
        }
        closedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron executed. Started: ${startedCount}, Closed: ${closedCount}`
    });

  } catch (error: any) {
    console.error('[API Cron] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
