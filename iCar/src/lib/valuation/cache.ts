import { redisConnection } from '../queue';
import crypto from 'crypto';

const CACHE_VERSION = 'v7'; // bumped after new-vehicle source-hierarchy calibration

function normalize(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'none';

    return String(value)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9+._-]/g, '');
}

function generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function getMileageBand(payload: any): string {
    const mode = payload.mode || 'listing';

    if (mode === 'quick' && payload.mileageMin != null && payload.mileageMax != null) {
        return `${payload.mileageMin}-${payload.mileageMax}`;
    }

    if (payload.mileage == null) return 'unknown';

    const m = Number(payload.mileage);

    if (!Number.isFinite(m) || m < 0) return 'unknown';
    if (m === 0) return '0';
    if (m <= 5000) return '1-5000';
    if (m <= 10000) return '5001-10000';
    if (m <= 25000) return '10001-25000';
    if (m <= 50000) return '25001-50000';
    if (m <= 75000) return '50001-75000';
    if (m <= 100000) return '75001-100000';

    return '100000+';
}

function getTtlSeconds(make: string): number {
    const makeLower = make.toLowerCase();

    const luxuryBrands = [
        'audi',
        'bmw',
        'mercedes',
        'mercedes-benz',
        'porsche',
        'lexus',
        'land-rover',
        'range-rover',
        'jaguar',
    ];

    const exoticBrands = [
        'ferrari',
        'lamborghini',
        'rolls-royce',
        'rolls',
        'bentley',
        'mclaren',
        'aston-martin',
        'brabus',
        'mansory',
    ];

    if (exoticBrands.includes(makeLower)) return 24 * 60 * 60;
    if (luxuryBrands.includes(makeLower)) return 48 * 60 * 60;

    return 72 * 60 * 60;
}

export async function getValuationFromCache(key: string) {
    try {
        const cached = await redisConnection.get(key);
        if (!cached) return null;

        return JSON.parse(cached);
    } catch (err) {
        console.error('Redis cache get error:', err);
        return null;
    }
}

export async function saveValuationToCache(key: string, data: any, make: string) {
    try {
        const ttlSeconds = getTtlSeconds(normalize(make));

        await redisConnection.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (err) {
        console.error('Redis cache save error:', err);
    }
}

export function buildCacheKey(
    payload: any,
    opts?: { ruleVersion?: string | null }
): string | null {
    const {
        region,
        make,
        model,
        variant,
        year,
        specs,
        mode,
        images,
    } = payload;

    const normalizedMode = mode || 'listing';

    if (normalizedMode === 'listing' && Array.isArray(images) && images.length > 0) {
        // Safer for production: do not cache photo-based inspections yet.
        // Different photos can change condition adjustment significantly.
        return null;
    }

    const keyParts = [
        'valuation',
        CACHE_VERSION,
        normalize(region),
        // Lebanon keys include the active import-rule version so cached
        // valuations are invalidated automatically when rules change.
        ...(opts?.ruleVersion ? [normalize(opts.ruleVersion)] : []),
        normalize(make),
        normalize(model),
        normalize(variant),
        normalize(year),
        normalize(getMileageBand(payload)),
        normalize(specs),
        normalize(normalizedMode),
        generateHash(JSON.stringify({
            notes: payload.notes || '',
        })).slice(0, 12),
    ];

    return keyParts.join(':');
}