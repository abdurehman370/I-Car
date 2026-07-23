/**
 * Lebanon local-comp cluster cap (direct/local path only).
 *
 * For NORMAL and LUXURY vehicles (never exotic/rare) valued from at least
 * three current, tightly clustered local listings, the current marketplace
 * cluster — not one stale/high asking listing — should drive the valuation.
 *
 * This is a downward-only cap: it never raises a valuation and never runs on
 * the source-market fallback path (sourceMarketAnchorUsed === true), on exotic
 * brands, or when notes justify a premium (rare spec, special edition, full
 * local warranty, exceptional options, very low mileage).
 */

export type UsdRange = { min: number; max: number };

export type BrandTier = 'exotic' | 'luxury' | 'normal';

export type ClusterAnchorLike = {
    year: number | null;
    mileageKm: number | null;
    priceUsd: number | null;
    sourceStrength: 'exact' | 'near_exact' | 'same_model' | 'older_reference' | 'segment';
};

export type ClusterMetadata = {
    localCompClusterApplied: boolean;
    localCompClusterCount: number;
    localCompClusterMinUsd: number | null;
    localCompClusterMedianUsd: number | null;
    localCompClusterMaxUsd: number | null;
    localCompClusterCapReason: string | null;
};

export type ClusterCapResult = {
    applied: boolean;
    market: UsdRange;
    dealer: UsdRange;
    metadata: ClusterMetadata;
};

export type ClusterCapParams = {
    brandTier: BrandTier;
    sourceMarketAnchorUsed: boolean;
    targetYear: number;
    specsAndNotes: string;
    anchors: ClusterAnchorLike[] | undefined;
    currentMarket: UsdRange;
    currentDealer: UsdRange;
    /** Dealer-buy factors used when rebuilding the dealer range after a cap. */
    dealerFactors?: { min: number; max: number };
};

const CLUSTER_STRENGTHS = new Set(['exact', 'near_exact', 'same_model']);

/** Anchor strengths that never anchor a cluster (context only). */
const MAX_ADJACENT_YEAR_GAP = 1;

/** Cluster is "tight" when the spread is within 15% of the median. */
const TIGHT_SPREAD_MAX = 0.15;

/** Notes/spec signals that justify a premium above the local cluster. */
export const CLUSTER_PREMIUM_EXCEPTION_REGEX =
    /special edition|limited edition|rare spec|exceptional option|full option|fully loaded|full local warranty|local warranty|official warranty|company warranty|full warranty|very low mileage|collector|one of|launch edition|first edition/i;

/** European/Germany source detection for normal-luxury sedans. */
export const EUROPEAN_SOURCE_REGEX = /german|germany|europe|european|\beu\b/i;

function median(sortedAsc: number[]): number {
    const n = sortedAsc.length;
    if (n === 0) return 0;
    const mid = Math.floor(n / 2);
    return n % 2 === 0
        ? Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2)
        : sortedAsc[mid];
}

function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

function emptyMetadata(): ClusterMetadata {
    return {
        localCompClusterApplied: false,
        localCompClusterCount: 0,
        localCompClusterMinUsd: null,
        localCompClusterMedianUsd: null,
        localCompClusterMaxUsd: null,
        localCompClusterCapReason: null,
    };
}

/**
 * Trims stale/high outliers: while more than three anchors remain, drop the
 * highest one if it sits materially (>6%) above the median of the rest. This
 * models "ignore high/stale asking prices when fresher lower comps exist"
 * without needing an explicit recency field.
 */
function trimHighOutliers(pricesAsc: number[]): number[] {
    const prices = [...pricesAsc];
    while (prices.length > 3) {
        const highest = prices[prices.length - 1];
        const rest = prices.slice(0, -1);
        const restMedian = median(rest);
        if (restMedian > 0 && highest > restMedian * 1.06) {
            prices.pop();
        } else {
            break;
        }
    }
    return prices;
}

/**
 * Applies the Lebanon local-comp cluster cap. Returns the (possibly unchanged)
 * market/dealer ranges plus structured cluster metadata.
 */
export function applyLebanonLocalCompClusterCap(params: ClusterCapParams): ClusterCapResult {
    const {
        brandTier,
        sourceMarketAnchorUsed,
        targetYear,
        specsAndNotes,
        anchors,
        currentMarket,
        currentDealer,
        dealerFactors = { min: 0.90, max: 0.91 },
    } = params;

    const noop: ClusterCapResult = {
        applied: false,
        market: currentMarket,
        dealer: currentDealer,
        metadata: emptyMetadata(),
    };

    // Exclusions: fallback path, exotic/rare vehicles, premium-justifying notes.
    if (sourceMarketAnchorUsed) return noop;
    if (brandTier === 'exotic') return noop;
    if (CLUSTER_PREMIUM_EXCEPTION_REGEX.test(specsAndNotes)) return noop;
    if (!Array.isArray(anchors)) return noop;

    // Only exact / near_exact / same_model anchors, positive price, same or
    // adjacent year. older_reference and segment anchors are ignored.
    const usablePrices = anchors
        .filter(
            (a) =>
                typeof a.priceUsd === 'number' &&
                a.priceUsd > 0 &&
                CLUSTER_STRENGTHS.has(a.sourceStrength) &&
                (a.year === null || Math.abs(a.year - targetYear) <= MAX_ADJACENT_YEAR_GAP)
        )
        .map((a) => a.priceUsd as number)
        .sort((x, y) => x - y);

    if (usablePrices.length < 3) return noop;

    // Drop stale/high asking outliers when fresher lower comps exist.
    const cluster = trimHighOutliers(usablePrices);
    if (cluster.length < 3) return noop;

    const clusterMin = cluster[0];
    const clusterMax = cluster[cluster.length - 1];
    const clusterMedian = median(cluster);
    const clusterCount = cluster.length;
    const clusterSpreadPercent =
        clusterMedian > 0 ? (clusterMax - clusterMin) / clusterMedian : Number.POSITIVE_INFINITY;

    const metadataBase: ClusterMetadata = {
        localCompClusterApplied: false,
        localCompClusterCount: clusterCount,
        localCompClusterMinUsd: clusterMin,
        localCompClusterMedianUsd: clusterMedian,
        localCompClusterMaxUsd: clusterMax,
        localCompClusterCapReason: null,
    };

    // Not a tight cluster → surface stats but do not cap.
    if (clusterSpreadPercent > TIGHT_SPREAD_MAX) {
        return { applied: false, market: currentMarket, dealer: currentDealer, metadata: metadataBase };
    }

    // European source on a normal/luxury sedan should not price above local
    // company/TGF/warranty listings → no headroom above the cluster max.
    const isEuropeanSource = EUROPEAN_SOURCE_REGEX.test(specsAndNotes);
    const aboveClusterPercent = isEuropeanSource ? 0.0 : 0.03;

    const capMax = roundTo(clusterMax * (1 + aboveClusterPercent), 100);
    const currentMid = (currentMarket.min + currentMarket.max) / 2;

    // Already inside the cluster (max within cap and midpoint not above the
    // cluster max) → nothing to do.
    if (currentMarket.max <= capMax && currentMid <= clusterMax) {
        return { applied: false, market: currentMarket, dealer: currentDealer, metadata: metadataBase };
    }

    // Rebuild the market range around the current cluster. Keep the midpoint
    // close to the cluster median; keep the max just inside/slightly above the
    // cluster max; preserve a sensible spread.
    const spread = Math.min(
        Math.max(currentMarket.max - currentMarket.min, 2_000),
        Math.max(clusterMax - clusterMin, 2_000) + Math.round(clusterMax * aboveClusterPercent)
    );

    let newMax = capMax;
    let newMin = roundTo(Math.min(clusterMin, newMax - spread), 100);
    if (newMin >= newMax) newMin = newMax - 1_000;
    if (newMin < 1_000) newMin = 1_000;

    const market: UsdRange = { min: newMin, max: newMax };

    const dealerMin = roundTo(newMin * dealerFactors.min, 100);
    let dealerMax = roundTo(newMax * dealerFactors.max, 100);
    if (dealerMax >= newMax) dealerMax = newMax - 500;
    let dealerMinFinal = dealerMin;
    if (dealerMinFinal >= dealerMax) dealerMinFinal = dealerMax - 1_000;

    const dealer: UsdRange = { min: dealerMinFinal, max: dealerMax };

    const reason = isEuropeanSource
        ? `Local comp cluster cap applied: ${clusterCount} current same/adjacent-year local listings cluster tightly around USD ${clusterMedian.toLocaleString()} (USD ${clusterMin.toLocaleString()}–${clusterMax.toLocaleString()}). European/Germany source held at or below the local company/TGF/warranty cluster; market max capped near the current cluster instead of stale/high asking listings.`
        : `Local comp cluster cap applied: ${clusterCount} current same/adjacent-year local listings cluster tightly around USD ${clusterMedian.toLocaleString()} (USD ${clusterMin.toLocaleString()}–${clusterMax.toLocaleString()}). Market max capped near the current cluster instead of stale/high asking listings.`;

    return {
        applied: true,
        market,
        dealer,
        metadata: {
            ...metadataBase,
            localCompClusterApplied: true,
            localCompClusterCapReason: reason,
        },
    };
}
