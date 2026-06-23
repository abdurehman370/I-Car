/**
 * Scraper service URL and API key helpers.
 * Defaults to 127.0.0.1 for same-host VPS deployments.
 */
export function getScraperBaseUrl(): string {
  return (process.env.SCRAPER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function getScraperApiKey(): string {
  const key = process.env.SCRAPER_API_KEY;
  if (process.env.NODE_ENV === 'production' && !key) {
    throw new Error('SCRAPER_API_KEY must be set in production');
  }
  return key || 'default_dev_key';
}
