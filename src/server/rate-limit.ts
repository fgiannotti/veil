/**
 * Simple in-memory sliding-window rate limiter.
 * Fine for a single Node process. For multi-instance deploys, swap for Redis/Upstash.
 */

type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs);

  if (bucket.timestamps.length >= opts.limit) {
    const oldest = bucket.timestamps[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000));
    store.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitedResponse(retryAfterSec: number) {
  return {
    body: { error: "rate_limited", message: "Demasiados intentos. Probá de nuevo en un rato." },
    init: {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  };
}
