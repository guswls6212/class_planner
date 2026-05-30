/**
 * CORS 미들웨어 테스트
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { corsMiddleware, getAllowedOrigins, handleCorsOptions } from "../cors";

// Mock environment
const originalEnv = process.env;

describe("CORS 미들웨어", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getAllowedOrigins", () => {
    it("development 환경에서 올바른 origins를 반환해야 한다", () => {
      vi.stubEnv("NODE_ENV", "development");

      const origins = getAllowedOrigins();

      expect(origins).toContain("http://localhost:3000");
      expect(origins).toContain("http://localhost:3001");
    });

    it("production 환경에서 올바른 origins를 반환해야 한다", () => {
      vi.stubEnv("NODE_ENV", "production");

      const origins = getAllowedOrigins();

      expect(origins).toContain("https://class-planner.info365.studio");
    });

    it("알 수 없는 환경에서 development 설정을 사용해야 한다", () => {
      vi.stubEnv("NODE_ENV", "unknown");

      const origins = getAllowedOrigins();

      expect(origins).toContain("http://localhost:3000");
    });

    it("ALLOWED_ORIGINS env가 설정되면 NODE_ENV보다 우선한다", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv(
        "ALLOWED_ORIGINS",
        "https://custom-a.example.com,https://custom-b.example.com"
      );

      const origins = getAllowedOrigins();

      expect(origins).toEqual([
        "https://custom-a.example.com",
        "https://custom-b.example.com",
      ]);
      expect(origins).not.toContain("https://class-planner.info365.studio");
    });

    it("ALLOWED_ORIGINS env의 공백을 trim한다", () => {
      vi.stubEnv("ALLOWED_ORIGINS", " https://a.com , https://b.com ");

      const origins = getAllowedOrigins();

      expect(origins).toEqual(["https://a.com", "https://b.com"]);
    });
  });

  describe("corsMiddleware", () => {
    it("테스트 환경에서 null을 반환해야 한다", () => {
      vi.stubEnv("NODE_ENV", "test");

      const request = new NextRequest("http://localhost:3000/test");
      const result = corsMiddleware(request);

      expect(result).toBeNull();
    });

    it("허용된 origin에서 null을 반환해야 한다", () => {
      vi.stubEnv("NODE_ENV", "development");

      const request = new NextRequest("http://localhost:3000/test", {
        headers: { origin: "http://localhost:3000" },
      });
      const result = corsMiddleware(request);

      expect(result).toBeNull();
    });
  });

  describe("handleCorsOptions", () => {
    it("OPTIONS 요청을 올바르게 처리해야 한다", () => {
      vi.stubEnv("NODE_ENV", "test");

      const request = new NextRequest("http://localhost:3000/test", {
        method: "OPTIONS",
      });
      const result = handleCorsOptions(request);

      expect(result).toBeDefined();
      expect(result?.status).toBe(200);
    });
  });
});
