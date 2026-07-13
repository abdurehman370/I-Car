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

CRITICAL:
- Do NOT apply Lebanon customs, VAT, daribeh, or any import duties. Return raw source-market anchor prices only. The backend applies Lebanon import rules deterministically.
- Do NOT return a Lebanon resale price. Only source-market anchors.
- Classify the vehicle's fuel category (electric, hybrid, plug_in_hybrid, mild_hybrid, gasoline, diesel).
- Exclude accident, salvage, flood, repaired, fake body-kit, and distress listings.

Return structured JSON only.`;
