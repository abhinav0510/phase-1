import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callN8nWebhook } from "@/server/integrations/n8n/client";

describe("callN8nWebhook", () => {
  const url = "http://localhost:9/webhook/x";
  beforeEach(() => {
    vi.stubEnv("N8N_BROADCAST_WEBHOOK_URL", url);
    vi.stubEnv("N8N_NOTIFY_SECRET", "s3cret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const respond = (status: number, body: string) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

  it("adds the secret server-side and returns the JSON", async () => {
    respond(200, '{"ok":true}');
    await expect(callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", { a: 1 })).resolves.toEqual({ ok: true });
    const [calledUrl, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(init.body)).toEqual({ a: 1, secret: "s3cret" });
  });
  it("fails clearly when not configured", async () => {
    vi.stubEnv("N8N_NOTIFY_SECRET", "");
    await expect(callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", {})).rejects.toThrow(/not configured/);
  });
  it("reports an error status, such as a workflow that is switched off", async () => {
    respond(404, "workflow not active");
    await expect(callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", {})).rejects.toThrow(/n8n responded 404/);
  });
  it("reports a non-JSON reply", async () => {
    respond(200, "<html>");
    await expect(callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", {})).rejects.toThrow(/non-JSON/);
  });
  it("reports a timeout in plain words", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const e = new Error("aborted");
        e.name = "AbortError";
        throw e;
      }),
    );
    await expect(callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", {})).rejects.toThrow(/did not respond in time/);
  });
});
