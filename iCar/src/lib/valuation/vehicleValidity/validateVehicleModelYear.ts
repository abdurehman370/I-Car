import OpenAI from 'openai';
import { redisConnection } from '@/lib/queue';
import { createLogger } from '@/lib/logger';
import {
    findRegistryEntry,
    normalizeVehicleName,
} from './modelYearRegistry';

const log = createLogger('valuation:validity');

/**
 * Pre-valuation model-year validity check.
 * 1. Deterministic registry (free, instant) for known edge cases.
 * 2. Optional AI + web-search validation for unknown EXOTIC models only
 *    (cost-gated), cached for 30 days.
 */

export type VehicleValidityResult =
    | {
        valid: true;
        checked: boolean;
        source: 'registry' | 'ai_web' | 'skipped';
        normalizedMake?: string;
        normalizedModel?: string;
        earliestValidYear?: number | null;
        latestKnownYear?: number | null;
        reason?: string;
        warning?: string | null;
    }
    | {
        valid: false;
        checked: true;
        source: 'registry' | 'ai_web';
        errorCode:
            | 'MODEL_YEAR_NOT_PRODUCED'
            | 'MODEL_NOT_FOUND'
            | 'MAKE_MODEL_MISMATCH'
            | 'AMBIGUOUS_MODEL'
            | 'DISCONTINUED_BEFORE_YEAR';
        message: string;
        submitted: {
            make: string;
            model: string;
            variant?: string | null;
            year: number;
        };
        correction?: {
            earliestValidYear?: number | null;
            latestKnownYear?: number | null;
            suggestedYearRange?: string | null;
            suggestedModelsForYear?: string[];
            suggestedModel?: string | null;
        };
        confidence: 'high' | 'medium' | 'low';
        sources?: Array<{ title: string; url: string; domain?: string }>;
    };

const VALIDITY_CACHE_PREFIX = 'vehicle-validity:v1';
const VALIDITY_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const EXOTIC_MAKES = [
    'ferrari', 'lamborghini', 'rolls royce', 'rolls', 'bentley',
    'mclaren', 'aston martin', 'brabus', 'mansory', 'bugatti',
    'koenigsegg', 'pagani', 'maybach',
];

type AiValidity = {
    valid: boolean;
    make: string;
    model: string;
    variant: string | null;
    submittedYear: number;
    earliestValidYear: number | null;
    latestKnownYear: number | null;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    suggestedModelsForYear: string[];
};

const AI_VALIDITY_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: [
        'valid', 'make', 'model', 'variant', 'submittedYear',
        'earliestValidYear', 'latestKnownYear', 'reason',
        'confidence', 'suggestedModelsForYear',
    ],
    properties: {
        valid: { type: 'boolean' },
        make: { type: 'string' },
        model: { type: 'string' },
        variant: { type: ['string', 'null'] },
        submittedYear: { type: 'integer' },
        earliestValidYear: { type: ['integer', 'null'] },
        latestKnownYear: { type: ['integer', 'null'] },
        reason: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        suggestedModelsForYear: { type: 'array', items: { type: 'string' } },
    },
} as const;

const AI_VALIDITY_INSTRUCTIONS = `You are validating whether a vehicle make/model/variant/year combination exists. Do not value the car.
Determine whether this exact model was produced or sold for the submitted model year.
- If the model was introduced AFTER the submitted year, it is invalid; report earliestValidYear.
- If the model was discontinued BEFORE the submitted year, it is invalid; report latestKnownYear.
- Suggest models this make actually offered for the submitted year in suggestedModelsForYear.
- Use confidence "high" only when you are certain from search results.
Return structured JSON only.`;

function buildValidityCacheKey(params: {
    make: string;
    model: string;
    variant?: string | null;
    year: number;
}): string {
    const norm = (v: string | null | undefined) =>
        normalizeVehicleName(v).replace(/\s+/g, '-') || 'none';
    return `${VALIDITY_CACHE_PREFIX}:${norm(params.make)}:${norm(params.model)}:${norm(params.variant)}:${params.year}`;
}

function isExoticMake(make: string): boolean {
    const m = normalizeVehicleName(make);
    return EXOTIC_MAKES.some((e) => m.includes(e));
}

function buildNotProducedMessage(params: {
    make: string;
    model: string;
    year: number;
    earliestValidYear: number;
    suggestedModelsForYear?: string[];
}): string {
    const { make, model, year, earliestValidYear, suggestedModelsForYear } = params;
    const suggestions = suggestedModelsForYear && suggestedModelsForYear.length > 0
        ? ` Please select ${earliestValidYear} or newer, or choose a valid ${year} ${make} model such as ${suggestedModelsForYear.join(', ')}.`
        : ` Please select a valid model year, e.g. ${earliestValidYear} or newer.`;

    return `${make} ${model} was not produced for model year ${year}. The ${model} was introduced for ${earliestValidYear}+ model years.${suggestions}`;
}

async function runAiValidation(params: {
    make: string;
    model: string;
    variant?: string | null;
    year: number;
}): Promise<AiValidity | null> {
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
        });
        const model = process.env.OPENAI_VALUATION_MODEL || 'gpt-5.4-2026-03-05';

        const response = await openai.responses.create({
            model,
            instructions: AI_VALIDITY_INSTRUCTIONS,
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text: `Does this vehicle exist for the submitted model year?\n\nMake: ${params.make}\nModel: ${params.model}\nVariant: ${params.variant || 'Not specified'}\nSubmitted model year: ${params.year}\n\nReturn structured JSON only.`,
                        },
                    ],
                },
            ],
            tools: [{ type: 'web_search', search_context_size: 'medium' } as any],
            tool_choice: 'required',
            text: {
                format: {
                    type: 'json_schema',
                    name: 'vehicle_model_year_validity',
                    strict: true,
                    schema: AI_VALIDITY_JSON_SCHEMA,
                },
            },
            max_output_tokens: 1024,
            temperature: 0,
        } as any);

        const raw = typeof (response as any)?.output_text === 'string'
            ? (response as any).output_text.trim()
            : '';

        if (!raw) return null;
        return JSON.parse(raw) as AiValidity;
    } catch (err) {
        log.error('AI model-year validation failed (non-fatal)', { err });
        return null;
    }
}

export async function validateVehicleModelYear(payload: {
    make: string;
    model: string;
    variant?: string | null;
    year: number;
}): Promise<VehicleValidityResult> {
    const { make, model, variant, year } = payload;

    // 1. Deterministic registry — free and authoritative
    const match = findRegistryEntry({ make, model, variant });

    if (match) {
        const { entry } = match;

        if (year < entry.earliestValidYear) {
            return {
                valid: false,
                checked: true,
                source: 'registry',
                errorCode: 'MODEL_YEAR_NOT_PRODUCED',
                message: buildNotProducedMessage({
                    make,
                    model,
                    year,
                    earliestValidYear: entry.earliestValidYear,
                    suggestedModelsForYear: entry.suggestedModelsForYear,
                }),
                submitted: { make, model, variant: variant ?? null, year },
                correction: {
                    earliestValidYear: entry.earliestValidYear,
                    latestKnownYear: entry.latestKnownYear ?? null,
                    suggestedYearRange: `${entry.earliestValidYear}+`,
                    suggestedModelsForYear: entry.suggestedModelsForYear ?? [],
                },
                confidence: 'high',
            };
        }

        if (entry.latestKnownYear && year > entry.latestKnownYear) {
            return {
                valid: false,
                checked: true,
                source: 'registry',
                errorCode: 'DISCONTINUED_BEFORE_YEAR',
                message: `${make} ${model} was discontinued after model year ${entry.latestKnownYear}. Model year ${year} does not exist.`,
                submitted: { make, model, variant: variant ?? null, year },
                correction: {
                    earliestValidYear: entry.earliestValidYear,
                    latestKnownYear: entry.latestKnownYear,
                    suggestedYearRange: `${entry.earliestValidYear}–${entry.latestKnownYear}`,
                },
                confidence: 'high',
            };
        }

        return {
            valid: true,
            checked: true,
            source: 'registry',
            earliestValidYear: entry.earliestValidYear,
            latestKnownYear: entry.latestKnownYear ?? null,
        };
    }

    // 2. AI + web-search validation — cost-gated: exotic makes only
    if (!isExoticMake(make)) {
        return { valid: true, checked: false, source: 'skipped' };
    }

    const cacheKey = buildValidityCacheKey(payload);

    // 30-day validity cache
    try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as VehicleValidityResult;
        }
    } catch (err) {
        log.error('Validity cache read error', { err });
    }

    const ai = await runAiValidation(payload);

    let result: VehicleValidityResult;

    if (!ai) {
        // Validation unavailable — never block a valuation on infra failure
        result = { valid: true, checked: false, source: 'skipped' };
        return result;
    }

    if (!ai.valid && ai.confidence === 'high') {
        result = {
            valid: false,
            checked: true,
            source: 'ai_web',
            errorCode: ai.earliestValidYear && year < ai.earliestValidYear
                ? 'MODEL_YEAR_NOT_PRODUCED'
                : 'MODEL_NOT_FOUND',
            message: ai.earliestValidYear
                ? buildNotProducedMessage({
                    make,
                    model,
                    year,
                    earliestValidYear: ai.earliestValidYear,
                    suggestedModelsForYear: ai.suggestedModelsForYear,
                })
                : `${make} ${model} (${year}) could not be verified as an existing model-year combination. ${ai.reason}`,
            submitted: { make, model, variant: variant ?? null, year },
            correction: {
                earliestValidYear: ai.earliestValidYear,
                latestKnownYear: ai.latestKnownYear,
                suggestedModelsForYear: ai.suggestedModelsForYear,
            },
            confidence: ai.confidence,
        };
    } else {
        result = {
            valid: true,
            checked: true,
            source: 'ai_web',
            earliestValidYear: ai.earliestValidYear,
            latestKnownYear: ai.latestKnownYear,
            reason: ai.reason,
            warning: !ai.valid
                ? `Model-year could not be confirmed with high confidence (${ai.confidence}): ${ai.reason}`
                : null,
        };
    }

    try {
        await redisConnection.setex(cacheKey, VALIDITY_TTL_SECONDS, JSON.stringify(result));
    } catch (err) {
        log.error('Validity cache write error', { err });
    }

    return result;
}
