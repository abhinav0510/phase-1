/**
 * The fetch every Supabase client uses. A hung connection is cut off instead of
 * tying up a server worker, and a read that hits a brief network or gateway failure
 * is tried once more. Writes are never retried, since they may already have applied.
 * Works in both the Node and Edge runtimes.
 */
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 250;
const RETRYABLE_STATUS = new Set([502, 503, 504]);

function withTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const outer = init?.signal;
  if (outer?.aborted) controller.abort();
  outer?.addEventListener("abort", () => controller.abort(), { once: true });
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export const resilientFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isRead = method === "GET" || method === "HEAD";
  try {
    const res = await withTimeout(input, init);
    if (!isRead || !RETRYABLE_STATUS.has(res.status)) return res;
  } catch (e) {
    if (!isRead || init?.signal?.aborted) throw e;
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return withTimeout(input, init);
};
