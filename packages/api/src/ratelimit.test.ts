import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RateLimitError, rateLimit, resetRateLimits } from "./ratelimit";

const policy = (points: number, windowMs: number) => ({ points, windowMs });

beforeEach(() => resetRateLimits());
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows up to `points` calls, then throws RateLimitError", () => {
    const p = policy(3, 60_000);
    rateLimit(p, "news");
    rateLimit(p, "news");
    rateLimit(p, "news");

    let caught: unknown;
    try {
      rateLimit(p, "news");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(RateLimitError);
    const err = caught as RateLimitError;
    expect(err.name).toBe("RateLimitError");
    expect(err.message).toBe("Rate limit exceeded");
    expect(err.retryAfterMs).toBeGreaterThan(0);
    expect(err.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("keeps buckets isolated per key", () => {
    const p = policy(1, 60_000);
    rateLimit(p, "a");
    expect(() => rateLimit(p, "a")).toThrow(RateLimitError);
    expect(() => rateLimit(p, "b")).not.toThrow();
  });

  it("refills tokens over time", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = policy(2, 1000);

    rateLimit(p, "k");
    rateLimit(p, "k");
    expect(() => rateLimit(p, "k")).toThrow(RateLimitError);

    vi.advanceTimersByTime(500);
    expect(() => rateLimit(p, "k")).not.toThrow();
    expect(() => rateLimit(p, "k")).toThrow(RateLimitError);
  });

  it("caps refill at the policy maximum", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const p = policy(2, 1000);

    rateLimit(p, "k");
    vi.advanceTimersByTime(60_000);
    rateLimit(p, "k");
    rateLimit(p, "k");
    expect(() => rateLimit(p, "k")).toThrow(RateLimitError);
  });

  it("resetRateLimits clears every bucket", () => {
    const p = policy(1, 60_000);
    rateLimit(p, "k");
    expect(() => rateLimit(p, "k")).toThrow(RateLimitError);
    resetRateLimits();
    expect(() => rateLimit(p, "k")).not.toThrow();
  });
});
