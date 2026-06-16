type OpenAIUsage = {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: {
        cached_tokens?: number;
    };
    input_tokens_details?: {
        cached_tokens?: number;
    };
};

function numberFromEnv(name: string): number | null {
    const raw = process.env[name];
    if (!raw) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

export function estimateOpenAICost(usage: OpenAIUsage, _model: string): number | null {
    const inputPrice = numberFromEnv('OPENAI_INPUT_PRICE_PER_1M');
    const cachedInputPrice = numberFromEnv('OPENAI_CACHED_INPUT_PRICE_PER_1M');
    const outputPrice = numberFromEnv('OPENAI_OUTPUT_PRICE_PER_1M');
    const webSearchPrice = numberFromEnv('OPENAI_WEB_SEARCH_PRICE_PER_CALL') || 0;

    if (inputPrice === null || cachedInputPrice === null || outputPrice === null) {
        return null;
    }

    const inputTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;
    const cachedTokens =
        usage.input_tokens_details?.cached_tokens ??
        usage.prompt_tokens_details?.cached_tokens ??
        0;

    const nonCachedInputTokens = Math.max(inputTokens - cachedTokens, 0);

    const inputCost = (nonCachedInputTokens / 1_000_000) * inputPrice;
    const cachedInputCost = (cachedTokens / 1_000_000) * cachedInputPrice;
    const outputCost = (outputTokens / 1_000_000) * outputPrice;

    return Number((inputCost + cachedInputCost + outputCost + webSearchPrice).toFixed(8));
}