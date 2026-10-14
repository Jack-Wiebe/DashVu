import "server-only";
import type { RatePolicy } from "@dashvu/core";

/**
 * In-memory token-bucket rate limiter. Like `cache.ts`, state is per-instance;
 * replace with a shared store (Redis) before running multiple instances.
 */
interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function rateLimit(policy: RatePolicy, key: string): void {
  const now = Date.now();
  const refillPerMs = policy.points / policy.windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: policy.points, updatedAt: now };
    buckets.set(key, bucket);
  }

  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(policy.points, bucket.tokens + elapsed * refillPerMs);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    throw new RateLimitError(Math.ceil((1 - bucket.tokens) / refillPerMs));
  }

  bucket.tokens -= 1;
}

export function resetRateLimits(): void {
  buckets.clear();
}
