import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearCache, fetchCached, invalidateCached } from "./cache";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

beforeEach(() => clearCache());

describe("fetchCached", () => {
  it("caches a resolved value per key", async () => {
    const fn = vi.fn(async () => "value");
    expect(await fetchCached("a", 60_000, fn)).toBe("value");
    expect(await fetchCached("a", 60_000, fn)).toBe("value");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("keeps different keys independent", async () => {
    const fn = vi.fn(async (key: string) => key);
    expect(await fetchCached("a", 60_000, () => fn("a"))).toBe("a");
    expect(await fetchCached("b", 60_000, () => fn("b"))).toBe("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not store when ttlMs is 0", async () => {
    const fn = vi.fn(async () => "value");
    await fetchCached("a", 0, fn);
    await fetchCached("a", 0, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("expires entries after the ttl", async () => {
    const fn = vi.fn(async () => "value");
    await fetchCached("a", 1, fn);
    await wait(10);
    await fetchCached("a", 1, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent calls for the same key", async () => {
    let resolve!: (value: string) => void;
    const fn = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        })
    );
    const first = fetchCached("a", 60_000, fn);
    const second = fetchCached("a", 60_000, fn);
    resolve("value");
    expect(await first).toBe("value");
    expect(await second).toBe("value");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const fn = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(fetchCached("a", 60_000, fn)).rejects.toThrow("boom");
    await expect(fetchCached("a", 60_000, fn)).rejects.toThrow("boom");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("invalidateCached", () => {
  it("forces the next call to re-run the fetcher", async () => {
    const fn = vi.fn(async () => "value");
    await fetchCached("a", 60_000, fn);
    invalidateCached("a");
    await fetchCached("a", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("clearCache", () => {
  it("removes every entry", async () => {
    const fn = vi.fn(async (key: string) => key);
    await fetchCached("a", 60_000, () => fn("a"));
    await fetchCached("b", 60_000, () => fn("b"));
    clearCache();
    await fetchCached("a", 60_000, () => fn("a"));
    await fetchCached("b", 60_000, () => fn("b"));
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
