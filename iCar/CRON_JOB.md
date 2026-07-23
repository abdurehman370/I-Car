# CarQ Alert System — How It Works

## Overview

The alert system automatically notifies dealers by email when car listings matching their saved criteria are found. It uses **BullMQ** (Redis-backed job queue) for scalable, concurrent, and reliable processing.

---

## Architecture

```
Linux Cron (every 5 min)
        │
        ▼
src/scripts/cron-push-alerts.ts
  └── Reads all alerts from DB
  └── Pushes 1 job per alert → Redis "alerts" queue
  └── Exits immediately
        │
        ▼
Redis Queue ("alerts")
        │
        ▼
src/scripts/start-worker.ts  ←  long-running process (npm run worker)
  └── src/lib/alert-worker.ts (concurrency=5, 3 retries, exponential backoff)
        │
        ├── 1. Re-read alert from DB (idempotency check)
        ├── 2. Check frequency cooldown → skip if too soon
        ├── 3. Search internal DB listings (Prisma)
        ├── 4. Call Python scraper API (localhost:8000, 120s timeout)
        ├── 5. Merge results
        ├── 6. If matches → send email (Nodemailer/Gmail SMTP)
        └── 7. Update alert.lastRun in DB
```

---

## Cron Entry

```
*/5 * * * * cd /home/abdurehman/Desktop/iCar/iCar && /home/abdurehman/.nvm/versions/node/v20.20.0/bin/node node_modules/.bin/tsx src/scripts/cron-push-alerts.ts >> logs/cron-push.log 2>&1
```

| Part | Meaning |
|------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `cd /home/.../iCar` | Required for relative imports to resolve |
| Absolute `node` path | Cron doesn't load nvm/shell PATH |
| `tsx` | Runs TypeScript directly, no build step |
| `>> logs/cron-push.log` | Appends output to persistent log |

### Auction scheduler cron (optional backup)

The auction status scheduler already runs inside `start-worker.ts` every 30s.
This cron is an optional backup trigger and **must use the same path
convention** as above (project root `/home/abdurehman/Desktop/iCar/iCar`,
absolute nvm `node`):

```
* * * * * cd /home/abdurehman/Desktop/iCar/iCar && /home/abdurehman/.nvm/versions/node/v20.20.0/bin/node node_modules/.bin/tsx src/scripts/cron-push-auctions.ts >> logs/cron-auctions.log 2>&1
```

> Deployment note: `/home/abdurehman/Desktop/iCar/iCar` and the nvm `node`
> path are the single source of truth for cron entries. If you deploy to a
> different location, update this file, `cron-push-alerts.ts`, and
> `cron-push-auctions.ts` together so all three stay in sync.

---

## Files

| File | Purpose |
|------|---------|
| `src/scripts/cron-push-alerts.ts` | Cron script — reads DB, enqueues one job per alert, exits |
| `src/scripts/start-worker.ts` | Long-running worker process + Bull Board UI on port 3001 |
| `src/lib/queue.ts` | Redis connection, `AlertJobData` type, queue config |
| `src/lib/alert-worker.ts` | All job processing logic — cooldown, DB, scraper, email |
| `src/lib/mail.ts` | Nodemailer email templates |
| `src/lib/db.ts` | Prisma client (MariaDB) |

---

## Job Configuration

| Setting | Value |
|---------|-------|
| Queue name | `alerts` |
| Concurrency | 5 jobs in parallel |
| Retries | 3 attempts |
| Backoff | Exponential — 5s, 10s, 20s |
| Scraper timeout | 120 seconds |
| Completed jobs kept | Last 100 |
| Failed jobs kept | Last 200 |

---

## Idempotency

Two mechanisms prevent duplicate emails:

1. **Deterministic job ID** — `alert-<id>-<5min-bucket>`. If cron fires twice in the same window, BullMQ silently ignores the duplicate job.
2. **DB re-read at processing time** — the worker re-reads `lastRun` from the DB before doing any work. If a duplicate job slips through after the first already updated `lastRun`, the cooldown check catches it and skips.

---

## Frequency Cooldowns

| Frequency | Cooldown |
|-----------|----------|
| `every5min` | 5 minutes |
| `daily` | 24 hours |
| `weekly` | 7 days |
| `monthly` | 30 days |

`lastRun` is **only updated when an email is successfully sent**. If no matches are found, the timer does not reset — the alert retries on the next cron tick.

---

## Scraper Sources

The Python scraper at `localhost:8000` runs with 4 uvicorn workers to handle concurrent requests.

| Region | Sources |
|--------|---------|
| UAE | Dubizzle, Dubicars, YallaMotor, Hatla2ee, CarSwitch, CarAbia |
| Lebanon | OLX, Autotrader Lebanon, Wheelers.me |
| Europe | AutoScout24 |

---

## Email

Uses **Nodemailer** with Gmail SMTP (`smtp.gmail.com:587`). Each email contains up to 10 matches with:
- Title, price, year, mileage
- Source badge: **CarQ** (purple) for internal listings, **External** (yellow) for scraper results
- Internal listings link to `APP_URL/listings/[id]`
- External listings link to the original site URL

---

## Environment Variables (`.env`)

```
DATABASE_URL=mysql://...
REDIS_URL=redis://127.0.0.1:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
BULL_BOARD_PORT=3001   # optional, defaults to 3001
```

---

## Running

**Start Redis** (must be running before the worker):
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server   # auto-start on boot
```

**Start the scraper** (must be running for external matches):
```bash
cd /home/abdurehman/Desktop/iCar/scrapper
nohup python app.py >> /home/abdurehman/Desktop/iCar/iCar/logs/scraper.log 2>&1 &
```

**Start the worker** (keep this running permanently):
```bash
npm run worker
```

**Manually push alert jobs** (without waiting for cron):
```bash
npm run push:alerts
```

---

## Monitoring

**Bull Board UI** — visual job dashboard:
```
http://localhost:3001/admin/queues
```

**Health check:**
```
http://localhost:3001/health
```

**Log files** (all in `logs/`):
```bash
tail -f logs/alert-worker.log   # worker job processing
tail -f logs/cron-push.log      # cron enqueue runs
tail -f logs/scraper.log        # Python scraper output
```

**Manage cron:**
```bash
crontab -l        # view
crontab -e        # edit
```
