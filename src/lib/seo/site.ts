/**
 * 사이트 정식(canonical) origin — SEO 메타데이터 · robots · sitemap 의 SSOT.
 *
 * 우선순위: 빌드타임 env(NEXT_PUBLIC_SITE_URL) → 없으면 프로덕션 도메인.
 * canonical/og:url 은 항상 정식 도메인을 가리켜야 하므로(프리뷰·info365 동일 컨테이너
 * 노출 대비) 기본값을 deepcraft 프로덕션으로 고정한다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://class-planner.deepcraft.app";
