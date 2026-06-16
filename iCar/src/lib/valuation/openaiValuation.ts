import OpenAI from 'openai';
import { OPENAI_JSON_SCHEMA, ValuationResultSchema, ValuationResult } from './schema';
import { GLOBAL_PROMPT } from './prompts/global';
import { LEBANON_PROMPT } from './prompts/lebanon';
import { UAE_PROMPT } from './prompts/uae';
import { EUROPE_PROMPT } from './prompts/europe';
import { buildMarkdownFromValuationJson } from './formatMarkdown';
import { extractWebSources } from './sourceExtraction';
import { estimateOpenAICost } from './cost';
import { getValuationFromCache, saveValuationToCache, buildCacheKey } from './cache';

// Initialize OpenAI client dynamically in the function to pick up env vars if they change
function getOpenAIClient() {
    return new OpenAI({
        apiKey: process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY,
    });
}

function getWebSearchTool(region: string): OpenAI.Chat.Completions.ChatCompletionTool {
    // Basic web_search tool structure
    const tool: any = {
        type: "web_search",
        web_search: {
            search_context_size: "high"
        }
    };

    // If allowed_domains is supported by the specific model version, it would be added here.
    // To ensure type safety with the standard SDK, we cast to any and let the API handle it.
    if (region === 'UAE') {
        tool.web_search.allowed_domains = [
            "dubizzle.com", "dubicars.com", "autotraderuae.com", 
            "audi-dubai.com", "mercedesbenzme.com", "altayermotors.com", "premier-carcare.com"
        ];
    } else if (region === 'EUROPE') {
        tool.web_search.allowed_domains = [
            "mobile.de", "autoscout24.com", "preowned.ferrari.com"
        ];
    }
    // Lebanon is intentionally kept broader as requested.

    return tool as OpenAI.Chat.Completions.ChatCompletionTool;
}

export async function evaluateVehicleWithAI(payload: any, forceNoCache = false) {
    const region = String(payload.region).toUpperCase();
    const isQuick = payload.mode === 'quick';
    
    let cacheKey = null;
    if (!forceNoCache) {
        cacheKey = buildCacheKey(payload);
        if (cacheKey) {
            const cached = await getValuationFromCache(cacheKey);
            if (cached) {
                return { ...cached, _fromCache: true };
            }
        }
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_VALUATION_MODEL || 'gpt-4o'; // Use standard model, overridden by env
    
    // Build region instructions
    let regionPrompt = '';
    if (region === 'LEBANON') regionPrompt = LEBANON_PROMPT;
    else if (region === 'UAE') regionPrompt = UAE_PROMPT;
    else if (region === 'EUROPE') regionPrompt = EUROPE_PROMPT;
    else throw new Error("Unsupported region");

    const systemInstructions = `${GLOBAL_PROMPT}\n\n${regionPrompt}\n\nReturn structured JSON matching the provided schema.`;

    // Build dynamic user input
    let mileageLabel = 'Unknown';
    if (isQuick && payload.mileageMin != null && payload.mileageMax != null) {
        mileageLabel = `${payload.mileageMin}-${payload.mileageMax} km`;
    } else if (payload.mileage != null) {
        mileageLabel = `${payload.mileage} km`;
    }

    const userInputText = `Perform valuation for this vehicle.

Region: ${region}
Make: ${payload.make}
Model: ${payload.model}
Variant: ${payload.variant || 'Not specified'}
Year: ${payload.year}
Mileage: ${mileageLabel}
Specs/source: ${payload.specs || 'Unknown'}
Condition notes: ${payload.notes || 'Average condition assumed'}
Mode: ${payload.mode}

Return structured JSON only.`;

    const userContent: Array<OpenAI.Chat.Completions.ChatCompletionContentPart> = [
        { type: 'text', text: userInputText }
    ];

    if (!isQuick && payload.images && Array.isArray(payload.images)) {
        for (const img of payload.images) {
            const url = typeof img === 'string' ? img : img.url || img;
            if (url && url.startsWith('data:')) {
                userContent.push({
                    type: 'image_url',
                    image_url: { url, detail: 'auto' },
                });
            }
        }
    }

    // Prepare API call
    let retryCount = 0;
    while (retryCount < 2) {
        try {
            const response = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemInstructions },
                    { role: 'user', content: userContent }
                ],
                tools: [getWebSearchTool(region)],
                tool_choice: "required", // Ensure web search is used
                response_format: {
                    type: "json_schema",
                    json_schema: OPENAI_JSON_SCHEMA
                },
                max_tokens: 4096,
                temperature: 0.3
            }) as any; // Cast to any to handle extra annotations/fields if returned

            const message = response.choices?.[0]?.message;
            if (!message) {
                throw new Error("Empty response from OpenAI");
            }

            // Verify web search was called
            const toolCalls = message.tool_calls || [];
            const hasWebSearch = toolCalls.some((tc: any) => tc.function?.name?.includes('web_search') || tc.type === 'web_search');
            
            // Note: If the tool_choice is strictly honored, this shouldn't happen, but we verify as requested.
            if (!hasWebSearch && !response.choices?.[0]?.message?.content_annotations) {
                // Some models return it in annotations instead of tool_calls
                const annotations = message.annotations || message.content_annotations || [];
                const hasUrl = annotations.some((a: any) => a.url);
                if (!hasUrl && toolCalls.length === 0) {
                     // Fail if no search was done
                     throw new Error("Marketplace search could not be completed. Please try again.");
                }
            }

            const jsonStr = message.content;
            let parsedJson: any;
            try {
                parsedJson = JSON.parse(jsonStr);
            } catch (e) {
                throw new Error("Failed to parse JSON output");
            }

            // Validate with Zod
            const validationResult = ValuationResultSchema.safeParse(parsedJson);
            if (!validationResult.success) {
                console.error("Zod validation failed:", validationResult.error);
                // Retry requested in requirements
                if (retryCount === 0) {
                    retryCount++;
                    // Append correction instruction for next loop
                    userContent.push({
                        type: 'text',
                        text: 'Your previous output was invalid JSON schema. Please correct it.'
                    });
                    continue;
                }
                throw new Error("Structured JSON invalid after retry");
            }

            const validData: ValuationResult = validationResult.data;

            // Generate Markdown from valid JSON (Backend-generated)
            const markdown = buildMarkdownFromValuationJson(validData);
            validData.markdown = markdown; // Replace AI markdown with ours as source of truth

            const sources = extractWebSources(response);
            const usage = response.usage || {};
            const estimatedCostUsd = estimateOpenAICost(usage, model);

            const finalResult = {
                status: 'ok',
                region,
                currency: region === 'UAE' ? 'AED' : (region === 'EUROPE' ? 'EUR' : 'USD'),
                valuation: validData,
                markdown,
                mileageUsed: payload.mileage != null ? Number(payload.mileage) : (payload.mileageMin != null && payload.mileageMax != null ? Math.round((payload.mileageMin + payload.mileageMax) / 2) : 0),
                sources,
                usage: {
                    inputTokens: usage.prompt_tokens || 0,
                    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens || 0,
                    outputTokens: usage.completion_tokens || 0,
                    totalTokens: usage.total_tokens || 0,
                    estimatedCostUsd
                },
                meta: {
                    model,
                    webSearchUsed: true,
                    fallbackUsed: validData.fallbackUsed,
                    fallbackLevel: validData.fallbackLevel,
                    confidence: validData.confidence
                }
            };

            // Cache it if key exists
            if (cacheKey) {
                await saveValuationToCache(cacheKey, finalResult, region, payload.make);
            }

            return finalResult;

        } catch (error: any) {
            if (error.message.includes("Marketplace search could not be completed") || error.message.includes("Structured JSON invalid")) {
                if (retryCount >= 1) throw error; // Throw to route handler for 502
            }
            console.error("OpenAI Valuation Error:", error);
            throw error; // Let route handler catch and return 502
        }
    }
}
