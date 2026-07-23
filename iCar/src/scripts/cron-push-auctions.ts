/**
 * cron-push-auctions.ts
 *
 * Automatically transitions auction statuses and determines outcomes.
 * Also runs inside carq-worker every 30s — this script is a manual/backup trigger.
 *
 * Cron entry (crontab -e) — every minute (same path convention as
 * cron-push-alerts.ts and CRON_JOB.md):
 *   * * * * * cd /home/abdurehman/Desktop/iCar/iCar && \
 *     /home/abdurehman/.nvm/versions/node/v20.20.0/bin/node \
 *     node_modules/.bin/tsx src/scripts/cron-push-auctions.ts \
 *     >> logs/cron-auctions.log 2>&1
 *
 * Or manually: npm run push:auctions
 */

import 'dotenv/config';
import prisma from '../lib/db';
import { runAuctionScheduler } from '../lib/auction-scheduler';
import { createLogger } from '../lib/logger';

const log = createLogger('cron-push-auctions');

async function main() {
  log.info('Running push:auctions');

  try {
    const result = await runAuctionScheduler();

    if (result.started === 0 && result.closed === 0 && result.expired === 0) {
      log.info('No auctions to start or close at this time');
    } else {
      log.info('Done', result);
    }
  } catch (error) {
    log.error('Fatal error in push:auctions', { err: error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
