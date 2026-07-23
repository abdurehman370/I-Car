import { FuelCategory } from '../importRules/types';

/**
 * Lebanon import-duty mileage threshold detection.
 *
 * This REPLACES the old mileage-monotonicity guard. Mileage should normally
 * reduce value (handled by prompt reasoning + local comps), but we no longer
 * force a hard backend cap. In Lebanon a hybrid / plug-in hybrid / mild-hybrid
 * vehicle above 5,000 km moves from the reduced hybrid duty class (18%) to the
 * gasoline-equivalent 63% class, which can legitimately raise the landed-cost
 * benchmark above a 0 km equivalent. We only surface this as explanatory
 * metadata — we never override the import-duty calculator with a lower-mileage
 * ceiling.
 */

export const HYBRID_DUTY_FAMILY: FuelCategory[] = [
    'hybrid',
    'plug_in_hybrid',
    'mild_hybrid',
];

export const LEBANON_HYBRID_DUTY_THRESHOLD_KM = 5_000;

export type ImportDutyMileageThreshold = {
    /** True when mileage pushed a hybrid-family vehicle past the 5,000 km duty threshold. */
    mileageImportDutyThresholdCrossed: boolean;
    /** Human-readable explanation, or null when the threshold is not relevant. */
    importDutyMileageReason: string | null;
};

/**
 * Returns whether the Lebanon hybrid/PHEV/mild-hybrid import-duty class changes
 * because mileage exceeds 5,000 km. Purely informational — it does not change
 * any price.
 */
export function getImportDutyMileageThreshold(
    fuelCategory: FuelCategory | undefined | null,
    mileageKm: number | null | undefined
): ImportDutyMileageThreshold {
    const fuel = (fuelCategory ?? 'unknown') as FuelCategory;
    const km = typeof mileageKm === 'number' && Number.isFinite(mileageKm) ? mileageKm : 0;

    if (HYBRID_DUTY_FAMILY.includes(fuel) && km > LEBANON_HYBRID_DUTY_THRESHOLD_KM) {
        return {
            mileageImportDutyThresholdCrossed: true,
            importDutyMileageReason:
                'Vehicle mileage exceeds 5,000 km, so Lebanon hybrid/PHEV/mild-hybrid import-duty treatment changes from the reduced hybrid class to the gasoline-equivalent 63% class.',
        };
    }

    return {
        mileageImportDutyThresholdCrossed: false,
        importDutyMileageReason: null,
    };
}
