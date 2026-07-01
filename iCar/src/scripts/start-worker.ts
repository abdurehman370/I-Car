/**
 * start-worker.ts
 *
 * Long-running process that:
 *  1. Starts the BullMQ worker (concurrency=5) to process alert jobs
 *  2. Starts an Express server on port 3001 exposing the Bull Board UI
 *     → http://localhost:3001/admin/queues
 *
 * Run with:
 *   npm run worker
 *
 * Keep this process alive with pm2 or systemd in production:
 *   pm2 start "npm run worker" --name icar-alert-worker
 */

import 'dotenv/config';
import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { createAlertWorker } from '../lib/alert-worker';
import { runAuctionScheduler } from '../lib/auction-scheduler';
import { alertQueue } from '../lib/queue';

const BOARD_PORT = parseInt(process.env.BULL_BOARD_PORT || '3001');
const AUCTION_TICK_MS = parseInt(process.env.AUCTION_SCHEDULER_INTERVAL_MS || '30000', 10);

// ---------------------------------------------------------------------------
// 1. Start the BullMQ worker
// ---------------------------------------------------------------------------
const worker = createAlertWorker();
console.log(`[${new Date().toISOString()}] [worker] Alert worker started (concurrency=5)`);

// ---------------------------------------------------------------------------
// 1b. Auction scheduler — auto start/close without relying on system cron
// ---------------------------------------------------------------------------
async function tickAuctionScheduler() {
  try {
    const result = await runAuctionScheduler();
    if (result.started > 0 || result.closed > 0 || result.expired > 0) {
      console.log(
        `[${new Date().toISOString()}] [worker] Auction scheduler — started: ${result.started}, closed: ${result.closed}, expired: ${result.expired}`
      );
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [worker] Auction scheduler error:`, error);
  }
}

void tickAuctionScheduler();
const auctionSchedulerTimer = setInterval(tickAuctionScheduler, AUCTION_TICK_MS);
console.log(
  `[${new Date().toISOString()}] [worker] Auction scheduler running every ${AUCTION_TICK_MS / 1000}s`
);

// ---------------------------------------------------------------------------
// 2. Bull Board dashboard (Express)
// ---------------------------------------------------------------------------
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(alertQueue)],
    serverAdapter,
});

const app = express();
app.use('/admin/queues', serverAdapter.getRouter());

// Simple health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', worker: 'running', queue: 'alerts' });
});

app.listen(BOARD_PORT, () => {
    console.log(`[${new Date().toISOString()}] [worker] Bull Board running at http://localhost:${BOARD_PORT}/admin/queues`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — wait for active jobs to finish before exiting
// ---------------------------------------------------------------------------
async function shutdown(signal: string) {
    console.log(`[${new Date().toISOString()}] [worker] Received ${signal} — shutting down gracefully...`);
    clearInterval(auctionSchedulerTimer);
    await worker.close();
    await alertQueue.close();
    console.log(`[${new Date().toISOString()}] [worker] Shutdown complete`);
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
