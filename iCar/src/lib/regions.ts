export const MARKETS = ['UAE', 'Lebanon', 'Europe'] as const;
export type Market = (typeof MARKETS)[number];

export const EUROPE_COUNTRIES = [
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Austria',
  'Switzerland',
  'Poland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Portugal',
  'Greece',
  'Ireland',
  'United Kingdom',
] as const;

export type EuropeCountry = (typeof EUROPE_COUNTRIES)[number];

export const UAE_EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
] as const;

export const LEBANON_CITIES = [
  'Beirut',
  'Tripoli',
  'Sidon',
  'Tyre',
  'Jounieh',
  'Byblos',
  'Zahle',
] as const;

const LEGACY_UAE_REGIONS = new Set<string>(UAE_EMIRATES);

export function isEuropeanCountry(value: string): value is EuropeCountry {
  return (EUROPE_COUNTRIES as readonly string[]).includes(value);
}

export function isLegacyUaeRegion(value: string): boolean {
  return LEGACY_UAE_REGIONS.has(value);
}

export function parseStoredRegion(stored: string): { market: Market; country: string; city?: string } {
  if (stored === 'UAE') {
    return { market: 'UAE', country: '' };
  }
  if (isLegacyUaeRegion(stored)) {
    return { market: 'UAE', country: '', city: stored };
  }
  if (stored === 'Lebanon') {
    return { market: 'Lebanon', country: '' };
  }
  if (isEuropeanCountry(stored)) {
    return { market: 'Europe', country: stored };
  }
  if (stored === 'Europe') {
    return { market: 'Europe', country: '' };
  }
  return { market: 'UAE', country: '' };
}

/** Value saved to DB / sent to APIs from market + optional Europe country. */
export function buildStoredRegion(market: Market, country?: string): string {
  if (market === 'Europe') {
    return country?.trim() || 'Germany';
  }
  return market;
}

export function resolveScraperRegionParams(storedRegion: string): {
  region: string;
  country?: string;
} {
  if (storedRegion === 'UAE' || isLegacyUaeRegion(storedRegion)) {
    return { region: 'UAE' };
  }
  if (storedRegion === 'Lebanon') {
    return { region: 'Lebanon' };
  }
  if (storedRegion === 'Europe') {
    return { region: 'Europe', country: 'Germany' };
  }
  if (isEuropeanCountry(storedRegion)) {
    return { region: 'Europe', country: storedRegion };
  }
  return { region: storedRegion };
}

/** Prisma `region` filter for internal listing search (alerts). */
export function listingRegionWhere(storedRegion: string): string | { in: string[] } {
  if (storedRegion === 'UAE' || isLegacyUaeRegion(storedRegion)) {
    return { in: ['UAE', ...UAE_EMIRATES] };
  }
  return storedRegion;
}

export function getCitiesForMarket(market: Market): readonly string[] {
  if (market === 'UAE') return UAE_EMIRATES;
  if (market === 'Lebanon') return LEBANON_CITIES;
  return EUROPE_COUNTRIES;
}

export function defaultCityForMarket(market: Market, country?: string): string {
  if (market === 'UAE') return 'Dubai';
  if (market === 'Lebanon') return 'Beirut';
  return country || 'Germany';
}
