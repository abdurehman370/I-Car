/**
 * Minimal structured logger.
 *
 * - Levels: debug < info < warn < error (set floor via LOG_LEVEL env).
 * - Production: single-line JSON per record (log-aggregator friendly).
 * - Development: readable prefixed lines.
 * - Error values passed in `meta` are normalized to {name, message, stack}.
 *
 * Usage:
 *   import { logger, createLogger } from '@/lib/logger';
 *   logger.info('server started');
 *   const log = createLogger('valuation');
 *   log.error('evaluate failed', { err, region });
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isProd = process.env.NODE_ENV === 'production';

const minLevel: number =
    LEVELS[(process.env.LOG_LEVEL as Level) || (isProd ? 'info' : 'debug')] ?? LEVELS.info;

type Meta = Record<string, unknown>;

function normalizeMeta(meta?: Meta): Meta | undefined {
    if (!meta) return undefined;

    const out: Meta = {};
    for (const [key, value] of Object.entries(meta)) {
        out[key] =
            value instanceof Error
                ? { name: value.name, message: value.message, stack: value.stack }
                : value;
    }
    return out;
}

function emit(level: Level, scope: string | undefined, message: string, meta?: Meta): void {
    if (LEVELS[level] < minLevel) return;

    const time = new Date().toISOString();
    const normalized = normalizeMeta(meta);
    const sink =
        level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    if (isProd) {
        sink(
            JSON.stringify({
                time,
                level,
                ...(scope ? { scope } : {}),
                msg: message,
                ...(normalized ? { meta: normalized } : {}),
            })
        );
        return;
    }

    const prefix = `[${time}] ${level.toUpperCase()}${scope ? ` (${scope})` : ''}:`;
    if (normalized) sink(prefix, message, normalized);
    else sink(prefix, message);
}

export interface Logger {
    debug(message: string, meta?: Meta): void;
    info(message: string, meta?: Meta): void;
    warn(message: string, meta?: Meta): void;
    error(message: string, meta?: Meta): void;
    child(scope: string): Logger;
}

function make(scope?: string): Logger {
    return {
        debug: (message, meta) => emit('debug', scope, message, meta),
        info: (message, meta) => emit('info', scope, message, meta),
        warn: (message, meta) => emit('warn', scope, message, meta),
        error: (message, meta) => emit('error', scope, message, meta),
        child: (childScope) => make(scope ? `${scope}:${childScope}` : childScope),
    };
}

export const logger = make();

export function createLogger(scope: string): Logger {
    return make(scope);
}
