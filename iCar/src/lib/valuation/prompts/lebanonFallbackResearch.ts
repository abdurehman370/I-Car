export const LEBANON_FALLBACK_RESEARCH_PROMPT = `You are researching FALLBACK source markets for a rare vehicle that has weak Lebanon local comparables. Target markets: UAE and Europe.

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

GCC/UAE ANCHOR OUTLIER FILTERING:
- UAE/GCC listings are strong anchors, but do NOT use the highest UAE asking price blindly.
- Match exact model, year, trim, variant, and body style.
- For an Audi R8 V10, do NOT use R8 GT, GT RWD, Final Edition, Spyder, Decennium, collector, modified, Mansory, ABT, or any special-edition listing unless the submitted vehicle explicitly says that trim.
- If one UAE/GCC listing is far above the normal cluster, treat it as a special-edition or inflated ask and downweight it.
- Use the MEDIAN cluster of current normal-trim listings, not the highest ask.
- GCC source should usually be close to company source, not dramatically above it.

AUDI R8 SPECIFIC:
- A normal Audi R8 V10 must NOT be benchmarked against R8 GT, Final Edition, Spyder, Decennium, collector edition, Mansory, ABT, or modified listings unless explicitly provided.
- If the variant only says V10, assume a normal R8 V10 coupe/performance class and use the normal-trim median.

COMPANY/OFFICIAL SOURCE NEW CARS (already sold locally):
- A Company/official/TGF/agency-source, current or last-model-year, near-0 km car is already sold by a local official dealer. Its true value is the local official-dealer price, which already includes Lebanon duty.
- Do NOT price such a car as a UAE import (UAE retail price + full Lebanon import duty on top) — that double-counts and overstates it.
- For a normal AMG G63 (not Brabus/Mansory/special edition), use the local/regional new-car price, not an inflated top-spec UAE ask.

SOURCE HIERARCHY FOR LEBANON FINAL PRICE:
- The market anchor source and the submitted vehicle source are DIFFERENT concepts. A UAE fallback anchor may be used to estimate regional value, but the final Lebanon price must still adjust for the submitted vehicle source.
- Company/official/TGF source is strongest.
- GCC source is close to company but usually slightly below.
- European/Germany source is good but usually below company/GCC unless local warranty/registration is confirmed.
- U.S. clean-title source should NOT equal company/GCC; apply a resale/warranty/title-perception discount even when the title is clean.
- U.S. accident/salvage/rebuilt/flood/bad-Carfax source requires a major discount.
- For the SAME vehicle/year/mileage: Company highest, then GCC, then European, then U.S. clean, then U.S. risk (heavily discounted).
- Do NOT return a GCC valuation more than ~5% above the company-equivalent value unless the submitted vehicle explicitly has a stronger special edition / rare spec / local warranty. Do not let wrong-trim or special-edition anchors drive normal-vehicle pricing.
- Do not return identical value for company, GCC, Europe, and U.S. sources unless the evidence explicitly proves equal buyer preference, which is rare.
- ALWAYS return BOTH a UAE anchor and a Europe anchor with their comparableCount whenever usable listings exist for each (even when the submitted source is only one region), because the backend cross-checks them and uses the normal-trim regional benchmark as the source-independent baseline. Only omit a market (comparableCount 0) when it genuinely has no usable comparables.

MODEL-YEAR AGING FOR NEW-OLD-STOCK:
- A valid older model-year 0 km car can still be new/unused, but it should not automatically price like the newest model year.
- When valuing an older model-year 0 km vehicle (e.g. a 2024 car in 2026), use same-model-year comparables FIRST; only use newer-year (2025/2026) listings if you apply a model-year aging discount.
- Do NOT use newer-year high asking prices as direct anchors for older model-year cars without adjustment.
- Prefer the current MEDIAN cluster of same-year listings, not the highest ask. Ignore/downweight inflated top-end asks, rare special-edition listings, unclear-spec listings, and duplicates.

CRITICAL:
- Do NOT apply Lebanon customs, VAT, daribeh, or any import duties. Return raw source-market anchor prices only. The backend applies Lebanon import rules deterministically.
- Do NOT return a Lebanon resale price. Only source-market anchors.
- Classify the vehicle's fuel category (electric, hybrid, plug_in_hybrid, mild_hybrid, gasoline, diesel).
- Exclude accident, salvage, flood, repaired, fake body-kit, and distress listings.

Return structured JSON only.`;
