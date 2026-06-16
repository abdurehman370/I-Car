import OpenAI from 'openai';
import {
    OPENAI_JSON_SCHEMA,
    ValuationResultSchema,
    ValuationResult,
} from './schema';
import { GLOBAL_PROMPT } from './prompts/global';
import { LEBANON_PROMPT } from './prompts/lebanon';
import { UAE_PROMPT } from './prompts/uae';
import { EUROPE_PROMPT } from './prompts/europe';
import { buildMarkdownFromValuationJson } from './formatMarkdown';
import { extractWebSources, responseUsedWebSearch } from './sourceExtraction';
import { estimateOpenAICost } from './cost';
import {
    getValuationFromCache,
    saveValuationToCache,
    buildCacheKey,
} from './cache';

type Region = 'LEBANON' | 'UAE' | 'EUROPE';

type EvaluateVehiclePayload = {
    region: Region | string;
    make: string;
    model: string;
    variant?: string | null;
    year: number;
    mileage?: number | null;
    mileageMin?: number | null;
    mileageMax?: number | null;
    specs?: string | null;
    notes?: string | null;
    images?: Array<string | { url?: string }>;
    mode?: 'quick' | 'listing' | 'partner' | string;
};

function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
    });
}

function getRegionPrompt(region: Region): string {
    if (region === 'LEBANON') return LEBANON_PROMPT;
    if (region === 'UAE') return UAE_PROMPT;
    if (region === 'EUROPE') return EUROPE_PROMPT;

    throw new Error('Unsupported region');
}

function getWebSearchTool(region: Region) {
    const tool: Record<string, any> = {
        type: 'web_search',
        search_context_size: 'high',
    };

    if (region === 'UAE') {
        tool.filters = {
            allowed_domains: [
                'dubizzle.com',
                'dubicars.com',
                'autotraderuae.com',
                'audi-dubai.com',
                'mercedesbenzme.com',
                'altayermotors.com',
                'premier-carcare.com',
            ],
        };
    }

    if (region === 'EUROPE') {
        tool.filters = {
            allowed_domains: [
                'mobile.de',
                'autoscout24.com',
                'preowned.ferrari.com',
            ],
        };
    }

    // Lebanon intentionally stays broader because local inventory is fragmented
    // across OLX, dealer pages, importer sites, Facebook/Instagram, and local websites.

    return tool;
}

function getMileageLabel(payload: EvaluateVehiclePayload): string {
    if (payload.mileageMin != null && payload.mileageMax != null) {
        return `${payload.mileageMin}-${payload.mileageMax} km`;
    }

    if (payload.mileage != null) {
        return `${payload.mileage} km`;
    }

    return 'Unknown';
}

function getMileageUsed(payload: EvaluateVehiclePayload): number {
    if (payload.mileage != null) return Number(payload.mileage);

    if (payload.mileageMin != null && payload.mileageMax != null) {
        return Math.round((Number(payload.mileageMin) + Number(payload.mileageMax)) / 2);
    }

    return 0;
}

function buildSystemInstructions(region: Region): string {
    return [
        GLOBAL_PROMPT,
        getRegionPrompt(region),
        `
STRUCTURED OUTPUT RULES:
Return JSON only.
The JSON must strictly match the provided schema.
Do not include markdown in the JSON.
Do not include source URLs inside JSON unless the schema explicitly allows them.
Always return numeric integer price ranges.
Dealer buy price must be below market price.
Do not return "Insufficient verified comparables".
Use fallback valuation hierarchy if exact comps are unavailable.
        `.trim(),
    ].join('\n\n');
}

function buildDynamicUserText(payload: EvaluateVehiclePayload, region: Region): string {
    return `
Perform valuation for this vehicle using current searched marketplace data.

Region: ${region}
Make: ${payload.make}
Model: ${payload.model}
Variant/Trim: ${payload.variant || 'Not specified'}
Year: ${payload.year}
Mileage: ${getMileageLabel(payload)}
Specs/source: ${payload.specs || 'Unknown'}
Condition notes: ${payload.notes || 'Average condition assumed'}
Mode: ${payload.mode || 'listing'}

Return structured JSON only.
    `.trim();
}

function buildInputContent(payload: EvaluateVehiclePayload, region: Region): any[] {
    const content: any[] = [
        {
            type: 'input_text',
            text: buildDynamicUserText(payload, region),
        },
    ];

    const isQuick = payload.mode === 'quick' || payload.mode === 'partner';

    if (!isQuick && Array.isArray(payload.images)) {
        for (const img of payload.images.slice(0, 5)) {
            const imageUrl = typeof img === 'string' ? img : img?.url;

            if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
                content.push({
                    type: 'input_image',
                    image_url: imageUrl,
                    detail: 'auto',
                });
            }
        }
    }

    return content;
}

function extractTextFromResponsesApi(response: any): string {
    if (typeof response?.output_text === 'string' && response.output_text.trim()) {
        return response.output_text.trim();
    }

    const output = Array.isArray(response?.output) ? response.output : [];

    for (const item of output) {
        const content = Array.isArray(item?.content) ? item.content : [];

        for (const part of content) {
            if (part?.type === 'output_text' && typeof part?.text === 'string') {
                return part.text.trim();
            }
        }
    }

    return '';
}

function getUsage(response: any) {
    const usage = response?.usage || {};

    return {
        inputTokens: usage.input_tokens || 0,
        cachedInputTokens: usage.input_tokens_details?.cached_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0,
    };
}

function buildFinalResponse(params: {
    region: Region;
    model: string;
    payload: EvaluateVehiclePayload;
    valuation: ValuationResult;
    markdown: string;
    sources: any[];
    usage: any;
    estimatedCostUsd: number | null;
    cacheHit: boolean;
}) {
    const {
        region,
        model,
        payload,
        valuation,
        markdown,
        sources,
        usage,
        estimatedCostUsd,
        cacheHit,
    } = params;

    return {
        status: 'ok',
        region,
        currency: region === 'UAE' ? 'AED' : region === 'EUROPE' ? 'EUR' : 'USD',
        valuation,
        markdown,
        mileageUsed: getMileageUsed(payload),
        sources,
        usage: {
            inputTokens: usage.inputTokens || 0,
            cachedInputTokens: usage.cachedInputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            totalTokens: usage.totalTokens || 0,
            estimatedCostUsd,
        },
        meta: {
            model,
            webSearchUsed: true,
            cacheHit,
            fallbackUsed: valuation.fallbackUsed,
            fallbackLevel: valuation.fallbackLevel,
            confidence: valuation.confidence,
        },
    };
}

async function callOpenAIValuation(params: {
    openai: OpenAI;
    model: string;
    region: Region;
    payload: EvaluateVehiclePayload;
    correction?: string;
}) {
    const { openai, model, region, payload, correction } = params;

    const dynamicContent = buildInputContent(payload, region);

    if (correction) {
        dynamicContent.push({
            type: 'input_text',
            text: correction,
        });
    }

    return openai.responses.create({
        model,
        instructions: buildSystemInstructions(region),
        input: [
            {
                role: 'user',
                content: dynamicContent,
            },
        ],
        tools: [getWebSearchTool(region)],
        tool_choice: 'required',
        include: ['web_search_call.action.sources'],
        text: {
            format: {
                type: 'json_schema',
                name: 'vehicle_valuation_result',
                strict: true,
                schema: OPENAI_JSON_SCHEMA,
            },
        },
        max_output_tokens: 4096,
        temperature: 0.2,
    } as any);
}

export async function evaluateVehicleWithAI(
    payload: EvaluateVehiclePayload,
    forceNoCache = false
) {
    const region = String(payload.region || '').toUpperCase() as Region;

    if (!['LEBANON', 'UAE', 'EUROPE'].includes(region)) {
        throw new Error('Unsupported region');
    }

    const cacheKey = !forceNoCache ? buildCacheKey({ ...payload, region }) : null;

    if (cacheKey) {
        const cached = await getValuationFromCache(cacheKey);

        if (cached) {
            return {
                ...cached,
                meta: {
                    ...(cached.meta || {}),
                    cacheHit: true,
                },
            };
        }
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_VALUATION_MODEL || 'gpt-5.4-2026-03-05';

    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await callOpenAIValuation({
                openai,
                model,
                region,
                payload,
                correction:
                    attempt === 0
                        ? undefined
                        : 'Your previous output failed validation. Return valid JSON matching the schema exactly. Keep currencies correct for the region and ensure dealer buy price is lower than market price.',
            });

            if (!responseUsedWebSearch(response)) {
                throw new Error('Marketplace search could not be completed. Please try again.');
            }

            const jsonText = extractTextFromResponsesApi(response);

            if (!jsonText) {
                throw new Error('Empty response from OpenAI');
            }

            let parsedJson: unknown;

            try {
                parsedJson = JSON.parse(jsonText);
            } catch {
                throw new Error('Failed to parse JSON output');
            }

            const validation = ValuationResultSchema.safeParse(parsedJson);

            if (!validation.success) {
                console.error('Structured JSON validation failed:', validation.error.flatten());

                if (attempt === 0) {
                    lastError = validation.error;
                    continue;
                }

                throw new Error('Structured JSON invalid after retry');
            }

            const valuation = validation.data;
            const markdown = buildMarkdownFromValuationJson(valuation);
            const sources = extractWebSources(response);
            const usage = getUsage(response);
            const estimatedCostUsd = estimateOpenAICost(
                {
                    input_tokens: usage.inputTokens,
                    output_tokens: usage.outputTokens,
                    total_tokens: usage.totalTokens,
                    input_tokens_details: {
                        cached_tokens: usage.cachedInputTokens,
                    },
                },
                model
            );

            const finalResult = buildFinalResponse({
                region,
                model,
                payload,
                valuation,
                markdown,
                sources,
                usage,
                estimatedCostUsd,
                cacheHit: false,
            });

            if (cacheKey) {
                await saveValuationToCache(cacheKey, finalResult, payload.make);
            }

            return finalResult;
        } catch (error) {
            lastError = error;

            const message = error instanceof Error ? error.message : String(error);

            if (
                message.includes('Marketplace search could not be completed') ||
                message.includes('OpenAI request failed')
            ) {
                throw error;
            }

            if (attempt === 1) {
                throw error;
            }
        }
    }

    throw lastError instanceof Error
        ? lastError
        : new Error('Failed to evaluate vehicle');
}