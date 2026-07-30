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

SOURCE HIERARCHY FOR LEBANON FINAL PRICE:
- The market anchor source and the submitted vehicle source are DIFFERENT concepts. A UAE fallback anchor may be used to estimate regional value, but the final Lebanon price must still adjust for the submitted vehicle source.
- Company/official/TGF source is strongest.
- GCC source is close to company but usually slightly below.
- European/Germany source is good but usually below company/GCC unless local warranty/registration is confirmed.
- U.S. clean-title source should NOT equal company/GCC; apply a resale/warranty/title-perception discount even when the title is clean.
- U.S. accident/salvage/rebuilt/flood/bad-Carfax source requires a major discount.
- Do not return identical value for company, GCC, Europe, and U.S. sources unless the evidence explicitly proves equal buyer preference, which is rare.
- ALWAYS return a UAE anchor with its comparableCount whenever usable UAE listings exist (even when the submitted source is Europe), because the backend uses the UAE regional benchmark as the source-independent baseline. Only omit the UAE anchor (comparableCount 0) when UAE genuinely has no usable comparables.

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
