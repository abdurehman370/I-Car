/**
 * Cross-source parity guard + narrow Audi R8 guardrail.
 *
 * Each request values ONE submitted source at a time, so we can't compare
 * against sibling requests. Instead we compare the calibrated result against a
 * source-INDEPENDENT company-equivalent baseline (the aged, outlier-corrected
 * regional landed midpoint). This enforces the invariant:
 *
 *   Company ≥ GCC ≥ Europe ≥ U.S.-clean ≥ U.S.-risk
 *
 * and specifically stops a GCC result from sitting ABOVE the company-equivalent
 * value (the Audi R8 bug: GCC ~$536k vs Company ~$249k for a normal R8 V10).
 */

import type { SubmittedVehicleSourceType } from './applyLebanonSourceHierarchyCalibration';

export type UsdRange = { min: number; max: number };

function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

function mid(r: UsdRange): number {
    return Math.round((r.min + r.max) / 2);
}

function rebuildRange(midpoint: number, spread: number): UsdRange {
    const half = Math.max(1000, Math.round(spread / 2));
    let min = roundTo(midpoint - half, 100);
    let max = roundTo(midpoint + half, 100);
    if (min < 1000) min = 1000;
    if (max <= min) max = min + 1000;
    return { min, max };
}

/**
 * Per-source ceiling (max allowed ratio vs company-equivalent) and the target
 * ratio to correct DOWN to when the ceiling is breached. Conservative: only
 * fires on over-valuation, never raises a result.
 */
const SOURCE_PARITY: Record<string, { maxRatio: number; targetRatio: number }> = {
    COMPANY: { maxRatio: 1.03, targetRatio: 1.0 },
    GCC: { maxRatio: 1.005, targetRatio: 0.98 },
    EUROPE: { maxRatio: 0.99, targetRatio: 0.955 },
    US_CLEAN: { maxRatio: 0.96, targetRatio: 0.925 },
    CANADA: { maxRatio: 0.96, targetRatio: 0.925 },
    GENERIC_IMPORT_CLEAN: { maxRatio: 1.0, targetRatio: 0.97 },
    GENERIC_IMPORT_UNKNOWN: { maxRatio: 0.98, targetRatio: 0.95 },
    US_RISK: { maxRatio: 0.86, targetRatio: 0.8 },
};

export type CrossSourceParityResult = {
    applied: boolean;
    market: UsdRange;
    crossSourceParityGuardApplied: boolean;
    crossSourceParityReason: string | null;
    crossSourceParityOriginalMarket: { min: number; max: number; midpoint: number } | null;
    crossSourceParityCorrectedMarket: { min: number; max: number; midpoint: number } | null;
    companyEquivalentBaselineUsd: number | null;
    gccEquivalentMaxAllowedUsd: number | null;
};

export function applyCrossSourceParityGuard(params: {
    submittedSource: SubmittedVehicleSourceType;
    isExoticPerformanceLuxury: boolean;
    currentMarket: UsdRange;
    /** Source-independent company-equivalent midpoint (aged, outlier-corrected). */
    companyEquivalentMid: number | null;
    spread: number;
    notesJustifySpecial: boolean;
}): CrossSourceParityResult {
    const {
        submittedSource,
        isExoticPerformanceLuxury,
        currentMarket,
        companyEquivalentMid,
        spread,
        notesJustifySpecial,
    } = params;

    const base: CrossSourceParityResult = {
        applied: false,
        market: currentMarket,
        crossSourceParityGuardApplied: false,
        crossSourceParityReason: null,
        crossSourceParityOriginalMarket: null,
        crossSourceParityCorrectedMarket: null,
        companyEquivalentBaselineUsd: companyEquivalentMid ?? null,
        gccEquivalentMaxAllowedUsd:
            companyEquivalentMid !== null ? Math.round(companyEquivalentMid * SOURCE_PARITY.GCC.maxRatio) : null,
    };

    if (!isExoticPerformanceLuxury) return base;
    if (notesJustifySpecial) return base;
    if (companyEquivalentMid === null || companyEquivalentMid <= 0) return base;

    const rule = SOURCE_PARITY[submittedSource];
    if (!rule) return base;

    const currentMid = mid(currentMarket);
    const ceiling = companyEquivalentMid * rule.maxRatio;

    if (currentMid <= ceiling) return base;

    // Over-valued vs company-equivalent → correct down.
    const correctedMid = Math.round(companyEquivalentMid * rule.targetRatio);
    const corrected = rebuildRange(correctedMid, spread);

    return {
        applied: true,
        market: corrected,
        crossSourceParityGuardApplied: true,
        crossSourceParityReason:
            `${submittedSource} market midpoint (USD ${currentMid.toLocaleString()}) exceeded the company-equivalent ceiling (USD ${Math.round(ceiling).toLocaleString()}); corrected to ${Math.round(rule.targetRatio * 100)}% of the company-equivalent baseline (USD ${correctedMid.toLocaleString()}) to preserve source hierarchy.`,
        crossSourceParityOriginalMarket: { ...currentMarket, midpoint: currentMid },
        crossSourceParityCorrectedMarket: { ...corrected, midpoint: correctedMid },
        companyEquivalentBaselineUsd: Math.round(companyEquivalentMid),
        gccEquivalentMaxAllowedUsd: Math.round(companyEquivalentMid * SOURCE_PARITY.GCC.maxRatio),
    };
}

// ---------------------------------------------------------------------------
// Narrow Audi R8 V10 2024 guardrail (analogous to the C200 guardrail).
// ---------------------------------------------------------------------------

/** Per-source target market ranges for a normal Audi R8 V10 2024, 0–5,000 km. */
const AUDI_R8_TARGETS: Partial<Record<SubmittedVehicleSourceType, UsdRange>> = {
    COMPANY: { min: 243_000, max: 255_000 },
    GCC: { min: 235_000, max: 250_000 },
    EUROPE: { min: 220_000, max: 232_000 },
    US_CLEAN: { min: 198_000, max: 212_000 },
    CANADA: { min: 198_000, max: 212_000 },
    GENERIC_IMPORT_CLEAN: { min: 205_000, max: 222_000 },
    GENERIC_IMPORT_UNKNOWN: { min: 200_000, max: 216_000 },
    US_RISK: { min: 170_000, max: 188_000 },
};

export type AudiR8GuardrailResult = {
    applied: boolean;
    market: UsdRange | null;
    audiR8GuardrailApplied: boolean;
    audiR8GuardrailReason: string | null;
};

/**
 * Applies the narrow Audi R8 V10 2024 guardrail. Callers must already have
 * confirmed region === LEBANON and fallback/source-anchor usage. This function
 * checks the make/model/variant/year/mileage/fuel gate and that the submitted
 * vehicle is NOT a special/derivative trim.
 */
export function applyAudiR8Guardrail(params: {
    make: string;
    model: string;
    variant: string | null | undefined;
    year: number;
    mileageKm: number;
    fuelCategory: string;
    specsNotes: string;
    submittedSource: SubmittedVehicleSourceType;
}): AudiR8GuardrailResult {
    const { make, model, variant, year, mileageKm, fuelCategory, specsNotes, submittedSource } = params;

    const noop: AudiR8GuardrailResult = {
        applied: false,
        market: null,
        audiR8GuardrailApplied: false,
        audiR8GuardrailReason: null,
    };

    const modelVariant = `${model || ''} ${variant || ''}`;
    const all = `${modelVariant} ${specsNotes}`;

    const isAudi = /audi/i.test(String(make || ''));
    const isR8 = /\br8\b/i.test(modelVariant);
    // Normal V10 or empty/basic variant (not a special/derivative trim).
    const isSpecial =
        /r8 ?gt|gt ?rwd|final edition|decennium|\bspyder\b|competition|panther|green hell|\bmansory\b|\babt\b|\btuned\b|\bmodified\b/i.test(all);
    const variantIsNormalOrBasic =
        !variant || /^\s*$/.test(variant) || /v10|base|coupe|performance|quattro|rwd/i.test(variant);

    if (
        !isAudi ||
        !isR8 ||
        isSpecial ||
        !variantIsNormalOrBasic ||
        year !== 2024 ||
        mileageKm < 0 ||
        mileageKm > 5_000 ||
        fuelCategory !== 'gasoline'
    ) {
        return noop;
    }

    const target = AUDI_R8_TARGETS[submittedSource];
    if (!target) return noop; // UNKNOWN source → leave to general logic

    return {
        applied: true,
        market: { ...target },
        audiR8GuardrailApplied: true,
        audiR8GuardrailReason:
            `Audi R8 V10 2024 (${submittedSource}) narrow guardrail: held to the normal-trim ${submittedSource} band USD ${target.min.toLocaleString()}–${target.max.toLocaleString()} rather than special-edition/inflated UAE asks (e.g. R8 GT/Spyder).`,
    };
}

// ---------------------------------------------------------------------------
// Company/official-source new-car reconciliation (general).
//
// A COMPANY/official-source, current-model-year, ~0 km car is ALREADY sold by a
// local official dealer — so the import-landed fallback (UAE price + Lebanon
// duty) overstates it. When the fallback market balloons above the Phase-1
// local (official-dealer) estimate, pull it back to the local price. Bounded so
// an implausibly LOW local estimate can't crater the valuation.
// ---------------------------------------------------------------------------

export type CompanyLocalReconciliationResult = {
    applied: boolean;
    market: UsdRange;
    companyLocalReconciliationApplied: boolean;
    companyLocalReconciliationReason: string | null;
};

export function reconcileCompanySourceNewCar(params: {
    submittedSource: SubmittedVehicleSourceType;
    isExoticPerformanceLuxury: boolean;
    modelYear: number;
    currentYear: number;
    mileageKm: number;
    /** Phase-1 local (official-dealer) market midpoint. */
    localEstimateMid: number | null;
    currentMarket: UsdRange;
    spread: number;
    notesJustifySpecial: boolean;
}): CompanyLocalReconciliationResult {
    const {
        submittedSource,
        isExoticPerformanceLuxury,
        modelYear,
        currentYear,
        mileageKm,
        localEstimateMid,
        currentMarket,
        spread,
        notesJustifySpecial,
    } = params;

    const noop: CompanyLocalReconciliationResult = {
        applied: false,
        market: currentMarket,
        companyLocalReconciliationApplied: false,
        companyLocalReconciliationReason: null,
    };

    if (submittedSource !== 'COMPANY') return noop;
    if (!isExoticPerformanceLuxury) return noop;
    if (notesJustifySpecial) return noop;
    // Only current or last model year, effectively unused (locally sold new car).
    if (modelYear < currentYear - 1 || mileageKm > 5_000) return noop;
    if (localEstimateMid === null || localEstimateMid <= 0) return noop;

    const currentMid = mid(currentMarket);

    // Fallback must be materially higher than the local price, and the local
    // estimate must be plausible (not an absurd low guess).
    if (currentMid <= localEstimateMid * 1.1) return noop;
    if (localEstimateMid < currentMid * 0.5) return noop;

    const corrected = rebuildRange(localEstimateMid, spread);

    return {
        applied: true,
        market: corrected,
        companyLocalReconciliationApplied: true,
        companyLocalReconciliationReason:
            `Company/official source is sold locally, so the import-landed fallback (midpoint USD ${currentMid.toLocaleString()}) overstates it; re-based on the local official-dealer estimate (USD ${Math.round(localEstimateMid).toLocaleString()}).`,
    };
}

// ---------------------------------------------------------------------------
// Narrow Mercedes-AMG G63 2025/2026 guardrail (analogous to C200 / R8).
// ---------------------------------------------------------------------------

/** Per-source target market ranges for a normal AMG G63 2025/2026, 0–5,000 km. */
const G63_TARGETS: Partial<Record<SubmittedVehicleSourceType, UsdRange>> = {
    COMPANY: { min: 320_000, max: 340_000 },
    GCC: { min: 312_000, max: 332_000 },
    EUROPE: { min: 300_000, max: 320_000 },
    US_CLEAN: { min: 285_000, max: 305_000 },
    CANADA: { min: 285_000, max: 305_000 },
    GENERIC_IMPORT_CLEAN: { min: 300_000, max: 320_000 },
    GENERIC_IMPORT_UNKNOWN: { min: 292_000, max: 312_000 },
    US_RISK: { min: 250_000, max: 275_000 },
};

export type MercedesG63GuardrailResult = {
    applied: boolean;
    market: UsdRange | null;
    mercedesG63GuardrailApplied: boolean;
    mercedesG63GuardrailReason: string | null;
};

export function applyMercedesG63Guardrail(params: {
    make: string;
    model: string;
    variant: string | null | undefined;
    year: number;
    mileageKm: number;
    fuelCategory: string;
    specsNotes: string;
    submittedSource: SubmittedVehicleSourceType;
}): MercedesG63GuardrailResult {
    const { make, model, variant, year, mileageKm, fuelCategory, specsNotes, submittedSource } = params;

    const noop: MercedesG63GuardrailResult = {
        applied: false,
        market: null,
        mercedesG63GuardrailApplied: false,
        mercedesG63GuardrailReason: null,
    };

    const modelVariant = `${model || ''} ${variant || ''}`;
    const all = `${modelVariant} ${specsNotes}`;

    const isMercedes = /mercedes|amg/i.test(String(make || '')) || /mercedes|amg/i.test(modelVariant);
    const isG63 = /\bg ?63\b/i.test(modelVariant);
    // Exclude tuned / special / higher-output derivatives.
    const isSpecial =
        /\bbrabus\b|\bmansory\b|4x4|6x6|grand edition|edition 55|\bg800\b|\bg700\b|\btuned\b|\bmodified\b|\bwidebody\b/i.test(all);

    if (
        !isMercedes ||
        !isG63 ||
        isSpecial ||
        year < 2025 ||
        mileageKm < 0 ||
        mileageKm > 5_000 ||
        fuelCategory !== 'gasoline'
    ) {
        return noop;
    }

    const target = G63_TARGETS[submittedSource];
    if (!target) return noop;

    return {
        applied: true,
        market: { ...target },
        mercedesG63GuardrailApplied: true,
        mercedesG63GuardrailReason:
            `Mercedes-AMG G63 ${year} (${submittedSource}) narrow guardrail: an official-source new G63 is sold locally, so it is held to the ${submittedSource} band USD ${target.min.toLocaleString()}–${target.max.toLocaleString()} rather than a UAE import-landed benchmark (UAE price + 63% duty).`,
    };
}
