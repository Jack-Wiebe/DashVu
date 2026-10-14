import "server-only";

/**
 * In-memory TTL cache with in-flight de-duplication.
 *
 * NOTE: module scope is per-instance, so this is only coherent for a single
 * process (local dev / one server). The `fetchCached` signature is the seam —
 * swap the backing store for Redis/KV when running multi-instance.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function fetchCached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = store.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    try {
      const value = await fn();
      if (ttlMs > 0) {
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function invalidateCached(key: string): void {
  store.delete(key);
}

export function clearCache(): void {
  store.clear();
}
