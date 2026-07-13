import { LebanonImportRulesJson } from './types';

/**
 * Built-in fallback rules used when no admin-uploaded rule document is active.
 * Mirrors the currently known Lebanon customs regime. Responses that used
 * these are flagged with `usedDefaultRules: true` so admins know a PDF
 * should be uploaded.
 */
export const DEFAULT_LEBANON_RULE_VERSION = 'default-lebanon-rules';

export const DEFAULT_LEBANON_IMPORT_RULES: LebanonImportRulesJson = {
    region: 'LEBANON',
    version: DEFAULT_LEBANON_RULE_VERSION,
    currency: 'USD',
    effectiveDate: null,
    rules: [
        {
            fuelCategory: 'electric',
            customsRate: 0,
            vatRate: 0.11,
            daribehRate: 0.03,
            totalRate: 0.14,
        },
        {
            fuelCategory: 'hybrid',
            minMileageKm: 0,
            maxMileageKm: 5000,
            customsRate: 0.04,
            vatRate: 0.11,
            daribehRate: 0.03,
            totalRate: 0.18,
        },
        {
            fuelCategory: 'plug_in_hybrid',
            minMileageKm: 0,
            maxMileageKm: 5000,
            customsRate: 0.04,
            vatRate: 0.11,
            daribehRate: 0.03,
            totalRate: 0.18,
        },
        {
            fuelCategory: 'mild_hybrid',
            minMileageKm: 0,
            maxMileageKm: 5000,
            customsRate: 0.04,
            vatRate: 0.11,
            daribehRate: 0.03,
            totalRate: 0.18,
        },
        {
            fuelCategory: 'hybrid',
            minMileageKm: 5001,
            totalRate: 0.63,
            notes: 'Hybrid above 5,000 km treated like gasoline.',
        },
        {
            fuelCategory: 'plug_in_hybrid',
            minMileageKm: 5001,
            totalRate: 0.63,
            notes: 'Plug-in hybrid above 5,000 km treated like gasoline.',
        },
        {
            fuelCategory: 'mild_hybrid',
            minMileageKm: 5001,
            totalRate: 0.63,
            notes: 'Mild hybrid above 5,000 km treated like gasoline.',
        },
        {
            fuelCategory: 'gasoline',
            totalRate: 0.63,
            notes: 'Includes customs, 11% VAT, and 3% daribeh.',
        },
        {
            fuelCategory: 'diesel',
            totalRate: 0.63,
            notes: 'Treated like gasoline.',
        },
    ],
    rawSummary:
        'Electric vehicles pay 0% customs, 11% VAT and 3% daribeh (14% total). Hybrid, plug-in hybrid and mild hybrid vehicles at or under 5,000 km pay 4% customs, 11% VAT and 3% daribeh (18% total). Hybrid vehicles above 5,000 km are treated like gasoline. Gasoline and diesel vehicles pay 63% total including customs, VAT and daribeh.',
};
