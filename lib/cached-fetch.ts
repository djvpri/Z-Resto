/**
 * Simple client-side cache with stale-while-revalidate strategy.
 *
 * Usage:
 *   const data = await cachedFetch("/api/menu", { maxAge: 60_000 });
 *
 * - First request: fetches from network, caches result
 * - Subsequent requests within maxAge: returns cached (instant)
 * - Requests after maxAge: returns cached immediately, re-fetches in background
 */

type CacheEntry = {
  data: unknown;
  timestamp: number;
};

const cache = new Map<string, CacheEntry>();

export async function cachedFetch<T = unknown>(
  url: string,
  options?: RequestInit & { maxAge?: number }
): Promise<T> {
  const maxAge = options?.maxAge ?? 5 * 60 * 1000; // default 5 minutes
  const now = Date.now();
  const entry = cache.get(url);

  // Hit cache if fresh
  if (entry && now - entry.timestamp < maxAge) {
    return entry.data as T;
  }

  // Stale — return cached immediately + revalidate in background
  if (entry) {
    // Return stale data, revalidate async
    revalidate<T>(url, options, maxAge);
    return entry.data as T;
  }

  // No cache — fetch and store
  return revalidate<T>(url, options, maxAge);
}

async function revalidate<T>(
  url: string,
  options?: RequestInit & { maxAge?: number },
  maxAge?: number
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}

/** Invalidate a cached URL (force fresh fetch next time) */
export function invalidateCache(url: string) {
  cache.delete(url);
}

/** Clear all cache */
export function clearCache() {
  cache.clear();
}
