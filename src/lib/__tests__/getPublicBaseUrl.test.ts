import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getClientBaseUrl,
  getServerBaseUrl,
} from "../getPublicBaseUrl";

describe("getPublicBaseUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.ALLOWED_PUBLIC_HOSTS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getClientBaseUrl", () => {
    it("returns window.location.origin in browser context", () => {
      const originalWindow = global.window;
      // @ts-expect-error — partial window mock for test
      global.window = { location: { origin: "http://localhost:3000" } };

      expect(getClientBaseUrl()).toBe("http://localhost:3000");

      global.window = originalWindow;
    });

    it("throws in server context (window undefined)", () => {
      const originalWindow = global.window;
      // @ts-expect-error — simulate server context
      delete global.window;

      expect(() => getClientBaseUrl()).toThrow(/browser context/);

      global.window = originalWindow;
    });
  });

  describe("getServerBaseUrl — env path", () => {
    it("uses PUBLIC_BASE_URL when set", () => {
      process.env.PUBLIC_BASE_URL = "https://class-planner.info365.studio";
      expect(getServerBaseUrl()).toBe("https://class-planner.info365.studio");
    });

    it("trims trailing slash from PUBLIC_BASE_URL", () => {
      process.env.PUBLIC_BASE_URL = "https://example.com///";
      expect(getServerBaseUrl()).toBe("https://example.com");
    });

    it("ignores request headers when PUBLIC_BASE_URL is set", () => {
      process.env.PUBLIC_BASE_URL = "https://prod.example.com";
      process.env.ALLOWED_PUBLIC_HOSTS = "attacker.com";
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-host": "attacker.com" },
      });
      expect(getServerBaseUrl(request)).toBe("https://prod.example.com");
    });
  });

  describe("getServerBaseUrl — header fallback", () => {
    it("uses x-forwarded-host when in allowlist", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = "class-planner.info365.studio";
      const request = new Request("http://localhost", {
        headers: {
          "x-forwarded-host": "class-planner.info365.studio",
          "x-forwarded-proto": "https",
        },
      });
      expect(getServerBaseUrl(request)).toBe(
        "https://class-planner.info365.studio"
      );
    });

    it("falls back to host header when x-forwarded-host missing", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = "localhost:3000";
      const request = new Request("http://localhost", {
        headers: { host: "localhost:3000" },
      });
      expect(getServerBaseUrl(request)).toBe("https://localhost:3000");
    });

    it("respects x-forwarded-proto when present", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = "localhost:3000";
      const request = new Request("http://localhost", {
        headers: {
          host: "localhost:3000",
          "x-forwarded-proto": "http",
        },
      });
      expect(getServerBaseUrl(request)).toBe("http://localhost:3000");
    });

    it("defaults to https when x-forwarded-proto missing", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = "example.com";
      const request = new Request("http://localhost", {
        headers: { host: "example.com" },
      });
      expect(getServerBaseUrl(request)).toBe("https://example.com");
    });
  });

  describe("getServerBaseUrl — security", () => {
    it("throws when host not in allowlist (Host Header Injection defense)", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = "class-planner.info365.studio";
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-host": "attacker-phishing.com" },
      });
      expect(() => getServerBaseUrl(request)).toThrow(
        /Cannot resolve public base URL/
      );
    });

    it("throws when allowlist empty and no env", () => {
      const request = new Request("http://localhost", {
        headers: { host: "example.com" },
      });
      expect(() => getServerBaseUrl(request)).toThrow(
        /Cannot resolve public base URL/
      );
    });

    it("throws when no env and no request", () => {
      expect(() => getServerBaseUrl()).toThrow(
        /Cannot resolve public base URL/
      );
    });
  });

  describe("ALLOWED_PUBLIC_HOSTS parsing", () => {
    it("supports comma-separated multi-host allowlist", () => {
      process.env.ALLOWED_PUBLIC_HOSTS =
        "class-planner.info365.studio,www.class-planner.info365.studio";
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-host": "www.class-planner.info365.studio" },
      });
      expect(getServerBaseUrl(request)).toBe(
        "https://www.class-planner.info365.studio"
      );
    });

    it("trims whitespace in allowlist entries", () => {
      process.env.ALLOWED_PUBLIC_HOSTS = " host-a.com , host-b.com ";
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-host": "host-b.com" },
      });
      expect(getServerBaseUrl(request)).toBe("https://host-b.com");
    });
  });
});
