import { applyLebanonLocalCompClusterCap } from '../src/lib/valuation/sanity/applyLebanonLocalCompClusterCap';
import { getImportDutyMileageThreshold } from '../src/lib/valuation/sanity/importDutyMileage';
import { calculateLebanonImportCost } from '../src/lib/valuation/importRules/calculateLebanonImportCost';
import { DEFAULT_LEBANON_IMPORT_RULES } from '../src/lib/valuation/importRules/defaultRules';
import { findRegistryEntry } from '../src/lib/valuation/vehicleValidity/modelYearRegistry';
import { selectTrustedDirectAnchor, isNonSpecificListingUrl, anchorStats } from '../src/lib/valuation/sanity/anchorTrust';
import {
    classifySubmittedVehicleSource,
    applyLebanonFallbackSourceHierarchy,
    getModelYearAgingFactor,
} from '../src/lib/valuation/sanity/applyLebanonSourceHierarchyCalibration';
import { detectFallbackAnchorOutlier } from '../src/lib/valuation/sanity/filterFallbackAnchorOutliers';
import { classifyAnchorTrim, submittedRequestsSpecialTrim } from '../src/lib/valuation/sanity/filterSpecialTrimAnchors';
import { applyCrossSourceParityGuard, applyAudiR8Guardrail, reconcileCompanySourceNewCar, applyMercedesG63Guardrail } from '../src/lib/valuation/sanity/applyCrossSourceParityGuard';

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, extra?: unknown) {
    if (cond) { pass++; console.log(`  PASS: ${name}`); }
    else { fail++; console.log(`  FAIL: ${name}`, extra ?? ''); }
}

const anchor = (priceUsd: number, year = 2023, strength: any = 'exact', mileageKm = 30000) =>
    ({ year, mileageKm, priceUsd, sourceStrength: strength });

console.log('\n== Cluster cap: C200 2023 (drops stale/high outliers) ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury',
        sourceMarketAnchorUsed: false,
        targetYear: 2023,
        specsAndNotes: 'European source Germany',
        anchors: [
            anchor(46900, 2023, 'exact', 19056),
            anchor(48900, 2023, 'near_exact', 33000),
            anchor(49000, 2023, 'exact', 30000),
            anchor(52000, 2023, 'same_model', 25000),
            anchor(54500, 2022, 'same_model', 40000),
        ],
        currentMarket: { min: 50000, max: 54000 },
        currentDealer: { min: 45500, max: 48500 },
    });
    ok('applied', res.applied, res);
    ok('market max <= 50500 (europe: no headroom above cluster max ~49000)', res.market.max <= 50500, res.market);
    ok('market max not 54000', res.market.max !== 54000, res.market);
    ok('market min around 47k (<=48000)', res.market.min <= 48000, res.market);
    ok('cluster count == 3 (outliers trimmed)', res.metadata.localCompClusterCount === 3, res.metadata);
    ok('cluster median ~48900', res.metadata.localCompClusterMedianUsd === 48900, res.metadata);
    ok('dealer max < market max', res.dealer.max < res.market.max, res.dealer);
    ok('metadata reason set', !!res.metadata.localCompClusterCapReason);
}

console.log('\n== Cluster cap: non-European gets ~3% headroom ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury',
        sourceMarketAnchorUsed: false,
        targetYear: 2023,
        specsAndNotes: 'GCC source',
        anchors: [anchor(46900), anchor(48900, 2023, 'near_exact'), anchor(49000)],
        currentMarket: { min: 50000, max: 54000 },
        currentDealer: { min: 45500, max: 48500 },
    });
    ok('applied', res.applied, res);
    ok('max <= clusterMax*1.03 (~50470)', res.market.max <= 50500 && res.market.max > 49000, res.market);
}

console.log('\n== Cluster cap NOT applied: exotic tier ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'exotic',
        sourceMarketAnchorUsed: false,
        targetYear: 2023,
        specsAndNotes: '',
        anchors: [anchor(46900), anchor(48900), anchor(49000)],
        currentMarket: { min: 50000, max: 54000 },
        currentDealer: { min: 45500, max: 48500 },
    });
    ok('not applied for exotic', !res.applied);
}

console.log('\n== Cluster cap NOT applied: source-market fallback path ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury', sourceMarketAnchorUsed: true, targetYear: 2023,
        specsAndNotes: '', anchors: [anchor(46900), anchor(48900), anchor(49000)],
        currentMarket: { min: 50000, max: 54000 }, currentDealer: { min: 45500, max: 48500 },
    });
    ok('not applied when sourceMarketAnchorUsed', !res.applied);
}

console.log('\n== Cluster cap NOT applied: <3 anchors ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury', sourceMarketAnchorUsed: false, targetYear: 2023,
        specsAndNotes: '', anchors: [anchor(46900), anchor(49000)],
        currentMarket: { min: 50000, max: 54000 }, currentDealer: { min: 45500, max: 48500 },
    });
    ok('not applied with 2 anchors', !res.applied);
}

console.log('\n== Cluster cap NOT applied: premium-justifying notes ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury', sourceMarketAnchorUsed: false, targetYear: 2023,
        specsAndNotes: 'full local warranty, exceptional options',
        anchors: [anchor(46900), anchor(48900), anchor(49000)],
        currentMarket: { min: 50000, max: 54000 }, currentDealer: { min: 45500, max: 48500 },
    });
    ok('not applied with premium notes', !res.applied);
}

console.log('\n== Cluster cap NOT applied: spread too wide (>15%) ==');
{
    const res = applyLebanonLocalCompClusterCap({
        brandTier: 'luxury', sourceMarketAnchorUsed: false, targetYear: 2023,
        specsAndNotes: '',
        anchors: [anchor(40000), anchor(48000, 2023, 'near_exact'), anchor(56000, 2023, 'same_model')],
        currentMarket: { min: 50000, max: 60000 }, currentDealer: { min: 45500, max: 55000 },
    });
    ok('not applied when spread wide', !res.applied, res.metadata);
    ok('metadata still reports cluster stats', res.metadata.localCompClusterCount === 3, res.metadata);
}

console.log('\n== Import-duty mileage threshold (replacement metadata) ==');
{
    const a = getImportDutyMileageThreshold('mild_hybrid', 30000);
    ok('mild_hybrid >5000 crossed', a.mileageImportDutyThresholdCrossed === true && !!a.importDutyMileageReason);
    const b = getImportDutyMileageThreshold('hybrid', 4000);
    ok('hybrid <=5000 not crossed', b.mileageImportDutyThresholdCrossed === false && b.importDutyMileageReason === null);
    const c = getImportDutyMileageThreshold('gasoline', 90000);
    ok('gasoline never crossed', c.mileageImportDutyThresholdCrossed === false);
    const d = getImportDutyMileageThreshold('plug_in_hybrid', 10000);
    ok('plug_in_hybrid >5000 crossed', d.mileageImportDutyThresholdCrossed === true);
}

console.log('\n== Test 4: import-duty calculator rates unchanged ==');
{
    const rate = (fuel: any, km: number) =>
        calculateLebanonImportCost({ sourceMarketPriceUsd: 10000, fuelCategory: fuel, mileageKm: km, rules: DEFAULT_LEBANON_IMPORT_RULES }).taxRateApplied;
    ok('electric = 14%', rate('electric', 0) === 0.14);
    ok('hybrid <=5000 = 18%', rate('hybrid', 3000) === 0.18);
    ok('plug_in_hybrid <=5000 = 18%', rate('plug_in_hybrid', 5000) === 0.18);
    ok('mild_hybrid <=5000 = 18%', rate('mild_hybrid', 1000) === 0.18);
    ok('hybrid >5000 = 63%', rate('hybrid', 6000) === 0.63);
    ok('plug_in_hybrid >5000 = 63%', rate('plug_in_hybrid', 30000) === 0.63);
    ok('mild_hybrid >5000 = 63%', rate('mild_hybrid', 30000) === 0.63);
    ok('gasoline = 63%', rate('gasoline', 0) === 0.63);
    ok('diesel = 63%', rate('diesel', 0) === 0.63);
}

console.log('\n== Test 2 basis: Revuelto registry blocks 2020 ==');
{
    const match = findRegistryEntry({ make: 'Lamborghini', model: 'Revuelto', variant: 'Base' });
    const entry = match?.entry;
    ok('Revuelto in registry', !!entry, match);
    ok('earliestValidYear 2024', entry?.earliestValidYear === 2024, entry);
    ok('2020 < earliest => invalid', !!entry && 2020 < (entry.earliestValidYear as number));
    ok('2026 >= earliest => valid', !!entry && 2026 >= (entry.earliestValidYear as number));
}

console.log('\n== Anchor trust: PROD C200 case (2 anchors: 46.9k + fabricated 54.5k) ==');
{
  // Exactly what the model returned in production: a near_exact $46,900 and a
  // lone "exact" $54,500 (>15% above), both from search-page URLs.
  const anchors = [
    { year: 2023, mileageKm: 30000, priceUsd: 54500, sourceStrength: 'exact', url: 'https://www.olx.com.lb/vehicles/cars-for-sale/beirut/q-c200-200/' },
    { year: 2023, mileageKm: 19056, priceUsd: 46900, sourceStrength: 'near_exact', url: 'https://www.olx.com.lb/en/vehicles/cars-for-sale/q-c200-mercedes/' },
  ] as any;
  const t = selectTrustedDirectAnchor(anchors, 2023, 30000);
  ok('trusted anchor chosen', !!t, t);
  ok('54,500 distrusted as high outlier (>15% above 46,900)', t?.distrustedOutlierUsd === 54500, t);
  ok('re-anchored to the real 46,900 comp', t?.priceUsd === 46900, t);
}

console.log('\n== Anchor trust: legit 49k present → 54.5k NOT distrusted, prefer specific-url exact ==');
{
  // If a real $49k exact exists, $54.5k is only ~11% above it → within tolerance,
  // and the specific-ad-url $49k should win over a search-page $54.5k.
  const anchors = [
    { year: 2023, mileageKm: 30000, priceUsd: 49000, sourceStrength: 'exact', url: 'https://www.olx.com.lb/ad/mercedes-c200-2023-iid1234567' },
    { year: 2023, mileageKm: 30000, priceUsd: 54500, sourceStrength: 'exact', url: 'https://www.olx.com.lb/vehicles/cars-for-sale/beirut/q-c200-200/' },
    { year: 2023, mileageKm: 19056, priceUsd: 46900, sourceStrength: 'near_exact', url: 'https://x/ad/2' },
  ] as any;
  const t = selectTrustedDirectAnchor(anchors, 2023, 30000);
  ok('no distrust when a legit mid comp exists', t?.distrustedOutlierUsd === null, t);
  ok('prefers specific-ad-url exact ($49k)', t?.priceUsd === 49000, t);
}

console.log('\n== Anchor trust: tight cluster (GLE 53 98–103k) is NOT distrusted ==');
{
  const anchors = [
    { year: 2023, mileageKm: 20000, priceUsd: 98000, sourceStrength: 'exact', url: 'https://x/ad/1' },
    { year: 2023, mileageKm: 25000, priceUsd: 101000, sourceStrength: 'near_exact', url: 'https://x/ad/2' },
    { year: 2023, mileageKm: 30000, priceUsd: 103000, sourceStrength: 'same_model', url: 'https://x/ad/3' },
  ] as any;
  const t = selectTrustedDirectAnchor(anchors, 2023, 22000);
  ok('no outlier distrusted (tight cluster)', t?.distrustedOutlierUsd === null, t);
  ok('keeps a top-of-cluster anchor', (t?.priceUsd ?? 0) >= 98000, t);
}

console.log('\n== Anchor trust: single anchor returned unchanged ==');
{
  const t = selectTrustedDirectAnchor([{ year: 2023, mileageKm: 10000, priceUsd: 99000, sourceStrength: 'exact', url: 'https://x/ad/1' }] as any, 2023, 10000);
  ok('single anchor used as-is', t?.priceUsd === 99000 && t?.distrustedOutlierUsd === null, t);
}

console.log('\n== URL classification ==');
{
  ok('search q- URL is non-specific', isNonSpecificListingUrl('https://www.olx.com.lb/vehicles/cars-for-sale/beirut/q-c200-200/') === true);
  ok('?q= URL is non-specific', isNonSpecificListingUrl('https://site/search?q=c200') === true);
  ok('individual ad URL is specific', isNonSpecificListingUrl('https://www.olx.com.lb/ad/mercedes-c200-iid1234567') === false);
  ok('null URL treated as non-specific', isNonSpecificListingUrl(null) === true);
}

console.log('\n== anchorStats: never null when count>0 ==');
{
  const s = anchorStats([46900]);
  ok('count 1 populated (no null with data)', s.count === 1 && s.minUsd === 46900 && s.medianUsd === 46900 && s.maxUsd === 46900, s);
  const empty = anchorStats([]);
  ok('empty → count 0 + nulls', empty.count === 0 && empty.minUsd === null, empty);
}

console.log('\n== Submitted-source classifier ==');
{
  ok('Company source → COMPANY', classifySubmittedVehicleSource('Company source', '') === 'COMPANY');
  ok('GCC source → GCC', classifySubmittedVehicleSource('GCC source', '') === 'GCC');
  ok('European source → EUROPE', classifySubmittedVehicleSource('European source', '') === 'EUROPE');
  ok('US clean (no accident) → US_CLEAN (not risk)', classifySubmittedVehicleSource('US source clean title no accident clean Carfax', '') === 'US_CLEAN');
  ok('US salvage → US_RISK', classifySubmittedVehicleSource('US source salvage or accident history', '') === 'US_RISK');
  ok('Canada → CANADA', classifySubmittedVehicleSource('Canadian source', '') === 'CANADA');
  ok('Import clean → GENERIC_IMPORT_CLEAN', classifySubmittedVehicleSource('Import, clean carfax', '') === 'GENERIC_IMPORT_CLEAN');
  ok('Import unknown → GENERIC_IMPORT_UNKNOWN', classifySubmittedVehicleSource('Imported', '') === 'GENERIC_IMPORT_UNKNOWN');
  ok('blank → UNKNOWN', classifySubmittedVehicleSource('', '') === 'UNKNOWN');
}

console.log('\n== Revuelto 2024 0km fallback source hierarchy (base 822k, exotic) ==');
{
  const base = 822_000;
  const run = (specs: string) => applyLebanonFallbackSourceHierarchy({
    specs, notes: '', tier: 'exotic', isPerformanceLuxury: true,
    modelYear: 2024, currentYear: 2026, mileageKm: 0,
    regionalBaseMid: base, marketSpread: 25_000, companyMarketMaxCap: 780_000,
  });
  const company = run('Company source');
  const gcc = run('GCC source');
  const europe = run('European source');
  const usClean = run('US source clean title no accident clean Carfax');
  const usRisk = run('US source salvage');

  const inRange = (r: any, lo: number, hi: number) => r.market.min >= lo - 3000 && r.market.max <= hi + 3000 && r.market.max > r.market.min;

  ok('Company applied + path fallback', company.applied && company.submittedVehicleSourceType === 'COMPANY', company);
  ok('Company market ~745–775k, not 847k', inRange(company, 745_000, 775_000) && company.market.max <= 780_000, company.market);
  ok('GCC market ~735–765k', gcc.submittedVehicleSourceType === 'GCC' && inRange(gcc, 735_000, 765_000), gcc.market);
  ok('Europe market ~710–740k', europe.submittedVehicleSourceType === 'EUROPE' && inRange(europe, 710_000, 740_000), europe.market);
  ok('US clean market ~685–720k', usClean.submittedVehicleSourceType === 'US_CLEAN' && inRange(usClean, 685_000, 720_000), usClean.market);
  ok('US risk heavily discounted (<640k)', usRisk.submittedVehicleSourceType === 'US_RISK' && usRisk.market.max < 640_000, usRisk.market);

  ok('Company / GCC / US_CLEAN are NOT identical', company.market.min !== gcc.market.min && gcc.market.min !== usClean.market.min && company.market.min !== usClean.market.min, { c: company.market, g: gcc.market, u: usClean.market });
  ok('hierarchy ordered Company>GCC>Europe>US_CLEAN>US_RISK',
    company.market.min > gcc.market.min && gcc.market.min > europe.market.min && europe.market.min > usClean.market.min && usClean.market.min > usRisk.market.min,
    { company: company.market.min, gcc: gcc.market.min, europe: europe.market.min, usClean: usClean.market.min, usRisk: usRisk.market.min });
  ok('model-year aging applied for 2024-in-2026', company.modelYearAgingAdjustmentApplied === true, company);
}

console.log('\n== Model-year aging edge cases ==');
{
  ok('current-year 2026 0km → no aging', getModelYearAgingFactor({ modelYear: 2026, currentYear: 2026, mileageKm: 0, exceptionalSpec: false }) === null);
  ok('2024-in-2026 0km → ~7.5% aging', Math.abs((getModelYearAgingFactor({ modelYear: 2024, currentYear: 2026, mileageKm: 0, exceptionalSpec: false })?.factor ?? 1) - 0.925) < 0.001);
  ok('exceptional spec → no aging', getModelYearAgingFactor({ modelYear: 2024, currentYear: 2026, mileageKm: 0, exceptionalSpec: true }) === null);
  ok('high mileage → no new-old-stock aging', getModelYearAgingFactor({ modelYear: 2024, currentYear: 2026, mileageKm: 40000, exceptionalSpec: false }) === null);
}

console.log('\n== Calibration does NOT run for normal (non-exotic, non-performance) fallback ==');
{
  const r = applyLebanonFallbackSourceHierarchy({
    specs: 'US source', notes: '', tier: 'normal', isPerformanceLuxury: false,
    modelYear: 2024, currentYear: 2026, mileageKm: 0, regionalBaseMid: 30_000, marketSpread: 3000,
  });
  ok('normal fallback vehicle not calibrated', r.applied === false, r);
}

console.log('\n== Special-trim classification ==');
{
  ok('R8 GT flagged special (V10 submitted)', classifyAnchorTrim('Audi R8 GT RWD 2024', false) === 'special_edition');
  ok('R8 Spyder Mansory flagged special', classifyAnchorTrim('Audi R8 Spyder Mansory', false) === 'special_edition');
  ok('normal R8 V10 not special', classifyAnchorTrim('Audi R8 V10 Performance Coupe 2024', false) === 'normal_trim');
  ok('submitted special → special anchor is normal comparable', classifyAnchorTrim('Audi R8 GT', true) === 'normal_trim');
  ok('submittedRequestsSpecialTrim detects GT in specs', submittedRequestsSpecialTrim('Audi R8 GT, GCC source') === true);
  ok('submittedRequestsSpecialTrim false for plain V10', submittedRequestsSpecialTrim('V10 GCC source') === false);
}

console.log('\n== Fallback anchor outlier: R8 GCC (UAE 544k vs EU 230k) rebased; Revuelto not ==');
{
  const r8 = detectFallbackAnchorOutlier({
    uaeLandedMid: 544_000, europeLandedMid: 230_000, chosenLandedMid: 544_000,
    chosenMarket: 'UAE', chosenReason: 'Based on UAE R8 GT listings', submittedSpecsNotesVariant: 'GCC source V10',
  });
  ok('R8 UAE outlier filtered', r8.gccAnchorOutlierFiltered === true, r8);
  ok('R8 baseline rebased well below 544k (~276k)', r8.baselineMid <= 300_000 && r8.baselineMid >= 230_000, r8);

  const revuelto = detectFallbackAnchorOutlier({
    uaeLandedMid: 822_000, europeLandedMid: 755_000, chosenLandedMid: 822_000,
    chosenMarket: 'UAE', chosenReason: 'UAE Revuelto listings', submittedSpecsNotesVariant: 'GCC source',
  });
  ok('Revuelto NOT filtered (UAE ~1.09x EU)', revuelto.gccAnchorOutlierFiltered === false, revuelto);
  ok('Revuelto baseline stays UAE 822k', revuelto.baselineMid === 822_000, revuelto);
}

console.log('\n== Cross-source parity guard ==');
{
  // GCC result absurdly above company-equivalent → corrected down.
  const over = applyCrossSourceParityGuard({
    submittedSource: 'GCC', isExoticPerformanceLuxury: true,
    currentMarket: { min: 531_200, max: 541_200 }, companyEquivalentMid: 249_000,
    spread: 12_000, notesJustifySpecial: false,
  });
  ok('parity guard fires for GCC >> company', over.crossSourceParityGuardApplied === true, over);
  ok('corrected GCC below company-equivalent', ((over.market.min + over.market.max) / 2) < 249_000, over.market);

  // GCC just below company → no correction.
  const ok2 = applyCrossSourceParityGuard({
    submittedSource: 'GCC', isExoticPerformanceLuxury: true,
    currentMarket: { min: 240_000, max: 250_000 }, companyEquivalentMid: 249_000,
    spread: 12_000, notesJustifySpecial: false,
  });
  ok('parity guard does NOT fire when GCC ≤ company', ok2.crossSourceParityGuardApplied === false, ok2);
}

console.log('\n== Audi R8 V10 2024 guardrail (per source) + hierarchy ==');
{
  const g = (specs: string, src: any) => applyAudiR8Guardrail({
    make: 'Audi', model: 'R8', variant: 'V10', year: 2024, mileageKm: 1000,
    fuelCategory: 'gasoline', specsNotes: specs, submittedSource: src,
  });
  const company = g('Company source', 'COMPANY');
  const gcc = g('GCC source', 'GCC');
  const europe = g('European source', 'EUROPE');
  const us = g('US source clean title no accident', 'US_CLEAN');

  ok('R8 company applied ~243-255k', company.applied && company.market!.min === 243_000 && company.market!.max === 255_000);
  ok('R8 GCC ~235-250k, max ≤ 270k, not 531k', gcc.applied && gcc.market!.max <= 270_000 && gcc.market!.min === 235_000);
  ok('R8 europe ~220-232k', europe.market!.min === 220_000);
  ok('R8 us clean ~198-212k', us.market!.min === 198_000);

  const m = (r: any) => (r.market.min + r.market.max) / 2;
  ok('hierarchy Company>GCC>Europe>US', m(company) > m(gcc) && m(gcc) > m(europe) && m(europe) > m(us),
    { c: m(company), g: m(gcc), e: m(europe), u: m(us) });
  const ratio = m(gcc) / m(company);
  ok('GCC/Company ratio in [0.92, 0.995]', ratio >= 0.92 && ratio <= 0.995, ratio);
  ok('GCC midpoint < Company midpoint', m(gcc) < m(company));

  // Must NOT touch special editions / other models / other years
  ok('R8 GT not guardrailed', !g('R8 GT', 'GCC').applied);
  ok('R8 Spyder not guardrailed', !applyAudiR8Guardrail({ make: 'Audi', model: 'R8', variant: 'Spyder', year: 2024, mileageKm: 1000, fuelCategory: 'gasoline', specsNotes: 'Spyder', submittedSource: 'GCC' }).applied);
  ok('R8 2025 not guardrailed', !applyAudiR8Guardrail({ make: 'Audi', model: 'R8', variant: 'V10', year: 2025, mileageKm: 1000, fuelCategory: 'gasoline', specsNotes: '', submittedSource: 'GCC' }).applied);
  ok('Audi RS6 not guardrailed', !applyAudiR8Guardrail({ make: 'Audi', model: 'RS6', variant: '', year: 2024, mileageKm: 1000, fuelCategory: 'gasoline', specsNotes: '', submittedSource: 'GCC' }).applied);
}

console.log('\n== Company-source new-car reconciliation (G63 2026 import-landed too high) ==');
{
  // Fallback ballooned to ~473k (UAE + 63% duty); local official estimate ~330k.
  const g63 = reconcileCompanySourceNewCar({
    submittedSource: 'COMPANY', isExoticPerformanceLuxury: true,
    modelYear: 2026, currentYear: 2026, mileageKm: 0,
    localEstimateMid: 330_000, currentMarket: { min: 468_000, max: 478_000 },
    spread: 20_000, notesJustifySpecial: false,
  });
  ok('reconciliation fires (company new car, fallback >> local)', g63.applied === true, g63);
  ok('re-based to local ~330k (not 473k)', ((g63.market.min + g63.market.max) / 2) <= 340_000 && g63.market.max < 468_000, g63.market);

  // Revuelto 2024 (2 model years old) → NOT reconciled (uses fallback hierarchy).
  const rev = reconcileCompanySourceNewCar({
    submittedSource: 'COMPANY', isExoticPerformanceLuxury: true,
    modelYear: 2024, currentYear: 2026, mileageKm: 0,
    localEstimateMid: 500_000, currentMarket: { min: 745_000, max: 775_000 },
    spread: 25_000, notesJustifySpecial: false,
  });
  ok('Revuelto 2024 NOT reconciled (older model year)', rev.applied === false, rev);

  // Absurdly-low local estimate → ignored (bounded downside).
  const low = reconcileCompanySourceNewCar({
    submittedSource: 'COMPANY', isExoticPerformanceLuxury: true,
    modelYear: 2026, currentYear: 2026, mileageKm: 0,
    localEstimateMid: 90_000, currentMarket: { min: 468_000, max: 478_000 },
    spread: 20_000, notesJustifySpecial: false,
  });
  ok('absurdly-low local estimate ignored', low.applied === false, low);

  // GCC source (imported) → NOT reconciled (import-landed is appropriate).
  const gcc = reconcileCompanySourceNewCar({
    submittedSource: 'GCC', isExoticPerformanceLuxury: true,
    modelYear: 2026, currentYear: 2026, mileageKm: 0,
    localEstimateMid: 330_000, currentMarket: { min: 468_000, max: 478_000 },
    spread: 20_000, notesJustifySpecial: false,
  });
  ok('GCC source NOT reconciled (car is imported)', gcc.applied === false, gcc);
}

console.log('\n== Mercedes G63 2026 guardrail (per source) + hierarchy ==');
{
  const g = (specs: string, src: any, year = 2026, variant = 'AMG') => applyMercedesG63Guardrail({
    make: 'Mercedes-Benz', model: 'G63', variant, year, mileageKm: 0,
    fuelCategory: 'gasoline', specsNotes: specs, submittedSource: src,
  });
  const company = g('Company source', 'COMPANY');
  const gcc = g('GCC source', 'GCC');
  const europe = g('European source', 'EUROPE');
  const us = g('US source clean title', 'US_CLEAN');

  ok('G63 company ~320-340k (not 468-478k)', company.applied && company.market!.min === 320_000 && company.market!.max === 340_000, company.market);
  ok('G63 GCC below company', gcc.applied && gcc.market!.max <= company.market!.max);
  const m = (r: any) => (r.market.min + r.market.max) / 2;
  ok('G63 hierarchy Company>GCC>Europe>US', m(company) > m(gcc) && m(gcc) > m(europe) && m(europe) > m(us),
    { c: m(company), g: m(gcc), e: m(europe), u: m(us) });

  // Exclusions
  ok('G63 Brabus not guardrailed', !g('Brabus G800', 'COMPANY', 2026, 'Brabus').applied);
  ok('G63 2023 (used) not guardrailed', !g('Company source', 'COMPANY', 2023).applied);
  ok('normal GLE not guardrailed', !applyMercedesG63Guardrail({ make: 'Mercedes-Benz', model: 'GLE 53', variant: '', year: 2026, mileageKm: 0, fuelCategory: 'gasoline', specsNotes: '', submittedSource: 'COMPANY' }).applied);
}

console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
