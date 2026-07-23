import { applyLebanonLocalCompClusterCap } from '../src/lib/valuation/sanity/applyLebanonLocalCompClusterCap';
import { getImportDutyMileageThreshold } from '../src/lib/valuation/sanity/importDutyMileage';
import { calculateLebanonImportCost } from '../src/lib/valuation/importRules/calculateLebanonImportCost';
import { DEFAULT_LEBANON_IMPORT_RULES } from '../src/lib/valuation/importRules/defaultRules';
import { findRegistryEntry } from '../src/lib/valuation/vehicleValidity/modelYearRegistry';

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

console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
