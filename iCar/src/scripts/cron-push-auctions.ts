/**
 * cron-push-auctions.ts
 *
 * Automatically transitions auction statuses and determines outcomes.
 * Also runs inside carq-worker every 30s — this script is a manual/backup trigger.
 *
 * Cron entry (crontab -e) — every minute:
 *   * * * * * cd /var/www/html/iCar/iCar && /usr/bin/node node_modules/.bin/tsx src/scripts/cron-push-auctions.ts >> logs/cron-auctions.log 2>&1
 *
 * Or manually: npm run push:auctions
 */

import 'dotenv/config';
import prisma from '../lib/db';
import { runAuctionScheduler } from '../lib/auction-scheduler';

async function main() {
  console.log('[Cron] Running push:auctions at', new Date().toISOString());

  try {
    const result = await runAuctionScheduler();

    if (result.started === 0 && result.closed === 0 && result.expired === 0) {
      console.log('[Cron] No auctions to start or close at this time.');
    } else {
      console.log(
        `[Cron] Done — started: ${result.started}, closed: ${result.closed}, expired: ${result.expired}`
      );
    }
  } catch (error) {
    console.error('[Cron] Fatal error in push:auctions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
