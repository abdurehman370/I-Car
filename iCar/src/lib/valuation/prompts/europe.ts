export const EUROPE_PROMPT = `Target region: Europe.

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
`;
