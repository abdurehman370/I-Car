import type { Auction, Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { sendAuctionStartedEmail, sendAuctionWonEmail } from '@/lib/mail';
import { sendPushToDealer } from '@/lib/web-push';
import { createLogger } from '@/lib/logger';

const log = createLogger('auction-scheduler');

type AuctionWithTopBid = Auction & {
  bids: { id: number; amount: Prisma.Decimal; dealerId: number | null }[];
};

export type AuctionSchedulerResult = {
  started: number;
  closed: number;
  expired: number;
};

async function notifyDealersAuctionStarted(auction: Auction) {
  const dealers = await prisma.dealer.findMany({
    where: { approvalStatus: 'approved' },
  });

  for (const dealer of dealers) {
    await sendAuctionStartedEmail(
      dealer.email,
      dealer.contactPerson || dealer.dealershipName || 'User',
      auction
    ).catch((err) => log.error('auction-started email failed', { err, dealerId: dealer.id, auctionId: auction.id }));

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
    }).catch((err) => log.error('auction-started push failed', { err, dealerId: dealer.id, auctionId: auction.id }));
  }
}

async function closeAuctionRecord(
  auction: AuctionWithTopBid
): Promise<'sold' | 'no_bids' | 'reserve_not_met' | 'expired'> {
  let outcome: 'sold' | 'no_bids' | 'reserve_not_met' | 'expired' = 'no_bids';
  let winnerDealerId: number | null = null;
  const highestBid = auction.bids[0] ?? null;

  if (highestBid) {
    const bidVal = highestBid.amount.toNumber();
    const reserve = auction.reservePrice
      ? auction.reservePrice.toNumber()
      : null;
    if (reserve && bidVal < reserve) {
      outcome = 'reserve_not_met';
    } else {
      outcome = 'sold';
      winnerDealerId = highestBid.dealerId;
    }
  } else if (auction.status === 'SCHEDULED') {
    outcome = 'expired';
  }

  // Guarded close: only one concurrent caller (cron, page-load sync, display
  // poll) actually performs the close and sends notifications.
  const didClose = await prisma.$transaction(async (tx) => {
    const res = await tx.auction.updateMany({
      where: { id: auction.id, status: { notIn: ['CLOSED', 'CANCELLED'] } },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        outcome,
        winnerDealerId,
      },
    });

    if (res.count === 0) return false;

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
    return true;
  });

  if (didClose && outcome === 'sold' && winnerDealerId && highestBid) {
    const winner = await prisma.dealer.findUnique({
      where: { id: winnerDealerId },
    });
    if (winner) {
      await sendAuctionWonEmail(
        winner.email,
        winner.contactPerson || winner.dealershipName || 'User',
        auction,
        highestBid.amount.toString()
      ).catch((err) => log.error('auction-won email failed', { err, dealerId: winner.id, auctionId: auction.id }));

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
      }).catch((err) => log.error('auction-won push failed', { err, dealerId: winner.id, auctionId: auction.id }));
    }
  }

  return outcome;
}

/**
 * Transition SCHEDULED → LIVE and LIVE/SCHEDULED → CLOSED based on wall-clock times.
 * Safe to call frequently (worker interval, API reads, cron script).
 */
export async function runAuctionScheduler(): Promise<AuctionSchedulerResult> {
  const now = new Date();
  const result: AuctionSchedulerResult = { started: 0, closed: 0, expired: 0 };

  const liveToClose = await prisma.auction.findMany({
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

  for (const auction of liveToClose) {
    const outcome = await closeAuctionRecord(auction);
    result.closed += 1;
    log.info('Closed auction', { auctionId: auction.id, outcome });
  }

  const scheduledToStart = await prisma.auction.findMany({
    where: {
      status: 'SCHEDULED',
      startAt: { lte: now },
      endAt: { gt: now },
    },
  });

  for (const auction of scheduledToStart) {
    const res = await prisma.auction.updateMany({
      where: { id: auction.id, status: 'SCHEDULED' },
      data: { status: 'LIVE' },
    });
    if (res.count === 0) continue; // another process already started it
    await notifyDealersAuctionStarted(auction);
    result.started += 1;
    log.info('Started auction', { auctionId: auction.id, title: auction.title });
  }

  const scheduledExpired = await prisma.auction.findMany({
    where: {
      status: 'SCHEDULED',
      endAt: { lte: now },
    },
    include: {
      bids: {
        orderBy: { amount: 'desc' },
        take: 1,
      },
    },
  });

  for (const auction of scheduledExpired) {
    const outcome = await closeAuctionRecord(auction);
    result.expired += 1;
    log.info('Expired scheduled auction', { auctionId: auction.id, outcome });
  }

  return result;
}

/** Run scheduler for a single auction (e.g. on page load). */
export async function syncAuctionById(auctionId: number): Promise<void> {
  const now = new Date();
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      bids: {
        orderBy: { amount: 'desc' },
        take: 1,
      },
    },
  });

  if (!auction) return;

  if (auction.status === 'LIVE' && auction.endAt <= now) {
    await closeAuctionRecord(auction);
    return;
  }

  if (
    auction.status === 'SCHEDULED' &&
    auction.startAt <= now &&
    auction.endAt > now
  ) {
    const res = await prisma.auction.updateMany({
      where: { id: auction.id, status: 'SCHEDULED' },
      data: { status: 'LIVE' },
    });
    if (res.count > 0) {
      await notifyDealersAuctionStarted(auction);
    }
    return;
  }

  if (auction.status === 'SCHEDULED' && auction.endAt <= now) {
    await closeAuctionRecord(auction);
  }
}
