/**
 * Anchor trust / outlier distrust for Lebanon direct-path valuations.
 *
 * The web-search model can return a lone "exact" asking price that is stale,
 * inflated, or blended from several listings (e.g. averaging a $49k real ad
 * with a $59k brand-new one → a fabricated ~$54.5k "exact" anchor). Left
 * unchecked, the direct-anchor sanity clamp then drags the valuation UP toward
 * that bad number.
 *
 * This helper is deliberately SOURCE-AGNOSTIC and CONSERVATIVE:
 *   - It only distrusts a HIGH outlier that diverges materially from the
 *     next-best comparable, so tightly-clustered anchors (e.g. GLE 53 at
 *     98–103k) are never touched.
 *   - It never fabricates or lowers a price on its own — it only re-points the
 *     anchor to an existing, more-typical local comp.
 *   - Single-anchor cases are returned unchanged (nothing to compare against).
 */

export type TrustAnchorLike = {
    year: number | null;
    mileageKm: number | null;
    priceUsd: number | null;
    sourceStrength: 'exact' | 'near_exact' | 'same_model' | 'older_reference' | 'segment';
    url?: string | null;
};

export type TrustedAnchor = {
    priceUsd: number;
    strength: 'exact' | 'near_exact' | 'same_model';
    url: string | null;
    /** Highest asking price that was rejected as a high outlier, if any. */
    distrustedOutlierUsd: number | null;
    distrustedCount: number;
};

const STRENGTH_PRIORITY: Record<string, number> = { exact: 0, near_exact: 1, same_model: 2 };

/** How far above the next-best comp a top asking price may sit before distrust. */
const HIGH_OUTLIER_RATIO = 1.15;

/**
 * Detects OLX/marketplace SEARCH or CATEGORY pages (many cars) vs a single ad.
 * Used only as a soft tie-breaker — never as a hard filter — so it cannot wrongly
 * drop a legitimate anchor from a source whose ad URLs we don't recognize.
 */
export function isNonSpecificListingUrl(url: string | null | undefined): boolean {
    if (!url) return true;
    const u = url.toLowerCase();
    // Query-style search pages: ".../q-c200-200/", "?q=", "/search"
    if (/[?&]q=/.test(u)) return true;
    if (/\/q-[^/]*\/?(?:$|\?)/.test(u)) return true;
    if (/\/search\b/.test(u)) return true;
    // Bare category roots with no item identifier
    if (/\/cars-for-sale\/?(?:$|\?)/.test(u)) return true;
    return false;
}

function median(sortedAsc: number[]): number {
    const n = sortedAsc.length;
    if (n === 0) return 0;
    const mid = Math.floor(n / 2);
    return n % 2 === 0 ? Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2) : sortedAsc[mid];
}

/**
 * Returns the best trusted direct anchor after distrusting high outliers,
 * or null when there are no usable numeric exact/near_exact/same_model anchors.
 */
export function selectTrustedDirectAnchor(
    anchors: TrustAnchorLike[] | undefined,
    targetYear: number,
    targetMileageKm: number,
): TrustedAnchor | null {
    if (!Array.isArray(anchors)) return null;

    const usable = anchors.filter(
        (a) =>
            typeof a.priceUsd === 'number' &&
            (a.priceUsd as number) > 0 &&
            a.sourceStrength in STRENGTH_PRIORITY,
    );

    if (usable.length === 0) return null;

    // Distrust high outliers: drop the top asking price while it sits more than
    // HIGH_OUTLIER_RATIO above the next-highest comp (keeps at least one).
    const byPriceAsc = [...usable].sort((a, b) => (a.priceUsd as number) - (b.priceUsd as number));
    const distrusted: number[] = [];
    const trusted = [...byPriceAsc];
    while (trusted.length > 1) {
        const top = trusted[trusted.length - 1].priceUsd as number;
        const next = trusted[trusted.length - 2].priceUsd as number;
        if (top > next * HIGH_OUTLIER_RATIO) {
            distrusted.push(top);
            trusted.pop();
        } else {
            break;
        }
    }

    // Pick the best trusted anchor: strength → specific-URL → same year →
    // closest mileage → higher price (prefer the stronger local reference).
    trusted.sort((a, b) => {
        const s = STRENGTH_PRIORITY[a.sourceStrength] - STRENGTH_PRIORITY[b.sourceStrength];
        if (s !== 0) return s;

        const urlA = isNonSpecificListingUrl(a.url) ? 1 : 0;
        const urlB = isNonSpecificListingUrl(b.url) ? 1 : 0;
        if (urlA !== urlB) return urlA - urlB;

        const yearA = a.year === targetYear ? 0 : 1;
        const yearB = b.year === targetYear ? 0 : 1;
        if (yearA !== yearB) return yearA - yearB;

        const mA = a.mileageKm !== null ? Math.abs(a.mileageKm - targetMileageKm) : Number.MAX_SAFE_INTEGER;
        const mB = b.mileageKm !== null ? Math.abs(b.mileageKm - targetMileageKm) : Number.MAX_SAFE_INTEGER;
        if (mA !== mB) return mA - mB;

        return (b.priceUsd as number) - (a.priceUsd as number);
    });

    const chosen = trusted[0];

    return {
        priceUsd: chosen.priceUsd as number,
        strength: chosen.sourceStrength as 'exact' | 'near_exact' | 'same_model',
        url: chosen.url ?? null,
        distrustedOutlierUsd: distrusted.length ? Math.max(...distrusted) : null,
        distrustedCount: distrusted.length,
    };
}

/** Compact stats for a set of numeric anchors (used for cluster metadata). */
export function anchorStats(pricesUsd: number[]): {
    count: number;
    minUsd: number | null;
    medianUsd: number | null;
    maxUsd: number | null;
} {
    const positive = pricesUsd.filter((p) => typeof p === 'number' && p > 0).sort((a, b) => a - b);
    if (positive.length === 0) return { count: 0, minUsd: null, medianUsd: null, maxUsd: null };
    return {
        count: positive.length,
        minUsd: positive[0],
        medianUsd: median(positive),
        maxUsd: positive[positive.length - 1],
    };
}
