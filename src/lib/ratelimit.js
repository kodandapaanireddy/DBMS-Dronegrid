/**
 * Sliding-window rate limiter keyed by IP.
 * State is in-process (fine for dev; swap to Redis for prod).
 * Returns an object with remaining/reset info, or null if the request is allowed.
 *
 * Kept in its own module (separate from middleware.js) so the logic can be
 * unit-tested without pulling in the Next.js `@/` path alias that only
 * resolves inside the bundler — plain `node --test` can't resolve it.
 */

const rateBuckets = new Map(); // key -> { count, resetAt }

export const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_REQUESTS = 30; // per IP per 15 min

export function rateLimitKey(pathname, ip) {
  return `${pathname}|${ip}`;
}

/**
 * @param {{ pathname: string, ip?: string }} request
 * @returns {Promise<{ limited: boolean, remaining: number, resetAt: number, retryAfterSeconds: number } | null>}
 */
export async function rateLimit(request) {
  const pathname = request.pathname || request.nextUrl?.pathname;
  if (!RATE_LIMITED_PATHS.includes(pathname)) return null;

  const ip = request.ip || 'unknown';
  const key = rateLimitKey(pathname, ip);
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  if (bucket.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      limited: true,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfterSeconds: Math.max(retryAfter, 1),
    };
  }
  bucket.count += 1;
  return {
    limited: false,
    remaining: MAX_REQUESTS - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export const RATE_LIMITED_PATHS = ['/api/auth/login', '/api/auth/register'];

export function clearOldBuckets() {
  const now = Date.now();
  for (const [k, v] of rateBuckets) {
    if (v.resetAt < now) rateBuckets.delete(k);
  }
}

// Periodic cleanup once per minute (skip under test runner)
if (process.env.NODE_ENV !== 'test') {
  setInterval(clearOldBuckets, 60 * 1000);
}