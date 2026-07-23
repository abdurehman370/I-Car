import OpenAI from 'openai';
import {
    OPENAI_JSON_SCHEMA,
    LEBANON_ASSESSMENT_JSON_SCHEMA,
    FALLBACK_RESEARCH_JSON_SCHEMA,
    ValuationResultSchema,
    ValuationResult,
    LebanonAssessmentResultSchema,
    LebanonAssessmentResult,
    FallbackResearchSchema,
    FallbackResearchResult,
} from './schema';
import { GLOBAL_PROMPT } from './prompts/global';
import { LEBANON_PROMPT } from './prompts/lebanon';
import { UAE_PROMPT } from './prompts/uae';
import { EUROPE_PROMPT } from './prompts/europe';
import { LEBANON_ASSESSMENT_PROMPT } from './prompts/lebanonAssessment';
import { LEBANON_FALLBACK_RESEARCH_PROMPT } from './prompts/lebanonFallbackResearch';
import { buildMarkdownFromValuationJson } from './formatMarkdown';
import { extractWebSources, responseUsedWebSearch, ValuationSource } from './sourceExtraction';
import { estimateOpenAICost } from './cost';
import {
    getValuationFromCache,
    saveValuationToCache,
    buildCacheKey,
} from './cache';
import { getActiveImportRules } from './importRules/getActiveImportRules';
import { calculateLebanonImportCost } from './importRules/calculateLebanonImportCost';
import { ActiveImportRules, FuelCategory } from './importRules/types';
import { validateVehicleModelYear } from './vehicleValidity/validateVehicleModelYear';
import { createLogger } from '../logger';
import { getImportDutyMileageThreshold } from './sanity/importDutyMileage';
import {
    applyLebanonLocalCompClusterCap,
    ClusterAnchorLike,
} from './sanity/applyLebanonLocalCompClusterCap';

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

const AED_PER_USD = 3.67;

const log = createLogger('valuation');

function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
    });
}

function getModel(): string {
    return process.env.OPENAI_VALUATION_MODEL || 'gpt-5.4-2026-03-05';
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

/** Combined UAE + Europe domains for the Lebanon fallback research phase. */
function getFallbackWebSearchTool() {
    return {
        type: 'web_search',
        search_context_size: 'high',
        filters: {
            allowed_domains: [
                'dubizzle.com',
                'dubicars.com',
                'autotraderuae.com',
                'mobile.de',
                'autoscout24.com',
                'preowned.ferrari.com',
            ],
        },
    } as Record<string, any>;
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

type UsageTotals = {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
};

function getUsage(response: any): UsageTotals {
    const usage = response?.usage || {};

    return {
        inputTokens: usage.input_tokens || 0,
        cachedInputTokens: usage.input_tokens_details?.cached_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0,
    };
}

function sumUsage(a: UsageTotals, b: UsageTotals): UsageTotals {
    return {
        inputTokens: a.inputTokens + b.inputTokens,
        cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
        outputTokens: a.outputTokens + b.outputTokens,
        totalTokens: a.totalTokens + b.totalTokens,
    };
}

function estimateCostFromUsage(usage: UsageTotals, model: string): number | null {
    return estimateOpenAICost(
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
}

function mergeSources(...groups: ValuationSource[][]): ValuationSource[] {
    const seen = new Map<string, ValuationSource>();

    for (const group of groups) {
        for (const source of group) {
            if (!seen.has(source.url)) {
                seen.set(source.url, source);
            }
        }
    }

    return Array.from(seen.values()).slice(0, 12);
}

function buildFinalResponse(params: {
    region: Region;
    model: string;
    payload: EvaluateVehiclePayload;
    valuation: ValuationResult;
    markdown: string;
    sources: any[];
    usage: UsageTotals;
    estimatedCostUsd: number | null;
    cacheHit: boolean;
    extraMeta?: Record<string, unknown>;
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
        extraMeta,
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
            ...(extraMeta || {}),
        },
    };
}

// ---------------------------------------------------------------------------
// Generic Responses API caller with validation + one correction retry.
// Used by all three call types (standard, assessment, fallback research).
// ---------------------------------------------------------------------------
async function callStructuredWithRetry<T>(params: {
    openai: OpenAI;
    model: string;
    instructions: string;
    content: any[];
    tool: Record<string, any>;
    schemaName: string;
    jsonSchema: Record<string, any>;
    validate: (data: unknown) => { success: true; data: T } | { success: false; error: unknown };
    correctionText: string;
}): Promise<{ data: T; response: any }> {
    const {
        openai,
        model,
        instructions,
        content,
        tool,
        schemaName,
        jsonSchema,
        validate,
        correctionText,
    } = params;

    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt++) {
        const input = [...content];

        if (attempt > 0) {
            input.push({ type: 'input_text', text: correctionText });
        }

        const response = await openai.responses.create({
            model,
            instructions,
            input: [{ role: 'user', content: input }],
            tools: [tool],
            tool_choice: 'required',
            include: ['web_search_call.action.sources'],
            text: {
                format: {
                    type: 'json_schema',
                    name: schemaName,
                    strict: true,
                    schema: jsonSchema,
                },
            },
            max_output_tokens: 4096,
            temperature: 0.2,
        } as any);

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

        const validation = validate(parsedJson);

        if (validation.success) {
            return { data: validation.data, response };
        }

        log.error('Structured JSON validation failed', { schemaName, error: validation.error });
        lastError = validation.error;

        if (attempt === 1) {
            throw new Error('Structured JSON invalid after retry');
        }
    }

    throw lastError instanceof Error ? lastError : new Error('OpenAI call failed');
}

// ---------------------------------------------------------------------------
// STANDARD FLOW (UAE / EUROPE) — unchanged behavior from the original
// implementation, extracted into its own function.
// ---------------------------------------------------------------------------
async function evaluateStandardRegionVehicleWithAI(
    payload: EvaluateVehiclePayload,
    region: Region,
    forceNoCache: boolean
) {
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
    const model = getModel();

    const { data: valuation, response } = await callStructuredWithRetry<ValuationResult>({
        openai,
        model,
        instructions: buildSystemInstructions(region),
        content: buildInputContent(payload, region),
        tool: getWebSearchTool(region),
        schemaName: 'vehicle_valuation_result',
        jsonSchema: OPENAI_JSON_SCHEMA as any,
        validate: (data) => {
            const result = ValuationResultSchema.safeParse(data);
            return result.success
                ? { success: true, data: result.data }
                : { success: false, error: result.error.flatten() };
        },
        correctionText:
            'Your previous output failed validation. Return valid JSON matching the schema exactly. Keep currencies correct for the region and ensure dealer buy price is lower than market price.',
    });

    const markdown = buildMarkdownFromValuationJson(valuation);
    const sources = extractWebSources(response);
    const usage = getUsage(response);
    const estimatedCostUsd = estimateCostFromUsage(usage, model);

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
}

// ---------------------------------------------------------------------------
// LEBANON FLOW — two-phase local assessment + UAE/Europe fallback with
// deterministic import/customs calculation.
// ---------------------------------------------------------------------------

function getFallbackThreshold(): number {
    const parsed = Number.parseInt(process.env.LEBANON_FALLBACK_MIN_STRONG_COMPS || '5', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

type BrandTier = 'exotic' | 'luxury' | 'normal';

function getBrandTier(make: string): BrandTier {
    const m = String(make || '').trim().toLowerCase().replace(/\s+/g, '-');

    const exotic = ['ferrari', 'lamborghini', 'rolls-royce', 'rolls', 'bentley', 'mclaren', 'aston-martin', 'brabus', 'mansory'];
    const luxury = ['audi', 'bmw', 'mercedes', 'mercedes-benz', 'porsche', 'lexus', 'land-rover', 'range-rover', 'jaguar'];

    if (exotic.includes(m)) return 'exotic';
    if (luxury.includes(m)) return 'luxury';
    return 'normal';
}

function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

/** Luxury brands or performance trims that hold value in Lebanon. */
function isPerformanceLuxury(payload: EvaluateVehiclePayload): boolean {
    if (getBrandTier(payload.make) !== 'normal') return true;

    return /\bsvr\b|\bamg\b|\bm\d\b|\brs ?\d?\b|turbo|\bsv\b|\bg63\b|\bgt\b|\bvxr\b|black edition/i
        .test(`${payload.make || ''} ${payload.model || ''} ${payload.variant || ''}`);
}

const EXPLICIT_RISK_REGEX =
    /accident|salvage|bad carfax|flood|repaired|repaint|title issue|non-clean|urgent|distress/i;

const CLEAN_CONDITION_REGEX = /clean title|no accident|good service/i;

// ---------------------------------------------------------------------------
// Lebanon NEW-VEHICLE SOURCE HIERARCHY (direct/local path only)
// Company/official > GCC > Europe/Germany > U.S./Canada clean > generic import.
// Backend guarantees the ordering for brand-new luxury/exotic vehicles even
// when the model over-prices a non-company source.
// ---------------------------------------------------------------------------
export type SourceHierarchyType =
    | 'COMPANY' | 'GCC' | 'EUROPE' | 'US_CLEAN' | 'US_RISK'
    | 'CANADA' | 'GENERIC_IMPORT' | 'UNKNOWN';

function classifySourceHierarchy(
    specs: string | null | undefined,
    notes: string | null | undefined
): SourceHierarchyType {
    const s = String(specs || '').toLowerCase();
    const all = `${s} ${String(notes || '').toLowerCase()}`;

    const isUs = /u\.s\.|\busa?\b|american/.test(s);

    if (isUs && /accident|salvage|bad carfax|title issue|non-clean/.test(all)) return 'US_RISK';
    if (/\btgf\b|\btewtel\b|company|agency|official/.test(s)) return 'COMPANY';
    if (/\bgcc\b|gulf|uae|dubai|saudi|qatar|kuwait/.test(s)) return 'GCC';
    if (/german|europe|\beu\b/.test(s)) return 'EUROPE';
    if (isUs) return 'US_CLEAN';
    if (/canada|canadian/.test(s)) return 'CANADA';
    if (/import|china/.test(s)) return 'GENERIC_IMPORT';
    return 'UNKNOWN';
}

/** Notes that justify pricing a non-company source at company level. */
const FULL_LOCAL_SUPPORT_REGEX =
    /fully registered|duties paid|full warranty|local warranty|official warranty/i;

type HierarchyAdjustment = {
    marketFactor: number;
    dealerFactors: { min: number; max: number };
    reason: string;
} | null;

/**
 * Midpoint adjustment per source type, relative to the (approximately
 * company-equivalent) direct local valuation the model returns.
 */
function getSourceHierarchyAdjustment(
    sourceType: SourceHierarchyType,
    cleanCondition: boolean
): HierarchyAdjustment {
    switch (sourceType) {
        case 'EUROPE':
            return {
                marketFactor: 0.98, // 2–5% below company level
                dealerFactors: { min: 0.91, max: 0.91 },
                reason: 'European/Germany source priced slightly below company/official level (no confirmed local warranty/registration).',
            };
        case 'US_CLEAN':
        case 'CANADA':
            return {
                marketFactor: 0.94, // 5–10% below company level
                dealerFactors: { min: 0.90, max: 0.905 },
                reason: 'U.S./Canada clean-title source priced below company/official and European source — Lebanon resale confidence, warranty/spec/support perception.',
            };
        case 'GENERIC_IMPORT':
            // Clean provenance proven in notes → neutral (model already buffers).
            return cleanCondition
                ? null
                : {
                    marketFactor: 0.97, // 3–7% conservative buffer
                    dealerFactors: { min: 0.90, max: 0.91 },
                    reason: 'Generic import without confirmed clean provenance — conservative source buffer applied.',
                };
        case 'US_RISK':
            // Explicit risk: the assessment prompt already applies 12–25%;
            // no additional backend discount to avoid double-counting.
            return null;
        case 'COMPANY':
        case 'GCC':
        case 'UNKNOWN':
        default:
            return null;
    }
}

type LocalAnchorLike = {
    year: number | null;
    mileageKm: number | null;
    priceUsd: number | null;
    sourceStrength: 'exact' | 'near_exact' | 'same_model' | 'older_reference' | 'segment';
};

/**
 * Picks the best numeric local anchor when the model forgot to set
 * directLebanonAnchorPriceUsd: exact > near_exact > same_model, preferring
 * same year, then closest mileage. older_reference/segment never anchor.
 */
function pickBestLocalAnchor(
    anchors: LocalAnchorLike[] | undefined,
    targetYear: number,
    targetMileageKm: number
): { price: number; strength: string } | null {
    if (!Array.isArray(anchors)) return null;

    const priority: Record<string, number> = { exact: 0, near_exact: 1, same_model: 2 };

    const usable = anchors.filter(
        (a) =>
            typeof a.priceUsd === 'number' && a.priceUsd > 0 &&
            a.sourceStrength in priority
    );

    if (usable.length === 0) return null;

    usable.sort((a, b) => {
        const p = priority[a.sourceStrength] - priority[b.sourceStrength];
        if (p !== 0) return p;

        const yearA = a.year === targetYear ? 0 : 1;
        const yearB = b.year === targetYear ? 0 : 1;
        if (yearA !== yearB) return yearA - yearB;

        const mA = a.mileageKm !== null ? Math.abs(a.mileageKm - targetMileageKm) : Number.MAX_SAFE_INTEGER;
        const mB = b.mileageKm !== null ? Math.abs(b.mileageKm - targetMileageKm) : Number.MAX_SAFE_INTEGER;
        return mA - mB;
    });

    return { price: usable[0].priceUsd as number, strength: usable[0].sourceStrength };
}

/** Final Lebanon market price spread bounds per brand tier (USD). */
function getMarketSpreadBounds(tier: BrandTier): { floor: number; cap: number } {
    if (tier === 'exotic') return { floor: 10_000, cap: 25_000 };
    if (tier === 'luxury') return { floor: 5_000, cap: 10_000 };
    return { floor: 2_000, cap: 5_000 };
}

/**
 * Fallback trigger, calibrated for Lebanon's thin inventory:
 * a single exact/near-exact priced local anchor is enough to price directly —
 * the env threshold is guidance, not a hard requirement, when a direct
 * anchor exists.
 */
function shouldUseLebanonFallback(
    assessment: LebanonAssessmentResult,
    threshold: number
): boolean {
    const a = assessment.localMarketAssessment;

    // Direct local anchors always win — no unnecessary fallback.
    if (a.hasExactVerifiedLocalMatch) return false;
    if (a.hasUsableDirectLebanonAnchor) return false;

    // Usable local market: at least 2 strong comps and not weak.
    if (a.strongComparableCount >= 2 && a.localCompsStrength !== 'weak') return false;

    // Env threshold as guidance: plenty of strong comps → direct.
    if (a.strongComparableCount >= threshold) return false;

    return (
        assessment.fallbackRequired === true ||
        a.localCompsStrength === 'weak' ||
        a.strongComparableCount === 0
    );
}

async function callLebanonAssessment(openai: OpenAI, model: string, payload: EvaluateVehiclePayload) {
    const instructions = [
        GLOBAL_PROMPT,
        LEBANON_PROMPT,
        LEBANON_ASSESSMENT_PROMPT,
    ].join('\n\n');

    return callStructuredWithRetry<LebanonAssessmentResult>({
        openai,
        model,
        instructions,
        content: buildInputContent(payload, 'LEBANON'),
        tool: getWebSearchTool('LEBANON'),
        schemaName: 'lebanon_local_assessment',
        jsonSchema: LEBANON_ASSESSMENT_JSON_SCHEMA as any,
        validate: (data) => {
            const result = LebanonAssessmentResultSchema.safeParse(data);
            return result.success
                ? { success: true, data: result.data }
                : { success: false, error: result.error.flatten() };
        },
        correctionText:
            'Your previous output failed validation. Return valid JSON matching the schema exactly. Currency must be USD, dealer buy price must be lower than market price, and the localMarketAssessment block is mandatory. If you claimed a direct local anchor but did not provide its numeric USD price, return directLebanonAnchorPriceUsd and localPriceAnchors with numeric priceUsd, or set the anchor booleans to false.',
    });
}

async function callLebanonFallbackResearch(openai: OpenAI, model: string, payload: EvaluateVehiclePayload) {
    const content: any[] = [
        {
            type: 'input_text',
            text: `
Research UAE and Europe fallback source markets for this vehicle (Lebanon local comps are weak).

Make: ${payload.make}
Model: ${payload.model}
Variant/Trim: ${payload.variant || 'Not specified'}
Year: ${payload.year}
Mileage: ${getMileageLabel(payload)}
Specs/source: ${payload.specs || 'Unknown'}
Condition notes: ${payload.notes || 'Average condition assumed'}

Return structured JSON only.
            `.trim(),
        },
    ];

    return callStructuredWithRetry<FallbackResearchResult>({
        openai,
        model,
        instructions: LEBANON_FALLBACK_RESEARCH_PROMPT,
        content,
        tool: getFallbackWebSearchTool(),
        schemaName: 'lebanon_fallback_research',
        jsonSchema: FALLBACK_RESEARCH_JSON_SCHEMA as any,
        validate: (data) => {
            const result = FallbackResearchSchema.safeParse(data);
            return result.success
                ? { success: true, data: result.data }
                : { success: false, error: result.error.flatten() };
        },
        correctionText:
            'Your previous output failed validation. Return valid JSON matching the schema exactly. Do not apply Lebanon import duties — raw source-market anchors only.',
    });
}

type AnchorCandidate = FallbackResearchResult['sourceMarketAnchors'][number];

/**
 * For neutral/company/import/unknown sources, UAE is the default Lebanon
 * regional resale anchor. Europe can only take over when the UAE landed
 * midpoint exceeds Europe's by more than this limit (or UAE comps are
 * missing/clearly weak, or the source explicitly says Germany/Europe).
 */
const UAE_OVER_EUROPE_PREMIUM_LIMIT = 0.20; // 20%

/** Max source-anchor spread per tier — wide, inconsistent ranges get compressed. */
function getAnchorSpreadCap(tier: BrandTier): number {
    if (tier === 'exotic') return 32_000; // 25k–40k band
    if (tier === 'luxury') return 20_000; // 15k–25k band
    return 10_000; // 5k–10k band
}

export type SourcePreference = 'UAE' | 'EUROPE' | 'LOCAL_OR_NEUTRAL' | 'NEUTRAL';

/**
 * Interprets the dealer-provided specs/source into an anchor preference.
 * "Company", "TGF", "Import", "Unknown" are NOT Europe — they default to
 * the UAE/GCC regional anchor when UAE has usable comps.
 */
function getSourcePreference(specs: string | null | undefined): SourcePreference {
    const s = String(specs || '').toLowerCase();

    if (/\bgcc\b|\bgulf\b|\buae\b|\bdubai\b|\bqatar\b|\bkuwait\b|\bsaudi\b|\bkhaleeji\b/.test(s)) return 'UAE';
    if (/\bgerman(y)?\b|\beurope(an)?\b|\beu\b/.test(s)) return 'EUROPE';
    if (/\btgf\b|\btewtel\b|\bcompany\b|\bagency\b|\bofficial\b/.test(s)) return 'LOCAL_OR_NEUTRAL';
    if (/\bimport(ed)?\b|\bunknown\b/.test(s)) return 'NEUTRAL';
    return 'NEUTRAL';
}

/**
 * Normalizes anchors: recomputes UAE USD deterministically from AED and
 * compresses excessively wide ranges around their midpoint so a single
 * high-end outlier listing cannot inflate the Lebanon landed benchmark.
 */
function normalizeAnchors(
    research: FallbackResearchResult,
    tier: BrandTier
): { anchors: AnchorCandidate[]; warnings: string[] } {
    const warnings: string[] = [];
    const cap = getAnchorSpreadCap(tier);

    const anchors = research.sourceMarketAnchors
        .map((anchor) => {
            let priceUsd = anchor.market === 'UAE' && anchor.currency === 'AED'
                ? {
                    min: Math.round(anchor.price.min / AED_PER_USD),
                    max: Math.round(anchor.price.max / AED_PER_USD),
                }
                : { ...anchor.priceUsd };

            const spread = priceUsd.max - priceUsd.min;
            if (spread > cap) {
                // Midpoint compression: trim both tails instead of only the top.
                const mid = Math.round((priceUsd.min + priceUsd.max) / 2);
                if (spread > cap * 2) {
                    warnings.push(
                        `${anchor.market} anchor listings were inconsistent (USD ${spread.toLocaleString()} spread) — compressed around the midpoint to USD ${cap.toLocaleString()}.`
                    );
                }
                priceUsd = {
                    min: Math.max(1, mid - Math.round(cap / 2)),
                    max: mid + Math.round(cap / 2),
                };
            }

            return { ...anchor, priceUsd };
        })
        .filter((a) => a.comparableCount > 0 && a.priceUsd.min > 0 && a.priceUsd.max >= a.priceUsd.min);

    return { anchors, warnings };
}

type AnchorSelection = {
    anchor: AnchorCandidate;
    importCalc: ReturnType<typeof calculateLebanonImportCost>;
    reason: string;
    warnings: string[];
    landedComparison: Record<string, { min: number; max: number }>;
    sourcePreference: SourcePreference;
    uaeLandedMidpoint: number | null;
    europeLandedMidpoint: number | null;
    chosenLandedMidpoint: number;
    overridden: boolean;
};

function landedMidpoint(calc: ReturnType<typeof calculateLebanonImportCost>): number {
    return Math.round((calc.landedCostUsd.min + calc.landedCostUsd.max) / 2);
}

/**
 * Deterministic anchor selection (the AI recommendation is advisory only):
 * 1. Landed cost (and its midpoint) is computed for EVERY valid anchor.
 * 2. Explicit GCC source → UAE anchor. Explicit Germany/Europe source →
 *    Europe anchor.
 * 3. Company / Import / Unknown / blank source → UAE preferred when it has
 *    usable comps; Europe never chosen when its landed midpoint is more
 *    than ~17.5% above the UAE landed midpoint.
 * 4. When both are valid and comparable quality, the lower (more
 *    conservative) landed midpoint wins.
 */
function selectFallbackAnchor(params: {
    research: FallbackResearchResult;
    fuelCategory: FuelCategory;
    mileageKm: number;
    rules: ActiveImportRules['rules'];
    specs: string | null | undefined;
    tier: BrandTier;
}): AnchorSelection | null {
    const { research, fuelCategory, mileageKm, rules, specs, tier } = params;

    const { anchors, warnings } = normalizeAnchors(research, tier);
    if (anchors.length === 0) return null;

    // 1. Landed cost for every valid anchor
    const withLanded = anchors.map((anchor) => ({
        anchor,
        calc: calculateLebanonImportCost({
            sourceMarketPriceUsdMin: anchor.priceUsd.min,
            sourceMarketPriceUsdMax: anchor.priceUsd.max,
            fuelCategory,
            mileageKm,
            rules,
        }),
    }));

    const landedComparison: Record<string, { min: number; max: number }> = {};
    for (const entry of withLanded) {
        landedComparison[entry.anchor.market] = entry.calc.landedCostUsd;
    }

    const uae = withLanded.find((x) => x.anchor.market === 'UAE') ?? null;
    const europe = withLanded.find((x) => x.anchor.market === 'EUROPE') ?? null;
    const sourcePreference = getSourcePreference(specs);

    const uaeMid = uae ? landedMidpoint(uae.calc) : null;
    const europeMid = europe ? landedMidpoint(europe.calc) : null;

    let chosen: (typeof withLanded)[number];
    let reason: string;

    if (europe && sourcePreference === 'EUROPE') {
        chosen = europe;
        reason = 'Vehicle source is Germany/Europe — Europe anchor required.';
    } else if (uae && sourcePreference === 'UAE') {
        chosen = uae;
        reason = 'Vehicle source is GCC — UAE/GCC anchor preferred.';
    } else if (!europe && uae) {
        chosen = uae;
        reason = 'Only the UAE anchor has usable comparables.';
    } else if (!uae && europe) {
        chosen = europe;
        reason = 'UAE comparables are missing — Europe anchor used.';
    } else if (uae && europe && uaeMid !== null && europeMid !== null) {
        // Neutral / Company / Import / Unknown source: UAE-FIRST policy.
        // UAE is usually the stronger regional resale anchor for Lebanon —
        // a lower Europe landed midpoint alone is NOT a reason to override.
        const uaePremiumOverEurope = (uaeMid - europeMid) / europeMid;
        const uaeClearlyWeak =
            uae.anchor.comparableCount < 2 &&
            europe.anchor.comparableCount >= 3;

        if (uaeClearlyWeak) {
            chosen = europe;
            reason = 'UAE anchor is clearly weak and Europe has much stronger comparables — Europe anchor used.';
        } else if (uaePremiumOverEurope > UAE_OVER_EUROPE_PREMIUM_LIMIT) {
            chosen = europe;
            reason = `UAE landed midpoint is ${Math.round(uaePremiumOverEurope * 100)}% above Europe (more than 20%) — Europe anchor used as the realistic benchmark.`;
        } else {
            chosen = uae;
            reason = 'UAE selected because source is neutral/company and UAE is the stronger Lebanon regional resale anchor; UAE landed midpoint is within 20% of Europe.';
        }
    } else {
        chosen = withLanded.sort((a, b) => b.anchor.comparableCount - a.anchor.comparableCount)[0];
        reason = 'Anchor with the strongest comparables used.';
    }

    // The AI recommendation is advisory — note when the backend overrides it.
    const overridden =
        !!research.recommendedAnchorMarket &&
        research.recommendedAnchorMarket !== chosen.anchor.market;

    if (overridden) {
        warnings.push(
            `AI recommended the ${research.recommendedAnchorMarket} anchor; backend selected ${chosen.anchor.market} deterministically (${reason})`
        );
    }

    return {
        anchor: chosen.anchor,
        importCalc: chosen.calc,
        reason,
        warnings,
        landedComparison,
        sourcePreference,
        uaeLandedMidpoint: uaeMid,
        europeLandedMidpoint: europeMid,
        chosenLandedMidpoint: landedMidpoint(chosen.calc),
        overridden,
    };
}

async function evaluateLebanonVehicleWithFallback(
    payload: EvaluateVehiclePayload,
    forceNoCache: boolean
) {
    // 1. Active import rules (versioned; falls back to defaults)
    const activeRules: ActiveImportRules = await getActiveImportRules('LEBANON');
    const ruleVersion = activeRules.rules.version;

    // 2. Cache (key includes the active import-rule version)
    const cacheKey = !forceNoCache
        ? buildCacheKey({ ...payload, region: 'LEBANON' }, { ruleVersion })
        : null;

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
    const model = getModel();
    const threshold = getFallbackThreshold();

    // 3. Phase 1 — Lebanon local assessment (always runs)
    const { data: assessment, response: assessmentResponse } =
        await callLebanonAssessment(openai, model, payload);

    const assessmentSources = extractWebSources(assessmentResponse);
    const assessmentUsage = getUsage(assessmentResponse);

    const baseMeta = {
        importRulesVersion: ruleVersion,
        usedDefaultImportRules: activeRules.isDefaultRules,
        localComparableCount: assessment.localMarketAssessment.totalComparableCount,
        strongLocalComparableCount: assessment.localMarketAssessment.strongComparableCount,
        hasUsableDirectLebanonAnchor: assessment.localMarketAssessment.hasUsableDirectLebanonAnchor ?? null,
        directLebanonAnchorReason: assessment.localMarketAssessment.directLebanonAnchorReason ?? null,
        sourceRiskLevel: assessment.localMarketAssessment.sourceRiskLevel ?? null,
        sourceRiskReason: assessment.localMarketAssessment.sourceRiskReason ?? null,
        fallbackThreshold: threshold,
    };

    // 4. Decide whether fallback is needed
    const fallbackNeeded = shouldUseLebanonFallback(assessment, threshold);

    if (!fallbackNeeded) {
        // 5. Direct Lebanon valuation (current behavior + assessment metadata)
        const { fallbackRequired: _ignored, ...assessmentFields } = assessment;

        // ── Direct-anchor extraction safety ─────────────────────────────
        // If the model claimed an anchor but left directLebanonAnchorPriceUsd
        // null, recover the numeric price from localPriceAnchors
        // (exact > near_exact > same_model; same year, closest mileage).
        const la = assessment.localMarketAssessment;
        const mileageUsedKm = getMileageUsed(payload);

        let anchorPrice: number | null = la.directLebanonAnchorPriceUsd ?? null;
        let anchorPriceSource: 'model_direct' | 'computed_from_anchors' | null =
            anchorPrice !== null && anchorPrice > 0 ? 'model_direct' : null;

        if (!anchorPriceSource) {
            const best = pickBestLocalAnchor(la.localPriceAnchors, payload.year, mileageUsedKm);
            if (best) {
                anchorPrice = best.price;
                anchorPriceSource = 'computed_from_anchors';
            } else {
                anchorPrice = null;
            }
        }

        const specsNotes = `${payload.specs || ''} ${payload.notes || ''}`;
        const explicitRisk = EXPLICIT_RISK_REGEX.test(specsNotes);
        const cleanCondition = CLEAN_CONDITION_REGEX.test(specsNotes);
        const clampWarnings: string[] = [];
        let directFields: typeof assessmentFields = assessmentFields;
        let clampApplied = false;
        let svrGuardrailApplied = false;

        // ── Direct-anchor sanity clamp ──────────────────────────────────
        // Clean, low-risk luxury/performance vehicle with a same-trim local
        // anchor: market midpoint must not sit more than 5–8% below the
        // anchor purely on mileage (5% when notes confirm clean condition).
        if (
            (la.hasUsableDirectLebanonAnchor || la.hasExactVerifiedLocalMatch) &&
            anchorPrice !== null && anchorPrice > 0 &&
            (la.sourceRiskLevel ?? 'low') === 'low' &&
            isPerformanceLuxury(payload) &&
            !explicitRisk &&
            mileageUsedKm <= 100_000
        ) {
            const floorFactor = cleanCondition ? 0.95 : 0.92; // 5% / 8% below anchor
            const mid = (assessment.marketPrice.min + assessment.marketPrice.max) / 2;
            const floorMid = anchorPrice * floorFactor;

            // Sanity window: only clamp when the anchor is plausibly comparable
            if (mid < floorMid && mid > anchorPrice * 0.5) {
                const spread = Math.max(
                    assessment.marketPrice.max - assessment.marketPrice.min,
                    2000
                );
                const newMin = roundTo(floorMid - spread / 2, 100);
                const newMax = Math.max(roundTo(floorMid + spread / 2, 100), newMin + 1000);

                const marketPrice = { currency: 'USD' as const, min: newMin, max: newMax };
                const dealerMin = roundTo(newMin * 0.89, 100);
                const dealerMax = Math.max(roundTo(newMax * 0.90, 100), dealerMin + 1000);
                const dealerBuyPrice = {
                    currency: 'USD' as const,
                    min: dealerMin,
                    max: Math.min(dealerMax, newMax - 500),
                };

                directFields = {
                    ...assessmentFields,
                    marketPrice,
                    marketPriceUsd: { ...marketPrice },
                    dealerBuyPrice,
                    dealerBuyPriceUsd: { ...dealerBuyPrice },
                };

                clampApplied = true;
                clampWarnings.push(
                    `Direct-anchor sanity clamp applied: model priced too far below the local anchor (USD ${Math.round(anchorPrice).toLocaleString()}); market midpoint raised to within ${Math.round((1 - floorFactor) * 100)}% of the anchor. Mileage alone does not justify a larger discount for a clean ${payload.make} ${payload.model}.`
                );
            }
        }

        // ── Model-specific guardrail: clean Range Rover Sport SVR ───────
        const isCleanRecentSvr =
            /land rover|range rover/i.test(String(payload.make || '')) &&
            /range rover sport|sport/i.test(String(payload.model || '')) &&
            /svr/i.test(`${payload.model || ''} ${payload.variant || ''}`) &&
            payload.year >= 2020 &&
            mileageUsedKm <= 85_000 &&
            (la.sourceRiskLevel ?? 'low') === 'low' &&
            cleanCondition &&
            !explicitRisk;

        // Skip the guardrail only when a numeric direct anchor clearly proves
        // a lower market level.
        const anchorsProveLower = anchorPrice !== null && anchorPrice > 0 && anchorPrice < 95_000;

        if (isCleanRecentSvr && !anchorsProveLower) {
            const current = directFields.marketPrice;
            const currentMid = (current.min + current.max) / 2;

            const MIN_MARKET_MIN = 95_000;
            const MIN_MARKET_MID = 99_000;

            if (current.min < MIN_MARKET_MIN || currentMid < MIN_MARKET_MID) {
                const spread = Math.max(current.max - current.min, 5_000);
                const targetMid = Math.max(currentMid, MIN_MARKET_MID);
                let newMin = Math.max(roundTo(targetMid - spread / 2, 100), MIN_MARKET_MIN);
                let newMax = Math.max(roundTo(newMin + spread, 100), newMin + 1000);

                const marketPrice = { currency: 'USD' as const, min: newMin, max: newMax };
                const dealerMin = Math.max(roundTo(newMin * 0.90, 100), 86_000);
                const dealerMax = Math.min(
                    Math.max(roundTo(newMax * 0.90, 100), dealerMin + 1000),
                    newMax - 500
                );
                const dealerBuyPrice = { currency: 'USD' as const, min: dealerMin, max: dealerMax };

                directFields = {
                    ...directFields,
                    marketPrice,
                    marketPriceUsd: { ...marketPrice },
                    dealerBuyPrice,
                    dealerBuyPriceUsd: { ...dealerBuyPrice },
                };

                svrGuardrailApplied = true;
                clampWarnings.push(
                    'Clean Range Rover Sport SVR sanity guardrail applied: market floor USD 95,000 / midpoint floor USD 99,000 (clean title, no explicit risk, no lower direct anchor).'
                );
            }
        }

        // ── Source-hierarchy calibration (brand-new luxury/exotic) ──────
        // Guarantees Company/Official ≥ GCC ≥ Europe ≥ U.S./Canada clean for
        // 0 km / current-model-year luxury vehicles priced from local comps.
        // Never runs when the anchor clamp or SVR guardrail already adjusted
        // the price (preserves the Portofino/SVR/GLE behaviors).
        const sourceHierarchyType = classifySourceHierarchy(payload.specs, payload.notes);
        let sourceHierarchyCalibrationApplied = false;
        let sourceHierarchyAdjustmentReason: string | null = null;

        const isNewish =
            payload.year >= new Date().getFullYear() || mileageUsedKm <= 5000;

        if (
            !clampApplied &&
            !svrGuardrailApplied &&
            directFields.sourceMarketAnchorUsed === false &&
            isPerformanceLuxury(payload) &&
            isNewish &&
            sourceHierarchyType !== 'UNKNOWN' &&
            !FULL_LOCAL_SUPPORT_REGEX.test(`${payload.specs || ''} ${payload.notes || ''}`)
        ) {
            const adjustment = getSourceHierarchyAdjustment(sourceHierarchyType, cleanCondition);

            if (adjustment) {
                const current = directFields.marketPrice;
                const newMin = roundTo(current.min * adjustment.marketFactor, 100);
                const newMax = Math.max(
                    roundTo(current.max * adjustment.marketFactor, 100),
                    newMin + 1000
                );

                const marketPrice = { currency: 'USD' as const, min: newMin, max: newMax };
                const dealerMin = roundTo(newMin * adjustment.dealerFactors.min, 100);
                const dealerMax = Math.min(
                    Math.max(roundTo(newMax * adjustment.dealerFactors.max, 100), dealerMin + 1000),
                    newMax - 500
                );
                const dealerBuyPrice = { currency: 'USD' as const, min: dealerMin, max: dealerMax };

                directFields = {
                    ...directFields,
                    marketPrice,
                    marketPriceUsd: { ...marketPrice },
                    dealerBuyPrice,
                    dealerBuyPriceUsd: { ...dealerBuyPrice },
                };

                sourceHierarchyCalibrationApplied = true;
                sourceHierarchyAdjustmentReason = adjustment.reason;
                clampWarnings.push(`Source-hierarchy calibration applied: ${adjustment.reason}`);
            }
        }

        // ── Lebanon local-comp cluster cap (direct path) ────────────────
        // For normal/luxury vehicles with 3+ tightly clustered current local
        // listings, cap the market near the current cluster so one stale/high
        // asking listing cannot inflate the range. Never runs on exotic/rare
        // vehicles, on premium-justifying notes, when the SVR guardrail set
        // explicit floors, or on the source-market fallback path. This
        // REPLACES the old mileage-monotonicity guard.
        let clusterMeta = {
            localCompClusterApplied: false,
            localCompClusterCount: 0,
            localCompClusterMinUsd: null as number | null,
            localCompClusterMedianUsd: null as number | null,
            localCompClusterMaxUsd: null as number | null,
            localCompClusterCapReason: null as string | null,
        };

        if (!svrGuardrailApplied && directFields.sourceMarketAnchorUsed === false) {
            const clusterCap = applyLebanonLocalCompClusterCap({
                brandTier: getBrandTier(payload.make),
                sourceMarketAnchorUsed: false,
                targetYear: payload.year,
                specsAndNotes: specsNotes,
                anchors: (la.localPriceAnchors as ClusterAnchorLike[] | undefined),
                currentMarket: directFields.marketPrice,
                currentDealer: directFields.dealerBuyPrice,
            });

            clusterMeta = clusterCap.metadata;

            if (clusterCap.applied) {
                const marketPrice = { currency: 'USD' as const, ...clusterCap.market };
                const dealerBuyPrice = { currency: 'USD' as const, ...clusterCap.dealer };

                directFields = {
                    ...directFields,
                    marketPrice,
                    marketPriceUsd: { ...marketPrice },
                    dealerBuyPrice,
                    dealerBuyPriceUsd: { ...dealerBuyPrice },
                };

                clampWarnings.push(clusterCap.metadata.localCompClusterCapReason!);
            }
        }

        // ── Narrow C200 2023 European-source guardrail ──────────────────
        // Mercedes-Benz C200 / C 200 2023, European source, 20k–40k km, with an
        // exact/near-exact ~USD 49k local comp: hold the market at the current
        // cluster (min ~47–48k, max ≤ 50.5k). Does NOT touch AMG variants,
        // brand-new 2025 cars, confirmed-warranty company/TGF cars, or exotics.
        let c200GuardrailApplied = false;

        if (
            !svrGuardrailApplied &&
            directFields.sourceMarketAnchorUsed === false &&
            /mercedes/i.test(String(payload.make || '')) &&
            /\bc\s?200\b/i.test(`${payload.model || ''} ${payload.variant || ''}`) &&
            !/\bc\s?43\b|\bc\s?63\b|\bamg\b/i.test(`${payload.model || ''} ${payload.variant || ''}`) &&
            payload.year === 2023 &&
            mileageUsedKm >= 20_000 && mileageUsedKm <= 40_000 &&
            /german|germany|europe|european|\beu\b/i.test(specsNotes) &&
            !/special edition|limited edition|full local warranty|company warranty|official warranty|exceptional option/i.test(specsNotes)
        ) {
            // Best exact/near-exact C200 2023 local anchor around USD 49k.
            const c200Anchor = (la.localPriceAnchors ?? []).find(
                (a: any) =>
                    (a?.sourceStrength === 'exact' || a?.sourceStrength === 'near_exact') &&
                    typeof a?.priceUsd === 'number' &&
                    a.priceUsd >= 44_000 && a.priceUsd <= 51_000
            );

            const base = c200Anchor?.priceUsd ?? 49_000;
            const newMin = Math.max(roundTo(base * 0.97, 100), 47_000);
            const newMax = Math.min(roundTo(base * 1.02, 100), 50_500);

            const marketPrice = { currency: 'USD' as const, min: newMin, max: Math.max(newMax, newMin + 1000) };
            const dealerMin = roundTo(newMin * 0.905, 100);
            const dealerMax = Math.min(roundTo(marketPrice.max * 0.91, 100), marketPrice.max - 500);
            const dealerBuyPrice = { currency: 'USD' as const, min: dealerMin, max: Math.max(dealerMax, dealerMin + 1000) };

            directFields = {
                ...directFields,
                marketPrice,
                marketPriceUsd: { ...marketPrice },
                dealerBuyPrice,
                dealerBuyPriceUsd: { ...dealerBuyPrice },
            };

            c200GuardrailApplied = true;
            clusterMeta = {
                ...clusterMeta,
                localCompClusterApplied: true,
                localCompClusterCapReason:
                    clusterMeta.localCompClusterCapReason ??
                    `C200 2023 European-source guardrail: held to the current local cluster around USD ${Math.round(base).toLocaleString()} (market ${marketPrice.min.toLocaleString()}–${marketPrice.max.toLocaleString()}).`,
            };
            clampWarnings.push(
                `C200 2023 European-source guardrail applied: market capped to the current local comp cluster (max ≤ USD 50,500) rather than stale/high asking listings.`
            );
        }

        // ── Import-duty mileage threshold (informational only) ──────────
        const directDutyThreshold = getImportDutyMileageThreshold(
            assessment.fuelCategory,
            mileageUsedKm
        );

        const valuation: ValuationResult = ValuationResultSchema.parse({
            ...directFields,
        });

        const markdown = buildMarkdownFromValuationJson(valuation);
        const estimatedCostUsd = estimateCostFromUsage(assessmentUsage, model);

        const finalResult = buildFinalResponse({
            region: 'LEBANON',
            model,
            payload,
            valuation,
            markdown,
            sources: assessmentSources,
            usage: assessmentUsage,
            estimatedCostUsd,
            cacheHit: false,
            extraMeta: {
                ...baseMeta,
                sourceMarketAnchorUsed: valuation.sourceMarketAnchorUsed,
                directAnchorClampApplied: clampApplied,
                svrGuardrailApplied,
                directLebanonAnchorPriceUsd: la.directLebanonAnchorPriceUsd ?? null,
                computedDirectAnchorPriceUsd: anchorPrice,
                directAnchorPriceSource: anchorPriceSource,
                sourceHierarchyCalibrationApplied,
                sourceHierarchySourceType: sourceHierarchyType,
                sourceHierarchyAdjustmentReason,
                localCompClusterApplied: clusterMeta.localCompClusterApplied,
                localCompClusterCount: clusterMeta.localCompClusterCount,
                localCompClusterMinUsd: clusterMeta.localCompClusterMinUsd,
                localCompClusterMedianUsd: clusterMeta.localCompClusterMedianUsd,
                localCompClusterMaxUsd: clusterMeta.localCompClusterMaxUsd,
                localCompClusterCapReason: clusterMeta.localCompClusterCapReason,
                c200GuardrailApplied,
                mileageImportDutyThresholdCrossed: directDutyThreshold.mileageImportDutyThresholdCrossed,
                importDutyMileageReason: directDutyThreshold.importDutyMileageReason,
                ...(clampWarnings.length > 0 ? { warnings: clampWarnings } : {}),
            },
        });

        if (cacheKey) {
            await saveValuationToCache(cacheKey, finalResult, payload.make);
        }

        return finalResult;
    }

    // 6. Phase 2 — UAE + Europe fallback research
    let research: FallbackResearchResult | null = null;
    let researchResponse: any = null;
    const warnings: string[] = [];

    try {
        const researchResult = await callLebanonFallbackResearch(openai, model, payload);
        research = researchResult.data;
        researchResponse = researchResult.response;
    } catch (err: any) {
        log.error('Lebanon fallback research failed', { err });

        // Graceful degradation: if the direct Lebanon estimate is usable,
        // return it with a warning instead of failing the request.
        if (assessment.confidence !== 'low') {
            const { fallbackRequired: _ignored, ...assessmentFields } = assessment;
            const valuation: ValuationResult = ValuationResultSchema.parse(assessmentFields);
            const markdown = buildMarkdownFromValuationJson(valuation);
            const estimatedCostUsd = estimateCostFromUsage(assessmentUsage, model);

            const finalResult = buildFinalResponse({
                region: 'LEBANON',
                model,
                payload,
                valuation,
                markdown,
                sources: assessmentSources,
                usage: assessmentUsage,
                estimatedCostUsd,
                cacheHit: false,
                extraMeta: {
                    ...baseMeta,
                    warnings: [
                        'Fallback market research failed — returned the direct Lebanon estimate instead.',
                    ],
                },
            });

            // Do not cache degraded results.
            return finalResult;
        }

        throw new Error('Marketplace search could not be completed. Please try again.');
    }

    // 7. Deterministic anchor selection: landed cost is computed for EVERY
    //    valid anchor and the backend picks the realistic benchmark — the
    //    AI's recommendation is advisory only.
    const fuelCategory: FuelCategory =
        research.fuelCategory !== 'unknown' ? research.fuelCategory : assessment.fuelCategory;

    const mileageKm = getMileageUsed(payload);

    const selection = selectFallbackAnchor({
        research,
        fuelCategory,
        mileageKm,
        rules: activeRules.rules,
        specs: payload.specs,
        tier: getBrandTier(payload.make),
    });

    if (!selection) {
        // No usable fallback anchors either — same degradation logic.
        warnings.push('No usable UAE/Europe anchors were found.');

        const { fallbackRequired: _ignored, ...assessmentFields } = assessment;
        const valuation: ValuationResult = ValuationResultSchema.parse({
            ...assessmentFields,
            fallbackMarketsUsed: research.fallbackMarketsUsed,
        });
        const markdown = buildMarkdownFromValuationJson(valuation);
        const usage = sumUsage(assessmentUsage, getUsage(researchResponse));

        const finalResult = buildFinalResponse({
            region: 'LEBANON',
            model,
            payload,
            valuation,
            markdown,
            sources: mergeSources(assessmentSources, extractWebSources(researchResponse)),
            usage,
            estimatedCostUsd: estimateCostFromUsage(usage, model),
            cacheHit: false,
            extraMeta: { ...baseMeta, warnings },
        });

        return finalResult;
    }

    // 8. Chosen anchor + its deterministic import/customs calculation
    const { anchor, importCalc } = selection;

    warnings.push(...selection.warnings, ...importCalc.warnings);

    const specsAndNotes = `${payload.specs || ''} ${payload.notes || ''}`;
    const isNorthAmericanSource = /u\.s\.|\busa?\b|american|canad/i.test(specsAndNotes);
    const cleanTitleConfirmed = /clean title|clean carfax|no accident/i.test(specsAndNotes);

    if (isNorthAmericanSource && !cleanTitleConfirmed) {
        warnings.push(
            'U.S./Canada source vehicle without confirmed clean title — priced conservatively; confirm title/Carfax/warranty before final offers.'
        );
    }

    // 9. Deterministic final Lebanon pricing.
    // Landed cost is a BENCHMARK, not the resale price: the market range is
    // built around the chosen landed MIDPOINT with a tier-capped spread, so
    // a high landed max can never inflate the final Lebanon price.
    const tier = getBrandTier(payload.make);
    const spreadBounds = getMarketSpreadBounds(tier);

    const landedMid = selection.chosenLandedMidpoint;
    const landedSpread = importCalc.landedCostUsd.max - importCalc.landedCostUsd.min;
    const marketSpread = Math.min(Math.max(landedSpread, spreadBounds.floor), spreadBounds.cap);

    let marketMin = roundTo(landedMid, 100);
    let marketMax = roundTo(landedMid + marketSpread, 100);

    if (marketMax <= marketMin) {
        marketMax = marketMin + 1000;
    }

    // ── Import-duty mileage threshold (informational only) ───────────
    // The old mileage-monotonicity guard has been removed. Mileage still
    // usually lowers value via prompt reasoning + comps, but the backend no
    // longer forces a hard cap. For hybrid-family vehicles over 5,000 km the
    // Lebanon 63% duty class legitimately applies and may raise the landed
    // benchmark above a 0 km equivalent — we surface this, we don't override it.
    const fallbackDutyThreshold = getImportDutyMileageThreshold(fuelCategory, mileageKm);

    const dealerFactors = tier === 'exotic'
        ? { min: 0.90, max: 0.915 } // ~9–15% below for slow-moving rare cars
        : tier === 'luxury'
            ? { min: 0.90, max: 0.92 } // 8–12% below market
            : { min: 0.91, max: 0.93 }; // 7–10% below market

    let dealerMin = roundTo(marketMin * dealerFactors.min, 100);
    let dealerMax = roundTo(marketMax * dealerFactors.max, 100);

    if (dealerMax >= marketMax) dealerMax = marketMax - 500;
    if (dealerMin >= dealerMax) dealerMin = dealerMax - 1000;

    const valuation: ValuationResult = ValuationResultSchema.parse({
        region: 'LEBANON',
        vehicle: assessment.vehicle,
        marketPrice: { currency: 'USD', min: marketMin, max: marketMax },
        marketPriceUsd: { currency: 'USD', min: marketMin, max: marketMax },
        dealerBuyPrice: { currency: 'USD', min: dealerMin, max: dealerMax },
        dealerBuyPriceUsd: { currency: 'USD', min: dealerMin, max: dealerMax },
        fallbackUsed: true,
        fallbackLevel: 5,
        mileageFallbackUsed: assessment.mileageFallbackUsed,
        sourceMarketAnchorUsed: true,
        confidence: research.confidence,
        shortReason: `Lebanon comps weak (${assessment.localMarketAssessment.strongComparableCount} strong). Anchored on ${anchor.market} market with ${Math.round(importCalc.taxRateApplied * 100)}% Lebanon import load applied. ${selection.reason} ${research.reason}`.slice(0, 500),
        localMarketAssessment: assessment.localMarketAssessment,
        fuelCategory,
        fallbackMarketsUsed: research.fallbackMarketsUsed,
        sourceMarketAnchors: research.sourceMarketAnchors,
        importCalculation: {
            applied: true,
            ruleVersion,
            usedDefaultRules: activeRules.isDefaultRules,
            sourceMarket: anchor.market,
            fuelCategory: importCalc.matchedFuelCategory,
            taxRateApplied: importCalc.taxRateApplied,
            sourceMarketPriceUsd: importCalc.sourceMarketPriceUsd,
            estimatedTaxUsd: importCalc.estimatedTaxUsd,
            landedCostUsd: importCalc.landedCostUsd,
            warnings,
        },
    });

    const markdown = buildMarkdownFromValuationJson(valuation);
    const usage = sumUsage(assessmentUsage, getUsage(researchResponse));
    const sources = mergeSources(assessmentSources, extractWebSources(researchResponse));

    const finalResult = buildFinalResponse({
        region: 'LEBANON',
        model,
        payload,
        valuation,
        markdown,
        sources,
        usage,
        estimatedCostUsd: estimateCostFromUsage(usage, model),
        cacheHit: false,
        extraMeta: {
            ...baseMeta,
            sourceMarketAnchorUsed: true,
            // Debug metadata — makes anchor decisions auditable
            sourcePreference: selection.sourcePreference,
            aiRecommendedAnchorMarket: research.recommendedAnchorMarket,
            backendChosenAnchorMarket: anchor.market,
            anchorOverrideReason: selection.overridden ? selection.reason : null,
            anchorSelectionReason: selection.reason,
            uaeLandedMidpoint: selection.uaeLandedMidpoint,
            europeLandedMidpoint: selection.europeLandedMidpoint,
            chosenLandedMidpoint: selection.chosenLandedMidpoint,
            landedComparison: selection.landedComparison,
            mileageImportDutyThresholdCrossed: fallbackDutyThreshold.mileageImportDutyThresholdCrossed,
            importDutyMileageReason: fallbackDutyThreshold.importDutyMileageReason,
            sourceRiskLevel: assessment.localMarketAssessment.sourceRiskLevel ?? null,
            sourceRiskReason: assessment.localMarketAssessment.sourceRiskReason ?? null,
            ...(warnings.length > 0 ? { warnings } : {}),
        },
    });

    if (cacheKey) {
        await saveValuationToCache(cacheKey, finalResult, payload.make);
    }

    return finalResult;
}

// ---------------------------------------------------------------------------
// Public entry point — unchanged signature.
// ---------------------------------------------------------------------------
export async function evaluateVehicleWithAI(
    payload: EvaluateVehiclePayload,
    forceNoCache = false
) {
    const region = String(payload.region || '').toUpperCase() as Region;

    if (!['LEBANON', 'UAE', 'EUROPE'].includes(region)) {
        throw new Error('Unsupported region');
    }

    // ── Model-year validity pre-check (registry first; AI web check for
    //    unknown exotic models). Runs BEFORE any expensive valuation call.
    const validity = await validateVehicleModelYear({
        make: payload.make,
        model: payload.model,
        variant: payload.variant,
        year: payload.year,
    });

    if (!validity.valid) {
        // Structured invalid-vehicle response — no valuation, nothing cached.
        return {
            status: 'invalid_vehicle',
            region,
            currency: 'USD',
            message: validity.message,
            correction: {
                make: payload.make,
                model: payload.model,
                submittedYear: payload.year,
                earliestValidYear: validity.correction?.earliestValidYear ?? null,
                latestKnownYear: validity.correction?.latestKnownYear ?? null,
                suggestedYearRange: validity.correction?.suggestedYearRange ?? null,
                suggestedModelsForYear: validity.correction?.suggestedModelsForYear ?? [],
            },
            sources: validity.sources ?? [],
            meta: {
                validationStage: 'model_year',
                modelYearValidated: true,
                modelYearValidationSource: validity.source,
                invalidReason: validity.errorCode,
                cacheHit: false,
            },
        };
    }

    const validityWarning = validity.warning ?? null;

    const result = region === 'LEBANON'
        ? await evaluateLebanonVehicleWithFallback({ ...payload, region }, forceNoCache)
        : await evaluateStandardRegionVehicleWithAI({ ...payload, region }, region, forceNoCache);

    if (result && typeof result === 'object' && 'meta' in result) {
        const existingWarnings = Array.isArray((result.meta as any)?.warnings)
            ? (result.meta as any).warnings
            : [];

        (result as any).meta = {
            ...(result as any).meta,
            modelYearValidated: validity.checked,
            modelYearValidationSource: validity.source,
            ...(validity.earliestValidYear ? { earliestValidYear: validity.earliestValidYear } : {}),
            ...(validityWarning
                ? { warnings: [...existingWarnings, validityWarning] }
                : {}),
        };
    }

    return result;
}
