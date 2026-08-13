# Lebanon Car Valuation — How It Works (Current Implementation)

**Last updated:** 2026-07-23 · **Valuation cache version:** `v14` · **Model-year validity cache:** `vehicle-validity:v1`

This document explains how the app values a car for the **Lebanon** market end to end: what the AI actually does, what the deterministic backend does, and every guardrail that shapes the final number. UAE and Europe use a simpler single-call flow and are only mentioned where relevant.

---

## 1. The core idea (read this first)

The valuation is a **hybrid of AI research and deterministic backend math** — the AI is never trusted to produce the final price on its own.

- **The AI does research, not arithmetic.** It uses live web search to find comparable listings and returns a *structured assessment*: an estimated market range, dealer-buy range, the comparable listings it relied on, the fuel type, and a source-risk read. Its price is a starting point and its anchor recommendation is **advisory only**.
- **The backend owns the money math.** Lebanon import duties, anchor selection, source-hierarchy adjustments, model-year aging, and all sanity guardrails are computed deterministically in code from versioned rules. This is what makes results auditable and repeatable.
- **Everything is grounded.** Every AI call *requires* a web search to have happened — if the model answers without searching, the request is rejected.

So "how does the AI value the car" is really two questions: **(a)** what the AI contributes (grounded comparables + a first-pass estimate), and **(b)** how the backend turns that into a defensible Lebanon price.

Entry point: `POST /api/dealer/evaluate` → `evaluateVehicleWithAI()` in `src/lib/valuation/openaiValuation.ts`.
Model: `OPENAI_VALUATION_MODEL` (default `gpt-5.4-2026-03-05`), OpenAI **Responses API**, strict JSON schema, `web_search` tool required, `temperature: 0.2`, `max_output_tokens: 4096`, one automatic correction-retry on invalid JSON.

---

## 2. End-to-end flow

```
Dealer/Partner form (CarValuationForm) → POST /api/dealer/evaluate  (auth: requireValuationSession)
   payload: region, make, model, variant, year, mileage (single) OR mileageMin/Max, specs/source, notes, mode
      │
      ▼
evaluateVehicleWithAI()
  0. MODEL-YEAR VALIDITY PRE-CHECK  (validateVehicleModelYear)
        └─ invalid (e.g. Revuelto 2020) → return { status: 'invalid_vehicle' }  — no price, nothing cached
  │
  ▼  (region === LEBANON)
evaluateLebanonVehicleWithFallback()
  1. getActiveImportRules('LEBANON')      → admin-uploaded PDF rules, else built-in defaults (versioned)
  2. Redis cache check                    → key includes cache version + import-rule version
  3. PHASE 1 — Lebanon local assessment   → OpenAI + web_search (always runs)
  4. shouldUseLebanonFallback()           → deterministic decision
  │
  ├── 5a. DIRECT PATH  (Lebanon has usable local comps)
  │       trusted anchor selection (outlier distrust)
  │       → direct-anchor sanity clamp → SVR guardrail → source-hierarchy calibration (direct)
  │       → local-comp cluster cap → C200 guardrail → import-duty threshold note
  │
  └── 5b. FALLBACK PATH (Lebanon comps too weak)
          PHASE 2 — UAE + Europe market research  → OpenAI + web_search
          → normalizeAnchors (AED→USD, spread compression)
          → selectFallbackAnchor (UAE-first, landed midpoints)
          → calculateLebanonImportCost (versioned duty rules — never AI)
          → source-hierarchy calibration (fallback) + model-year aging
  │
  ▼
  build markdown + merge web sources + debug metadata → cache → respond
```

There are up to **three AI calls** for one Lebanon valuation: an optional validity check (only for unknown exotic models), the Phase 1 assessment (always), and the Phase 2 fallback research (only when local comps are weak).

---

## 3. Step 0 — Model-year validity pre-check

Before any expensive valuation call, `validateVehicleModelYear()` checks the make/model/year is a car that actually exists:

1. A free, instant **registry** (`vehicleValidity/modelYearRegistry.ts`) covers known edge cases — e.g. Lamborghini **Revuelto earliest valid year = 2024**.
2. For unknown *exotic* models only, an optional AI + web-search validation (cached 30 days).

If invalid, the API returns a structured `invalid_vehicle` response (message + suggested valid years/models) and **no price**. Example: a **Lamborghini Revuelto 2020** returns `invalid_vehicle`, "Revuelto was not produced for 2020," suggested 2024+, with Aventador/Huracán/Urus as valid 2020 Lamborghinis. The frontend renders a dedicated invalid-model-year panel.

---

## 4. Caching

`src/lib/valuation/cache.ts`, Redis-backed.

- Key = `valuation : <version> : <region> : <import-rule-version> : make : model : variant : year : mileage-band : specs : mode : notes-hash`.
- **Version** is currently `v13`; bumping it instantly invalidates all older entries (they simply stop being read).
- **Mileage is banded** (0, 1–5000, 5001–10000, …) to widen cache hits.
- **TTL by brand class**: exotic 24 h, luxury 48 h, mass-market 72 h.
- Photo/listing-mode inspections are **not cached** (photos change condition).
- Redis errors fail soft — a cache outage degrades to a miss, never a 500.
- The `vehicle-validity:v1` cache is separate and is not touched by valuation-version bumps.

---

## 5. Phase 1 — Lebanon local assessment (the primary AI step)

Prompt: `prompts/lebanonAssessment.ts`. The model is told to value the **Lebanon local market only**, searching OLX Lebanon, Beirut dealer/importer inventories, and verified dealer pages.

What the AI returns (validated by a strict Zod + JSON schema — `LebanonAssessmentResultSchema`):

- `marketPrice` / `dealerBuyPrice` in USD (its first-pass estimate).
- `localMarketAssessment`:
  - `strongComparableCount`, `totalComparableCount`
  - `hasExactVerifiedLocalMatch`, `hasUsableDirectLebanonAnchor`
  - `directLebanonAnchorPriceUsd` (the best exact/near-exact local asking price)
  - `localPriceAnchors[]` — each listing it used: title, url, year, mileage, `priceUsd`, `sourceStrength` (`exact | near_exact | same_model | older_reference | segment`), reason
  - `sourceRiskLevel` (low/medium/high) + reason
- `fuelCategory` (electric / hybrid / plug_in_hybrid / mild_hybrid / gasoline / diesel).
- `fallbackRequired` (its recommendation, advisory).

Key prompt rules the model must follow:

- **Anchor price integrity (anti-fabrication):** every `priceUsd` must be the real asking price of **one specific individual ad** — never invented, rounded to a "typical" price, or **blended/averaged** across listings. An `exact`/`near_exact` anchor's URL must be a single ad page, not an OLX `q-…` search page. If a price can't be verified, downgrade to `same_model` or omit it.
- **Local comp cluster pricing:** when several current listings cluster tightly, price to the cluster; don't let one old/high ask pull the range up. European source shouldn't beat company/TGF/warranty listings unless notes justify it.
- **Mileage & import-duty note:** mileage normally lowers value, but there is **no hard rule** that higher mileage must be cheaper (see §8 on the duty threshold).
- **Source hierarchy / source risk:** how strongly to weight Company/TGF vs GCC vs Europe vs U.S. vs generic import, and when to apply a risk discount.

The AI's job here is essentially: *find the real Lebanon comps, report them honestly, and give a first-pass number.* The backend decides what to do with it.

---

## 6. Step 4 — Direct vs Fallback decision

`shouldUseLebanonFallback()` is deterministic. Lebanon inventory is thin, so:

- If there's an **exact verified local match** or a **usable direct Lebanon anchor**, use the **direct path** even if the total comp count is low.
- Otherwise, if strong comps are below the threshold (`LEBANON_FALLBACK_MIN_STRONG_COMPS`, default **5**) and there's no usable direct anchor, run the **fallback path**.

---

## 7. Step 5a — Direct path (local comps exist)

The backend takes the AI's assessment and passes it through a sequence of guardrails. Each is skipped when it doesn't apply; several are model-specific.

**(a) Trusted anchor selection with outlier distrust** — `sanity/anchorTrust.ts`.
The AI sometimes returns a lone high "exact" price that's stale, inflated, or blended from several listings. `selectTrustedDirectAnchor()` distrusts a top asking price that sits **>15 % above the next-best comp** and re-anchors to the trusted comp, so a bad number can't drive the clamp. It's deliberately conservative: tight anchor sets (e.g. GLE 53 at $98–103k) and single-anchor cases are untouched, and specific-ad URLs are preferred over search-page URLs. Metadata: `directAnchorOutlierDistrusted`, `trustedDirectAnchorPriceUsd`.

**(b) Direct-anchor sanity clamp.**
For a clean, low-risk luxury/performance car with a same-trim local anchor, the market midpoint may not sit more than 5–8 % below that anchor purely on mileage (5 % when notes confirm clean condition). Prevents over-discounting a clean car off one low reference.

**(c) Range Rover Sport SVR guardrail.**
A clean, recent (2020+, ≤85k km, low risk) SVR gets an explicit market floor (~$95k min / $99k midpoint) unless a genuine lower local anchor proves otherwise. Preserved exactly.

**(d) Source-hierarchy calibration (direct).** — `classifySourceHierarchy()` + `getSourceHierarchyAdjustment()`.
For brand-new / current-model-year luxury/exotic cars priced from local comps, guarantees the ordering Company/Official ≥ GCC ≥ Europe ≥ U.S./Canada clean ≥ generic import (e.g. European source ~2–5 % below company; U.S. clean ~5–10 % below). This is the path the **G63 2026** source hierarchy uses.

**(e) Local-comp cluster cap.** — `sanity/applyLebanonLocalCompClusterCap.ts`.
For **normal/luxury (never exotic)** vehicles with **≥3** tight, current, same/adjacent-year exact/near-exact anchors (spread ≤15 %), the final market is capped near the current cluster (max ≤ ~cluster max +3 %; European source gets no headroom above the cluster). High/stale outliers are trimmed. Excluded: exotics, premium-justifying notes (special edition, full warranty, very low mileage), and the fallback path.

**(f) Narrow C200 2023 guardrail.**
A Mercedes-Benz C200 (not C43/C63/AMG) 2023, European source, 20k–40k km, with a ~$49k exact local comp is held to market ~$47–50.5k / dealer ~$42.5–45.5k. This is a targeted fix for a specific over-valuation case.

**(g) Import-duty mileage threshold note** (informational) — see §8.

---

## 8. Mileage & the import-duty threshold (why higher mileage can cost more)

There is **no backend "mileage monotonicity" cap** — the old rule that forced a higher-mileage car below a lower-mileage equivalent was removed, because it's genuinely wrong for Lebanon.

Lebanon import duty depends on fuel type **and** mileage:

| Fuel | Duty |
|---|---|
| Electric | 14 % |
| Hybrid / plug-in hybrid / mild hybrid **≤ 5,000 km** | 18 % |
| Hybrid / plug-in hybrid / mild hybrid **> 5,000 km** | 63 % |
| Gasoline / diesel | 63 % |

So a plug-in-hybrid crossing 5,000 km jumps from the 18 % class to the 63 % gasoline-equivalent class — which can legitimately make the **higher-mileage** car's landed-cost benchmark *higher*. The backend surfaces this instead of hiding it, via `sanity/importDutyMileage.ts`, with metadata `mileageImportDutyThresholdCrossed` + `importDutyMileageReason`. Mileage still normally reduces value through the AI's market reasoning and comps — it's just not a hard cap. (This is why a Revuelto PHEV at 10,000 km can price above the same car at 0 km.)

---

## 9. Step 5b — Fallback path (weak local comps)

Used for rare/exotic cars with thin Lebanon inventory.

**Phase 2 research** (`prompts/lebanonFallbackResearch.ts`): the AI searches the **UAE** (Dubizzle, DubiCars, AutoTrader) and **Europe** (Mobile.de, AutoScout24) markets and returns *raw source-market anchor prices only* — it is explicitly forbidden from computing any Lebanon duties or resale price. It's also told to **always return a UAE anchor** when UAE comps exist (even for a Europe-sourced car) and to prefer the **same-year median cluster**, not top-end or newer-year asks.

**Deterministic backend steps:**

1. **`normalizeAnchors`** — convert AED→USD at 3.67, compress over-wide ranges to a midpoint-based spread.
2. **`selectFallbackAnchor`** — compute the Lebanon **landed cost** for every anchor and pick the realistic benchmark. Policy is **UAE-first** (UAE is the stronger regional resale anchor for Lebanon); Europe is only chosen when the vehicle is Europe-sourced, UAE comps are missing/weak, or the UAE landed midpoint is >20 % above Europe. The AI's recommendation is advisory; overrides are logged.
3. **Anchor outlier / wrong-trim correction** (`sanity/filterFallbackAnchorOutliers.ts` + `filterSpecialTrimAnchors.ts`). For GCC-sourced cars `selectFallbackAnchor` *forces* the UAE anchor, bypassing its own outlier check — so if the UAE anchor was built from a wrong-trim/special-edition/inflated listing (e.g. a normal Audi R8 V10 anchored on an R8 GT), it would explode the price. When the UAE landed midpoint is >35 % above the Europe benchmark (or the anchor reason names a special trim the buyer didn't ask for), the calibration base is **re-based to a modest premium over Europe** (Europe × 1.2), producing a source-independent baseline. Tight/plausible anchors (e.g. Revuelto UAE ≈ 1.09 × Europe) are untouched. Metadata: `gccAnchorOutlierFiltered`, `normalTrimAnchorMedianUsd`, `rejectedFallbackAnchors`.
4. **`calculateLebanonImportCost`** (`importRules/`) — applies the versioned duty rules (§8) to the anchor price. **The AI never does this math.** Landed cost = source price + duty; it's a *benchmark*, not the resale price.
5. **Market range** is built around the landed midpoint with a tier-capped spread (exotic $10–25k, luxury $5–10k, mass $2–5k) — a high landed *max* can't inflate the final price.
6. **Fallback source-hierarchy calibration + model-year aging** (see §10) — the key fix for exotics, applied to the outlier-corrected baseline.
7. **Cross-source parity guard** (`sanity/applyCrossSourceParityGuard.ts`) — enforces Company ≥ GCC ≥ Europe ≥ U.S. against the source-independent company-equivalent baseline. A submitted source can never exceed its ceiling vs company-equivalent (GCC ceiling = company × 1.005, corrected down to × 0.98 if breached). Metadata: `crossSourceParityGuardApplied`, `companyEquivalentBaselineUsd`, `gccEquivalentMaxAllowedUsd`, original/corrected market.
8. **Narrow Audi R8 V10 2024 guardrail** (same module) — for a normal R8 V10 (not GT/Spyder/Final Edition/tuned), 0–5,000 km, gasoline, sets per-source bands: Company $243–255k, GCC $235–250k, Europe $220–232k, U.S. clean $198–212k. Metadata: `audiR8GuardrailApplied`.
9. Dealer-buy range = corrected market × tier factors (exotic ~9–15 % below, luxury ~8–12 %, mass ~7–10 %) — recomputed from the final corrected market.

---

## 10. Submitted-source hierarchy & model-year aging (fallback)

`sanity/applyLebanonSourceHierarchyCalibration.ts`. This fixes a real bug where Company, GCC and U.S. sources returned **identical** valuations (all anchored on UAE), because the fallback path never adjusted for the car's *submitted* source.

**Two distinct concepts** (the old bug conflated them):

- **Anchor market** (`fallbackAnchorMarketUsed`: UAE or EUROPE) — where the regional price estimate came from.
- **Submitted vehicle source** (`submittedVehicleSourceType`) — the car's actual origin from the specs/notes.

`classifySubmittedVehicleSource()` returns: COMPANY, GCC, EUROPE, US_CLEAN, US_RISK, CANADA, GENERIC_IMPORT_CLEAN, GENERIC_IMPORT_UNKNOWN, UNKNOWN — classified from submitted text, **not** from the anchor. (It correctly treats "US, clean title, no accident" as US_CLEAN, and "US salvage/accident" as US_RISK.)

The calibration:

1. Uses the **UAE-preferred landed midpoint** as a source-market-**independent** baseline (so all submitted sources start from the same regional benchmark).
2. Applies **model-year aging** for new-old-stock: 3.75 %/yr (max 10 %), only for an older-model-year car with 0–15k km, skipped when notes prove exceptional spec (Ad Personam, full carbon, allocation, special colour, etc.).
3. Applies a **source multiplier vs the company baseline**:

| Submitted source | Multiplier vs Company |
|---|---|
| COMPANY | 1.00 (baseline) |
| GCC | 0.985 |
| EUROPE | 0.955 |
| US_CLEAN / CANADA | 0.925 |
| GENERIC_IMPORT_CLEAN | 0.97 |
| GENERIC_IMPORT_UNKNOWN | 0.95 |
| US_RISK | 0.80 |
| UNKNOWN | none (no source adjustment) |

Exotic company market is also capped at ~$780k without exceptional-spec evidence.

**Worked example — Lamborghini Revuelto 2024, 0 km, PHEV, Lebanon** (regional benchmark ≈ $822k; aged ~7.5 % for a 2024 car valued in 2026):

| Source | Market (USD) |
|---|---|
| Company | ~745,000 – 775,000 |
| GCC | ~735,000 – 765,000 |
| Europe | ~710,000 – 740,000 |
| U.S. clean | ~685,000 – 720,000 |
| U.S. risk | heavily discounted (~$600k) |

Company > GCC > Europe > U.S.-clean > U.S.-risk, and no two are identical. Metadata: `sourceHierarchyCalibrationApplied`, `sourceHierarchyCalibrationPath` (direct/fallback/skipped), `sourceHierarchyAdjustmentFactor`, `modelYearAgingAdjustmentApplied/Reason`.

---

## 11. Model-specific behaviors (preserved)

| Vehicle / case | Behavior |
|---|---|
| Ferrari Portofino | Fallback → UAE anchor selected |
| Range Rover Sport SVR (clean, recent) | Direct-path market floor guardrail |
| GLE 53 | Direct-anchor behavior (~$98–103k), tight-anchor set not distrusted |
| G63 2026 | Direct-path source hierarchy (Company ≥ Europe ≥ U.S.) |
| Revuelto 2020 | `invalid_vehicle` (registry blocks < 2024) |
| Revuelto 2024/2026 | Fallback source-hierarchy + model-year aging; no monotonicity cap |
| Audi R8 V10 2024 | Fallback anchor-outlier correction + cross-source parity + narrow R8 guardrail (Company > GCC > Europe > U.S., GCC not benchmarked on R8 GT/Spyder) |
| C200 2023 European 30k km | Direct-path cluster cap ~$47–50k |

---

## 12. Response shape (what the caller gets)

```jsonc
{
  "status": "ok",
  "region": "LEBANON",
  "currency": "USD",
  "valuation": {
    "marketPrice": { "currency": "USD", "min": …, "max": … },
    "marketPriceUsd": { … },
    "dealerBuyPrice": { … },
    "dealerBuyPriceUsd": { … },
    "fallbackUsed": true|false,
    "sourceMarketAnchorUsed": true|false,
    "confidence": "high|medium|low",
    "shortReason": "…",
    "localMarketAssessment": { …comparables… },
    "fuelCategory": "…",
    "importCalculation": { "taxRateApplied": 0.18|0.63|…, "landedCostUsd": … }
  },
  "markdown": "💰 Market Price … 🏷️ Dealer Buy Price …",
  "sources": [ { "title": …, "url": …, "domain": … } ],
  "meta": {
    "cacheHit": …, "backendChosenAnchorMarket": "UAE|EUROPE",
    "submittedVehicleSourceType": "COMPANY|GCC|EUROPE|US_CLEAN|…",
    "sourceHierarchyCalibrationApplied": …, "sourceHierarchyCalibrationPath": "direct|fallback|skipped",
    "sourceHierarchyAdjustmentFactor": …, "modelYearAgingAdjustmentApplied": …,
    "localCompClusterApplied": …, "directAnchorOutlierDistrusted": …,
    "mileageImportDutyThresholdCrossed": …, "warnings": [ … ]
  }
}
```

The `meta` block is an audit trail: it makes every backend decision (which anchor, which source class, which guardrail fired, why) inspectable.

---

## 13. Key files

| Concern | File |
|---|---|
| Orchestration / entry | `src/lib/valuation/openaiValuation.ts` |
| Phase 1 prompt | `prompts/lebanonAssessment.ts` |
| Phase 2 prompt | `prompts/lebanonFallbackResearch.ts` |
| Import-duty calculator | `importRules/calculateLebanonImportCost.ts`, `importRules/defaultRules.ts` |
| Model-year validity | `vehicleValidity/validateVehicleModelYear.ts`, `vehicleValidity/modelYearRegistry.ts` |
| Anchor trust / outlier distrust | `sanity/anchorTrust.ts` |
| Local-comp cluster cap | `sanity/applyLebanonLocalCompClusterCap.ts` |
| Source hierarchy + model-year aging | `sanity/applyLebanonSourceHierarchyCalibration.ts` |
| Import-duty mileage note | `sanity/importDutyMileage.ts` |
| Schemas | `schema.ts` · Cache: `cache.ts` |
| Regression tests | `scratch/valuationCalibrationTest.ts` (`npx tsx scratch/valuationCalibrationTest.ts`) |

---

## 14. Known limitations

- **LLM grounding isn't perfect.** Even with the anti-fabrication prompt, the model can occasionally return a wrong or blended asking price (e.g. citing an OLX search page rather than one ad). The backend outlier-distrust and guardrails are the deterministic safety net that keeps the *final* number sane when this happens.
- **`temperature` is not a request field.** It is hardcoded to `0.2`; anything sent in the request body is ignored.
- **Fallback anchor variance.** The clean source hierarchy depends on a UAE anchor being present as the baseline; the prompt pushes for that, and the multipliers guarantee the ordering regardless, but a Europe-only run anchors slightly lower.
- **Cost/latency.** A Lebanon valuation can involve up to three sequential web-search AI calls; results are cached to mitigate this (photo mode is never cached).
