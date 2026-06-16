export const LEBANON_PROMPT = `Target region: Lebanon.

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
`;
