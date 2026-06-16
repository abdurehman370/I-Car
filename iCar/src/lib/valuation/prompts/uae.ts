export const UAE_PROMPT = `Target region: UAE.

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
`;
