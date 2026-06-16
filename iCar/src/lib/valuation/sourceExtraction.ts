export type ExtractedSource = {
    title: string;
    url: string;
    domain: string;
};

export function extractWebSources(response: any): ExtractedSource[] {
    const sources: ExtractedSource[] = [];
    const urlSet = new Set<string>();

    try {
        const message = response.choices?.[0]?.message;
        if (!message) return sources;

        // Extract from tool calls if present
        if (message.tool_calls && Array.isArray(message.tool_calls)) {
            for (const call of message.tool_calls) {
                // OpenAI's web_search sometimes returns sources in the tool call action or response
                // Depending on the exact model and SDK payload, the sources might be here or in citations.
                // Usually web_search results are not easily parsable directly from the raw response unless using a specific beta feature.
                // Let's attempt to parse web_search tool responses if they are mocked or stored.
                // If it's standard web_search, the actual sources are often returned in citations.
            }
        }

        // Try to extract from annotations/citations if present in some formats
        const annotations = message.annotations || message.content_annotations;
        if (Array.isArray(annotations)) {
            for (const item of annotations) {
                if (item.url) {
                    const url = item.url;
                    if (!urlSet.has(url)) {
                        urlSet.add(url);
                        try {
                            const domain = new URL(url).hostname.replace(/^www\./, '');
                            sources.push({
                                title: item.title || domain,
                                url,
                                domain
                            });
                        } catch (e) {
                            // Invalid URL
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error extracting web sources:", error);
    }

    return sources.slice(0, 10);
}
