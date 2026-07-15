# Lebanon Car Valuation — Current Implementation (Full Reference)

Snapshot of the valuation feature as currently implemented, including every prompt verbatim
and all deterministic backend rules. Lebanon runs a **two-phase** flow; UAE/Europe use the
original single-call flow.

---

## 1. Flow Overview

```
Dealer/Partner form (CarValuationForm)
   fields: market/region, make, model, variant, year, mileage min–max,
           specs/source dropdown, notes
      │  POST /api/dealer/evaluate  (requireValuationSession)
      ▼
evaluateVehicleWithAI()                     src/lib/valuation/openaiValuation.ts
  ├─ region UAE/EUROPE → evaluateStandardRegionVehicleWithAI()   (original flow)
  └─ region LEBANON    → evaluateLebanonVehicleWithFallback():
        1. getActiveImportRules()      (admin PDF rules or built-in defaults)
        2. Redis cache check           (v6 key incl. import-rule version)
        3. PHASE 1 — Lebanon local assessment (OpenAI + web_search required)
        4. shouldUseLebanonFallback()  (deterministic trigger)
        5a. DIRECT path: model's Lebanon valuation
              + direct-anchor sanity clamp (5–8% below anchor max)
              + clean-SVR guardrail
        5b. FALLBACK path:
              PHASE 2 — UAE + Europe research (OpenAI + web_search)
              → normalizeAnchors (AED→USD @3.67, midpoint spread compression)
              → selectFallbackAnchor (UAE-first, landed midpoints)
              → calculateLebanonImportCost (versioned rules, never AI math)
              → deterministic final pricing from landed midpoint
        6. markdown + merged sources + debug meta → cache → respond
```

Model: `OPENAI_VALUATION_MODEL` (default `gpt-5.4-2026-03-05`), Responses API,
`tool_choice: 'required'` web_search, strict JSON schema, temperature 0.2, one
validation retry with a correction message.

---

## 2. PHASE 1 — Lebanon Local Assessment

**Instructions = `GLOBAL_PROMPT` + `LEBANON_PROMPT` + `LEBANON_ASSESSMENT_PROMPT`** (joined
with blank lines). Web search tool: unfiltered domains (Lebanese inventory is fragmented).

### 2.1 GLOBAL_PROMPT — `src/lib/valuation/prompts/global.ts` (unchanged)

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

### 2.2 LEBANON_PROMPT — `prompts/lebanon.ts` (unchanged)

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

### 2.3 LEBANON_ASSESSMENT_PROMPT — `prompts/lebanonAssessment.ts` (current, post-calibration)

```
You are evaluating the Lebanon local market ONLY.

Use Lebanon sources first:
- OLX Lebanon
- Beirut dealer listings
- Lebanese importer inventories
- verified dealer websites
- verified dealer Facebook/Instagram pages only when price is clearly visible

SOURCE / ORIGIN INTERPRETATION:
- "Import" means generic imported vehicle unless more details are provided.
- Do not assume "Import" means accident, salvage, U.S. damage history, or weak title.
- Do not assume "Import" means Europe/Germany.
- If the source is "Company", "TGF", "Tewtel", "agency", or official dealer source, treat it as higher confidence.
- If the source is "GCC", prioritize GCC/local Gulf references.
- If the source is "Germany", "German", "Europe", or "European", prioritize European/German references.
- If the source is "U.S.", "USA", "American", or "Canada", apply source risk only when notes imply accident/title risk or when comps show U.S.-spec discount.
- Missing source in a local listing should not disqualify it when the model/trim/year/mileage/price match is strong.

SOURCE RISK ADJUSTMENT:
- Generic "Import" alone: sourceRiskLevel at most medium; apply only a moderate uncertainty buffer of roughly 3–7%. Never a large discount.
- "Import" with clean title / clean Carfax / no accident in notes: sourceRiskLevel low; 0–3% adjustment at most.
- Notes/specs explicitly mention accident, salvage, bad Carfax, flood, repaired, repaint-heavy, title issue, non-clean title, or unknown damaged import: sourceRiskLevel high; 12–25% discount depending on severity.
- "Company", "TGF", "agency", "official dealer" source: sourceRiskLevel low; no discount, may even deserve a small premium.
- Never apply a large source-risk discount without an explicit risk signal in the notes or specs.

STRONG COMPARABLE RULES:
A strong Lebanon comparable must match:
- same make/model/trim or clearly same variant
- same or close year
- close mileage band
- clean/non-damaged listing
- clear price
- verified marketplace/dealer/importer source
Same source/origin is PREFERRED but NOT mandatory when the local comp is otherwise very close. Source/origin improves confidence; it does not disqualify an otherwise strong local comp.

Do not count weak segment comps as strong comparables.
Do not count accident, salvage, flood, repaired, urgent-sale, or fake body-kit listings.

SEARCH RECALL:
Search MULTIPLE name variants of the model/trim before concluding comps are missing.
Example — for a Range Rover Sport SVR 2021, also search:
- "Range Rover SVR 2021 Lebanon"
- "Range Rover Sport SVR 2021 Lebanon"
- "Land Rover SVR 2021 Lebanon"
- "SVR Black Edition 2021 Lebanon"
Apply the same variant expansion to other models (with/without make name, trim-only + year + Lebanon, common local nicknames).

DIRECT LOCAL ANCHOR PRICING (mileage adjustment):
- Performance/luxury vehicles (SVR, AMG, M, RS, SV, G63, Porsche Turbo, VXR and similar) hold value in Lebanon — do NOT apply aggressive mileage depreciation from a single low-mileage anchor.
- For a same-year same-trim direct Lebanon anchor:
  - 0–30,000 km mileage difference: small adjustment only.
  - 30,000–60,000 km difference: moderate adjustment.
  - Do not exceed roughly 8–12% discount solely for mileage unless the vehicle is over 100,000 km or condition risk is explicit.
- Never price a clean (low source risk) same-year same-trim vehicle more than 10–12% below a direct local anchor unless older/higher-mileage local comps prove that lower level.
- When multiple local references exist, bracket the target between the same-year direct anchor and older/higher-mileage references — do not rely on a single low reference too aggressively.
- Report the direct anchor's asking price in directLebanonAnchorPriceUsd (USD, null if no anchor).

LBP / OLD REFERENCE RULE:
- Use LBP prices only if the listing clearly represents current pricing and can be safely converted.
- Do not use old LBP listings as strong pricing anchors.
- Do not let older-model LBP references pull down a newer same-year USD-priced vehicle.
- Older references (e.g. a 2017 model of the same trim) may support lower-bound context only — they must NOT dominate the valuation of a clean newer vehicle.
- For Lebanon, clear USD asking prices from same-year/same-trim listings are stronger than older LBP references.

LOCAL PRICE ANCHORS (mandatory structured output):
- List every priced local listing you relied on in localPriceAnchors, with its numeric priceUsd, year, mileage, and sourceStrength (exact / near_exact / same_model / older_reference / segment).
- If hasExactVerifiedLocalMatch is true, at least one localPriceAnchors entry MUST be exact or near_exact with a positive numeric priceUsd.
- If hasUsableDirectLebanonAnchor is true, at least one localPriceAnchors entry MUST have a positive numeric priceUsd, and directLebanonAnchorPriceUsd MUST be set to the best exact/near-exact anchor's price.
- If you cannot provide a numeric USD price for any local anchor, you MUST set hasExactVerifiedLocalMatch and hasUsableDirectLebanonAnchor to false.

You must ALWAYS still return your best direct Lebanon valuation (market price and dealer buy price in USD), even when comps are weak — the backend decides whether to use it or run a fallback.

Assessment rules:
- Report strongComparableCount and totalComparableCount honestly.
- hasExactVerifiedLocalMatch is true ONLY when there is at least one exact, verified Lebanon listing with the same model, trim, year, close mileage, and a clearly shown price (matching source/origin strengthens it but is not required).
- hasUsableDirectLebanonAnchor is true when Lebanon has at least one exact or near-exact local listing with a clear price that can anchor the valuation, even if strongComparableCount is low. Lebanon inventory is thin — one exact verified listing can be enough.
- Explain the direct anchor in directLebanonAnchorReason (which listing, why it anchors the price), or state why none exists.
- If strong comparable count is low AND there is no usable direct Lebanon anchor, set localCompsStrength to weak or medium and set fallbackRequired true.
- If there is an exact verified local match or a usable direct Lebanon anchor, fallbackRequired must be false even if the total count is low.
- Classify the vehicle's fuel category (electric, hybrid, plug_in_hybrid, mild_hybrid, gasoline, diesel). Use "unknown" only if it truly cannot be determined.
- Report sourceRiskLevel (low/medium/high) and sourceRiskReason per the SOURCE RISK ADJUSTMENT rules.

Return structured JSON only.
```

### 2.4 User message (both phases build from the form input)

```
Perform valuation for this vehicle using current searched marketplace data.

Region: LEBANON
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

Phase 1 strict output (`LEBANON_ASSESSMENT_JSON_SCHEMA`): full valuation fields +
`localMarketAssessment` (strong/total counts, exact-match flag, usable-anchor flag +
reason + `directLebanonAnchorPriceUsd`, `localPriceAnchors[]`, strength, source risk
level/reason) + `fuelCategory` + `fallbackRequired`. Zod refinements **reject** the
response (one retry with correction) if an anchor boolean is claimed without a numeric
anchor price.

---

## 3. Fallback Trigger (deterministic — `shouldUseLebanonFallback`)

No fallback when any of: `hasExactVerifiedLocalMatch`, `hasUsableDirectLebanonAnchor`,
(strongComparableCount ≥ 2 AND strength ≠ weak), or strongComparableCount ≥
`LEBANON_FALLBACK_MIN_STRONG_COMPS` (env, default 5 — guidance only).
Fallback when: `fallbackRequired`, strength = weak, or strongComparableCount = 0.
One exact priced Lebanon listing is enough to price directly.

---

## 4. DIRECT Path Safeguards (backend, after Phase 1)

**Anchor price recovery:** if `directLebanonAnchorPriceUsd` is null, the backend picks the
best numeric anchor from `localPriceAnchors` (exact > near_exact > same_model; same year
preferred, then closest mileage; older_reference/segment never anchor). Reported in
`meta.computedDirectAnchorPriceUsd` + `meta.directAnchorPriceSource`.

**Direct-anchor sanity clamp:** when the vehicle is luxury/performance (brand tier or trim
regex SVR/AMG/M/RS/SV/G63/Turbo/VXR…), sourceRiskLevel low, mileage ≤ 100k, and no
explicit risk keywords (accident, salvage, bad carfax, flood, repaired, repaint, title issue,
non-clean, urgent, distress) in specs/notes: the market **midpoint** may not sit more than
**8%** below the anchor — **5%** when notes confirm clean title / no accident / good
service. If it does, the range is shifted up (spread preserved), dealer buy recomputed
~10–11% below, and `meta.directAnchorClampApplied = true`.

**Clean-SVR guardrail:** Land/Range Rover Sport SVR, year ≥ 2020, ≤ 85k km, low risk,
clean notes, no explicit risk → market min ≥ **$95,000**, midpoint ≥ **$99,000**, dealer
min ≥ **$86,000** — skipped only when a numeric anchor proves a lower level (< $95k).
`meta.svrGuardrailApplied` flags it.

---

## 5. PHASE 2 — Fallback Research Prompt (`prompts/lebanonFallbackResearch.ts`, current)

Used alone as instructions; web search domains: dubizzle.com, dubicars.com,
autotraderuae.com, mobile.de, autoscout24.com, preowned.ferrari.com.

```
You are researching FALLBACK source markets for a rare vehicle that has weak Lebanon local comparables. Target markets: UAE and Europe.

Search the UAE market:
- Dubizzle UAE
- DubiCars
- AutoTrader UAE
- verified UAE dealer/importer inventories

Search the Europe market:
- Mobile.de
- AutoScout24
- official/specialist European dealers

Source/origin logic:
- German / European source vehicle → the Europe/Germany anchor is the most important.
- GCC source vehicle → the UAE/GCC anchor is the most important.
- U.S. source vehicle → prefer UAE listings of U.S.-spec imports if available; otherwise mark the anchor's reason as limited-source coverage.
- Canada source vehicle → treat like U.S./North America; note limited coverage in the reason.
- Chinese source EVs → UAE listings of the same Chinese model if available; otherwise note limited coverage.

For each market, identify comparable listings matching the vehicle (model, trim, year, close mileage, clean title, verified sellers) and estimate a realistic source-market anchor price range.

Currency rules:
- UAE anchors: price in AED, and priceUsd converted at 1 USD = 3.67 AED.
- Europe anchors: price in EUR, and priceUsd converted at the current searched FX rate (use a reasonable fixed rate if unavailable, conservatively).

ANCHOR RECOMMENDATION FOR LEBANON:
- If source is GCC, prefer the UAE/GCC anchor when usable.
- If source is Germany/Europe, prefer the Europe/Germany anchor when usable.
- If source is generic Import, Company source, or Unknown, prefer UAE when UAE has usable comparable listings because UAE is often a stronger regional resale anchor for Lebanon luxury/exotic vehicles.
- Do not recommend Europe only because European listings are available.
- Do not recommend a market whose landed cost would materially overstate Lebanon resale value when another valid regional anchor exists.
- Keep anchor ranges TIGHT by excluding outliers and distressed listings — do not stretch the range to cover extreme high-end or low-end listings.
- Return comparableCount honestly.
- Explain the recommendation briefly.
- If a market has no usable comparables, return it with comparableCount 0 and explain.

CRITICAL:
- Do NOT apply Lebanon customs, VAT, daribeh, or any import duties. Return raw source-market anchor prices only. The backend applies Lebanon import rules deterministically.
- Do NOT return a Lebanon resale price. Only source-market anchors.
- Classify the vehicle's fuel category (electric, hybrid, plug_in_hybrid, mild_hybrid, gasoline, diesel).
- Exclude accident, salvage, flood, repaired, fake body-kit, and distress listings.

Return structured JSON only.
```

Output: `fallbackMarketsUsed`, `sourceMarketAnchors[]` (market, currency, price,
priceUsd, comparableCount, reason), `recommendedAnchorMarket` (advisory only),
`recommendedAnchorPriceUsd`, `fuelCategory`, `confidence`, `reason`.

---

## 6. FALLBACK Path — Deterministic Backend Rules

**Anchor normalization:** UAE AED→USD recomputed at 3.67 server-side. Spread compression
around the **midpoint** (both tails trimmed): normal $10k, luxury $20k, exotic $32k caps.

**Source preference (`getSourcePreference`)** from the specs dropdown:
GCC/Gulf/UAE/Dubai/Qatar/Kuwait/Saudi → `UAE`; Germany/Europe/EU → `EUROPE`;
TGF/Tewtel/Company/Agency/Official → `LOCAL_OR_NEUTRAL`; Import/Unknown/blank → `NEUTRAL`.

**Anchor selection (`selectFallbackAnchor`)** — AI recommendation is advisory; landed cost
(midpoint) is computed for EVERY valid anchor via the import calculator:
1. Explicit Europe source → Europe. Explicit GCC source → UAE.
2. Only one usable anchor → that one.
3. Neutral/company/import/unknown source with both usable → **UAE-first**:
   Europe wins only if UAE comps are clearly weak (<2 vs ≥3), or the UAE landed midpoint is
   more than **20%** above Europe's. Otherwise UAE, with the override reason:
   *"UAE selected because source is neutral/company and UAE is the stronger Lebanon regional
   resale anchor; UAE landed midpoint is within 20% of Europe."*

**Import calculator (`calculateLebanonImportCost`)** — versioned rules (admin PDF or
built-in defaults, flagged `usedDefaultRules`):

| Fuel | Mileage | Total rate |
|---|---|---|
| Electric | any | **14%** (0% customs + 11% VAT + 3% daribeh) |
| Hybrid / PHEV / Mild hybrid | ≤ 5,000 km | **18%** (4% + 11% + 3%) |
| Hybrid / PHEV / Mild hybrid | > 5,000 km | **63%** (treated as gasoline) |
| Gasoline / Diesel | any | **63%** |
| Unknown | any | 63% + warning |

**Final pricing:** landed **midpoint** is the anchor (never the landed max):
`marketMin = round(landedMid)`, `marketMax = marketMin + clamp(landedSpread, floor, cap)`
with spreads exotic $10k–25k, luxury $5k–10k, normal $2k–5k. Dealer buy: exotic ~9–15%
below, luxury 8–12%, normal 7–10%. Result carries `fallbackUsed: true`, `fallbackLevel: 5`,
`sourceMarketAnchors`, `importCalculation` (rule version, tax rate, tax amount, landed
range), and the anchor-selection debug meta.

**Degradation:** research failure or zero usable anchors → return the direct Lebanon
estimate with a warning (if assessment confidence is medium/high), else 502.

---

## 7. Cache & Meta

Cache: Redis, version **v6**, key
`valuation:v6:lebanon:{rule-version}:{make}:{model}:{variant}:{year}:{mileage-band}:{specs}:{mode}:{notes-hash}`.
TTL 24h exotic / 48h luxury / 72h standard. Photo-listing valuations never cached.
Activating a new import-rules PDF changes the rule version → automatic invalidation.

Debug meta (Lebanon): `importRulesVersion`, `usedDefaultImportRules`,
`localComparableCount`, `strongLocalComparableCount`, `hasUsableDirectLebanonAnchor`,
`directLebanonAnchorReason`, `directLebanonAnchorPriceUsd`, `computedDirectAnchorPriceUsd`,
`directAnchorPriceSource`, `directAnchorClampApplied`, `svrGuardrailApplied`,
`sourceRiskLevel/Reason`, `sourcePreference`, `aiRecommendedAnchorMarket`,
`backendChosenAnchorMarket`, `anchorOverrideReason`, `uaeLandedMidpoint`,
`europeLandedMidpoint`, `chosenLandedMidpoint`, `landedComparison`, `warnings`.

## 8. Config

| Env | Default |
|---|---|
| `OPEN_AI_KEY` / `OPENAI_API_KEY` | required |
| `OPENAI_VALUATION_MODEL` | `gpt-5.4-2026-03-05` |
| `LEBANON_FALLBACK_MIN_STRONG_COMPS` | 5 (guidance) |
| `REDIS_URL` | `redis://127.0.0.1:6379` |
| `OPENAI_*_PRICE_PER_1M` | unset → cost tracking off |
