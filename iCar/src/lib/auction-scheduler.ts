import type { Auction, Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { sendAuctionStartedEmail, sendAuctionWonEmail } from '@/lib/mail';
import { sendPushToDealer } from '@/lib/web-push';

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

  if (outcome === 'sold' && winnerDealerId && highestBid) {
    const winner = await prisma.dealer.findUnique({
      where: { id: winnerDealerId },
    });
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
    console.log(
      `[auction-scheduler] Closed auction #${auction.id} — outcome: ${outcome}`
    );
  }

  const scheduledToStart = await prisma.auction.findMany({
    where: {
      status: 'SCHEDULED',
      startAt: { lte: now },
      endAt: { gt: now },
    },
  });

  for (const auction of scheduledToStart) {
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'LIVE' },
    });
    await notifyDealersAuctionStarted(auction);
    result.started += 1;
    console.log(
      `[auction-scheduler] Started auction #${auction.id}: ${auction.title}`
    );
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
    console.log(
      `[auction-scheduler] Expired scheduled auction #${auction.id} — outcome: ${outcome}`
    );
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
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'LIVE' },
    });
    await notifyDealersAuctionStarted(auction);
    return;
  }

  if (auction.status === 'SCHEDULED' && auction.endAt <= now) {
    await closeAuctionRecord(auction);
  }
}
