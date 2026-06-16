import { z } from 'zod';

export const ValuationResultSchema = z.object({
    region: z.enum(['LEBANON', 'UAE', 'EUROPE']),
    vehicle: z.object({
        make: z.string(),
        model: z.string(),
        variant: z.string().nullable(),
        year: z.number().int(),
        mileageKm: z.number().int().nullable(),
        mileageRangeKm: z.object({
            min: z.number().int(),
            max: z.number().int()
        }).nullable(),
        specs: z.string().nullable(),
        notes: z.string().nullable()
    }),
    marketPrice: z.object({
        currency: z.enum(['USD', 'AED', 'EUR']),
        min: z.number().int(),
        max: z.number().int()
    }),
    marketPriceUsd: z.object({
        currency: z.literal('USD'),
        min: z.number().int(),
        max: z.number().int()
    }).nullable(),
    dealerBuyPrice: z.object({
        currency: z.enum(['USD', 'AED', 'EUR']),
        min: z.number().int(),
        max: z.number().int()
    }),
    dealerBuyPriceUsd: z.object({
        currency: z.literal('USD'),
        min: z.number().int(),
        max: z.number().int()
    }).nullable(),
    fallbackUsed: z.boolean(),
    fallbackLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    mileageFallbackUsed: z.boolean(),
    sourceMarketAnchorUsed: z.boolean(),
    confidence: z.enum(['high', 'medium', 'low']),
    shortReason: z.string(),
    markdown: z.string()
});

export type ValuationResult = z.infer<typeof ValuationResultSchema>;

export const OPENAI_JSON_SCHEMA = {
    name: "vehicle_valuation_result",
    strict: true,
    schema: {
        type: "object",
        additionalProperties: false,
        required: [
            "region",
            "vehicle",
            "marketPrice",
            "marketPriceUsd",
            "dealerBuyPrice",
            "dealerBuyPriceUsd",
            "fallbackUsed",
            "fallbackLevel",
            "mileageFallbackUsed",
            "sourceMarketAnchorUsed",
            "confidence",
            "shortReason",
            "markdown"
        ],
        properties: {
            region: {
                type: "string",
                enum: ["LEBANON", "UAE", "EUROPE"]
            },
            vehicle: {
                type: "object",
                additionalProperties: false,
                required: [
                    "make",
                    "model",
                    "variant",
                    "year",
                    "mileageKm",
                    "mileageRangeKm",
                    "specs",
                    "notes"
                ],
                properties: {
                    make: { type: "string" },
                    model: { type: "string" },
                    variant: { type: ["string", "null"] },
                    year: { type: "integer" },
                    mileageKm: { type: ["integer", "null"] },
                    mileageRangeKm: {
                        type: ["object", "null"],
                        additionalProperties: false,
                        required: ["min", "max"],
                        properties: {
                            min: { type: "integer" },
                            max: { type: "integer" }
                        }
                    },
                    specs: { type: ["string", "null"] },
                    notes: { type: ["string", "null"] }
                }
            },
            marketPrice: {
                type: "object",
                additionalProperties: false,
                required: ["currency", "min", "max"],
                properties: {
                    currency: { type: "string", "enum": ["USD", "AED", "EUR"] },
                    min: { type: "integer" },
                    max: { type: "integer" }
                }
            },
            marketPriceUsd: {
                type: ["object", "null"],
                additionalProperties: false,
                required: ["currency", "min", "max"],
                properties: {
                    currency: { type: "string", "enum": ["USD"] },
                    min: { type: "integer" },
                    max: { type: "integer" }
                }
            },
            dealerBuyPrice: {
                type: "object",
                additionalProperties: false,
                required: ["currency", "min", "max"],
                properties: {
                    currency: { type: "string", "enum": ["USD", "AED", "EUR"] },
                    min: { type: "integer" },
                    max: { type: "integer" }
                }
            },
            dealerBuyPriceUsd: {
                type: ["object", "null"],
                additionalProperties: false,
                required: ["currency", "min", "max"],
                properties: {
                    currency: { type: "string", "enum": ["USD"] },
                    min: { type: "integer" },
                    max: { type: "integer" }
                }
            },
            fallbackUsed: { type: "boolean" },
            fallbackLevel: { type: "integer", "enum": [1, 2, 3, 4, 5] },
            mileageFallbackUsed: { type: "boolean" },
            sourceMarketAnchorUsed: { type: "boolean" },
            confidence: { type: "string", "enum": ["high", "medium", "low"] },
            shortReason: { type: "string" },
            markdown: { type: "string" }
        }
    }
};
