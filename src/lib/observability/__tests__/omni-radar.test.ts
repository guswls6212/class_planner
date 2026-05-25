import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOmniRadarEnabled, sendErrorEvent } from "../omni-radar";

describe("isOmniRadarEnabled", () => {
  const originalUrl = process.env.NEXT_PUBLIC_OMNI_RADAR_URL;
  const originalToken = process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN;

  afterEach(() => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = originalUrl;
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = originalToken;
  });

  it("returns false when env missing", () => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "";
    expect(isOmniRadarEnabled()).toBe(false);
  });

  it("returns false when only URL set", () => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "https://radar.deepcraft.app";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "";
    expect(isOmniRadarEnabled()).toBe(false);
  });

  it("returns false when only token set", () => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "deadbeef";
    expect(isOmniRadarEnabled()).toBe(false);
  });

  it("returns true when both env set", () => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "https://radar.deepcraft.app";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "deadbeef";
    expect(isOmniRadarEnabled()).toBe(true);
  });
});

describe("sendErrorEvent", () => {
  const originalUrl = process.env.NEXT_PUBLIC_OMNI_RADAR_URL;
  const originalToken = process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "https://radar.deepcraft.app";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "test-token";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = originalUrl;
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("is noop when env missing", async () => {
    process.env.NEXT_PUBLIC_OMNI_RADAR_URL = "";
    process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN = "";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendErrorEvent({
      source: "window.onerror",
      error: new Error("boom"),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs to /ingest with Bearer header + event_type=exception", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendErrorEvent({
      source: "window.onerror",
      error: new Error("boom message"),
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://radar.deepcraft.app/ingest");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-token");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init?.body as string);
    expect(body.event_type).toBe("exception");
    expect(body.target).toBe("browser");
    expect(body.payload.source).toBe("window.onerror");
    expect(body.payload.message).toBe("boom message");
    expect(body.payload.name).toBe("Error");
    expect(typeof body.payload.stack).toBe("string");
  });

  it("includes componentStack for react-error-boundary", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendErrorEvent({
      source: "react-error-boundary",
      error: new Error("render failure"),
      componentStack: "  at Foo\n  at Bar",
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.payload.component_stack).toBe("  at Foo\n  at Bar");
    expect(body.payload.source).toBe("react-error-boundary");
  });

  it("swallows fetch errors (fire-and-forget)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));
    await expect(
      sendErrorEvent({
        source: "unhandledrejection",
        error: new Error("x"),
      }),
    ).resolves.toBeUndefined();
  });

  it("truncates very long stack and message", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    const bigMsg = "X".repeat(2000);
    const err = new Error(bigMsg);
    err.stack = "Y".repeat(5000);
    await sendErrorEvent({ source: "window.onerror", error: err });
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.payload.message.length).toBeLessThanOrEqual(1020); // 1000 + "…[truncated]"
    expect(body.payload.stack.length).toBeLessThanOrEqual(4020);
    expect(body.payload.message.endsWith("[truncated]")).toBe(true);
    expect(body.payload.stack.endsWith("[truncated]")).toBe(true);
  });

  it("merges custom metadata", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(new Response());
    await sendErrorEvent({
      source: "window.onerror",
      error: new Error("ctx"),
      metadata: { academy_id: "abc-123", custom_flag: true },
    });
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.payload.academy_id).toBe("abc-123");
    expect(body.payload.custom_flag).toBe(true);
  });
});
