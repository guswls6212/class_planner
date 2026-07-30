import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/** 콘텐츠 변경 시 갱신 — 빌드마다 흔들리지 않도록 정적 상수(테스트 결정성). */
const LAST_MODIFIED = "2026-06-04";

/**
 * /sitemap.xml (App Router 동적 생성).
 *
 * 공개 + 색인 대상 페이지만 포함한다. 앱 라우트는 로그인 뒤라 색인 가치가 없어 제외
 * (robots.ts 와 정합). 공개 페이지가 늘면 여기에 추가.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
