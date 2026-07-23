import { redisConnection } from './queue';
import { createLogger } from './logger';

const log = createLogger('rate-limit');

export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    /** Seconds until the window resets (only meaningful when blocked). */
    retryAfterSec: number;
};

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE).
 *
 * Fails OPEN: if Redis is unavailable, requests are allowed rather than
 * locking users out. Intended for coarse abuse protection (e.g. login
 * brute-force), not precise quota enforcement.
 */
export async function rateLimit(
    key: string,
    opts: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
    const { limit, windowSec } = opts;
    const redisKey = `ratelimit:${key}`;

    try {
        const count = await redisConnection.incr(redisKey);
        if (count === 1) {
            await redisConnection.expire(redisKey, windowSec);
        }

        if (count > limit) {
            const ttl = await redisConnection.ttl(redisKey);
            return { allowed: false, remaining: 0, retryAfterSec: ttl > 0 ? ttl : windowSec };
        }

        return { allowed: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
    } catch (err) {
        log.warn('rate limiter unavailable — failing open', { err, key });
        return { allowed: true, remaining: limit, retryAfterSec: 0 };
    }
}

/** Best-effort client IP from proxy headers. */
export function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}
