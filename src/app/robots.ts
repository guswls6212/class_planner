import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/**
 * /robots.txt (App Router 동적 생성).
 *
 * 공개 마케팅 면(`/`, `/privacy`)은 색인 허용(기본 allow), 로그인 뒤의 앱·인증·내부
 * 라우트는 disallow. 크롤 예산을 색인 가치가 있는 페이지에 집중시킨다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: [
        "/schedule",
        "/schedule-v2",
        "/students",
        "/subjects",
        "/attendance",
        "/teachers",
        "/settings",
        "/admin",
        "/onboarding",
        "/login",
        "/about", // features.ts HIDDEN — 숨김 페이지
        "/invite/",
        "/share/",
        "/academy/",
        "/design-explorations",
        "/dev",
        "/api/",
        "/~offline",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
