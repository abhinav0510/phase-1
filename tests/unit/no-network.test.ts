import { describe, expect, it } from "vitest";

describe("unit test network guard", () => {
  it("blocks real services", async () => {
    await expect(fetch("https://example.supabase.co/rest/v1/startups")).rejects.toThrow("can't reach example.supabase.co");
    await expect(fetch("https://example.app.n8n.cloud/webhook/x")).rejects.toThrow("can't reach example.app.n8n.cloud");
  });
});
