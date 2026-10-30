import { afterEach, describe, expect, it, vi } from "vitest";
import { freshOrRefetch } from "@/lib/cached-read";
import { resilientFetch } from "@/lib/supabase/resilient-fetch";

describe("freshOrRefetch", () => {
  const entry = { at: 1_000, value: "cached" };
  const silenceErrors = () => vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => vi.restoreAllMocks());

  it("uses the cached copy while it is in date", async () => {
    const refetch = vi.fn(async () => "new");
    await expect(freshOrRefetch(entry, 60_000, refetch, 2_000)).resolves.toBe("cached");
    expect(refetch).not.toHaveBeenCalled();
  });

  it("reads again instead of serving an expired copy", async () => {
    await expect(freshOrRefetch(entry, 60_000, async () => "new", 100_000)).resolves.toBe("new");
  });

  it("falls back to the last good copy when that read fails", async () => {
    const log = silenceErrors();
    const failed = async () => {
      throw new Error("down");
    };
    await expect(freshOrRefetch(entry, 60_000, failed, 100_000)).resolves.toBe("cached");
    expect(log).toHaveBeenCalled();
  });
});

describe("resilientFetch", () => {
  const stubFetch = (...replies: (Response | Error)[]) => {
    const mock = vi.fn(async () => {
      const reply = replies.shift();
      if (reply instanceof Error) throw reply;
      return reply as Response;
    });
    vi.stubGlobal("fetch", mock);
    return mock;
  };

  afterEach(() => vi.unstubAllGlobals());

  it("retries a read once after a gateway error", async () => {
    const mock = stubFetch(new Response("", { status: 503 }), new Response("ok"));
    const res = await resilientFetch("https://x.test/a");
    expect(await res.text()).toBe("ok");
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("retries a read once after a network failure", async () => {
    const mock = stubFetch(new TypeError("fetch failed"), new Response("ok"));
    const res = await resilientFetch("https://x.test/a", { method: "GET" });
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("never retries a write, which may already have applied", async () => {
    const mock = stubFetch(new TypeError("fetch failed"));
    await expect(resilientFetch("https://x.test/a", { method: "POST" })).rejects.toThrow("fetch failed");
    expect(mock).toHaveBeenCalledTimes(1);
    const bad = stubFetch(new Response("", { status: 503 }));
    expect((await resilientFetch("https://x.test/a", { method: "PATCH" })).status).toBe(503);
    expect(bad).toHaveBeenCalledTimes(1);
  });

  it("doesn't retry an application error", async () => {
    const mock = stubFetch(new Response("", { status: 500 }));
    expect((await resilientFetch("https://x.test/a")).status).toBe(500);
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
