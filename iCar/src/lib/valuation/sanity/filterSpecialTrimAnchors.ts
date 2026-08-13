/**
 * Special-edition / wrong-trim anchor detection.
 *
 * A normal vehicle must not be benchmarked against a special-edition or tuned
 * listing (e.g. a normal "Audi R8 V10" against an "R8 GT" or "R8 Spyder
 * Mansory" ask). This module classifies anchor/listing text so those anchors
 * can be excluded from the normal-trim baseline unless the SUBMITTED vehicle
 * explicitly asked for that trim.
 */

export type AnchorTrimClass = 'normal_trim' | 'special_edition' | 'unclear';

/** Generic special-edition / tuned / collector markers across brands. */
export const SPECIAL_TRIM_REGEX =
    /\bgt\b|\bgt ?rwd\b|final edition|performance final edition|decennium|collector|special edition|limited edition|numbered edition|one[- ]off|\bmansory\b|\babt\b|brabus|\btuned\b|\bmodified\b|track edition|anniversary/i;

/** Audi R8 special/derivative trims that are NOT a normal R8 V10. */
export const AUDI_R8_SPECIAL_REGEX =
    /r8 ?gt|gt ?rwd|final edition|decennium|\bspyder\b|competition|panther|green hell|\bmansory\b|\babt\b|\btuned\b|\bmodified\b/i;

/** Normal Audi R8 V10 descriptors. */
export const AUDI_R8_NORMAL_REGEX =
    /v10( performance| quattro| rwd| coupe)?/i;

/**
 * True when the SUBMITTED vehicle explicitly asks for a special/derivative trim
 * (so special-edition anchors become legitimate for it).
 */
export function submittedRequestsSpecialTrim(
    specsNotesVariant: string | null | undefined,
): boolean {
    const t = String(specsNotesVariant || '');
    return SPECIAL_TRIM_REGEX.test(t) || AUDI_R8_SPECIAL_REGEX.test(t);
}

/**
 * Classifies a single anchor/listing by its title/reason text relative to the
 * submitted vehicle. `submittedSpecialTrim` short-circuits to 'normal_trim'
 * because the special anchor is then a valid comparable.
 */
export function classifyAnchorTrim(
    text: string | null | undefined,
    submittedSpecialTrim: boolean,
): AnchorTrimClass {
    if (submittedSpecialTrim) return 'normal_trim';
    const t = String(text || '');
    if (!t.trim()) return 'unclear';
    if (SPECIAL_TRIM_REGEX.test(t) || AUDI_R8_SPECIAL_REGEX.test(t)) return 'special_edition';
    return 'normal_trim';
}
