import {
    FuelCategory,
    LebanonImportCostResult,
    LebanonImportRule,
    LebanonImportRulesJson,
} from './types';

const HYBRID_FAMILY: FuelCategory[] = ['hybrid', 'plug_in_hybrid', 'mild_hybrid'];

function ruleMatchesMileage(rule: LebanonImportRule, mileageKm: number): boolean {
    const min = rule.minMileageKm ?? 0;
    const max = rule.maxMileageKm ?? Number.POSITIVE_INFINITY;
    return mileageKm >= min && mileageKm <= max;
}

function findRule(
    rules: LebanonImportRulesJson,
    fuelCategory: FuelCategory,
    mileageKm: number
): LebanonImportRule | null {
    // 1. Exact fuel category + mileage window
    const exact = rules.rules.find(
        (r) => r.fuelCategory === fuelCategory && ruleMatchesMileage(r, mileageKm)
    );
    if (exact) return exact;

    // 2. Hybrid family members can share each other's rules (e.g. a document
    //    that only lists "hybrid" should still cover mild/plug-in hybrids).
    if (HYBRID_FAMILY.includes(fuelCategory)) {
        const familyRule = rules.rules.find(
            (r) => HYBRID_FAMILY.includes(r.fuelCategory) && ruleMatchesMileage(r, mileageKm)
        );
        if (familyRule) return familyRule;
    }

    // 3. Fall back to the gasoline rule
    const gasoline = rules.rules.find(
        (r) => r.fuelCategory === 'gasoline' && ruleMatchesMileage(r, mileageKm)
    );
    if (gasoline) return gasoline;

    return rules.rules.find((r) => r.fuelCategory === 'gasoline') ?? null;
}

/**
 * Deterministic Lebanon import/customs cost calculator.
 * The AI never computes duties — this function applies the structured,
 * versioned rules to the source-market anchor price.
 */
export function calculateLebanonImportCost(params: {
    sourceMarketPriceUsd?: number;
    sourceMarketPriceUsdMin?: number;
    sourceMarketPriceUsdMax?: number;
    fuelCategory: FuelCategory;
    mileageKm: number | null;
    rules: LebanonImportRulesJson;
}): LebanonImportCostResult {
    const { rules, mileageKm } = params;
    const warnings: string[] = [];

    const min = Math.round(
        params.sourceMarketPriceUsdMin ?? params.sourceMarketPriceUsd ?? 0
    );
    const max = Math.round(
        params.sourceMarketPriceUsdMax ?? params.sourceMarketPriceUsd ?? min
    );

    if (min <= 0 || max <= 0) {
        throw new Error('Import calculator requires a positive source market price');
    }

    let fuelCategory = params.fuelCategory;

    if (!fuelCategory || fuelCategory === 'unknown') {
        fuelCategory = 'unknown';
        warnings.push('Fuel category unknown; conservative gasoline import rate applied.');
    }

    const effectiveFuel: FuelCategory =
        fuelCategory === 'unknown' ? 'gasoline' : fuelCategory;

    const effectiveMileage = mileageKm ?? 0;
    if (mileageKm === null || mileageKm === undefined) {
        warnings.push('Mileage unknown; treated as 0 km for import rule matching.');
    }

    const rule = findRule(rules, effectiveFuel, effectiveMileage);

    if (!rule) {
        throw new Error(
            `No import rule matched fuel category "${effectiveFuel}" in rule set ${rules.version}`
        );
    }

    if (rule.fuelCategory !== effectiveFuel) {
        warnings.push(
            `No specific rule for "${effectiveFuel}"; applied "${rule.fuelCategory}" rule instead.`
        );
    }

    const taxRateApplied = rule.totalRate;

    const estimatedTaxMin = Math.round(min * taxRateApplied);
    const estimatedTaxMax = Math.round(max * taxRateApplied);

    return {
        applied: true,
        ruleVersion: rules.version,
        fuelCategory: params.fuelCategory,
        matchedFuelCategory: rule.fuelCategory,
        mileageKm: mileageKm ?? null,
        taxRateApplied,
        sourceMarketPriceUsd: { min, max },
        estimatedTaxUsd: { min: estimatedTaxMin, max: estimatedTaxMax },
        landedCostUsd: { min: min + estimatedTaxMin, max: max + estimatedTaxMax },
        warnings,
    };
}
