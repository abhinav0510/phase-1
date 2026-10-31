import "server-only";

/** A cached value and when it was read. */
export interface Stamped<T> {
  at: number;
  value: T;
}

/**
 * `unstable_cache` serves an expired copy to the next visitor and refreshes in the
 * background, so a founder who comes back after days would see days-old data. This
 * re-reads an expired copy instead, and falls back to it only if that read fails, so
 * a brief outage shows the last good data rather than an error.
 */
export async function freshOrRefetch<T>(
  entry: Stamped<T>,
  ttlMs: number,
  refetch: () => Promise<T>,
  now = Date.now(),
): Promise<T> {
  if (now - entry.at <= ttlMs) return entry.value;
  try {
    return await refetch();
  } catch (e) {
    console.error("Serving the last good copy after a failed read:", e);
    return entry.value;
  }
}
