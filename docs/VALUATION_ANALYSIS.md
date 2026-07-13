# Car Price Evaluation — Full Technical Analysis

How CarQ's AI price evaluation works end-to-end: architecture, every component's implementation, the exact prompts, web search configuration, caching, and output validation.

---

## 1. High-Level Architecture

```
Dealer / Partner
      │
      ▼
CarValuationForm  (src/components/dealer/CarValuationForm.tsx)
  /vehicle-valuation (dealer, full listing mode)
  /car-valuation     (partner, quick mode)
      │  POST
      ▼
/api/dealer/evaluate  (src/app/api/dealer/evaluate/route.ts)
  - requireValuationSession()  → dealers + banking partners only
  - normalize & validate payload
      │
      ▼
evaluateVehicleWithAI()  (src/lib/valuation/openaiValuation.ts)
      │
      ├─ 1. Redis cache lookup  (cache.ts) ──── hit ──► return cached (cacheHit: true)
      │
      ├─ 2. OpenAI Responses API call
      │       model: OPENAI_VALUATION_MODEL (default gpt-5.4-2026-03-05)
      │       instructions: GLOBAL + REGION + OUTPUT prompts
      │       tools: web_search (required, high context, domain-filtered)
      │       output: strict JSON schema
      │
      ├─ 3. Validate (Zod) → retry once with correction prompt on failure
      │
      ├─ 4. Extract sources, usage, cost → build markdown → cache result
      │
      ▼
Response: { valuation, markdown, sources, usage, meta }
```

**Important:** the Python scraper's statistical evaluator (`scrapper/evaluator.py`, IQR outlier
filtering + 0.05/km over-mileage penalty) is a **separate system**. It powers Market Search and
Alerts but is NOT part of this valuation flow. Pricing here is done entirely by OpenAI with live
web search.

---

## 2. Entry Point — `/api/dealer/evaluate`

File: `src/app/api/dealer/evaluate/route.ts`

- **Auth:** `requireValuationSession()` — allows Car Dealer and banking-partner roles
  (`canAccessValuation()` in `src/lib/portal-access.ts`).
- **Payload normalization:**
  - `region` must be one of `LEBANON | UAE | EUROPE` (uppercased).
  - `year`: integer, 1900 ≤ year ≤ current year + 2.
  - Mileage: exact `mileage` (listing mode) or `mileageMin`/`mileageMax` band (quick mode).
  - Images: must be `data:image/(png|jpe?g|webp);base64,...` data URLs; max 5.
- **Modes:**
  - `quick` / `partner` — mileage range allowed, images ignored, result cacheable.
  - `listing` — exact mileage required, 1–5 photos supported, photo results not cached.
- **API key check:** `OPEN_AI_KEY` or `OPENAI_API_KEY` env var must be present.
- Delegates everything to `evaluateVehicleWithAI(payload)`.

---

## 3. The Valuation Engine — `evaluateVehicleWithAI()`

File: `src/lib/valuation/openaiValuation.ts`

### 3.1 Cache lookup first
`buildCacheKey()` is computed (see §6); on a Redis hit the cached response is returned
immediately with `meta.cacheHit: true` — zero OpenAI cost.

### 3.2 OpenAI call — Responses API
```ts
openai.responses.create({
  model,                                  // OPENAI_VALUATION_MODEL || 'gpt-5.4-2026-03-05'
  instructions: buildSystemInstructions(region),   // GLOBAL + REGION + OUTPUT RULES
  input: [{ role: 'user', content: dynamicContent }],
  tools: [getWebSearchTool(region)],
  tool_choice: 'required',                // web search is MANDATORY
  include: ['web_search_call.action.sources'],
  text: { format: { type: 'json_schema', name: 'vehicle_valuation_result',
                    strict: true, schema: OPENAI_JSON_SCHEMA } },
  max_output_tokens: 4096,
  temperature: 0.2,
})
```

Key facts:
- Uses the **Responses API** (`openai.responses.create`), not chat completions.
- `tool_choice: 'required'` forces at least one web search per valuation.
  After the call, `responseUsedWebSearch()` re-verifies a search actually ran;
  if not, the request fails with *"Marketplace search could not be completed."*
- **Temperature 0.2** for near-deterministic pricing.
- **Strict JSON schema** output — the model cannot return free text.

### 3.3 User content assembly
`buildDynamicUserText()` produces the user message:

```
Perform valuation for this vehicle using current searched marketplace data.

Region: {REGION}
Make: {make}
Model: {model}
Variant/Trim: {variant | 'Not specified'}
Year: {year}
Mileage: {"X km" | "min-max km" | "Unknown"}
Specs/source: {specs | 'Unknown'}
Condition notes: {notes | 'Average condition assumed'}
Mode: {quick | listing}

Return structured JSON only.
```

In listing mode, up to 5 photos are appended as `input_image` blocks (`detail: 'auto'`).
In quick/partner mode images are skipped entirely.

### 3.4 Validation & retry
- Response text is parsed as JSON and validated with **Zod** (`ValuationResultSchema`).
- On first-attempt validation failure, one retry is made with this correction appended:
  > "Your previous output failed validation. Return valid JSON matching the schema exactly.
  > Keep currencies correct for the region and ensure dealer buy price is lower than market price."
- Second failure → hard error. Web-search-missing errors are not retried.

### 3.5 Post-processing
1. `extractWebSources()` (`sourceExtraction.ts`) walks the response tree for
   `url` / `url_citation` fields → up to 10 `{title, url, domain}` sources.
2. `getUsage()` reads token counts (including cached input tokens).
3. `estimateOpenAICost()` (`cost.ts`) computes USD cost from env-configured prices:
   `OPENAI_INPUT_PRICE_PER_1M`, `OPENAI_CACHED_INPUT_PRICE_PER_1M`,
   `OPENAI_OUTPUT_PRICE_PER_1M`, `OPENAI_WEB_SEARCH_PRICE_PER_CALL` (null if unset).
4. `buildMarkdownFromValuationJson()` (`formatMarkdown.ts`) renders the display markdown
   (currency-aware; AED+USD for UAE, EUR+USD for Europe, USD for Lebanon).
5. Result cached (unless photos were used), then returned.

---

## 4. Web Search Configuration

File: `openaiValuation.ts`, `getWebSearchTool()`

| Region  | Tool | Context | Allowed domains |
|---------|------|---------|-----------------|
| UAE     | `web_search` | `high` | dubizzle.com, dubicars.com, autotraderuae.com, audi-dubai.com, mercedesbenzme.com, altayermotors.com, premier-carcare.com |
| EUROPE  | `web_search` | `high` | mobile.de, autoscout24.com, preowned.ferrari.com |
| LEBANON | `web_search` | `high` | **No filter** — intentionally broad because Lebanese inventory is fragmented across OLX, dealer pages, importer sites, and social media |

- `tool_choice: 'required'` + post-hoc verification = a valuation can never be produced
  from model memory alone.
- Source URLs are captured via `include: ['web_search_call.action.sources']` and returned
  to the frontend for transparency.

---

## 5. The Prompts (verbatim)

Assembled by `buildSystemInstructions(region)` as:
`GLOBAL_PROMPT + "\n\n" + REGION_PROMPT + "\n\n" + STRUCTURED OUTPUT RULES`.

### 5.1 GLOBAL_PROMPT — `src/lib/valuation/prompts/global.ts`

```
You are an expert automotive market analyst specializing in real-time vehicle valuation for dealers.

Your task is to determine TRUE market price and dealer buy price using searched marketplace data.

You must ALWAYS return a price range.

You must use web search for every valuation. Do not answer from memory only.

Use uploaded images only to verify visible condition, color, trim badges, body kit, accident signs, interior condition, wheels, and visible modifications.
Do not use images as price sources.
If images show damage, repaint, heavy wear, missing parts, fake body kit, or trim mismatch, adjust valuation conservatively.

CORE RULE:
Always produce:
1. Market Price
2. Dealer Buy Price

Do NOT return "Insufficient verified comparables."
If exact matches are not available, use the fallback valuation hierarchy.

MILEAGE FALLBACK RULE:
If exact mileage is not available:
- Use the closest available mileage band.
- Adjust price conservatively based on mileage difference.
- 0 km vehicles should be compared first with 0–5,000 km units.
- Low-mileage vehicles should be compared with the closest mileage range available.
- Do not use damaged, salvage, accident, repaired, flood, or urgent-sale listings.

EXCLUDE:
- Accident vehicles
- Salvage vehicles
- Flood vehicles
- Repaired vehicles
- Wrong trim
- Fake Brabus / Mansory / body-kit conversions when the vehicle is genuine certified
- Unverified private listings when dealer/importer/certified comps exist
- Extreme outliers
- Urgent-sale distress listings

DEALER BUY PRICE METHOD:
Dealer buy price must reflect:
- resale margin
- negotiation buffer
- reconditioning risk
- market liquidity
- holding cost
- rarity
- demand in target region
- spec/warranty/source risk
```

### 5.2 UAE_PROMPT — `prompts/uae.ts`

```
Target region: UAE.

Primary currency: AED.
Convert to USD using 1 USD = 3.67 AED.
Show both AED and USD.

Primary sources:
- Dubizzle UAE
- DubiCars
- AutoTrader UAE
- Official UAE dealer inventories
- Verified UAE dealer/importer websites
- Verified UAE dealer social pages only if price is clearly shown

Use UAE marketplace data first.

Strict matching priority:
First search for listings matching:
- Exact model + trim + variant
- Exact year
- Exact mileage
- Exact GCC / non-GCC / import source if provided
- Clean title
- Verified dealer/importer/marketplace listing

Spec/source rule:
- If GCC spec is provided, prioritize GCC only.
- If German / European source is provided, prioritize European import listings in UAE, then use Europe as source anchor if needed.
- If American source is provided, prioritize US import listings in UAE, then use US source anchor if needed.
- If source/spec is not provided, use the most common clean UAE market spec for that vehicle and price conservatively.

Valuation fallback hierarchy:
LEVEL 1 — Exact UAE Match:
Same model, trim, year, mileage, and source/spec.

LEVEL 2 — Closest UAE Match:
Same model, trim, and year, but closest mileage band.

LEVEL 3 — Same Model UAE Match:
Same model and trim, but slightly different mileage, source, or available local year references.
Adjust for year, mileage, and spec.

LEVEL 4 — Local Segment Benchmark:
Use UAE listings for the closest equivalent vehicle segment.
Examples:
- Brabus G700 can be benchmarked against UAE G63 / Brabus / Mansory / G800 / similar high-end G-Class listings.
- Ferrari Portofino can be benchmarked against UAE Ferrari California T / Roma / Portofino listings.
- Lamborghini Urus SE can be benchmarked against UAE Urus S / Performante / SE listings.
- Rolls-Royce Cullinan can be benchmarked against UAE Cullinan / Black Badge / Bentayga / Range Rover SV references.
- GMC Terrain Denali can be benchmarked against UAE GMC Terrain / Acadia / Chevrolet Equinox / similar SUV listings.

LEVEL 5 — Import Source Anchor:
If UAE has no usable rare-car comps, use verified source-market listings that match the vehicle origin/source.
Examples:
- German source car → use Germany / Europe listings as import-value anchor.
- American source car → use US-market source references.
- GCC source car → use closest GCC/UAE references.
Then adjust to UAE using realistic UAE dealer margin, import status, warranty value, demand, depreciation, and liquidity.

Foreign/source-market data is only allowed as fallback when UAE data is too thin.
Final price must represent UAE resale market value, not raw foreign price.

Price range rule:
- Normal vehicles: market spread AED 10,000–20,000
- Luxury vehicles: market spread AED 20,000–50,000
- Exotic / rare vehicles: market spread AED 50,000–100,000 if needed
```

### 5.3 LEBANON_PROMPT — `prompts/lebanon.ts`

```
Target region: Lebanon.

Primary currency: USD.
Use LBP only if explicitly shown in listing.
Do not invent LBP conversion unless provided.

Primary sources:
- OLX Lebanon
- Beirut dealer listings
- Lebanese importer inventories
- Verified Lebanese dealer Facebook / Instagram pages
- Verified local dealer websites

Use Lebanon marketplace data first.

Strict matching priority:
First search for listings matching:
- Exact model + trim + variant
- Exact year
- Exact mileage
- Exact origin/source if provided
- Clean title
- Verified dealer/importer listing

Valuation fallback hierarchy:
LEVEL 1 — Exact Lebanon Match:
Same model, trim, year, mileage, source/origin.

LEVEL 2 — Closest Lebanon Match:
Same model, trim, and year, but closest mileage band.

LEVEL 3 — Same Model Lebanon Match:
Same model and trim, but slightly different mileage or available local year references.
Adjust for year and mileage.

LEVEL 4 — Local Segment Benchmark:
Use Lebanon listings for the closest equivalent vehicle segment.
Examples:
- Brabus G700 can be benchmarked against Lebanon G63 / Brabus / Mansory / similar high-end G-Class listings.
- Ferrari Portofino can be benchmarked against Lebanon Ferrari California T / Roma / Portofino listings.
- Lamborghini Urus SE can be benchmarked against Lebanon Urus S / Performante / SE listings.
- Rolls-Royce Cullinan can be benchmarked against Lebanon Cullinan / Black Badge / Ghost / Bentayga-style ultra-luxury SUV references.
- GMC Terrain Denali can be benchmarked against Lebanon GMC Terrain / Acadia / Chevrolet Equinox / similar American-source SUV listings.

LEVEL 5 — Import Source Anchor:
If Lebanon has no usable rare-car comps, use verified source-market listings that match the vehicle origin/source.
Examples:
- German source car → use Germany / Europe listings as import-value anchor.
- American source car → use US-market source references only if Lebanese comps are weak.
- GCC source car → use UAE / GCC references only if Lebanese comps are weak.
Then adjust to Lebanon using realistic dealer/importer market premium, rarity, taxes/customs exposure, demand, and local liquidity.

Foreign/source-market data is only allowed as fallback when Lebanon data is too thin.
Final price must represent Lebanon resale market value, not raw foreign price.

Price range rule:
- Normal vehicles: market spread USD 2,000–5,000
- Luxury vehicles: market spread USD 5,000–10,000
- Exotic / rare vehicles: market spread USD 10,000–25,000 if needed
```

### 5.4 EUROPE_PROMPT — `prompts/europe.ts`

```
Target region: Europe.

Primary currency: EUR.
Convert to USD using current searched FX rate if available.
If FX rate is unavailable, use a reasonable fixed EUR/USD conversion and keep the range conservative.

Primary sources:
- Mobile.de
- AutoScout24
- Official European dealer inventories
- Verified specialist dealer websites
- Certified pre-owned dealer listings

Use European marketplace data first.

Strict matching priority:
First search for listings matching:
- Exact model + trim + variant
- Exact year
- Exact mileage
- Exact engine/spec/version
- Exact country/source if provided
- Clean title
- Verified dealer/certified marketplace listing

Spec/country rule:
- Prioritize the same European country/source if provided.
- If German source is provided, prioritize Germany listings first.
- If exact country/source is not provided, use broad Europe listings but avoid non-equivalent trims, engines, VAT distortions, and export-only outliers.

Valuation fallback hierarchy:
LEVEL 1 — Exact Europe Match:
Same model, trim, year, mileage, source/country, and engine/spec version.

LEVEL 2 — Closest Europe Match:
Same model, trim, year, and engine/spec version, but closest mileage band.

LEVEL 3 — Same Model Europe Match:
Same model and trim, but slightly different mileage, country, or available year references.
Adjust for year, mileage, VAT display, and country market difference.

LEVEL 4 — European Segment Benchmark:
Use Europe listings for the closest equivalent vehicle segment.
Examples:
- Brabus G700 can be benchmarked against European G63 / Brabus / Mansory / G800 / high-end G-Class listings.
- Ferrari Portofino can be benchmarked against European Ferrari California T / Roma / Portofino listings.
- Lamborghini Urus SE can be benchmarked against European Urus S / Performante / SE listings.
- Rolls-Royce Cullinan can be benchmarked against European Cullinan / Black Badge / Bentayga / Range Rover SV references.
- GMC Terrain Denali can be benchmarked against European equivalent American-import SUVs only if available.

LEVEL 5 — Source-Market Anchor:
If Europe has no usable rare-car comps, use verified source-market listings that match the vehicle origin/source.
Then adjust to Europe using realistic dealer margin, VAT exposure, rarity, demand, depreciation, import/export relevance, and liquidity.

Fallback data is allowed when exact European comps are too thin.
Final price must represent European resale market value, not raw unrelated foreign price.

Price range rule:
- Normal vehicles: market spread EUR 2,000–5,000
- Luxury vehicles: market spread EUR 5,000–15,000
- Exotic / rare vehicles: market spread EUR 10,000–25,000 if needed
```

### 5.5 STRUCTURED OUTPUT RULES (appended last, in `buildSystemInstructions()`)

```
STRUCTURED OUTPUT RULES:
Return JSON only.
The JSON must strictly match the provided schema.
Do not include markdown in the JSON.
Do not include source URLs inside JSON unless the schema explicitly allows them.
Always return numeric integer price ranges.
Dealer buy price must be below market price.
Do not return "Insufficient verified comparables".
Use fallback valuation hierarchy if exact comps are unavailable.
```

---

## 6. Output Schema & Validation

File: `src/lib/valuation/schema.ts`

Enforced twice: (a) OpenAI-side via `strict: true` JSON schema, (b) server-side via Zod
with custom refinements (e.g. `min ≤ max`, dealer buy < market price).

Fields:
- `region` — LEBANON | UAE | EUROPE
- `vehicle` — make, model, variant, year, mileageKm (nullable), mileageRangeKm, specs, notes
- `marketPrice` + `marketPriceUsd` — `{currency, min, max}` (positive integers)
- `dealerBuyPrice` + `dealerBuyPriceUsd`
- `fallbackUsed` (bool), `fallbackLevel` (1–5), `mileageFallbackUsed` (bool),
  `sourceMarketAnchorUsed` (bool)
- `confidence` — high | medium | low
- `shortReason` — one-line justification

---

## 7. Caching

File: `src/lib/valuation/cache.ts` — Redis, via the shared BullMQ `redisConnection`.

**Cache key** (version `v2`):
```
valuation:v2:{region}:{make}:{model}:{variant}:{year}:{mileage-band}:{specs}:{mode}:{notes-hash12}
```
- All parts normalized (lowercase, spaces→`-`, alphanumerics only); notes are SHA-256-hashed.
- Mileage is bucketed into bands so nearby mileages share a cache entry:
  `0`, `1-5000`, `5001-10000`, `10001-25000`, `25001-50000`, `50001-75000`,
  `75001-100000`, `100000+` (quick mode uses the exact submitted min-max band).

**TTL by brand tier** (`getTtlSeconds`):
| Tier | Brands | TTL |
|------|--------|-----|
| Exotic | Ferrari, Lamborghini, Rolls-Royce, Bentley, McLaren, Aston Martin, Brabus, Mansory | 24 h |
| Luxury | Audi, BMW, Mercedes(-Benz), Porsche, Lexus, Land/Range Rover, Jaguar | 48 h |
| Standard | everything else | 72 h |

**Exclusions:** listing-mode requests **with photos are never cached** (condition varies per
car). Cache read/write failures degrade silently (valuation still works, just costs a call).

Separate from this, the Python scraper has its own Redis cache
(`scrapper/core/cache.py`): key `carq:scrape:{md5(params)}`, fixed 10-minute TTL,
toggled by `CACHE_ENABLED` — used only by `/api/scrape` and the scraper's own evaluator.

---

## 8. Configuration Summary (env vars)

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPEN_AI_KEY` / `OPENAI_API_KEY` | OpenAI auth | required |
| `OPENAI_VALUATION_MODEL` | model override | `gpt-5.4-2026-03-05` |
| `OPENAI_INPUT_PRICE_PER_1M` | cost tracking | unset → cost = null |
| `OPENAI_CACHED_INPUT_PRICE_PER_1M` | cost tracking | unset |
| `OPENAI_OUTPUT_PRICE_PER_1M` | cost tracking | unset |
| `OPENAI_WEB_SEARCH_PRICE_PER_CALL` | cost tracking | 0 |
| `REDIS_URL` | valuation cache + queues | `redis://127.0.0.1:6379` |

---

## 9. Known Fragilities (for future hardening)

1. **No fallback path** — if OpenAI or its web search fails, the request errors after 2
   immediate retries (no backoff, no scraper-based fallback estimate).
2. **No explicit timeout** on the OpenAI call (SDK default), and no rate limiting on
   `/api/dealer/evaluate` — quota exhaustion is possible under abuse.
3. **Images are not size-checked or compressed** before being sent (token/cost inflation).
4. The retry correction prompt doesn't tell the model *which* field failed validation.
5. `formatMarkdown.ts` contains a stray `console.log` for Europe valuations.
6. Silent cache degradation — no alert if Redis is down; every request quietly pays for OpenAI.
