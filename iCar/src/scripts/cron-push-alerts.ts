/**
 * cron-push-alerts.ts
 *
 * This is the ONLY script the cron job runs (every 5 minutes).
 * Its sole responsibility is to read all alerts from the DB and push
 * one BullMQ job per alert. The worker(s) do all the heavy lifting.
 *
 * Cron entry (crontab -e):
 *   *\/5 * * * * cd /home/abdurehman/Desktop/iCar/iCar && \
 *     /home/abdurehman/.nvm/versions/node/v20.20.0/bin/node \
 *     node_modules/.bin/tsx src/scripts/cron-push-alerts.ts \
 *     >> logs/cron-push.log 2>&1
 */

import 'dotenv/config';
import prisma from '../lib/db';
import { alertQueue, AlertJobData } from '../lib/queue';
import { createLogger } from '../lib/logger';

const log = createLogger('cron-push-alerts');

async function pushAlertJobs(): Promise<void> {
    log.info('Starting alert job enqueue');

    try {
        // Fetch only enabled alerts (toggle off = cron skips)
        const alerts = await prisma.alert.findMany({
            where: { enabled: true },
            include: { dealer: true },
        });

        log.info('Found alerts to enqueue', { count: alerts.length });

        for (const alert of alerts) {
            const jobData: AlertJobData = {
                alertId:     alert.id,
                dealerId:    alert.dealerId,
                dealerEmail: alert.dealer?.email ?? null,
                dealerName:  alert.dealer?.contactPerson ?? null,
                make:        alert.make,
                model:       alert.model,
                yearMin:     alert.yearMin,
                yearMax:     alert.yearMax,
                variant:     alert.variant,
                region:      alert.region,
                frequency:   alert.frequency,
                lastRun:     alert.lastRun ? alert.lastRun.toISOString() : null,
            };

            // Use a deterministic job ID so that if cron fires twice before
            // the previous batch finishes, duplicates are deduplicated by BullMQ.
            // Format: alert-<id>-<5-min-bucket>
            const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
            const jobId = `alert-${alert.id}-${bucket}`;

            await alertQueue.add(`alert-${alert.id}`, jobData, {
                jobId, // BullMQ ignores duplicate jobIds — idempotent enqueue
            });

            log.info('Enqueued job', { jobId });
        }

        log.info('Done — jobs enqueued', { count: alerts.length });
    } catch (err) {
        log.error('cron-push-alerts failed', { err });
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        // Close the queue connection so the process exits cleanly
        await alertQueue.close();
        process.exit(0);
    }
}

pushAlertJobs();
