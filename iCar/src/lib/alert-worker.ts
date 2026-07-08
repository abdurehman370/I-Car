import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { redisConnection, AlertJobData } from './queue';
import prisma from './db';
import { sendAlertNotificationEmail } from './mail';
import { listingRegionWhere, resolveScraperRegionParams } from './regions';
import { sendPushToDealer } from './web-push';
import { getScraperApiKey, getScraperBaseUrl } from './scraper';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Persistent log directory — logs go to <project>/logs/ not /tmp
// ---------------------------------------------------------------------------
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, 'alert-worker.log');

function log(level: 'INFO' | 'WARN' | 'ERROR', jobId: string | undefined, msg: string) {
    const line = `[${new Date().toISOString()}] [${level}] [job:${jobId ?? 'n/a'}] ${msg}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, line + '\n');
}

// ---------------------------------------------------------------------------
// Cooldown check — same logic as the old script, centralised here
// Returns true if the alert should be skipped (still within cooldown window)
// ---------------------------------------------------------------------------
function isWithinCooldown(frequency: string, lastRun: string | null): boolean {
    if (!lastRun) return false; // never run → always process

    const diffMs = Date.now() - new Date(lastRun).getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (frequency === 'every5min' && diffMinutes < 5) return true;
    if (frequency === 'daily' && diffDays < 1) return true;
    if (frequency === 'weekly' && diffDays < 7) return true;
    if (frequency === 'monthly' && diffDays < 30) return true;

    return false;
}

// ---------------------------------------------------------------------------
// Scraper call with AbortController timeout (60 seconds)
// ---------------------------------------------------------------------------
async function fetchScraperMatches(data: AlertJobData): Promise<any[]> {
    const controller = new AbortController();
    // 120s — scraper hits multiple sources (Dubizzle, YallaMotor, Hatla2ee etc.)
    // Single scrape takes ~7s but with concurrency=5 they queue up in uvicorn,
    // so worst case is ~5 × 7s = 35s. 120s gives safe headroom.
    const SCRAPER_TIMEOUT_MS = 120_000;
    const timeout = setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);

    try {
        const scraperParams = resolveScraperRegionParams(data.region);

        const res = await fetch(`${getScraperBaseUrl()}/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': getScraperApiKey()
            },
            body: JSON.stringify({
                make: data.make,
                model: data.model,
                region: scraperParams.region,
                country: scraperParams.country,
                year_min: data.yearMin,
                year_max: data.yearMax,
                variant: data.variant,
                max_pages: 1,
            }),
            signal: controller.signal,
        });

        if (!res.ok) return [];

        const json = await res.json();
        // Normalise listing_url → url so mail.ts detects external links correctly
        return (json.data || []).map((m: any) => ({
            ...m,
            url: m.url || m.listing_url || null,
        }));
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Scraper API timed out after ${SCRAPER_TIMEOUT_MS / 1000}s`);
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

// ---------------------------------------------------------------------------
// Core job processor
// BullMQ calls this for every dequeued job. Throwing here triggers a retry.
// ---------------------------------------------------------------------------
async function processAlertJob(job: Job<AlertJobData>): Promise<void> {
    const { alertId, dealerEmail, dealerName, frequency, lastRun } = job.data;

    log('INFO', job.id, `Starting — alert #${alertId} (${job.data.make} ${job.data.model}, ${job.data.region})`);

    // ------------------------------------------------------------------
    // Idempotency / cooldown check
    // Re-read lastRun from DB at processing time — a duplicate job that
    // was enqueued before the previous one finished will see the updated
    // lastRun and exit early, preventing duplicate emails.
    // ------------------------------------------------------------------
    const freshAlert = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!freshAlert) {
        log('WARN', job.id, `Alert #${alertId} no longer exists — skipping`);
        return;
    }

    const freshLastRun = freshAlert.lastRun ? freshAlert.lastRun.toISOString() : null;
    if (isWithinCooldown(freshAlert.frequency, freshLastRun)) {
        log('INFO', job.id, `Alert #${alertId} is within cooldown (freq=${freshAlert.frequency}, lastRun=${freshLastRun}) — skipping`);
        return;
    }

    // ------------------------------------------------------------------
    // 1. Internal DB listings
    // ------------------------------------------------------------------
    const internalMatches = await prisma.listing.findMany({
        where: {
            make: { contains: freshAlert.make },
            model: { contains: freshAlert.model },
            region: listingRegionWhere(freshAlert.region),
            status: 'ACTIVE',
            ...(freshAlert.yearMin ? { year: { gte: freshAlert.yearMin } } : {}),
            ...(freshAlert.yearMax ? { year: { lte: freshAlert.yearMax } } : {}),
        },
        include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
        },
        take: 5,
    });

    log('INFO', job.id, `Internal matches: ${internalMatches.length}`);

    // ------------------------------------------------------------------
    // 2. External scraper listings (with 10s timeout)
    // ------------------------------------------------------------------
    let scraperMatches: any[] = [];
    try {
        scraperMatches = await fetchScraperMatches(job.data);
        log('INFO', job.id, `Scraper matches: ${scraperMatches.length}`);
    } catch (err: any) {
        // Scraper failure is non-fatal — we still send internal matches
        log('WARN', job.id, `Scraper error (non-fatal): ${err.message}`);
    }

    const allMatches = [...internalMatches, ...scraperMatches];

    if (allMatches.length === 0) {
        log('INFO', job.id, `No matches — skipping email, lastRun not updated`);
        return;
    }

    // ------------------------------------------------------------------
    // 3. Notify (cap at 10 results)
    // Dealer-owned alerts (legacy): email + push to the dealer.
    // Admin-owned alerts (dealerId null): email the admin address if
    // configured (ADMIN_ALERT_EMAIL), otherwise matches are simply
    // available in the admin panel under /admin/alerts/<id>/results.
    // ------------------------------------------------------------------
    if (freshAlert.dealerId && dealerEmail) {
        await sendAlertNotificationEmail(
            dealerEmail,
            dealerName ?? 'Dealer',
            freshAlert,
            allMatches.slice(0, 10),
        );

        await sendPushToDealer(freshAlert.dealerId, {
            title: `Car alert: ${allMatches.length} matches`,
            body: `${allMatches.length} listings found for ${freshAlert.make} ${freshAlert.model} in ${freshAlert.region}.`,
            url: `/dashboard`,
            tag: `alert-${alertId}`,
        }).catch((err) => {
            log('WARN', job.id, `Push notification failed (non-fatal): ${err.message}`);
        });
    } else if (process.env.ADMIN_ALERT_EMAIL) {
        await sendAlertNotificationEmail(
            process.env.ADMIN_ALERT_EMAIL,
            'Admin',
            freshAlert,
            allMatches.slice(0, 10),
        );
    } else {
        log('INFO', job.id, `Admin alert #${alertId}: ${allMatches.length} matches found (no ADMIN_ALERT_EMAIL configured — view in admin panel)`);
    }

    // ------------------------------------------------------------------
    // 4. Stamp lastRun — only after successful email send
    // ------------------------------------------------------------------
    await prisma.alert.update({
        where: { id: alertId },
        data: { lastRun: new Date() },
    });

    log('INFO', job.id, `Done — sent email with ${Math.min(allMatches.length, 10)} matches`);
}

// ---------------------------------------------------------------------------
// Worker factory — exported so start-worker.ts can instantiate it
// Concurrency = 5: process up to 5 alert jobs simultaneously
// ---------------------------------------------------------------------------
export function createAlertWorker() {
    const worker = new Worker<AlertJobData>(
        'alerts',
        processAlertJob,
        {
            connection: redisConnection,
            concurrency: 5,
        },
    );

    worker.on('completed', (job) => {
        log('INFO', job.id, `Completed successfully`);
    });

    worker.on('failed', (job, err) => {
        log('ERROR', job?.id, `Failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}): ${err.message}`);
    });

    worker.on('error', (err) => {
        log('ERROR', undefined, `Worker error: ${err.message}`);
    });

    return worker;
}
