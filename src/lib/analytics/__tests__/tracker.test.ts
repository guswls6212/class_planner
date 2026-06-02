import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  classifyOutbound,
  getFirstTouchUtm,
  getOrCreateSessionId,
  getOrCreateVisitorId,
  initOutboundLinks,
  isAnalyticsEnabled,
  isBotUserAgent,
  roundVitalValue,
  sendEvent,
  sendPageview,
  trackClick,
  trackEngagement,
  trackScrollDepth,
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

describe("sendEvent (click/custom)", () => {
  const originalUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const originalToken = process.env.NEXT_PUBLIC_ANALYTICS_TOKEN;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = originalUrl;
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("POSTs to /event with the given event_type + metadata", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    await sendEvent({
      visitorId: "11111111-1111-1111-1111-111111111111",
      sessionId: "22222222-2222-2222-2222-222222222222",
      eventType: "click",
      path: "/schedule",
      metadata: { target: "pdf_download" },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://analytics.deepcraft.app/event");
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      visitor_id: "11111111-1111-1111-1111-111111111111",
      session_id: "22222222-2222-2222-2222-222222222222",
      event_type: "click",
      path: "/schedule",
      metadata: { target: "pdf_download" },
    });
  });

  it("is noop when env missing", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendEvent({ visitorId: "v", sessionId: "s", eventType: "click", path: "/x" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is noop when eventType / path / ids missing", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendEvent({ visitorId: "", sessionId: "s", eventType: "click", path: "/x" });
    await sendEvent({ visitorId: "v", sessionId: "s", eventType: "", path: "/x" });
    await sendEvent({ visitorId: "v", sessionId: "s", eventType: "click", path: "" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("trackClick", () => {
  const originalUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const originalToken = process.env.NEXT_PUBLIC_ANALYTICS_TOKEN;

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
    window.sessionStorage.clear();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = originalUrl;
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("fires a click event with target metadata + auto visitor/session/path", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "deadbeef-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());

    trackClick("pdf_download", { view: "시간표" }); // fire-and-forget (void)

    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.event_type).toBe("click");
    expect(body.metadata).toMatchObject({ target: "pdf_download", view: "시간표" });
    expect(body.visitor_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.session_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(typeof body.path).toBe("string");
  });

  it("is noop when analytics disabled", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    trackClick("pdf_download");
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("Phase 2 — getFirstTouchUtm / trackEngagement / trackScrollDepth", () => {
  const originalUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const originalToken = process.env.NEXT_PUBLIC_ANALYTICS_TOKEN;

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
    window.sessionStorage.clear();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = originalUrl;
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("getFirstTouchUtm returns {} when no utm + no stored", () => {
    expect(getFirstTouchUtm()).toEqual({});
  });

  it("getFirstTouchUtm returns stored first-touch utm", () => {
    window.sessionStorage.setItem(
      "analytics_first_touch_utm",
      JSON.stringify({ utm_source: "kakao", utm_campaign: "launch" }),
    );
    expect(getFirstTouchUtm()).toMatchObject({
      utm_source: "kakao",
      utm_campaign: "launch",
    });
  });

  it("trackEngagement is noop under 1s", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "tk";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    trackEngagement(500, "/x");
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("trackEngagement sends engagement event with duration_ms (>=1s)", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "tk";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    trackEngagement(5000, "/schedule");
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.event_type).toBe("engagement");
    expect(body.path).toBe("/schedule");
    expect(body.metadata.duration_ms).toBe(5000);
  });

  it("trackScrollDepth sends scroll event with depth", async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "tk";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    trackScrollDepth(50, "/schedule");
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.event_type).toBe("scroll");
    expect(body.metadata.depth).toBe(50);
  });
});

describe("Phase 2b — roundVitalValue (CLS 소수 보존)", () => {
  it("preserves CLS decimals (4자리)", () => {
    expect(roundVitalValue("CLS", 0.0873)).toBeCloseTo(0.0873, 4);
    expect(roundVitalValue("CLS", 0.08735)).toBeCloseTo(0.0874, 4);
    expect(roundVitalValue("CLS", 0)).toBe(0);
  });

  it("rounds ms metrics to integer", () => {
    expect(roundVitalValue("LCP", 2345.6)).toBe(2346);
    expect(roundVitalValue("INP", 199.4)).toBe(199);
  });

  it("guards non-finite", () => {
    expect(roundVitalValue("CLS", NaN)).toBe(0);
    expect(roundVitalValue("LCP", Infinity)).toBe(0);
  });
});

describe("Phase 2b — classifyOutbound", () => {
  const origin = "https://class-planner.deepcraft.app";

  it("classifies external link as outbound (host+path, query 제외)", () => {
    expect(classifyOutbound("https://instagram.com/foo?x=1#h", origin)).toEqual({
      type: "outbound",
      host: "instagram.com",
      path: "/foo",
    });
  });

  it("classifies file extension as download", () => {
    expect(classifyOutbound("/files/report.pdf", origin)).toEqual({
      type: "download",
      ext: "pdf",
      path: "/files/report.pdf",
    });
  });

  it("classifies download attribute as download even without extension", () => {
    expect(classifyOutbound("/export", origin, true)).toMatchObject({
      type: "download",
    });
  });

  it("ignores same-origin navigation (pageview 가 커버)", () => {
    expect(classifyOutbound("/schedule", origin)).toBeNull();
    expect(classifyOutbound(`${origin}/students`, origin)).toBeNull();
  });

  it("ignores mailto / tel / empty / invalid", () => {
    expect(classifyOutbound("mailto:a@b.com", origin)).toBeNull();
    expect(classifyOutbound("tel:01012345678", origin)).toBeNull();
    expect(classifyOutbound("", origin)).toBeNull();
    expect(classifyOutbound(null, origin)).toBeNull();
  });
});

describe("Phase 2b — initOutboundLinks (document click capture)", () => {
  const originalUrl = process.env.NEXT_PUBLIC_ANALYTICS_URL;
  const originalToken = process.env.NEXT_PUBLIC_ANALYTICS_TOKEN;

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
    window.sessionStorage.clear();
    process.env.NEXT_PUBLIC_ANALYTICS_URL = "https://analytics.deepcraft.app";
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = "tk";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = originalUrl;
    process.env.NEXT_PUBLIC_ANALYTICS_TOKEN = originalToken;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  // jsdom 은 navigation 미구현 — preventDefault 로 경고 억제(capture listener 는 그 전에 발화).
  function clickAnchor(href: string, download = false) {
    const a = document.createElement("a");
    a.setAttribute("href", href);
    if (download) a.setAttribute("download", "");
    a.addEventListener("click", (e) => e.preventDefault());
    document.body.appendChild(a);
    a.click();
  }

  it("fires a download event on file-link click", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    const cleanup = initOutboundLinks();
    clickAnchor("/files/timetable.pdf");
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.event_type).toBe("download");
    expect(body.metadata).toMatchObject({ ext: "pdf" });
    cleanup();
  });

  it("does not fire on same-origin navigation click", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    const cleanup = initOutboundLinks();
    clickAnchor("/schedule");
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
    cleanup();
  });

  it("cleanup removes the listener", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    const cleanup = initOutboundLinks();
    cleanup();
    clickAnchor("https://external.com/x");
    await Promise.resolve();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
