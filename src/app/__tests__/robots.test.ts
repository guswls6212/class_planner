/**
 * robots.txt (App Router) 단위 테스트 — 공개 면은 색인 허용, 앱/인증/내부 라우트는 disallow.
 */

import { describe, expect, it } from "vitest";

import robots from "../robots";

describe("robots.txt", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const disallow = (rule?.disallow ?? []) as string[];

  it("앱·인증·내부 라우트를 disallow 한다", () => {
    expect(disallow).toContain("/schedule");
    expect(disallow).toContain("/settings");
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/about"); // features.ts HIDDEN
  });

  it("공개 색인 페이지(/, /privacy)는 막지 않는다", () => {
    expect(disallow).not.toContain("/");
    expect(disallow).not.toContain("/privacy");
  });

  it("sitemap 절대 URL 을 가리킨다", () => {
    expect(result.sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});
