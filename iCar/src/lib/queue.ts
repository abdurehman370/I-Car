import 'dotenv/config';
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from './logger';

const log = createLogger('queue');

// ---------------------------------------------------------------------------
// Redis connection
// Shared across queue, worker, and scheduler. maxRetriesPerRequest must be
// null for BullMQ blocking commands (BRPOP etc.) to work correctly.
// ---------------------------------------------------------------------------
export const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

redisConnection.on('error', (err) => {
    log.error('Redis connection error', { message: err.message });
});

// ---------------------------------------------------------------------------
// Alert job data shape
// Each job carries everything the worker needs — no extra DB lookups required
// to decide whether to process the job.
// ---------------------------------------------------------------------------
export interface AlertJobData {
    alertId: number;
    dealerId: number | null; // null for admin-owned alerts
    dealerEmail: string | null;
    dealerName: string | null;
    make: string;
    model: string;
    yearMin: number | null;
    yearMax: number | null;
    variant: string | null;
    region: string;
    frequency: string;
    lastRun: string | null; // ISO string or null
}

// ---------------------------------------------------------------------------
// Queue definition
// - removeOnComplete: keep last 100 completed jobs for Bull Board inspection
// - removeOnFail: keep last 200 failed jobs for debugging
// - attempts: 3 retries per job
// - backoff: exponential — 5s, 10s, 20s
// ---------------------------------------------------------------------------
export const alertQueue = new Queue<AlertJobData>('alerts', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
    },
});

// QueueEvents lets external code listen to job lifecycle events (optional)
export const alertQueueEvents = new QueueEvents('alerts', {
    connection: new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    }),
});
