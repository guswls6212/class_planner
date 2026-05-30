import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrCreateSessionId,
  getOrCreateVisitorId,
  isAnalyticsEnabled,
  isBotUserAgent,
  sendPageview,
} from "../tracker";

describe("isBotUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"],
    ["facebookexternalhit/1.1"],
    ["HeadlessChrome/120.0"],
    ["Playwright/1.0"],
  ])("returns true for known bot UA %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)",
    ],
  ])("returns false for normal browser UA", (ua) => {
    expect(isBotUserAgent(ua)).toBe(false);
  });

  it("returns false for null / undefined / empty", () => {
    expect(isBotUserAgent(null)).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent("")).toBe(false);
  });
});

describe("getOrCreateVisitorId", () => {
  // setupTests.ts 의 localStorage 가 vi.fn() spy(no-op) 라 spec 안에서 in-memory store 로 wire.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (k: string) => store.get(k) ?? null,
    );
    vi.mocked(window.localStorage.setItem).mockImplementation(
      (k: string, v: string) => {
        store.set(k, v);
      },
    );
    vi.mocked(window.localStorage.removeItem).mockImplementation((k: string) => {
      store.delete(k);
    });
  });

  it("creates a UUID on first call and persists it", () => {
    const id1 = getOrCreateVisitorId();
    expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    expect(window.localStorage.getItem("analytics_visitor_id")).toBe(id1);
  });

  it("returns the same UUID across calls", () => {
    const id1 = getOrCreateVisitorId();
    const id2 = getOrCreateVisitorId();
    expect(id1).toBe(id2);
  });

  it("regenerates if the persisted value is malformed (wrong length)", () => {
    window.localStorage.setItem("analytics_visitor_id", "not-a-uuid");
    const id = getOrCreateVisitorId();
    expect(id).not.toBe("not-a-uuid");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("getOrCreateSessionId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("creates a UUID on first call and persists it", () => {
    const now = 1_700_000_000_000;
    const id = getOrCreateSessionId(now);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(window.sessionStorage.getItem("analytics_session_id")).toBe(id);
    expect(window.sessionStorage.getItem("analytics_session_last_activity")).toBe(
      String(now),
    );
  });

  it("returns the same UUID when within idle window", () => {
    const t0 = 1_700_000_000_000;
    const id1 = getOrCreateSessionId(t0);
    const id2 = getOrCreateSessionId(t0 + 10 * 60 * 1000); // 10분 후
    expect(id1).toBe(id2);
    expect(window.sessionStorage.getItem("analytics_session_last_activity")).toBe(
      String(t0 + 10 * 60 * 1000),
    );
  });

  it("issues a new UUID after 30 minutes of idle", () => {
    const t0 = 1_700_000_000_000;
    const id1 = getOrCreateSessionId(t0);
    const id2 = getOrCreateSessionId(t0 + 31 * 60 * 1000); // 31분 후
    expect(id1).not.toBe(id2);
    expect(id2).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("isAnalyticsEnabled / sendPageview", () => {
  const originalUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const originalToken = process.env.NEXT_PUBLIC_ANALYTICS_TOKEN;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = originalUrl;
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("isAnalyticsEnabled returns false when env missing", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "";
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("isAnalyticsEnabled returns true when both env set", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef";
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("sendPageview is noop when env missing", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendPageview({
      visitorId: "11111111-1111-1111-1111-111111111111",
      sessionId: "22222222-2222-2222-2222-222222222222",
      path: "/schedule",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sendPageview POSTs to /event with Bearer token", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    await sendPageview({
      visitorId: "11111111-1111-1111-1111-111111111111",
      sessionId: "22222222-2222-2222-2222-222222222222",
      path: "/schedule",
      referrer: "https://example.com",
      metadata: { viewport_w: 1280 },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://analytics.deepcraft.app/event");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer deadbeef-token");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      visitor_id: "11111111-1111-1111-1111-111111111111",
      session_id: "22222222-2222-2222-2222-222222222222",
      event_type: "pageview",
      path: "/schedule",
      referrer: "https://example.com",
      metadata: { viewport_w: 1280 },
    });
  });

  it("sendPageview swallows fetch errors (fire-and-forget)", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    await expect(
      sendPageview({
        visitorId: "11111111-1111-1111-1111-111111111111",
        sessionId: "22222222-2222-2222-2222-222222222222",
        path: "/schedule",
      }),
    ).resolves.toBeUndefined();
  });

  it("sendPageview is noop when path/visitor/session missing", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    await sendPageview({ visitorId: "", sessionId: "session", path: "/x" });
    await sendPageview({ visitorId: "v", sessionId: "", path: "/x" });
    await sendPageview({ visitorId: "v", sessionId: "s", path: "" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
