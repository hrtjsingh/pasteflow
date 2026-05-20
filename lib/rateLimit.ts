/**
 * Lightweight in-process rate limiter using a sliding-window counter.
 * For multi-instance deployments (multiple Vercel functions), swap the
 * Map for a Redis-backed store (ioredis + RateLimiterRedis).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Cleanup stale entries every 5 minutes to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const win = store.get(identifier);

  if (!win || win.resetAt < now) {
    // New or expired window
    store.set(identifier, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1, resetAt: now + opts.windowMs };
  }

  win.count += 1;
  const remaining = Math.max(0, opts.limit - win.count);
  return {
    allowed: win.count <= opts.limit,
    remaining,
    resetAt: win.resetAt,
  };
}

/** Extract a usable client identifier from headers (prefer CF-Connecting-IP on Vercel) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// ── Pre-configured limiters ───────────────────────────────────────────────────

/** 20 paste creations per IP per 15 minutes */
export function pasteCreateLimiter(ip: string) {
  return rateLimit(`paste:create:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
}

/** 60 paste reads per IP per minute */
export function pasteReadLimiter(ip: string) {
  return rateLimit(`paste:read:${ip}`, { limit: 60, windowMs: 60 * 1000 });
}

/** 5 registration attempts per IP per hour */
export function registerLimiter(ip: string) {
  return rateLimit(`auth:register:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
}

/** 10 login attempts per IP per 15 minutes */
export function loginLimiter(ip: string) {
  return rateLimit(`auth:login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
}

/** 5 password attempts per paste ID per 5 minutes — anti brute-force */
export function passwordLimiter(pasteId: string, ip: string) {
  return rateLimit(`paste:pwd:${pasteId}:${ip}`, { limit: 5, windowMs: 5 * 60 * 1000 });
}
