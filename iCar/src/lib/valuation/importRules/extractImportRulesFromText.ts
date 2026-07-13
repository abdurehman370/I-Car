import OpenAI from 'openai';
import {
    LebanonImportRulesJson,
    LebanonImportRulesJsonSchema,
} from './types';

/**
 * Converts extracted PDF text into structured Lebanon import rules JSON.
 * Called ONCE at upload time (never during valuations).
 */

const EXTRACTION_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['region', 'currency', 'effectiveDate', 'rules', 'rawSummary'],
    properties: {
        region: { type: 'string', enum: ['LEBANON'] },
        currency: { type: 'string', enum: ['USD'] },
        effectiveDate: { type: ['string', 'null'] },
        rules: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'fuelCategory',
                    'minMileageKm',
                    'maxMileageKm',
                    'customsRate',
                    'vatRate',
                    'daribehRate',
                    'totalRate',
                    'notes',
                ],
                properties: {
                    fuelCategory: {
                        type: 'string',
                        enum: [
                            'electric',
                            'hybrid',
                            'plug_in_hybrid',
                            'mild_hybrid',
                            'gasoline',
                            'diesel',
                            'unknown',
                        ],
                    },
                    minMileageKm: { type: ['integer', 'null'] },
                    maxMileageKm: { type: ['integer', 'null'] },
                    customsRate: { type: ['number', 'null'] },
                    vatRate: { type: ['number', 'null'] },
                    daribehRate: { type: ['number', 'null'] },
                    totalRate: { type: 'number' },
                    notes: { type: ['string', 'null'] },
                },
            },
        },
        rawSummary: { type: 'string' },
    },
} as const;

const EXTRACTION_INSTRUCTIONS = `You are a customs-regulation data extractor.

You receive raw text extracted from an official/administrative PDF describing Lebanon vehicle import and customs rules.

Convert the rules into structured JSON exactly matching the provided schema.

Rules:
- All rates must be decimal fractions (11% -> 0.11, 63% -> 0.63).
- totalRate is the total effective import tax load on the vehicle value.
- If the document treats a fuel type above a mileage threshold like gasoline, emit a separate rule entry for that fuel type with minMileageKm set and the gasoline totalRate.
- Emit separate entries for hybrid, plug_in_hybrid and mild_hybrid when the document groups them together.
- Use null for fields the document does not specify.
- mileage thresholds are in kilometers.
- rawSummary must be a short plain-English summary of the entire rule set.
- Do not invent rates that are not in the document.

Return JSON only.`;

function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
    });
}

export async function extractImportRulesFromText(params: {
    extractedText: string;
    version: string;
    sourceDocumentId?: string;
}): Promise<LebanonImportRulesJson> {
    const { extractedText, version, sourceDocumentId } = params;

    if (!extractedText || extractedText.trim().length < 20) {
        throw new Error('PDF text extraction produced no usable text');
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_VALUATION_MODEL || 'gpt-5.4-2026-03-05';

    const response = await openai.responses.create({
        model,
        instructions: EXTRACTION_INSTRUCTIONS,
        input: [
            {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: `Extract Lebanon import rules from this document text:\n\n${extractedText.slice(0, 50_000)}`,
                    },
                ],
            },
        ],
        text: {
            format: {
                type: 'json_schema',
                name: 'lebanon_import_rules',
                strict: true,
                schema: EXTRACTION_JSON_SCHEMA,
            },
        },
        max_output_tokens: 4096,
        temperature: 0,
    } as any);

    const raw =
        typeof (response as any)?.output_text === 'string'
            ? (response as any).output_text.trim()
            : '';

    if (!raw) {
        throw new Error('OpenAI returned an empty rules extraction');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('Failed to parse extracted rules JSON');
    }

    const candidate = {
        ...(parsed as Record<string, unknown>),
        version,
        ...(sourceDocumentId ? { sourceDocumentId } : {}),
    };

    const validation = LebanonImportRulesJsonSchema.safeParse(candidate);

    if (!validation.success) {
        console.error('Import rules validation failed:', validation.error.flatten());
        throw new Error('Extracted import rules did not match the expected structure');
    }

    return validation.data;
}
