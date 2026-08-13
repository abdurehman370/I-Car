/**
 * Fallback anchor outlier correction (source-independent baseline).
 *
 * Phase-2 research returns ONE aggregate anchor per market (UAE, Europe), so we
 * can't filter individual listings — but we CAN sanity-check the chosen anchor
 * against the other market and against the anchor's own reason text.
 *
 * The bug this fixes: for a GCC-sourced car, `selectFallbackAnchor` forces the
 * UAE anchor (sourcePreference === 'UAE'), bypassing the normal UAE-vs-Europe
 * outlier check. If that UAE anchor was built from a wrong-trim / special-
 * edition / inflated listing (e.g. a normal Audi R8 V10 anchored on an R8 GT at
 * ~2.4x the Europe value), the final Lebanon price explodes.
 *
 * This produces a SOURCE-INDEPENDENT calibration baseline: when the UAE landed
 * midpoint is a clear outlier above Europe (or the anchor reason names a
 * special trim the buyer didn't ask for), it prefers the Europe landed midpoint
 * (or a capped value) instead. Conservative — it only ever LOWERS an implausibly
 * high base, and leaves tight/plausible anchors (e.g. Revuelto UAE ~1.09x
 * Europe) untouched.
 */

import { submittedRequestsSpecialTrim, SPECIAL_TRIM_REGEX, AUDI_R8_SPECIAL_REGEX } from './filterSpecialTrimAnchors';

/** UAE landed midpoint above this multiple of Europe is treated as an outlier. */
export const CROSS_MARKET_OUTLIER_RATIO = 1.35;

export type RejectedFallbackAnchor = {
    market?: string;
    priceUsd?: number;
    reason: string;
};

export type FallbackAnchorOutlierResult = {
    /** Source-independent baseline landed midpoint to calibrate from. */
    baselineMid: number;
    gccAnchorOutlierFiltered: boolean;
    gccAnchorOutlierReason: string | null;
    normalTrimAnchorMedianUsd: number | null;
    rejectedFallbackAnchors: RejectedFallbackAnchor[];
};

export function detectFallbackAnchorOutlier(params: {
    uaeLandedMid: number | null;
    europeLandedMid: number | null;
    chosenLandedMid: number;
    chosenMarket: string;
    chosenReason: string | null | undefined;
    submittedSpecsNotesVariant: string | null | undefined;
}): FallbackAnchorOutlierResult {
    const {
        uaeLandedMid,
        europeLandedMid,
        chosenLandedMid,
        chosenMarket,
        chosenReason,
        submittedSpecsNotesVariant,
    } = params;

    const submittedSpecial = submittedRequestsSpecialTrim(submittedSpecsNotesVariant);
    const rejected: RejectedFallbackAnchor[] = [];

    // Does the CHOSEN anchor's own reason text describe a special/tuned trim the
    // buyer didn't ask for? (soft signal)
    const reasonNamesSpecial =
        !submittedSpecial &&
        (SPECIAL_TRIM_REGEX.test(String(chosenReason || '')) ||
            AUDI_R8_SPECIAL_REGEX.test(String(chosenReason || '')));

    // Cross-market outlier: UAE landed midpoint clearly above Europe's.
    const crossMarketOutlier =
        !submittedSpecial &&
        uaeLandedMid !== null &&
        europeLandedMid !== null &&
        europeLandedMid > 0 &&
        uaeLandedMid > europeLandedMid * CROSS_MARKET_OUTLIER_RATIO;

    // Default baseline: UAE-preferred (the source-market-independent regional
    // benchmark), falling back to Europe, then whatever was chosen.
    let baselineMid = uaeLandedMid ?? europeLandedMid ?? chosenLandedMid;
    let filtered = false;
    let reason: string | null = null;

    if ((crossMarketOutlier || reasonNamesSpecial) && europeLandedMid !== null && europeLandedMid > 0) {
        // Cap the baseline at a modest premium over the Europe benchmark
        // (UAE legitimately runs ~10–20% above Europe) so a wrong-trim UAE ask
        // can't dominate, without over-discounting the normal case.
        baselineMid = Math.round(europeLandedMid * 1.2);
        if (uaeLandedMid !== null) baselineMid = Math.min(uaeLandedMid, baselineMid);
        filtered = true;
        reason = crossMarketOutlier
            ? `UAE landed midpoint (USD ${Math.round(uaeLandedMid as number).toLocaleString()}) is more than ${Math.round((CROSS_MARKET_OUTLIER_RATIO - 1) * 100)}% above the Europe benchmark (USD ${Math.round(europeLandedMid).toLocaleString()}) — treated as a wrong-trim/special-edition/inflated anchor; re-based on the Europe/normal-trim benchmark.`
            : `Chosen ${chosenMarket} anchor reason names a special/derivative trim not requested by the buyer — re-based on the Europe/normal-trim benchmark.`;
        rejected.push({
            market: chosenMarket,
            priceUsd: Math.round(chosenLandedMid),
            reason: reason,
        });
    }

    return {
        baselineMid,
        gccAnchorOutlierFiltered: filtered,
        gccAnchorOutlierReason: reason,
        // With aggregate anchors, the "normal-trim median" is the Europe
        // benchmark when we rejected UAE, else the baseline itself.
        normalTrimAnchorMedianUsd: filtered ? (europeLandedMid ?? baselineMid) : (uaeLandedMid ?? europeLandedMid ?? null),
        rejectedFallbackAnchors: rejected,
    };
}
