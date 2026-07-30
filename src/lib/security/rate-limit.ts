import "server-only";

/**
 * Lightweight in-memory sliding-window rate limiter for expensive actions
 * (e.g. AI generation). Per-instance only — on serverless this bounds a single
 * warm instance. For strict global limits in production, back this with Upstash
 * Redis / Vercel KV (swap the store, keep the interface).
 */

const buckets = new Map<string, number[]>();

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateResult {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    const retryAfterMs = Math.max(0, hits[0]! + windowMs - now);
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Opportunistic cleanup to bound memory.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const alive = v.filter((t) => t > cutoff);
      if (alive.length === 0) buckets.delete(k);
      else buckets.set(k, alive);
    }
  }

  return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 };
}
