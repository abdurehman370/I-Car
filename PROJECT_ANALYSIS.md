# iCar Project — Full Analysis

This document describes how the **iCar** project works, how the **scraper** works, and how iCar uses the scraper.

---

## 1. Project Overview

The repo contains two main parts:

| Part | Tech | Purpose |
|------|------|---------|
| **iCar** | Next.js 14 (App Router), Prisma, MySQL | Dealer portal: auth, list vehicles, get valuations, manage listings |
| **scrapper** | Python, FastAPI, uvicorn | Backend API: scrape car listings and compute valuations for UAE, Lebanon, Europe |

- **iCar** is the frontend and business logic (dealers sign up, log in, list cars).
- **scrapper** is the data/valuation service: it talks to external car listing sources and returns listings + price stats.
- iCar calls the scrapper only for **valuation** when a dealer is listing a vehicle (`POST /api/evaluate`). Listing creation and storage are done entirely in iCar (Next.js API + DB).

---

## 2. How the Scraper Works

The scraper lives under `scrapper/`. It does **not** use a browser or HTML scraping for UAE/Lebanon; it uses **APIs** (and for Europe, HTML via requests + optional proxy).

### 2.1 Entry Points

- **CLI (standalone):** `scrapper/scraper.py`  
  - Uses `DubizzleScraper` + `DubizzleClient` only (UAE).  
  - Builds Algolia payloads via `QueryBuilder`, paginates, exports JSON/CSV.  
  - No direct use from iCar.

- **HTTP API (used by iCar):** `scrapper/app.py`  
  - FastAPI app on port **8000**.  
  - Two main endpoints:
    - `POST /api/scrape` — scrape listings with filters (region, make, model, year, mileage, etc.).
    - `POST /api/evaluate` — **valuation only**: same filters + vehicle year/mileage; returns estimated value and price range.

iCar uses **only** `POST /api/evaluate`.

### 2.2 Region Clients (Data Sources)

The API selects the client by `region` (and for Europe, `country`):

| Region   | Client            | Data source        | Method |
|----------|-------------------|--------------------|--------|
| UAE      | `DubizzleClient`  | Dubizzle (Algolia) | REST API (Algolia search) |
| Lebanon  | `OlxLbClient`     | OLX Lebanon        | REST API (Elasticsearch: `search.mena.sector.run`) |
| Lebanon  | `OpenSooqLbClient`| OpenSooq Lebanon (lb.opensooq.com) | HTML scraping |
| Lebanon  | `AutotraderLbClient` | Autotrader Lebanon (autotrader.com.lb) | HTML scraping (best-effort; site may be slow/JS-heavy) |
| Lebanon  | `AutobeebLbClient` | AutoBeeb (autobeeb.com, Lebanon cars) | HTML scraping |
| Europe   | `EuropeClient`    | AutoScout24        | HTTP GET + HTML parsing (BeautifulSoup); optional Scrape.do proxy |

- **UAE (`dubizzle_client.py`):**  
  - Uses Algolia: `ALGOLIA_BASE_URL`, app id and API key in `config.py`.  
  - `QueryBuilder.build_payload()` builds the search (category path, query, numeric filters for year, mileage, price).  
  - Returns raw “hits”; `Exporter.format_listing()` normalizes to a common shape (title, price, year, mileage, location, listing_url, image_url).

- **Lebanon (multiple sources, aggregated):**  
  - **OLX (`olx_lb_client.py`):** Elasticsearch at `https://search.mena.sector.run`, index `olx-lb*`; bool query, pagination; normalizes to common listing format.  
  - **OpenSooq (`opensooq_lb_client.py`):** [OpenSooq Lebanon](https://lb.opensooq.com/en) cars-for-sale; HTML scraping (BeautifulSoup), optional make in path, pagination.  
  - **Autotrader (`autotrader_lb_client.py`):** [Autotrader Lebanon](https://www.autotrader.com.lb/); HTML scraping (best-effort; site may timeout or be JS-heavy).  
  - **AutoBeeb (`autobeeb_lb_client.py`):** [AutoBeeb](https://autobeeb.com/) Lebanon cars; HTML scraping, pagination via `pagenum`.  
  - For both **scrape** and **evaluate**, the API runs all four clients and merges results, then runs `PriceEvaluator` on the combined list.

- **Europe (`europe_client.py`):**  
  - Builds an AutoScout24 URL per country (e.g. `https://www.autoscout24.de/lst/volkswagen/golf`).  
  - Optional: body style (e.g. estate), year, mileage, page.  
  - If `SCRAPE_DO_TOKEN` is set, the request goes via `https://api.scrape.do?token=...&url=...`; otherwise direct GET.  
  - Parses HTML with BeautifulSoup (e.g. `ListItemTitle_*`, price, pills for year/km, seller address).  
  - Returns the same normalized listing structure (currency EUR).

So: **UAE and Lebanon = API clients; Europe = HTML scraper** (with optional proxy).

### 2.3 Filters and Query Building

- **UAE:** `filters.py` → `QueryBuilder.build_params()` / `build_payload()`.  
  - Category path like `motors/used-cars/{make}/{model}`, query text, numeric filters (year, kilometers, price).  
  - Used by both the CLI scraper and the FastAPI app.

- **Lebanon / Europe:** filters are plain dicts (make, model, variant, year_min, year_max, mileage_max, price_min, price_max, and for Europe `country`).  
  - No shared `QueryBuilder`; each client builds its own request.

### 2.4 Valuation Logic

- **UAE & Lebanon:** `evaluator.py` → `PriceEvaluator.calculate_stats()` and `PriceEvaluator.calculate_valuation()`.  
  - Stats: from listing prices, exclude very low (e.g. &lt; 500), then IQR-based outlier removal; compute min, max, average, median, counts.  
  - Valuation: median as base; “expected” mileage = (current_year - vehicle_year) × 15,000 km; penalty for over-mileage (e.g. 0.05 per km over expected); `estimated_price = median - penalty`.

- **Europe:** `EuropeClient.calculate_valuation()` in `europe_client.py`.  
  - Same idea: median (and mean, min, max) from listing prices; penalty for over-mileage (e.g. 0.03 per km); `estimated_price = median - penalty`.

So the **scraper** is responsible for:  
1) Fetching listings from the right region/country,  
2) Normalizing them,  
3) Computing stats and estimated value.  
It does **not** store listings in any DB; it returns them in the API response.

### 2.5 Exporter

- `exporter.py`: `Exporter.format_listing()` normalizes Algolia hits (UAE) to the same schema as Lebanon/Europe.  
- Also has `save_to_json` / `save_to_csv` used by the CLI, not by the FastAPI app.

### 2.6 Config

- `config.py`: Algolia keys and URLs, indexes, region config (currency, API type, OLX/AutoScout URLs, Europe countries and Scrape.do token from env).

---

## 3. How iCar Uses the Scraper

iCar uses the scraper **only for the valuation step** when a dealer lists a vehicle. No other feature calls the scraper.

### 3.1 Where It’s Used

- **File:** `iCar/src/app/(dealer)/(portal)/list-vehicle/page.tsx`  
- **Flow:** “List Your Vehicle” is a two-step form:
  - **Step 1 – Vehicle valuation:** Dealer enters region (UAE / Lebanon / Europe), optionally country (Europe), make, model, year, mileage, variant. On “Get Valuation”, the frontend calls the scraper.  
  - **Step 2 – Listing details:** Price (pre-filled from valuation if available), condition, city, description, features, images. Submit goes to iCar’s own API, not the scraper.

### 3.2 Valuation API Call

- **URL:** `http://localhost:8000/api/evaluate` (hardcoded).  
- **Method:** POST, `Content-Type: application/json`.  
- **Body (from list-vehicle page):**
  - `region`, `make`, `model`, `year`, `mileage` (required)  
  - `variant` (optional)  
  - `country` (optional, only when region is Europe)

No auth; CORS in the scraper allows `http://localhost:3000` (Next.js dev).

### 3.3 What iCar Does With the Response

- On success, the UI shows:
  - Estimated value (from `valuation.estimated_valuation`)
  - Price range (`valuation.price_range.min` / `max`)
  - Currency from the response
- The **price** field in the form is pre-filled with `Math.round(valuation.estimated_valuation)` so the dealer can publish with one click or adjust.
- If the request fails (network or 5xx), the user sees a message like “Failed to connect to valuation service. Please ensure the Python API is running.”

So: **iCar does not store scraper results**. It only uses them to suggest a price and show a range on the “List Vehicle” page.

### 3.4 Listing Creation (No Scraper)

- Submitting the listing (Step 2) calls **iCar’s** `POST /api/dealer/listings` (`iCar/src/app/api/dealer/listings/route.ts`).  
- That API:
  - Authenticates the dealer (session).
  - Validates make, model, year, mileage, price, description, condition, city, region, status (DRAFT/ACTIVE).
  - Creates a `Listing` (and optionally `ListingImage`s) in MySQL via Prisma.  
- No call to the scraper here; listings are entirely internal to iCar.

---

## 4. End-to-End Data Flow

```
[Dealer] → iCar (Next.js) List Vehicle page
                ↓
         Step 1: Enter region, make, model, year, mileage (and country if Europe)
                ↓
         Click "Get Valuation"
                ↓
         Browser → POST http://localhost:8000/api/evaluate (scrapper)
                ↓
         scrapper/app.py → region → DubizzleClient | OlxLbClient | EuropeClient
                ↓
         Client fetches listings (Algolia / ES / AutoScout24 HTML)
                ↓
         Normalize listings → PriceEvaluator or EuropeClient.calculate_valuation
                ↓
         Response: { status, region, currency, valuation: { estimated_valuation, price_range, ... } }
                ↓
         iCar shows value + range and pre-fills price field
                ↓
         Step 2: Dealer fills description, city, images, etc. → "Publish" or "Save Draft"
                ↓
         Browser → POST /api/dealer/listings (iCar Next.js API)
                ↓
         Prisma → MySQL (Listing + ListingImage). No scraper involved.
```

---

## 5. Summary Table

| Topic | Detail |
|-------|--------|
| **What the scraper does** | Fetches car listings from UAE (Dubizzle/Algolia), Lebanon (OLX/ES), Europe (AutoScout24 HTML); normalizes them; computes price stats and estimated valuation. |
| **How UAE/Lebanon “scrape”** | REST APIs (Algolia, Elasticsearch), not browser or HTML scraping. |
| **How Europe scrapes** | HTTP GET to AutoScout24, HTML parsed with BeautifulSoup; optional Scrape.do proxy. |
| **What iCar uses** | Only `POST /api/evaluate` for the “Get Valuation” button on the List Vehicle page. |
| **Scraper URL in iCar** | Hardcoded `http://localhost:8000`. Scraper must be running (e.g. `uvicorn` on 8000) for valuation to work. |
| **Where listings are stored** | In iCar’s MySQL DB (Prisma `Listing` / `ListingImage`). The scraper does not persist data. |

---

## 6. Recommendations (Optional)

- **Environment variable for scraper URL** in iCar (e.g. `NEXT_PUBLIC_VALUATION_API_URL` or server-side `VALUATION_API_URL`) so production can point to a deployed scraper.
- **Error handling:** Differentiate “scraper not running” vs “no listings found” vs “scraper error” so the UI can show clearer messages.
- **Security:** If the scraper is ever exposed, consider API key or internal-only network; CORS is already restricted to localhost in the snippet you have.
- **Europe:** Ensure `SCRAPE_DO_TOKEN` is set in the scraper environment when using Europe from regions that need the proxy.

This is how the project is structured and how the scraper and iCar work together end to end.
