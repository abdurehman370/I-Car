import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_AUCTION_TIMEZONE = 'Asia/Dubai';

/** UAE emirates — all use Gulf Standard Time. */
const UAE_REGIONS = new Set([
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Fujairah',
  'Ras Al Khaimah',
  'Umm Al Quwain',
  'UAE',
  'United Arab Emirates',
]);

/** Europe country → IANA timezone. */
const EUROPE_COUNTRY_TIMEZONES: Record<string, string> = {
  Germany: 'Europe/Berlin',
  France: 'Europe/Paris',
  Italy: 'Europe/Rome',
  Spain: 'Europe/Madrid',
  Netherlands: 'Europe/Amsterdam',
  Belgium: 'Europe/Brussels',
  Austria: 'Europe/Vienna',
  Switzerland: 'Europe/Zurich',
  Poland: 'Europe/Warsaw',
  Sweden: 'Europe/Stockholm',
  Norway: 'Europe/Oslo',
  Denmark: 'Europe/Copenhagen',
  Finland: 'Europe/Helsinki',
  Portugal: 'Europe/Lisbon',
  Greece: 'Europe/Athens',
  Ireland: 'Europe/Dublin',
  'United Kingdom': 'Europe/London',
  UK: 'Europe/London',
};

const TIMEZONE_LABELS: Record<string, string> = {
  'Asia/Dubai': 'UAE (GST)',
  'Asia/Beirut': 'Lebanon',
  'Europe/Berlin': 'Germany (CET/CEST)',
  'Europe/Paris': 'France (CET/CEST)',
  'Europe/Rome': 'Italy (CET/CEST)',
  'Europe/Madrid': 'Spain (CET/CEST)',
  'Europe/Amsterdam': 'Netherlands (CET/CEST)',
  'Europe/Brussels': 'Belgium (CET/CEST)',
  'Europe/Vienna': 'Austria (CET/CEST)',
  'Europe/Zurich': 'Switzerland (CET/CEST)',
  'Europe/Warsaw': 'Poland (CET/CEST)',
  'Europe/Stockholm': 'Sweden (CET/CEST)',
  'Europe/Oslo': 'Norway (CET/CEST)',
  'Europe/Copenhagen': 'Denmark (CET/CEST)',
  'Europe/Helsinki': 'Finland (EET/EEST)',
  'Europe/Lisbon': 'Portugal (WET/WEST)',
  'Europe/Athens': 'Greece (EET/EEST)',
  'Europe/Dublin': 'Ireland (GMT/IST)',
  'Europe/London': 'UK (GMT/BST)',
};

export type AuctionMarket = {
  region?: string | null;
  city?: string | null;
  country?: string | null;
};

/**
 * Resolve the IANA timezone for an auction's market.
 * Times are always interpreted in THIS timezone — not the admin's laptop timezone.
 */
export function getAuctionTimeZone(market?: AuctionMarket | string | null): string {
  if (!market) return DEFAULT_AUCTION_TIMEZONE;

  const region =
    typeof market === 'string' ? market : market.region?.trim() || '';
  const country =
    typeof market === 'string' ? undefined : market.country?.trim() || undefined;
  const city =
    typeof market === 'string' ? undefined : market.city?.trim() || undefined;

  if (region === 'Lebanon' || country === 'Lebanon' || city === 'Beirut') {
    return 'Asia/Beirut';
  }

  if (region === 'Europe' || country) {
    if (country && EUROPE_COUNTRY_TIMEZONES[country]) {
      return EUROPE_COUNTRY_TIMEZONES[country];
    }
    if (city && EUROPE_COUNTRY_TIMEZONES[city]) {
      return EUROPE_COUNTRY_TIMEZONES[city];
    }
    return 'Europe/Berlin';
  }

  if (UAE_REGIONS.has(region)) {
    return 'Asia/Dubai';
  }

  return DEFAULT_AUCTION_TIMEZONE;
}

export function getAuctionTimezoneLabel(market?: AuctionMarket | string | null): string {
  const tz = getAuctionTimeZone(market);
  return TIMEZONE_LABELS[tz] || tz.replace('_', ' ');
}

/**
 * Parse datetime-local input as wall-clock time in the auction's market timezone.
 * Admin in Lebanon entering "9:00 PM" for a Dubai auction means 9:00 PM Dubai time.
 */
export function parseAuctionDateTime(
  value: string,
  market?: AuctionMarket | string | null
): Date {
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
  const tz = getAuctionTimeZone(market);
  const parsed = dayjs.tz(normalized, tz);

  if (!parsed.isValid()) {
    throw new Error('Invalid datetime');
  }

  return parsed.toDate();
}

/** Display in the auction's market timezone. */
export function formatAuctionDateTime(
  date: Date | string,
  market?: AuctionMarket | string | null
): string {
  const tz = getAuctionTimeZone(market);
  return dayjs(date).tz(tz).format('M/D/YYYY, h:mm:ss A');
}

export function formatAuctionDate(
  date: Date | string,
  market?: AuctionMarket | string | null
): string {
  const tz = getAuctionTimeZone(market);
  return dayjs(date).tz(tz).format('M/D/YYYY');
}

/** Format for datetime-local input in the auction market timezone. */
export function formatAuctionDateTimeForInput(
  date: Date | string,
  market?: AuctionMarket | string | null
): string {
  const tz = getAuctionTimeZone(market);
  return dayjs(date).tz(tz).format('YYYY-MM-DDTHH:mm');
}

/** Display in the viewer's browser timezone (client only). */
export function formatViewerLocalDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Market time + label, with optional local time for international viewers. */
export function formatAuctionDateTimeWithContext(
  date: Date | string,
  market?: AuctionMarket | string | null,
  options?: { showLocal?: boolean }
): { market: string; local?: string; marketLabel: string } {
  const marketLabel = getAuctionTimezoneLabel(market);
  const marketTime = formatAuctionDateTime(date, market);
  const showLocal = options?.showLocal ?? typeof window !== 'undefined';

  if (!showLocal) {
    return { market: marketTime, marketLabel };
  }

  const tz = getAuctionTimeZone(market);
  const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (viewerTz === tz) {
    return { market: marketTime, marketLabel };
  }

  return {
    market: marketTime,
    marketLabel,
    local: formatViewerLocalDateTime(date),
  };
}

/** @deprecated Use getAuctionTimezoneLabel(market) */
export const AUCTION_TIMEZONE_LABEL = 'UAE (GST)';
