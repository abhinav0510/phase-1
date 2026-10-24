import "server-only";

/**
 * Calls one of the platform's guarded n8n webhooks (ADMIN-BROADCAST,
 * SYNC-CONTACTS). The shared secret is added here, server-side, so it never
 * reaches the browser. Throws with a readable message on any failure.
 */
export async function callN8nWebhook<T = unknown>(
  urlEnv: "N8N_BROADCAST_WEBHOOK_URL" | "N8N_CONTACTS_SYNC_WEBHOOK_URL",
  payload: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<T> {
  const url = process.env[urlEnv];
  const secret = process.env.N8N_NOTIFY_SECRET;
  if (!url || !secret) {
    throw new Error(`${urlEnv} / N8N_NOTIFY_SECRET is not configured`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret }),
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`n8n responded ${res.status}: ${text.slice(0, 200)}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`n8n returned a non-JSON response: ${text.slice(0, 200)}`);
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("n8n did not respond in time");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
