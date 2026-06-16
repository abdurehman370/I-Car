export function estimateOpenAICost(usage: any, model: string): number | null {
    if (!usage) return null;

    const inputPricePer1M = process.env.OPENAI_INPUT_PRICE_PER_1M 
        ? parseFloat(process.env.OPENAI_INPUT_PRICE_PER_1M) 
        : 2.50; // gpt-4o default input price as fallback

    const cachedInputPricePer1M = process.env.OPENAI_CACHED_INPUT_PRICE_PER_1M 
        ? parseFloat(process.env.OPENAI_CACHED_INPUT_PRICE_PER_1M) 
        : 1.25;

    const outputPricePer1M = process.env.OPENAI_OUTPUT_PRICE_PER_1M 
        ? parseFloat(process.env.OPENAI_OUTPUT_PRICE_PER_1M) 
        : 10.00;

    const webSearchPricePerCall = process.env.OPENAI_WEB_SEARCH_PRICE_PER_CALL 
        ? parseFloat(process.env.OPENAI_WEB_SEARCH_PRICE_PER_CALL) 
        : 0;

    const inputTokens = usage.prompt_tokens || 0;
    const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const standardInputTokens = Math.max(0, inputTokens - cachedTokens);

    let cost = 0;
    cost += (standardInputTokens / 1_000_000) * inputPricePer1M;
    cost += (cachedTokens / 1_000_000) * cachedInputPricePer1M;
    cost += (outputTokens / 1_000_000) * outputPricePer1M;

    // Add web search cost if applicable (assuming 1 call if not specified)
    // Often we don't have exact counts, so we can just add the fixed cost if webSearchUsed is true (handled higher up)
    
    return cost;
}
