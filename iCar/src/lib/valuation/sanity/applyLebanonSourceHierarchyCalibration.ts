/**
 * Lebanon FALLBACK source-hierarchy + model-year aging calibration.
 *
 * The existing direct-path source-hierarchy calibration only runs when the
 * valuation is built from local comps. Exotic / new-luxury vehicles usually go
 * through the UAE/Europe FALLBACK path, which historically applied NO submitted
 * -source adjustment — so Company, GCC and U.S. sources (all UAE-anchored) came
 * out identical.
 *
 * Two distinct concepts must not be confused:
 *   - the ANCHOR market (UAE vs Europe) used to estimate regional value, and
 *   - the SUBMITTED vehicle source (Company / GCC / Europe / U.S. / …).
 * The final Lebanon price must adjust for the SUBMITTED source.
 *
 * This module derives a source-independent company-level baseline from the
 * regional landed benchmark, applies a model-year aging discount for
 * new-old-stock, then applies the submitted-source multiplier. It only ever
 * REDUCES relative to a top (company) source — it never invents value.
 */

export type SubmittedVehicleSourceType =
    | 'COMPANY'
    | 'GCC'
    | 'EUROPE'
    | 'US_CLEAN'
    | 'US_RISK'
    | 'CANADA'
    | 'GENERIC_IMPORT_CLEAN'
    | 'GENERIC_IMPORT_UNKNOWN'
    | 'UNKNOWN';

export type UsdRange = { min: number; max: number };

export type BrandTier = 'exotic' | 'luxury' | 'normal';

function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

/** Notes that justify NOT aging an older-model-year 0 km car (premium spec). */
export const EXCEPTIONAL_SPEC_REGEX =
    /ad ?personam|special colou?r|full carbon|carbon package|allocation|bespoke|one[- ]off|limited edition|special edition|collector|launch edition|exceptional|rare spec|full local warranty|official local warranty/i;

const CLEAN_EVIDENCE_REGEX =
    /clean title|clean carfax|no accident|no accidents|accident[- ]free|full service history|fully registered|duties paid/i;

const HARD_RISK_REGEX =
    /salvage|flood|bad carfax|rebuilt|rebuild(?:ed)? title|frame damage|title issue|non[- ]clean|\bwrecked\b|major (?:paint|damage)|heavy damage|repaired frame|structural damage/i;

/**
 * Classifies the SUBMITTED vehicle source from specs/notes — NOT from the
 * UAE/Europe fallback anchor.
 */
export function classifySubmittedVehicleSource(
    specs: string | null | undefined,
    notes: string | null | undefined,
): SubmittedVehicleSourceType {
    const all = `${specs || ''} ${notes || ''}`.toLowerCase();

    const cleanEvidence = CLEAN_EVIDENCE_REGEX.test(all);
    const accidentRisk = /\baccident\b/.test(all) && !cleanEvidence;
    const isRisk = HARD_RISK_REGEX.test(all) || accidentRisk;

    // Explicit damage/title risk dominates regardless of geography.
    if (isRisk) return 'US_RISK';

    if (/\btgf\b|tewtel|\bcompany\b|\bofficial\b|\bagency\b|authoriz(?:ed|ed dealer)|main dealer|dealer source/.test(all)) {
        return 'COMPANY';
    }
    if (/\bgcc\b|\bgulf\b|\buae\b|\bdubai\b|\bqatar\b|\bkuwait\b|\bsaudi\b|\boman\b|\bbahrain\b|khaleeji|abu dhabi/.test(all)) {
        return 'GCC';
    }
    if (/\beurope(?:an)?\b|german(?:y)?\b|\beu\b/.test(all)) {
        return 'EUROPE';
    }
    if (/u\.s\.|\busa?\b|\bamerica(?:n)?\b|\bus source\b/.test(all)) {
        return 'US_CLEAN';
    }
    if (/\bcanad(?:a|ian)\b/.test(all)) {
        return 'CANADA';
    }
    if (/\bimport(?:ed)?\b/.test(all)) {
        return cleanEvidence ? 'GENERIC_IMPORT_CLEAN' : 'GENERIC_IMPORT_UNKNOWN';
    }
    return 'UNKNOWN';
}

/**
 * Classifies the source/origin of ONE local Lebanon listing anchor from its
 * title / reason / sourceName text — same rules as the submitted source.
 */
export function classifyAnchorSourceType(text: string | null | undefined): SubmittedVehicleSourceType {
    return classifySubmittedVehicleSource(text, '');
}

type LocalAnchorSourceInput = {
    title?: string | null;
    reason?: string | null;
    sourceName?: string | null;
    priceUsd?: number | null;
    sourceStrength?: 'exact' | 'near_exact' | 'same_model' | 'older_reference' | 'segment';
};

export type SourceMatchedLocalAnchors = {
    /** A priced local Lebanon anchor whose source/origin matches the submitted source. */
    found: boolean;
    count: number;
    bestPriceUsd: number | null;
    bestStrength: string | null;
    /** Source type of the matched anchor, else the strongest usable local anchor. */
    localAnchorSourceType: SubmittedVehicleSourceType | null;
};

const STRENGTH_RANK: Record<string, number> = {
    exact: 0, near_exact: 1, same_model: 2, older_reference: 3, segment: 4,
};

/**
 * Detects Lebanon local anchors whose ORIGIN matches the submitted source (e.g.
 * a European-source request matched to European/German-source Lebanon listings).
 * Used to keep the valuation on the direct (local) path — no import duty — when
 * the car is already priced in Lebanon.
 */
export function detectSourceMatchedLocalAnchors(
    anchors: LocalAnchorSourceInput[] | undefined,
    submittedSource: SubmittedVehicleSourceType,
): SourceMatchedLocalAnchors {
    const usable = (anchors ?? []).filter(
        (a) => typeof a.priceUsd === 'number' && (a.priceUsd as number) > 0,
    );

    if (usable.length === 0) {
        return { found: false, count: 0, bestPriceUsd: null, bestStrength: null, localAnchorSourceType: null };
    }

    let count = 0;
    let best: LocalAnchorSourceInput | null = null;

    for (const a of usable) {
        const t = classifyAnchorSourceType(`${a.title || ''} ${a.reason || ''} ${a.sourceName || ''}`);
        if (submittedSource !== 'UNKNOWN' && t === submittedSource) {
            count++;
            const rank = STRENGTH_RANK[a.sourceStrength ?? 'segment'] ?? 5;
            const bestRank = best ? (STRENGTH_RANK[best.sourceStrength ?? 'segment'] ?? 5) : 99;
            if (rank < bestRank) best = a;
        }
    }

    // Fallback source type: strongest usable local anchor's classified origin.
    const strongest = [...usable].sort(
        (a, b) => (STRENGTH_RANK[a.sourceStrength ?? 'segment'] ?? 5) - (STRENGTH_RANK[b.sourceStrength ?? 'segment'] ?? 5),
    )[0];
    const fallbackType = strongest
        ? classifyAnchorSourceType(`${strongest.title || ''} ${strongest.reason || ''} ${strongest.sourceName || ''}`)
        : null;

    return {
        found: count > 0,
        count,
        bestPriceUsd: best ? (best.priceUsd as number) : null,
        bestStrength: best ? (best.sourceStrength ?? null) : null,
        localAnchorSourceType: best ? submittedSource : fallbackType,
    };
}

/**
 * Source multiplier relative to the COMPANY baseline (company = 1.00).
 * Returns null for UNKNOWN (no source adjustment applied).
 */
export function getFallbackSourceMultiplier(
    type: SubmittedVehicleSourceType,
): { factor: number; reason: string } | null {
    switch (type) {
        case 'COMPANY':
            return { factor: 1.0, reason: 'Company/official source — strongest Lebanon buyer confidence (baseline).' };
        case 'GCC':
            return { factor: 0.985, reason: 'GCC source — very strong, priced just below company/official.' };
        case 'EUROPE':
            return { factor: 0.955, reason: 'European/Germany source — good, below company/GCC unless local warranty/registration confirmed.' };
        case 'US_CLEAN':
            return { factor: 0.925, reason: 'U.S. clean-title source — no accident penalty, but Lebanon resale/warranty perception keeps it below company/GCC/Europe.' };
        case 'CANADA':
            return { factor: 0.925, reason: 'Canada source — treated like clean U.S./North-America source.' };
        case 'US_RISK':
            return { factor: 0.80, reason: 'U.S./import with accident/salvage/title risk — major resale discount; dealer buy priced very conservatively.' };
        case 'GENERIC_IMPORT_CLEAN':
            return { factor: 0.97, reason: 'Generic import with clean documentation — small buyer-confidence buffer.' };
        case 'GENERIC_IMPORT_UNKNOWN':
            return { factor: 0.95, reason: 'Generic import without confirmed clean documentation — 5% conservative buffer.' };
        case 'UNKNOWN':
        default:
            return null;
    }
}

/** Per-year model-year aging (new-old-stock) for exotic/new-luxury vehicles. */
const AGING_PER_YEAR = 0.0375;
const AGING_MAX = 0.10;

export function getModelYearAgingFactor(params: {
    modelYear: number;
    currentYear: number;
    mileageKm: number;
    exceptionalSpec: boolean;
}): { factor: number; reason: string } | null {
    const { modelYear, currentYear, mileageKm, exceptionalSpec } = params;

    const yearsOld = currentYear - modelYear;
    // Only age new-old-stock: older model year AND effectively unused/low mileage.
    if (yearsOld <= 0 || mileageKm > 15_000 || exceptionalSpec) return null;

    const discount = Math.min(AGING_MAX, AGING_PER_YEAR * yearsOld);
    if (discount <= 0) return null;

    return {
        factor: 1 - discount,
        reason: `Model-year aging: a ${modelYear} 0 km car valued in ${currentYear} is not the newest model year; applied ${(discount * 100).toFixed(1)}% new-old-stock discount vs a current-year 0 km equivalent.`,
    };
}

export type FallbackSourceCalibrationResult = {
    applied: boolean;
    market: UsdRange;
    /** Source-independent company-level baseline midpoint (aged, pre source multiplier). */
    companyBaselineMid: number | null;
    submittedVehicleSourceType: SubmittedVehicleSourceType;
    sourceHierarchyAdjustmentFactor: number | null;
    sourceHierarchyAdjustmentReason: string | null;
    modelYearAgingAdjustmentApplied: boolean;
    modelYearAgingAdjustmentReason: string | null;
    /** Cap on market max applied when the aged company baseline was clamped. */
    marketMaxCapApplied: boolean;
};

/**
 * Produces the source-adjusted market range for a Lebanon fallback exotic /
 * new-luxury vehicle. `regionalBaseMid` should be the UAE-preferred landed
 * midpoint (a company/GCC-level regional benchmark), so the result is
 * independent of which anchor market happened to be chosen.
 */
export function applyLebanonFallbackSourceHierarchy(params: {
    specs: string | null | undefined;
    notes: string | null | undefined;
    tier: BrandTier;
    isPerformanceLuxury: boolean;
    modelYear: number;
    currentYear: number;
    mileageKm: number;
    regionalBaseMid: number;
    marketSpread: number;
    /** Optional absolute cap on the company-baseline market max (safety). */
    companyMarketMaxCap?: number;
}): FallbackSourceCalibrationResult {
    const {
        specs,
        notes,
        tier,
        isPerformanceLuxury,
        modelYear,
        currentYear,
        mileageKm,
        regionalBaseMid,
        marketSpread,
        companyMarketMaxCap,
    } = params;

    const submittedVehicleSourceType = classifySubmittedVehicleSource(specs, notes);

    const noop: FallbackSourceCalibrationResult = {
        applied: false,
        market: { min: 0, max: 0 },
        companyBaselineMid: null,
        submittedVehicleSourceType,
        sourceHierarchyAdjustmentFactor: null,
        sourceHierarchyAdjustmentReason: null,
        modelYearAgingAdjustmentApplied: false,
        modelYearAgingAdjustmentReason: null,
        marketMaxCapApplied: false,
    };

    // Only exotic / new-luxury / performance vehicles are calibrated here.
    if (!(tier === 'exotic' || isPerformanceLuxury)) return noop;
    if (!Number.isFinite(regionalBaseMid) || regionalBaseMid <= 0) return noop;

    const exceptionalSpec = EXCEPTIONAL_SPEC_REGEX.test(`${specs || ''} ${notes || ''}`);

    const aging = getModelYearAgingFactor({ modelYear, currentYear, mileageKm, exceptionalSpec });
    const sourceMult = getFallbackSourceMultiplier(submittedVehicleSourceType);

    // Nothing to adjust (current-year car + unclassified source) → leave as-is.
    if (!aging && !sourceMult) return noop;

    const half = Math.max(1000, Math.round(marketSpread / 2));

    // Company-level baseline = regional benchmark aged for new-old-stock.
    let companyBaselineMid = regionalBaseMid * (aging?.factor ?? 1);

    // Safety cap on the company market max (e.g. don't exceed ~780k for a
    // Revuelto without exceptional spec).
    let marketMaxCapApplied = false;
    if (!exceptionalSpec && typeof companyMarketMaxCap === 'number' && companyMarketMaxCap > 0) {
        const cappedMid = companyMarketMaxCap - half;
        if (companyBaselineMid > cappedMid) {
            companyBaselineMid = cappedMid;
            marketMaxCapApplied = true;
        }
    }

    const finalMid = companyBaselineMid * (sourceMult?.factor ?? 1);

    let min = roundTo(finalMid - half, 100);
    let max = roundTo(finalMid + half, 100);
    if (min < 1000) min = 1000;
    if (max <= min) max = min + 1000;

    const overallFactor = finalMid / regionalBaseMid;

    const reasonParts: string[] = [];
    if (sourceMult) reasonParts.push(sourceMult.reason);
    if (aging) reasonParts.push(aging.reason);

    return {
        applied: true,
        market: { min, max },
        companyBaselineMid: Math.round(companyBaselineMid),
        submittedVehicleSourceType,
        sourceHierarchyAdjustmentFactor: Number(overallFactor.toFixed(4)),
        sourceHierarchyAdjustmentReason: reasonParts.join(' ') || null,
        modelYearAgingAdjustmentApplied: !!aging,
        modelYearAgingAdjustmentReason: aging?.reason ?? null,
        marketMaxCapApplied,
    };
}
