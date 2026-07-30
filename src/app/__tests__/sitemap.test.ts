/**
 * sitemap.xml (App Router) 단위 테스트 — 공개 색인 페이지만 포함(robots 와 정합).
 */

import { describe, expect, it } from "vitest";

import sitemap from "../sitemap";

describe("sitemap.xml", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("공개 색인 페이지만 포함한다 (/, /privacy)", () => {
    expect(urls.some((u) => u.endsWith("/"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/privacy"))).toBe(true);
    expect(entries).toHaveLength(2);
  });

  it("로그인 뒤 앱 라우트는 제외한다", () => {
    const joined = urls.join(" ");
    expect(joined).not.toContain("/schedule");
    expect(joined).not.toContain("/settings");
  });

  it("루트(/)가 최우선순위(priority 1)이다", () => {
    const root = entries.find((e) => e.url.endsWith("/"));
    expect(root?.priority).toBe(1);
  });
});
