import { z } from 'zod';
import { FuelCategorySchema } from './importRules/types';

const PriceSchema = z.object({
    currency: z.enum(['USD', 'AED', 'EUR']),
    min: z.number().int().positive(),
    max: z.number().int().positive(),
}).refine((value) => value.min < value.max, {
    message: 'Price min must be lower than max',
});

const UsdPriceSchema = z.object({
    currency: z.literal('USD'),
    min: z.number().int().positive(),
    max: z.number().int().positive(),
}).refine((value) => value.min < value.max, {
    message: 'USD price min must be lower than max',
});

const UsdRangeSchema = z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
}).refine((value) => value.min <= value.max, {
    message: 'Range min must be lower than or equal to max',
});

export const FallbackMarketSchema = z.enum(['UAE', 'EUROPE', 'US', 'CANADA', 'CHINA', 'OTHER']);

export const LocalPriceAnchorSchema = z.object({
    title: z.string(),
    sourceName: z.string().nullable(),
    url: z.string().nullable(),
    year: z.number().int().nullable(),
    mileageKm: z.number().int().nonnegative().nullable(),
    priceUsd: z.number().positive().nullable(),
    currency: z.enum(['USD', 'LBP', 'EUR', 'AED', 'OTHER']).nullable(),
    sourceStrength: z.enum(['exact', 'near_exact', 'same_model', 'older_reference', 'segment']),
    reason: z.string(),
});

export type LocalPriceAnchor = z.infer<typeof LocalPriceAnchorSchema>;

export const LocalMarketAssessmentSchema = z.object({
    strongComparableCount: z.number().int().nonnegative(),
    totalComparableCount: z.number().int().nonnegative(),
    hasExactVerifiedLocalMatch: z.boolean(),
    localCompsStrength: z.enum(['strong', 'medium', 'weak']),
    reason: z.string(),
    // Direct-anchor calibration fields (optional for backward compatibility)
    hasUsableDirectLebanonAnchor: z.boolean().optional(),
    directLebanonAnchorReason: z.string().optional(),
    directLebanonAnchorPriceUsd: z.number().nonnegative().nullable().optional(),
    localPriceAnchors: z.array(LocalPriceAnchorSchema).optional(),
    sourceRiskLevel: z.enum(['low', 'medium', 'high']).optional(),
    sourceRiskReason: z.string().optional(),
});

export const SourceMarketAnchorSchema = z.object({
    market: FallbackMarketSchema,
    currency: z.enum(['AED', 'EUR', 'USD', 'CAD', 'CNY', 'OTHER']),
    price: UsdRangeSchema,
    priceUsd: UsdRangeSchema,
    comparableCount: z.number().int().nonnegative(),
    reason: z.string(),
});

export const ImportCalculationSchema = z.object({
    applied: z.boolean(),
    ruleVersion: z.string().nullable(),
    usedDefaultRules: z.boolean().optional(),
    sourceMarket: FallbackMarketSchema.nullable(),
    fuelCategory: FuelCategorySchema.nullable(),
    taxRateApplied: z.number().nullable(),
    sourceMarketPriceUsd: UsdRangeSchema.nullable(),
    estimatedTaxUsd: UsdRangeSchema.nullable(),
    landedCostUsd: UsdRangeSchema.nullable(),
    warnings: z.array(z.string()).optional(),
});

const VehicleSchema = z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    variant: z.string().nullable(),
    year: z.number().int(),
    mileageKm: z.number().int().nonnegative().nullable(),
    mileageRangeKm: z.object({
        min: z.number().int().nonnegative(),
        max: z.number().int().nonnegative(),
    }).refine((value) => value.min <= value.max, {
        message: 'Mileage range min must be lower than or equal to max',
    }).nullable(),
    specs: z.string().nullable(),
    notes: z.string().nullable(),
});

// Shared base shape used by the standard result and the Lebanon phases.
const valuationBaseShape = {
    region: z.enum(['LEBANON', 'UAE', 'EUROPE']),
    vehicle: VehicleSchema,
    marketPrice: PriceSchema,
    marketPriceUsd: UsdPriceSchema.nullable(),
    dealerBuyPrice: PriceSchema,
    dealerBuyPriceUsd: UsdPriceSchema.nullable(),
    fallbackUsed: z.boolean(),
    fallbackLevel: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
    ]),
    mileageFallbackUsed: z.boolean(),
    sourceMarketAnchorUsed: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    shortReason: z.string().min(1),
} as const;

function applyRegionRefinements(value: any, ctx: z.RefinementCtx) {
    if (value.dealerBuyPrice.max >= value.marketPrice.max) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['dealerBuyPrice'],
            message: 'Dealer buy price max must be lower than market price max',
        });
    }

    if (value.region === 'UAE') {
        if (value.marketPrice.currency !== 'AED') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['marketPrice', 'currency'],
                message: 'UAE primary currency must be AED',
            });
        }

        if (value.dealerBuyPrice.currency !== 'AED') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['dealerBuyPrice', 'currency'],
                message: 'UAE dealer buy currency must be AED',
            });
        }

        if (!value.marketPriceUsd || !value.dealerBuyPriceUsd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['marketPriceUsd'],
                message: 'UAE valuation must include USD conversions',
            });
        }
    }

    if (value.region === 'EUROPE') {
        if (value.marketPrice.currency !== 'EUR') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['marketPrice', 'currency'],
                message: 'Europe primary currency must be EUR',
            });
        }

        if (value.dealerBuyPrice.currency !== 'EUR') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['dealerBuyPrice', 'currency'],
                message: 'Europe dealer buy currency must be EUR',
            });
        }

        if (!value.marketPriceUsd || !value.dealerBuyPriceUsd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['marketPriceUsd'],
                message: 'Europe valuation must include USD conversions',
            });
        }
    }

    if (value.region === 'LEBANON') {
        if (value.marketPrice.currency !== 'USD') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['marketPrice', 'currency'],
                message: 'Lebanon primary currency must be USD',
            });
        }

        if (value.dealerBuyPrice.currency !== 'USD') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['dealerBuyPrice', 'currency'],
                message: 'Lebanon dealer buy currency must be USD',
            });
        }
    }
}

/**
 * Final valuation result — the original fields plus OPTIONAL Lebanon
 * fallback fields, so existing UAE/EUROPE (and legacy Lebanon) responses
 * remain fully backward compatible.
 */
export const ValuationResultSchema = z.object({
    ...valuationBaseShape,
    localMarketAssessment: LocalMarketAssessmentSchema.optional(),
    fuelCategory: FuelCategorySchema.optional(),
    fallbackMarketsUsed: z.array(FallbackMarketSchema).optional(),
    sourceMarketAnchors: z.array(SourceMarketAnchorSchema).optional(),
    importCalculation: ImportCalculationSchema.optional(),
}).superRefine(applyRegionRefinements);

export type ValuationResult = z.infer<typeof ValuationResultSchema>;

/**
 * Phase 1 (Lebanon-only): local market assessment. The model must always
 * return its best direct Lebanon valuation PLUS the comparables assessment
 * and a fallback recommendation.
 */
export const LebanonAssessmentResultSchema = z.object({
    ...valuationBaseShape,
    localMarketAssessment: LocalMarketAssessmentSchema,
    fuelCategory: FuelCategorySchema,
    fallbackRequired: z.boolean(),
}).superRefine(applyRegionRefinements).superRefine((value: any, ctx: z.RefinementCtx) => {
    // A claimed direct local anchor MUST come with a numeric USD price —
    // otherwise the backend clamp cannot run and pricing drifts low.
    const a = value.localMarketAssessment;
    if (!a) return;

    const directPrice = a.directLebanonAnchorPriceUsd;
    const anchors: any[] = Array.isArray(a.localPriceAnchors) ? a.localPriceAnchors : [];

    const hasNumericStrongAnchor = anchors.some(
        (an) =>
            (an?.sourceStrength === 'exact' || an?.sourceStrength === 'near_exact') &&
            typeof an?.priceUsd === 'number' && an.priceUsd > 0
    );
    const hasAnyNumericUsableAnchor = anchors.some(
        (an) =>
            ['exact', 'near_exact', 'same_model'].includes(an?.sourceStrength) &&
            typeof an?.priceUsd === 'number' && an.priceUsd > 0
    );

    if (a.hasExactVerifiedLocalMatch === true) {
        const ok = (typeof directPrice === 'number' && directPrice > 0) || hasNumericStrongAnchor;
        if (!ok) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['localMarketAssessment', 'directLebanonAnchorPriceUsd'],
                message: 'hasExactVerifiedLocalMatch requires a positive numeric anchor price (directLebanonAnchorPriceUsd or an exact/near_exact localPriceAnchors entry)',
            });
        }
    }

    if (a.hasUsableDirectLebanonAnchor === true) {
        const ok = (typeof directPrice === 'number' && directPrice > 0) || hasAnyNumericUsableAnchor;
        if (!ok) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['localMarketAssessment', 'hasUsableDirectLebanonAnchor'],
                message: 'hasUsableDirectLebanonAnchor requires a positive numeric anchor price (directLebanonAnchorPriceUsd or a numeric localPriceAnchors entry)',
            });
        }
    }
});

export type LebanonAssessmentResult = z.infer<typeof LebanonAssessmentResultSchema>;

/**
 * Phase 2 (Lebanon-only): UAE + Europe fallback market research.
 * The model returns source-market anchors ONLY — the backend applies
 * Lebanon import duties deterministically.
 */
export const FallbackResearchSchema = z.object({
    fallbackMarketsUsed: z.array(z.enum(['UAE', 'EUROPE'])),
    sourceMarketAnchors: z.array(z.object({
        market: z.enum(['UAE', 'EUROPE']),
        currency: z.enum(['AED', 'EUR', 'USD']),
        price: UsdRangeSchema,
        priceUsd: UsdRangeSchema,
        comparableCount: z.number().int().nonnegative(),
        reason: z.string(),
    })),
    recommendedAnchorMarket: z.enum(['UAE', 'EUROPE']).nullable(),
    recommendedAnchorPriceUsd: UsdRangeSchema.nullable(),
    fuelCategory: FuelCategorySchema,
    confidence: z.enum(['high', 'medium', 'low']),
    reason: z.string(),
});

export type FallbackResearchResult = z.infer<typeof FallbackResearchSchema>;

// ---------------------------------------------------------------------------
// OpenAI strict JSON schemas
// ---------------------------------------------------------------------------

const FUEL_CATEGORY_ENUM = [
    'electric',
    'hybrid',
    'plug_in_hybrid',
    'mild_hybrid',
    'gasoline',
    'diesel',
    'unknown',
] as const;

const RANGE_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['min', 'max'],
    properties: {
        min: { type: 'integer' },
        max: { type: 'integer' },
    },
} as const;

export const OPENAI_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'region',
        'vehicle',
        'marketPrice',
        'marketPriceUsd',
        'dealerBuyPrice',
        'dealerBuyPriceUsd',
        'fallbackUsed',
        'fallbackLevel',
        'mileageFallbackUsed',
        'sourceMarketAnchorUsed',
        'confidence',
        'shortReason',
    ],
    properties: {
        region: {
            type: 'string',
            enum: ['LEBANON', 'UAE', 'EUROPE'],
        },
        vehicle: {
            type: 'object',
            additionalProperties: false,
            required: [
                'make',
                'model',
                'variant',
                'year',
                'mileageKm',
                'mileageRangeKm',
                'specs',
                'notes',
            ],
            properties: {
                make: { type: 'string' },
                model: { type: 'string' },
                variant: { type: ['string', 'null'] },
                year: { type: 'integer' },
                mileageKm: { type: ['integer', 'null'] },
                mileageRangeKm: {
                    type: ['object', 'null'],
                    additionalProperties: false,
                    required: ['min', 'max'],
                    properties: {
                        min: { type: 'integer' },
                        max: { type: 'integer' },
                    },
                },
                specs: { type: ['string', 'null'] },
                notes: { type: ['string', 'null'] },
            },
        },
        marketPrice: {
            type: 'object',
            additionalProperties: false,
            required: ['currency', 'min', 'max'],
            properties: {
                currency: { type: 'string', enum: ['USD', 'AED', 'EUR'] },
                min: { type: 'integer' },
                max: { type: 'integer' },
            },
        },
        marketPriceUsd: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['currency', 'min', 'max'],
            properties: {
                currency: { type: 'string', enum: ['USD'] },
                min: { type: 'integer' },
                max: { type: 'integer' },
            },
        },
        dealerBuyPrice: {
            type: 'object',
            additionalProperties: false,
            required: ['currency', 'min', 'max'],
            properties: {
                currency: { type: 'string', enum: ['USD', 'AED', 'EUR'] },
                min: { type: 'integer' },
                max: { type: 'integer' },
            },
        },
        dealerBuyPriceUsd: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['currency', 'min', 'max'],
            properties: {
                currency: { type: 'string', enum: ['USD'] },
                min: { type: 'integer' },
                max: { type: 'integer' },
            },
        },
        fallbackUsed: { type: 'boolean' },
        fallbackLevel: { type: 'integer', enum: [1, 2, 3, 4, 5] },
        mileageFallbackUsed: { type: 'boolean' },
        sourceMarketAnchorUsed: { type: 'boolean' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        shortReason: { type: 'string' },
    },
} as const;

/** Phase 1 strict schema: base valuation + local assessment fields. */
export const LEBANON_ASSESSMENT_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        ...OPENAI_JSON_SCHEMA.required,
        'localMarketAssessment',
        'fuelCategory',
        'fallbackRequired',
    ],
    properties: {
        ...OPENAI_JSON_SCHEMA.properties,
        localMarketAssessment: {
            type: 'object',
            additionalProperties: false,
            required: [
                'strongComparableCount',
                'totalComparableCount',
                'hasExactVerifiedLocalMatch',
                'hasUsableDirectLebanonAnchor',
                'directLebanonAnchorReason',
                'directLebanonAnchorPriceUsd',
                'localPriceAnchors',
                'localCompsStrength',
                'sourceRiskLevel',
                'sourceRiskReason',
                'reason',
            ],
            properties: {
                strongComparableCount: { type: 'integer' },
                totalComparableCount: { type: 'integer' },
                hasExactVerifiedLocalMatch: { type: 'boolean' },
                hasUsableDirectLebanonAnchor: { type: 'boolean' },
                directLebanonAnchorReason: { type: 'string' },
                directLebanonAnchorPriceUsd: { type: ['number', 'null'] },
                localPriceAnchors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: [
                            'title',
                            'sourceName',
                            'url',
                            'year',
                            'mileageKm',
                            'priceUsd',
                            'currency',
                            'sourceStrength',
                            'reason',
                        ],
                        properties: {
                            title: { type: 'string' },
                            sourceName: { type: ['string', 'null'] },
                            url: { type: ['string', 'null'] },
                            year: { type: ['integer', 'null'] },
                            mileageKm: { type: ['integer', 'null'] },
                            priceUsd: { type: ['number', 'null'] },
                            currency: {
                                type: ['string', 'null'],
                                enum: ['USD', 'LBP', 'EUR', 'AED', 'OTHER', null],
                            },
                            sourceStrength: {
                                type: 'string',
                                enum: ['exact', 'near_exact', 'same_model', 'older_reference', 'segment'],
                            },
                            reason: { type: 'string' },
                        },
                    },
                },
                localCompsStrength: { type: 'string', enum: ['strong', 'medium', 'weak'] },
                sourceRiskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                sourceRiskReason: { type: 'string' },
                reason: { type: 'string' },
            },
        },
        fuelCategory: { type: 'string', enum: [...FUEL_CATEGORY_ENUM] },
        fallbackRequired: { type: 'boolean' },
    },
} as const;

/** Phase 2 strict schema: fallback market anchors only (no import math). */
export const FALLBACK_RESEARCH_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'fallbackMarketsUsed',
        'sourceMarketAnchors',
        'recommendedAnchorMarket',
        'recommendedAnchorPriceUsd',
        'fuelCategory',
        'confidence',
        'reason',
    ],
    properties: {
        fallbackMarketsUsed: {
            type: 'array',
            items: { type: 'string', enum: ['UAE', 'EUROPE'] },
        },
        sourceMarketAnchors: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['market', 'currency', 'price', 'priceUsd', 'comparableCount', 'reason'],
                properties: {
                    market: { type: 'string', enum: ['UAE', 'EUROPE'] },
                    currency: { type: 'string', enum: ['AED', 'EUR', 'USD'] },
                    price: RANGE_JSON_SCHEMA,
                    priceUsd: RANGE_JSON_SCHEMA,
                    comparableCount: { type: 'integer' },
                    reason: { type: 'string' },
                },
            },
        },
        recommendedAnchorMarket: {
            type: ['string', 'null'],
            enum: ['UAE', 'EUROPE', null],
        },
        recommendedAnchorPriceUsd: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['min', 'max'],
            properties: {
                min: { type: 'integer' },
                max: { type: 'integer' },
            },
        },
        fuelCategory: { type: 'string', enum: [...FUEL_CATEGORY_ENUM] },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        reason: { type: 'string' },
    },
} as const;
