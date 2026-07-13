import { z } from 'zod';

export type FuelCategory =
    | 'electric'
    | 'hybrid'
    | 'plug_in_hybrid'
    | 'mild_hybrid'
    | 'gasoline'
    | 'diesel'
    | 'unknown';

export const FUEL_CATEGORIES: FuelCategory[] = [
    'electric',
    'hybrid',
    'plug_in_hybrid',
    'mild_hybrid',
    'gasoline',
    'diesel',
    'unknown',
];

export const FuelCategorySchema = z.enum([
    'electric',
    'hybrid',
    'plug_in_hybrid',
    'mild_hybrid',
    'gasoline',
    'diesel',
    'unknown',
]);

export const LebanonImportRuleSchema = z.object({
    fuelCategory: FuelCategorySchema,
    minMileageKm: z.number().int().nonnegative().nullable().optional(),
    maxMileageKm: z.number().int().nonnegative().nullable().optional(),
    customsRate: z.number().min(0).max(2).nullable().optional(),
    vatRate: z.number().min(0).max(1).nullable().optional(),
    daribehRate: z.number().min(0).max(1).nullable().optional(),
    totalRate: z.number().min(0).max(3),
    notes: z.string().nullable().optional(),
});

export type LebanonImportRule = z.infer<typeof LebanonImportRuleSchema>;

export const LebanonImportRulesJsonSchema = z.object({
    region: z.literal('LEBANON'),
    version: z.string().min(1),
    sourceDocumentId: z.string().optional(),
    currency: z.literal('USD'),
    effectiveDate: z.string().nullable().optional(),
    rules: z.array(LebanonImportRuleSchema).min(1),
    rawSummary: z.string(),
});

export type LebanonImportRulesJson = z.infer<typeof LebanonImportRulesJsonSchema>;

export type UsdRange = { min: number; max: number };

export type LebanonImportCostResult = {
    applied: boolean;
    ruleVersion: string;
    fuelCategory: FuelCategory;
    matchedFuelCategory: FuelCategory;
    mileageKm: number | null;
    taxRateApplied: number;
    sourceMarketPriceUsd: UsdRange;
    estimatedTaxUsd: UsdRange;
    landedCostUsd: UsdRange;
    warnings: string[];
};

export type ActiveImportRules = {
    rules: LebanonImportRulesJson;
    isDefaultRules: boolean;
    documentId: number | null;
};
