export type ValuationSource = {
    title: string;
    url: string;
    domain: string;
};

function getDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

function addSource(
    sources: Map<string, ValuationSource>,
    source: { title?: string; url?: string }
) {
    if (!source.url) return;

    const url = source.url;
    const domain = getDomain(url);

    if (!domain) return;

    sources.set(url, {
        title: source.title || domain,
        url,
        domain,
    });
}

function walkForUrls(value: unknown, sources: Map<string, ValuationSource>) {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
        for (const item of value) {
            walkForUrls(item, sources);
        }
        return;
    }

    const obj = value as Record<string, any>;

    if (typeof obj.url === 'string') {
        addSource(sources, {
            title: typeof obj.title === 'string' ? obj.title : undefined,
            url: obj.url,
        });
    }

    if (typeof obj.uri === 'string') {
        addSource(sources, {
            title: typeof obj.title === 'string' ? obj.title : undefined,
            url: obj.uri,
        });
    }

    if (obj.type === 'url_citation' && typeof obj.url === 'string') {
        addSource(sources, {
            title: typeof obj.title === 'string' ? obj.title : undefined,
            url: obj.url,
        });
    }

    for (const child of Object.values(obj)) {
        walkForUrls(child, sources);
    }
}

export function extractWebSources(response: unknown): ValuationSource[] {
    const sources = new Map<string, ValuationSource>();

    walkForUrls(response, sources);

    return Array.from(sources.values()).slice(0, 10);
}

export function responseUsedWebSearch(response: any): boolean {
    const output = Array.isArray(response?.output) ? response.output : [];

    return output.some((item: any) => item?.type === 'web_search_call');
}