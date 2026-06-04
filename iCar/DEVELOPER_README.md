# iCar — Developer Guide (Existing Project)

This document describes **how the current iCar application is built** so you can extend it safely (e.g., auctions, partner roles). For environment setup, see the repo root [`SETUP.md`](../SETUP.md). For planned changes, see [`docs/CHANGE_REQUIREMENTS.md`](../docs/CHANGE_REQUIREMENTS.md).

---

## Quick answers

| Question | Answer |
|----------|--------|
| **Routing** | **App Router only** — `src/app/`. There is **no** `pages/` directory. |
| **Database** | MySQL/MariaDB via **Prisma** (`prisma/schema.prisma`) |
| **Auth** | **JWT in httpOnly cookies** (`jose`), separate cookies for admin vs dealer |
| **API auth** | `/api/*` **bypasses middleware** — each route calls `getAdminSession()` / `getDealerSession()` |
| **Background jobs** | **BullMQ + Redis** — alert scraping/notifications |
| **Valuation** | OpenRouter (Gemini) in `/api/dealer/evaluate` |

---

## Repository layout

```
iCar/                          ← monorepo root
├── SETUP.md                   ← install & run (DB, Redis, worker, scraper)
├── docs/
│   └── CHANGE_REQUIREMENTS.md
├── scrapper/                  ← Python FastAPI scraper (port 8000)
└── iCar/                      ← Next.js application (this folder)
    ├── prisma/
    │   ├── schema.prisma      ← ★ SOURCE OF TRUTH for data model
    │   └── migrations/
    ├── src/
    │   ├── app/               ← App Router (pages + API routes)
    │   ├── lib/               ← auth, db, queue, worker, mail
    │   ├── middleware.ts      ← page-level route protection
    │   ├── components/
    │   └── scripts/           ← worker + cron enqueue
    ├── public/
    └── DEVELOPER_README.md    ← this file
```

---

## 1. Database — `prisma/schema.prisma` (most important)

**Path:** `iCar/prisma/schema.prisma`  
**Client:** `src/lib/db.ts` — singleton `PrismaClient` with `@prisma/adapter-mariadb` and `DATABASE_URL`.

### Entity relationship (logical)

```
User (admin)
Dealer ──┬── Listing ─── ListingImage
         └── Alert

CarMake ── CarModel ── CarVariant
```

### Models summary

| Model | Primary key | Purpose |
|-------|-------------|---------|
| **User** | `Int` autoincrement | Admin users (`username`, `password`, `role` default `"admin"`) |
| **Dealer** | `Int` autoincrement | Dealer accounts; `approvalStatus`: `pending` \| `approved` \| `rejected` |
| **Listing** | `String` cuid | Dealer inventory; `status`: `DRAFT` \| `ACTIVE` \| `SOLD` \| `EXPIRED` |
| **ListingImage** | `String` cuid | Image `url` under `public/uploads/listings/` |
| **Alert** | `Int` autoincrement | Dealer market-watch criteria; `frequency`, `enabled`, `lastRun` |
| **CarMake / CarModel / CarVariant** | `Int` | Taxonomy for dropdowns (admin-managed) |

### Dealer approval (critical for login)

```prisma
approvalStatus String @default("pending") // pending, approved, rejected
```

- Signup sets `pending`.
- Login API returns **403** if not `approved`.
- Admin updates via `POST /api/admin/dealers/updateStatus`.

### Listing fields worth noting

- `features` — JSON array stored as **TEXT** (stringified in app).
- `condition` — `NEW`, `USED`, `CERTIFIED`.
- `region` — e.g. `UAE`, `Lebanon`, `Europe`.
- Cascade delete: deleting `Dealer` removes `Listing` and `Alert`.

### Migrations

```bash
cd iCar
npx prisma generate
npx prisma migrate deploy   # production / existing DB
# or: npx prisma db push    # dev only
```

Migration history:

| Migration | Adds |
|-----------|------|
| `20260210182843_init_users` | `User` |
| `20260211155212_init_dealer_table` | `Dealer` |
| `20260212165143_add_listing_models` | `Listing`, `ListingImage` |
| `20260218202412_rename_image_data_to_url` | `ListingImage.url` |

---

## 2. Authentication — `src/lib/auth.ts`

**Library:** `jose` (`SignJWT` / `jwtVerify`, HS256)  
**Secret:** `process.env.JWT_SECRET` (fallback `'secret'` — set in production)  
**Session TTL:** 24 hours

### Cookies

| Role | Cookie name | Payload `type` |
|------|-------------|----------------|
| Admin | `admin-session` | `'admin'` |
| Dealer | `dealer-session` | `'dealer'` |

### Session payload shape

```ts
{
  user: AdminData | DealerData,
  type: 'admin' | 'dealer',
  expires: Date
}
```

**Admin `user`:** `{ id, username, role }`  
**Dealer `user`:** `{ id, email, dealershipName }`

### Public API surface

| Function | Use |
|----------|-----|
| `loginAdmin` / `logoutAdmin` / `getAdminSession` / `updateAdminSession` | Admin |
| `loginDealer` / `logoutDealer` / `getDealerSession` / `updateDealerSession` | Dealer |
| `login` / `logout` / `getSession` | **Legacy aliases → admin only** |

### Password hashing

- **bcryptjs** in API routes (cost factor 10 on signup).

---

## 3. Middleware — `src/middleware.ts`

Protects **page routes only**. **`/api/*` is not protected here** — handlers must check sessions themselves.

### Flow

```
Request
  ├─ static / images / uploads / api/webhook → pass
  ├─ /api/* → pass (no middleware auth)
  ├─ /admin/* or /api/admin/* → admin session
  │     ├─ not logged in & not /admin/login → redirect /admin/login
  │     └─ logged in & on /admin/login → redirect /admin
  └─ everything else → dealer session
        ├─ public: /, /login, /signup, /forgot-password
        ├─ not logged in & not public → redirect /login
        └─ logged in & on public auth pages → redirect /dashboard
```

### Public dealer pages (whitelist)

`/`, `/login`, `/signup`, `/forgot-password`

### Matcher

Excludes `_next/static`, `_next/image`, `favicon.ico`, `images`, `uploads`.

**Implication for new roles (e.g. Partner):** add a new middleware branch + cookie + public paths, or extend this file — do not rely on middleware for API security.

---

## 4. Next.js routing — App Router only

**There is no `pages/` directory.** All UI and API routes live under `src/app/`.

### Route groups (UI)

| Path prefix | Group | Auth |
|-------------|-------|------|
| `/` | `app/page.tsx` | Public landing |
| `/login`, `/signup` | `(dealer)/(auth)/` | Public |
| `/dashboard`, `/list-vehicle`, `/alerts`, … | `(dealer)/(portal)/` | Dealer (middleware) |
| `/admin/login` | `admin/(auth)/` | Public |
| `/admin`, `/admin/dealers`, … | `admin/(dashboard)/` | Admin (middleware) |

### API routes (Route Handlers)

Pattern: `src/app/api/<area>/<resource>/route.ts`

| Area | Example |
|------|---------|
| `api/admin/*` | `auth/login`, `getDealers`, `dealers/updateStatus`, `getListings`, `taxonomy/*` |
| `api/dealer/*` | `auth/login`, `auth/signup`, `listings`, `alerts`, `evaluate`, `profile` |
| `api/taxonomy/*` | Public read: makes, models, variants |

---

## 5. Dealer auth API

| Method | Route | File |
|--------|-------|------|
| POST | `/api/dealer/auth/signup` | `src/app/api/dealer/auth/signup/route.ts` |
| POST | `/api/dealer/auth/login` | `src/app/api/dealer/auth/login/route.ts` |
| POST | `/api/dealer/auth/logout` | `src/app/api/dealer/auth/logout/route.ts` |

### Signup behavior

- Required: `email`, `password`, `dealershipName`, `contactPerson`, `phoneNumber`
- Optional: `address`, `city`, `country`
- Creates dealer with `approvalStatus: 'pending'`
- Does **not** log in automatically

### Login behavior

- Validates bcrypt password
- **Blocks** if `approvalStatus !== 'approved'` (403)
- Sets `dealer-session` via `loginDealer()`

### UI

- Login: `src/app/(dealer)/(auth)/login/page.tsx`
- Signup: `src/app/(dealer)/(auth)/signup/page.tsx`

---

## 6. Admin auth API

| Method | Route | File |
|--------|-------|------|
| POST | `/api/admin/auth/login` | `src/app/api/admin/auth/login/route.ts` |
| POST | `/api/admin/auth/logout` | `src/app/api/admin/auth/logout/route.ts` |

- Uses `User` table (`username` + `password`)
- Calls legacy `login()` → `loginAdmin()`
- UI: `src/app/admin/(auth)/login/page.tsx`

---

## 7. Admin dealer approval

### API

| Method | Route | File |
|--------|-------|------|
| POST | `/api/admin/dealers/updateStatus` | `src/app/api/admin/dealers/updateStatus/route.ts` |

**Body:** `{ dealerId: number, status: "approved" | "rejected" }`  
**Auth:** `getAdminSession()` required  
**Side effects:** sends approval/rejection email via `src/lib/mail.ts`

### List dealers API

| Method | Route | File |
|--------|-------|------|
| GET | `/api/admin/getDealers` | `src/app/api/admin/getDealers/route.tsx` |

### UI

| Page | Path |
|------|------|
| Authenticate dealers | `src/app/admin/(dashboard)/authenticate-dealers/page.tsx` |
| Dealers list | `src/app/admin/(dashboard)/dealers/page.tsx` |

**Pattern to copy for Partner approval:** same flow as dealer — pending status, admin page, `updateStatus` API, optional email.

---

## 8. Vehicle evaluation — `/api/dealer/evaluate`

**File:** `src/app/api/dealer/evaluate/route.ts`  
**Auth:** `getDealerSession()` — dealer only today

### Request (POST JSON)

| Field | Required | Notes |
|-------|----------|-------|
| `region` | Yes | Market context |
| `make`, `model`, `year`, `mileage` | Yes | |
| `variant`, `specs`, `notes` | No | |
| `images` | Yes | Array of 1–5 base64 `data:` URLs |

### Backend

- **LLM:** OpenRouter → `google/gemini-2.0-flash-001`
- **Env:** `LLM_API_KEY`
- Large `VALUATION_SYSTEM_PROMPT` — markdown report with Summary + 3 price ranges

### Response

```json
{
  "status": "ok",
  "region": "...",
  "currency": "AED",
  "markdown": "## Summary\n..."
}
```

### UI consumer

- `src/app/(dealer)/(portal)/list-vehicle/page.tsx` — Step 1 valuation, then listing

**For Partner role:** extract shared valuation service; add `getPartnerSession()` + `/api/partner/evaluate` without duplicating prompt logic.

---

## 9. Notifications & BullMQ worker

Alerts are **implemented**. Auction notifications would likely extend this pattern.

### Components

| File | Role |
|------|------|
| `src/lib/queue.ts` | Redis connection, `alertQueue`, `AlertJobData` type |
| `src/lib/alert-worker.ts` | BullMQ `Worker` — scrape, email, update `lastRun` |
| `src/scripts/cron-push-alerts.ts` | Enqueues one job per enabled alert (run every 5 min) |
| `src/scripts/start-worker.ts` | Starts worker + Bull Board on port **3001** |
| `src/lib/mail.ts` | SMTP emails (alerts, dealer approval) |

### npm scripts

```bash
npm run worker        # long-running: worker + Bull Board UI
npm run push:alerts   # manual enqueue (same as cron)
```

### Job flow

```
cron-push-alerts.ts
  → prisma.alert.findMany({ enabled: true })
  → alertQueue.add(...) per alert

alert-worker.ts
  → cooldown check (every5min / daily / weekly / monthly)
  → POST http://localhost:8000/api/scrape (Python scraper)
  → sendAlertNotificationEmail(dealer)
  → update alert.lastRun
```

### Env vars

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | BullMQ (default `redis://127.0.0.1:6379`) |
| `SCRAPER_API_KEY` | Header for scraper API |
| `SMTP_*` | Email |
| `BULL_BOARD_PORT` | Default `3001` |

### Dashboards

- Bull Board: `http://localhost:3001/admin/queues`
- Health: `http://localhost:3001/health`
- Logs: `iCar/logs/alert-worker.log`, `logs/cron-push.log`

### Dealer alert CRUD

| Method | Route |
|--------|-------|
| GET/POST | `/api/dealer/alerts` |
| PATCH/DELETE | `/api/dealer/alerts/[id]` |
| GET | `/api/dealer/alerts/[id]/results` |

UI: `src/app/(dealer)/(portal)/alerts/page.tsx`

---

## 10. Other notable dealer APIs

| Route | Purpose |
|-------|---------|
| `/api/dealer/listings` | CRUD listings |
| `/api/dealer/listings/[id]` | Single listing |
| `/api/dealer/profile` | Dealer profile |
| `/api/dealer/getDealer` | Current dealer info |
| `/api/dealer/search` | Search helpers |

---

## 11. Environment variables (`.env`)

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | Prisma |
| `JWT_SECRET` | Auth cookies |
| `REDIS_URL` | BullMQ |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Mail |
| `NEXT_PUBLIC_APP_URL` | Links in emails / OpenRouter referer |
| `LLM_API_KEY` | Valuation |
| `SCRAPER_API_KEY` | Alert worker → Python scraper |

---

## 12. Extending the project (checklist)

When adding **Auctions** or **Partner (insurance/bank)** roles:

1. **Update `prisma/schema.prisma`** — new models + relations + migrations.
2. **Extend `src/lib/auth.ts`** — new cookie, `type`, login/get/update session helpers.
3. **Update `src/middleware.ts`** — new route prefixes and public pages.
4. **Add API routes** under `src/app/api/<role>/` — always call session helpers in handlers.
5. **Reuse patterns:**
   - Dealer approval → Partner approval
   - `evaluate` route → shared valuation module
   - Alert queue → optional auction notification queue
6. **Do not mix** `pages/` router — stay in `app/` only.

---

## 13. Key file index

| Topic | Path |
|-------|------|
| **Schema** | `prisma/schema.prisma` |
| **DB client** | `src/lib/db.ts` |
| **Auth** | `src/lib/auth.ts` |
| **Middleware** | `src/middleware.ts` |
| **Dealer login** | `src/app/api/dealer/auth/login/route.ts` |
| **Dealer signup** | `src/app/api/dealer/auth/signup/route.ts` |
| **Admin login** | `src/app/api/admin/auth/login/route.ts` |
| **Dealer approval API** | `src/app/api/admin/dealers/updateStatus/route.ts` |
| **Dealer approval UI** | `src/app/admin/(dashboard)/authenticate-dealers/page.tsx` |
| **Valuation API** | `src/app/api/dealer/evaluate/route.ts` |
| **Queue** | `src/lib/queue.ts` |
| **Worker** | `src/lib/alert-worker.ts` |
| **Start worker** | `src/scripts/start-worker.ts` |
| **Cron enqueue** | `src/scripts/cron-push-alerts.ts` |
| **Root layout** | `src/app/layout.tsx` |
| **Landing** | `src/app/page.tsx` |

---

## 14. Related docs

- [`../SETUP.md`](../SETUP.md) — run locally (MariaDB, Redis, scraper, worker)
- [`../docs/CHANGE_REQUIREMENTS.md`](../docs/CHANGE_REQUIREMENTS.md) — auction & partner CRD

---

*Last updated: April 2026 — reflects codebase as implemented in the iCar Next.js app.*
