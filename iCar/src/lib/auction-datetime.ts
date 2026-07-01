/**
 * Parse datetime-local values (no timezone) using APP_TIMEZONE_OFFSET when set.
 * On VPS (UTC), set APP_TIMEZONE_OFFSET=+04:00 for UAE auction times.
 */
export function parseAuctionDateTime(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Missing datetime');
  }

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid datetime');
    }
    return parsed;
  }

  const normalized = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const offset = process.env.APP_TIMEZONE_OFFSET;

  const parsed = offset
    ? new Date(`${normalized}${offset}`)
    : new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid datetime');
  }

  return parsed;
}
