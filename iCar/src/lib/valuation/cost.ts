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

// Default per-1M-token prices (USD). These are estimates for a GPT-5-class
// model so the UI/console always shows a cost; override per your real model
// pricing via the OPENAI_*_PRICE_PER_1M / _PER_CALL env vars.
const DEFAULT_INPUT_PRICE_PER_1M = 1.25;
const DEFAULT_CACHED_INPUT_PRICE_PER_1M = 0.125;
const DEFAULT_OUTPUT_PRICE_PER_1M = 10;
const DEFAULT_WEB_SEARCH_PRICE_PER_CALL = 0.025;

export function estimateOpenAICost(usage: OpenAIUsage, _model: string): number | null {
    const inputPrice = numberFromEnv('OPENAI_INPUT_PRICE_PER_1M') ?? DEFAULT_INPUT_PRICE_PER_1M;
    const cachedInputPrice =
        numberFromEnv('OPENAI_CACHED_INPUT_PRICE_PER_1M') ?? DEFAULT_CACHED_INPUT_PRICE_PER_1M;
    const outputPrice = numberFromEnv('OPENAI_OUTPUT_PRICE_PER_1M') ?? DEFAULT_OUTPUT_PRICE_PER_1M;
    const webSearchPrice =
        numberFromEnv('OPENAI_WEB_SEARCH_PRICE_PER_CALL') ?? DEFAULT_WEB_SEARCH_PRICE_PER_CALL;

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