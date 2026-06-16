import { z } from 'zod';

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

export const ValuationResultSchema = z.object({
    region: z.enum(['LEBANON', 'UAE', 'EUROPE']),
    vehicle: z.object({
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
    }),
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
}).superRefine((value, ctx) => {
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
});

export type ValuationResult = z.infer<typeof ValuationResultSchema>;

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