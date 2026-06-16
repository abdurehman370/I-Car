import { redisConnection } from '../queue';
import crypto from 'crypto';

function generateHash(data: string) {
    return crypto.createHash('md5').update(data).digest('hex');
}

export async function getValuationFromCache(key: string) {
    try {
        const cached = await redisConnection.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error("Redis cache get error:", err);
    }
    return null;
}

export async function saveValuationToCache(key: string, data: any, region: string, make: string) {
    try {
        // Normal: 3 days, Luxury: 2 days, Exotic: 24 hours
        let ttlHours = 72; // 3 days
        
        const makeLower = make.toLowerCase();
        const luxuryBrands = ['audi', 'bmw', 'mercedes', 'porsche', 'lexus', 'land rover', 'jaguar'];
        const exoticBrands = ['ferrari', 'lamborghini', 'rolls-royce', 'bentley', 'mclaren', 'aston martin'];
        
        if (exoticBrands.includes(makeLower)) {
            ttlHours = 24;
        } else if (luxuryBrands.includes(makeLower)) {
            ttlHours = 48;
        }

        await redisConnection.setex(key, ttlHours * 3600, JSON.stringify(data));
    } catch (err) {
        console.error("Redis cache save error:", err);
    }
}

export function buildCacheKey(payload: any): string | null {
    const { region, make, model, variant, year, mileage, mileageMin, mileageMax, specs, mode, images } = payload;
    
    let mileageBand = 'unknown';
    if (mode === 'quick' && mileageMin != null && mileageMax != null) {
        mileageBand = `${mileageMin}-${mileageMax}`;
    } else if (mileage != null) {
        const m = Number(mileage);
        if (m === 0) mileageBand = '0';
        else if (m <= 5000) mileageBand = '1-5000';
        else if (m <= 10000) mileageBand = '5001-10000';
        else if (m <= 25000) mileageBand = '10001-25000';
        else if (m <= 50000) mileageBand = '25001-50000';
        else if (m <= 75000) mileageBand = '50001-75000';
        else if (m <= 100000) mileageBand = '75001-100000';
        else mileageBand = '100000+';
    }

    let imageConditionHash = 'none';
    if (mode === 'listing' && images && images.length > 0) {
        // If image hashing is required, we do it here.
        // For simplicity, we can hash the concatenated base64 strings
        const concatImages = images.map((img: any) => typeof img === 'string' ? img : img.url).join('');
        imageConditionHash = generateHash(concatImages);
        // Note: As per instructions: "If image hash is hard to implement now, do not cache listing mode yet."
        // We will just not cache listing mode to be safe and avoid giant redis payloads
        return null;
    }

    const key = `valuation:v1:${region}:${make}:${model}:${variant || 'none'}:${year}:${mileageBand}:${specs || 'none'}:${mode}:${imageConditionHash}`;
    return key.replace(/\s+/g, '-').toLowerCase();
}
