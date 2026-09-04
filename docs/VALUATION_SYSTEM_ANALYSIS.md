# CarQ Vehicle Valuation — Full Technical Analysis & Weaknesses

**Date:** 2026-07-23 · **Valuation cache:** `v15` · **Validity cache:** `vehicle-validity:v1`
**Scope:** the complete price-valuation subsystem — the AI/API used, every prompt, the two-phase Lebanon flow, fallbacks, the import-duty engine, every backend guardrail ("barrier"), caching, and a candid weaknesses assessment.

> Companion doc: `LEBANON_VALUATION_CURRENT_IMPLEMENTATION.md` (narrative walkthrough). This document is the deeper technical + risk audit.

---

## 1. High-level architecture

Entry: `POST /api/dealer/evaluate` (auth: `requireValuationSession`) → `evaluateVehicleWithAI()` in `src/lib/valuation/openaiValuation.ts` (~1,800 lines).

Two design principles:

1. **AI researches, backend decides.** The model finds live comparable listings via web search and returns a *structured* assessment. It never sets the final price alone — Lebanon import duty, anchor selection, source-hierarchy and every guardrail are computed deterministically in code.
2. **Everything is grounded.** Every model call *requires* a web search to have occurred; if not, the request is rejected.

Region routing:
- **UAE / Europe** → single-call "standard" flow.
- **Lebanon** → two-phase flow (local assessment → UAE/Europe fallback only when local comps are weak).

---

## 2. The API and model

| Item | Value |
|---|---|
| Provider | OpenAI **Responses API** (`openai.responses.create`) |
| Model | `process.env.OPENAI_VALUATION_MODEL` — default **`gpt-5.4-2026-03-05`** |
| API key | `OPEN_AI_KEY` \|\| `OPENAI_API_KEY` |
| Tool | `web_search`, `search_context_size: 'high'`, `tool_choice: 'required'` |
| Grounding check | `responseUsedWebSearch()` — throws "Marketplace search could not be completed" if the model didn't search |
| Output format | `type: 'json_schema'`, `strict: true` (per-phase schema) |
| `max_output_tokens` | **4096** |
| `temperature` | **0.2** (hardcoded; a `temperature` field in the request body is **ignored**) |
| Retry | one automatic correction-retry on invalid JSON, then hard fail |
| Sources | `include: ['web_search_call.action.sources']` → extracted into `sources[]` |
| Cost | `estimateOpenAICost()` — returns `null` unless `OPENAI_INPUT/OUTPUT/CACHED_PRICE_PER_1M` envs are set |

**Search domain allow-lists** (`getWebSearchTool` / `getFallbackWebSearchTool`):
- **UAE:** dubizzle, dubicars, autotraderuae, audi-dubai, mercedesbenzme, altayermotors, premier-carcare.
- **Europe:** mobile.de, autoscout24, preowned.ferrari.com.
- **Fallback (Phase 2):** the UAE + Europe sets combined.
- **Lebanon (Phase 1):** intentionally **no allow-list** (local inventory is fragmented across OLX, dealer pages, importer sites, FB/IG).

---

## 3. The prompts

There are effectively four prompt bodies. For Lebanon Phase 1, three are concatenated (`GLOBAL_PROMPT` + `LEBANON_PROMPT` + `LEBANON_ASSESSMENT_PROMPT`); Phase 2 uses `LEBANON_FALLBACK_RESEARCH_PROMPT`. Full text lives in `src/lib/valuation/prompts/`.

**① `GLOBAL_PROMPT` (global.ts)** — role + universal rules: always return a price range; always web-search (not memory); images verify condition only (never a price source); only value vehicles that exist; always produce Market + Dealer Buy; mileage fallback (0 km compared with 0–5,000 km first); EXCLUDE accident/salvage/flood/repaired/wrong-trim/fake-bodykit/urgent-sale/outliers; dealer-buy method (margin, negotiation, reconditioning, liquidity, holding cost, rarity, demand, spec/source risk).

**② `LEBANON_PROMPT` (lebanon.ts)** — Lebanon region + a 5-level local hierarchy: L1 exact Lebanon match → L2 closest mileage → L3 same-model adjust → L4 local segment benchmark → L5 import source anchor (only when local is thin). Price spreads: normal $2–5k, luxury $5–10k, exotic $10–25k.

**③ `LEBANON_ASSESSMENT_PROMPT` (lebanonAssessment.ts, Phase 1)** — the core assessment. Key blocks:
- Source/origin interpretation (Import ≠ accident; Company/TGF = higher confidence).
- Source-risk adjustment (import 3–7%, clean 0–3%, explicit damage 12–25%, company none).
- New-vehicle source hierarchy (Company ≥ Europe ≥ US clean).
- Strong-comparable rules; search-recall (search many name variants first).
- Direct-anchor mileage adjustment (max ~8–12% on mileage for performance/luxury).
- **Local comp cluster pricing** (price to the current cluster).
- **Mileage & import-duty note** (mileage not a hard cap; hybrids >5,000 km change duty class).
- **Anchor price integrity** (every price from ONE real ad URL; no `q-`/search pages; never invent/blend/average).
- Local price anchors (mandatory structured output) + `directLebanonAnchorPriceUsd`, fuel category, source risk, `fallbackRequired`.

**④ `LEBANON_FALLBACK_RESEARCH_PROMPT` (lebanonFallbackResearch.ts, Phase 2)** — raw UAE/Europe anchors only (no duty math). Key blocks:
- Search UAE + Europe; AED→USD @3.67; EUR→USD at "searched or reasonable fixed" rate.
- Anchor recommendation (UAE-first for neutral/company/import).
- **GCC/UAE anchor outlier filtering** (don't use the highest UAE ask; median normal-trim cluster; reject R8 GT/Spyder etc.).
- **Audi R8 specific** (normal V10 ≠ GT/Spyder/Mansory).
- **Company/official new cars** (already sold locally — don't price as UAE import + duty).
- **Source hierarchy** (Company ≥ GCC ≥ Europe ≥ US-clean ≥ US-risk; GCC not >5% above company; always return BOTH UAE and Europe anchors).
- **Model-year aging** (a 2024 0 km car in 2026 isn't the newest year).
- CRITICAL: never apply Lebanon duties (backend does that); never return a Lebanon resale price; classify fuel; exclude damaged listings.

**Observation:** the source hierarchy is enforced **both** in the prompt **and** deterministically in the backend — belt-and-suspenders, but a maintenance/consistency cost (they can drift).

---

## 4. Two-phase Lebanon flow & the fallback decision

```
0. validateVehicleModelYear()  → invalid → { status:'invalid_vehicle' } (no price, nothing cached)
1. getActiveImportRules('LEBANON') + Redis cache check (key = v15 + rule version)
2. PHASE 1  callLebanonAssessment()   (GLOBAL+LEBANON+ASSESSMENT, web_search required)
3. shouldUseLebanonFallback(assessment, threshold)
     ├─ DIRECT  → local-comp pricing + direct-path guardrails
     └─ FALLBACK → PHASE 2 callLebanonFallbackResearch() + deterministic duty + fallback guardrails
4. markdown + sources + audit metadata → cache → respond
```

**`shouldUseLebanonFallback` (deterministic):**
```
if hasExactVerifiedLocalMatch      → DIRECT
if hasUsableDirectLebanonAnchor    → DIRECT
if strongComparableCount ≥ 2 and localCompsStrength ≠ 'weak' → DIRECT
if strongComparableCount ≥ threshold (env LEBANON_FALLBACK_MIN_STRONG_COMPS, default 5) → DIRECT
else → FALLBACK (fallbackRequired || 'weak' || strongComparableCount == 0)
```

**Fallback anchor selection (`selectFallbackAnchor`)** — computes Lebanon landed cost per market; **UAE-first** policy; Europe chosen only if source is European, UAE is missing/weak, or UAE landed >20% above Europe. Exposes `uaeLandedMidpoint`, `europeLandedMidpoint`, `chosenLandedMidpoint`. **Note:** when source preference is "UAE" (e.g. GCC-source cars), the UAE anchor is forced and the 20% check is bypassed — the reason the Audi R8 GCC bug existed.

---

## 5. Import-duty engine (`importRules/`)

Deterministic, versioned (admin-uploadable rule documents; built-in defaults otherwise). The AI never computes duty.

| Fuel | Mileage | Total rate |
|---|---|---|
| Electric | any | 14% |
| Hybrid / PHEV / mild-hybrid | ≤ 5,000 km | 18% |
| Hybrid / PHEV / mild-hybrid | > 5,000 km | 63% |
| Gasoline / diesel | any | 63% |

Landed cost = source price × (1 + rate). It is a **benchmark**, not the resale price — the market range is built around the landed midpoint with a tier-capped spread.

---

## 6. The barriers / guardrails (full inventory)

Guardrails run **in sequence**; later, more-specific ones override earlier ones. Each is skipped when its trigger doesn't match.

### Direct path (local comps exist)
| # | Guardrail | Trigger | Effect |
|---|---|---|---|
| 1 | **Anchor outlier distrust** (`anchorTrust.ts`) | ≥2 usable anchors, top >15% above next | Re-anchor to the trusted comp (anti-fabrication/blending) |
| 2 | **Direct-anchor sanity clamp** | clean low-risk luxury/perf + same-trim anchor | Market midpoint not >5–8% below anchor on mileage alone |
| 3 | **Range Rover SVR floor** | clean recent SVR (2020+, ≤85k km, low risk) | Market floor ~$95k / midpoint ~$99k |
| 4 | **Source-hierarchy calibration (direct)** | new/current-year luxury/exotic, not clamped/SVR | Europe ~0.98, US-clean/Canada ~0.94, generic import ~0.97 |
| 5 | **Local-comp cluster cap** (`applyLebanonLocalCompClusterCap.ts`) | normal/luxury (not exotic), ≥3 tight exact/near comps | Cap market to the current cluster (+≤3%) |
| 6 | **C200 2023 guardrail** | Mercedes C200 (not AMG), 2023, 20–40k km, EU source | Market ~$47–50.5k |
| 7 | **Import-duty mileage note** | hybrid family >5,000 km | Metadata only (explains 63% class) |

### Fallback path (weak local comps)
| # | Guardrail | Trigger | Effect |
|---|---|---|---|
| 1 | **Anchor outlier / wrong-trim correction** (`filterFallbackAnchorOutliers.ts` + `filterSpecialTrimAnchors.ts`) | UAE landed >35% above Europe, or anchor reason names a special trim | Re-base off Europe (× 1.2 cap) → source-independent baseline |
| 2 | **Import-duty calc** | always | Landed cost from versioned rules |
| 3 | **Source-hierarchy calibration + model-year aging** (`applyLebanonSourceHierarchyCalibration.ts`) | exotic/perf, fallback | Company 1.00, GCC 0.985, Europe 0.955, US-clean/Canada 0.925, generic-clean 0.97, generic-unknown 0.95, US-risk 0.80; aging 3.75%/yr (max 10%) for older 0 km |
| 4 | **Cross-source parity guard** (`applyCrossSourceParityGuard.ts`) | exotic/perf, over company-equivalent ceiling | Correct down (e.g. GCC ≤ company × 1.005) |
| 5 | **Audi R8 guardrail** | R8 V10 2024, 0–5,000 km, gasoline, not special | Per-source bands (Company $243–255k … US-clean $198–212k) |
| 6 | **Company/official new-car reconciliation** | Company source, current/last year, ≤5,000 km, fallback > local×1.10 | Re-base to Phase-1 local (official-dealer) estimate |
| 7 | **Mercedes G63 guardrail** | AMG G63 ≥2025, 0–5,000 km, gasoline, not Brabus/special | Per-source bands (Company $320–340k …) |
| 8 | Dealer buy | always | Market × tier factors (exotic ~9–15% below, luxury ~8–12%, mass ~7–10%) |

### Model-year validity (both paths)
Registry-based (`vehicleValidity/modelYearRegistry.ts`) + optional AI web check for unknown exotics (cached 30 days). E.g. Revuelto < 2024 → `invalid_vehicle`.

---

## 7. Auditability (metadata)

Every response's `meta` records which path and guardrails fired and why: `fallbackUsed`, `backendChosenAnchorMarket`, `submittedVehicleSourceType`, `sourceHierarchyCalibrationPath`, `sourceHierarchyAdjustmentFactor`, `localCompClusterApplied`, `directAnchorOutlierDistrusted`, `gccAnchorOutlierFiltered`, `crossSourceParityGuardApplied`, `companyEquivalentBaselineUsd`, `audiR8GuardrailApplied`, `companyLocalReconciliationApplied`, `mercedesG63GuardrailApplied`, `mileageImportDutyThresholdCrossed`, plus a human-readable `warnings[]`. This is a genuine strength — decisions are inspectable.

---

## 8. Caching

- **Valuation cache** (`cache.ts`): key = `valuation:v15:<region>:<rule-version>:make:model:variant:year:mileage-band:specs:mode:notes-hash`. Versioned (bump = instant invalidation), mileage banded, TTL by brand tier (exotic 24h / luxury 48h / mass 72h), **photo/listing-mode not cached**, fails soft on Redis error.
- **Validity cache**: `vehicle-validity:v1:make:model:variant:year`, 30-day TTL, separate from valuation version.

---

## 9. Weaknesses & risks (candid)

Severity: **High** (fix soon) · **Med** · **Low**.

**[High] Model-specific guardrail proliferation ("whack-a-mole").** There are now hardcoded, per-model guardrails for C200, SVR, GLE 53, G63, Portofino, Audi R8 and Revuelto — each with baked-in USD price bands and thresholds. Every over/under-pricing report tends to produce another one. This does not scale to a catalogue of thousands of models; each guardrail is a maintenance liability and a place for logic to interact unexpectedly. It's treating symptoms car-by-car rather than the root cause (unreliable anchors).

**[High] Hardcoded prices go stale and need a deploy to change.** The R8 ($243–255k), G63 ($320–340k), SVR ($95k floor), C200 ($47–50.5k) bands are 2026 values compiled into TypeScript. As the market moves, they silently become wrong, and correcting them requires a code change, a cache bump, and a redeploy — not a config edit. There is no admin-editable price-band/override table.

**[High] The AI is the weak link; the backend is a pile of compensating patches.** Despite the anti-fabrication prompt, the model still invents or blends prices (the $54,500 C200 that existed on no listing; the R8 GT anchoring; the inflated G63 UAE anchor). Every major guardrail exists to catch a specific way the model lied. The architecture is reactive: grounding is required but not verified against the actual page content.

**[Med] Fallback anchors are aggregates, so true wrong-trim filtering is impossible.** Phase 2 returns one UAE + one Europe anchor *range*, not individual listings with titles/URLs. The backend therefore can only cross-check UAE-vs-Europe, not reject the specific "R8 GT" listing that built the anchor. This is precisely why model-specific guardrails were needed. Returning per-listing anchors (like Phase 1 does) would let the backend filter deterministically.

**[Med] Magic numbers everywhere, no central config.** Multipliers (0.985/0.955/0.925), thresholds (1.15, 1.35, 20%, 5,000 km), aging (3.75%/yr), spreads and USD bands are scattered across several files. Hard to audit, tune, or keep internally consistent.

**[Med] Cost & latency.** A single Lebanon exotic valuation can fire **three sequential web-search LLM calls** (validity + Phase 1 + Phase 2), each with `search_context_size: 'high'` (the most expensive tier). There is **no timeout / AbortController** on the OpenAI calls — a hung request blocks the handler indefinitely. Photo/listing mode is never cached, so every photo valuation pays full cost.

**[Med] Single retry + 4,096-token cap = brittle failures.** Large anchor lists can exceed `max_output_tokens: 4096`, truncating the JSON; there is only **one** correction retry before a hard "Structured JSON invalid after retry" failure. Under load or for comp-rich cars this is a real failure mode.

**[Med] No end-to-end / integration tests, no CI.** The only coverage is `scratch/valuationCalibrationTest.ts` — pure-function unit tests, not wired into a test runner or CI, and not run automatically. The full pipeline (AI + Redis + guardrail ordering) has no automated test. Guardrails override each other in sequence; their interactions are untested.

**[Med] Guardrail ordering is implicit and fragile.** Direct path: clamp → SVR → hierarchy → cluster → C200. Fallback: outlier → hierarchy → parity → R8 → reconciliation → G63. Precedence is encoded only by statement order in one long function; adding a guardrail in the wrong place can silently change outcomes. There's no declarative precedence or conflict detection.

**[Low] Company-source reconciliation trusts the Phase-1 estimate.** The G63 fix re-bases to the Phase-1 local price, which itself can be unreliable; it's bounded (ignored if <50% of fallback) but still a heuristic dependency.

**[Low] Model name and key handling.** The default model `gpt-5.4-2026-03-05` is hardcoded; if the env is unset/wrong there's no fallback model — all valuations fail. The OpenAI key is read under two names (`OPEN_AI_KEY`/`OPENAI_API_KEY`) and the model under a third env; inconsistent naming invites misconfiguration.

**[Low] FX from the model.** UAE uses a fixed 3.67 peg (fine), but EUR→USD is "the current searched rate, or a reasonable fixed rate" — i.e. an unverified number from the LLM feeding the Europe anchor.

**[Low] Validity gating is narrow.** The AI validity web-check runs only for *unknown exotic* makes; a wrong/typo'd mainstream model that isn't in the registry can still be valued.

**[Low] Cost observability off by default.** `estimatedCostUsd` is `null` unless the `OPENAI_*_PRICE_PER_1M` envs are set, so spend tracking is likely inactive in production.

**[Low] Prompt overload & duplication.** The assessment prompt is ~100 lines of overlapping rules; the source hierarchy is specified in both the prompt and the backend. Long prompts add cost and can dilute instruction-following; duplicated logic can diverge.

---

## 10. Strengths (for balance)

- Clean **AI-advisory / deterministic-backend** separation; duty math is auditable and versioned.
- **Grounding required** (no search → reject) prevents pure hallucinated pricing.
- **Rich audit metadata** on every response.
- **Graceful degradation** (Phase 2 failure falls back to the direct estimate; Redis failure → cache miss, not 500).
- **Two-phase efficiency** (fallback only runs when local comps are genuinely weak).
- **Model-year validity** blocks impossible cars up front.

---

## 11. Recommendations (highest leverage first)

1. **Return per-listing anchors from Phase 2** (title + URL + price, like Phase 1's `localPriceAnchors`). This lets the backend filter wrong-trim/outlier listings deterministically and would remove most of the need for per-model guardrails.
2. **Move price bands & multipliers into admin-editable config / DB** (like the import-rules pattern already in place) so corrections don't need a deploy and don't go stale silently.
3. **Add a verification step for exact anchors** — fetch/confirm the cited listing (or at least require a resolvable individual-ad URL) before trusting an "exact" price.
4. **Introduce a real test suite + CI** — promote `scratch/valuationCalibrationTest.ts` into a runner, add fixture-based integration tests for guardrail ordering, and gate deploys on them.
5. **Harden the API calls** — add an AbortController/timeout, raise/park `max_output_tokens`, allow ≥2 retries, and add a fallback model.
6. **Centralise guardrails behind a declarative pipeline** with explicit precedence and conflict logging, instead of sequential overrides in one 1,800-line function.
7. **Close the loop** — capture dealer corrections / actual sale prices to tune multipliers and bands from data rather than by hand.

---

*Line/behaviour references were accurate at 2026-07-23 (cache v15). Verify against current code before acting; the valuation module changes frequently.*
