/**
 * cron-push-auctions.ts
 *
 * Automatically transitions auction statuses and determines outcomes.
 * Run this on a schedule (e.g. every minute) via cron or PM2.
 *
 * Cron entry (crontab -e):
 *   * * * * * cd /home/abdurehman/Desktop/iCar/iCar && \
 *     /home/abdurehman/.nvm/versions/node/v20.20.0/bin/node \
 *     node_modules/.bin/tsx src/scripts/cron-push-auctions.ts \
 *     >> logs/cron-auctions.log 2>&1
 *
 * Or manually: npm run push:auctions
 */

import 'dotenv/config';
import prisma from '../lib/db';
import {
  sendAuctionStartedEmail,
  sendAuctionWonEmail,
} from '../lib/mail';
import { sendPushToDealer } from '../lib/web-push';

async function main() {
  console.log('[Cron] Running push:auctions at', new Date().toISOString());

  try {
    const now = new Date();

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
      console.log(`[Cron] Found ${auctionsToStart.length} auction(s) to start.`);
      for (const auction of auctionsToStart) {
        await prisma.auction.update({
          where: { id: auction.id },
          data: { status: 'LIVE' },
        });

        // Notify all approved dealers
        const dealers = await prisma.dealer.findMany({
          where: { approvalStatus: 'approved' },
        });

        for (const dealer of dealers) {
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

          await sendPushToDealer(dealer.id, {
            title: 'Auction started!',
            body: `${auction.year} ${auction.make} ${auction.model} is now live.`,
            url: `/auctions/${auction.id}`,
            tag: `auction-${auction.id}-started`,
          }).catch(console.error);
        }
        console.log(`[Cron] Started auction #${auction.id}: ${auction.title}`);
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
      console.log(`[Cron] Found ${auctionsToClose.length} auction(s) to close.`);
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

            await sendPushToDealer(winner.id, {
              title: 'You won the auction!',
              body: `You won ${auction.year} ${auction.make} ${auction.model}.`,
              url: `/auctions/${auction.id}`,
              tag: `auction-${auction.id}-won`,
            }).catch(console.error);
          }
        }

        console.log(`[Cron] Closed auction #${auction.id} — outcome: ${outcome}`);
      }
    }

    if (auctionsToStart.length === 0 && auctionsToClose.length === 0) {
      console.log('[Cron] No auctions to start or close at this time.');
    }

  } catch (error) {
    console.error('[Cron] Fatal error in push:auctions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
