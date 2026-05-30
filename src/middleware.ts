import { NextRequest, NextResponse } from "next/server";

/**
 * 온보딩 가드 + 역할 기반 라우트 가드 + design-explorations production 차단 Middleware.
 *
 * 1. 로그인한 사용자가 데이터 페이지 접근 시 onboarded 쿠키를 확인한다.
 *    쿠키가 없으면 /onboarding으로 리디렉트한다.
 * 2. user_role 쿠키가 'member'면 admin-only 페이지 접근을 차단하고
 *    /schedule?toast=permission_denied 로 보낸다.
 * 3. production 환경에서 /design-explorations/* 접근 시 404 응답 — dev/mockup
 *    라우트가 검색 인덱싱·사용자 우연 접근에 노출되지 않도록 차단.
 *    상세: docs/future-work/design-explorations-production-guard.md
 *
 * 비로그인 사용자는 Anonymous-First 정책에 따라 그대로 통과시킨다.
 *
 * DB 오버헤드 0: 쿠키만 체크. user_role 쿠키는 useMyRole 훅이
 * /api/auth/set-role-cookie 호출로 설정한다 (UX 가이드일 뿐 보안 경계 아님 —
 * 권한 강제는 API 계층의 requireRole이 담당).
 */

const GUARDED_PATHS = ["/students", "/subjects", "/teachers", "/schedule"];
const ADMIN_ONLY_PATHS = ["/students", "/subjects", "/teachers"];
const DESIGN_EXPLORATIONS_PREFIX = "/design-explorations";

function isGuardedPath(pathname: string): boolean {
  return GUARDED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function hasSupabaseSession(request: NextRequest): boolean {
  // Supabase JS SDK stores session in cookies prefixed with sb-{projectRef}-auth-token
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Production에서 design-explorations mockup 라우트 차단 (404)
  // dev/test 환경(NODE_ENV !== "production")은 통과 → 사용자 본인 브라우저에서 검토 가능
  if (
    process.env.NODE_ENV === "production" &&
    pathname.startsWith(DESIGN_EXPLORATIONS_PREFIX)
  ) {
    return new NextResponse(null, { status: 404 });
  }

  if (!isGuardedPath(pathname)) {
    return NextResponse.next();
  }

  // 비로그인 → Anonymous-First 통과
  if (!hasSupabaseSession(request)) {
    return NextResponse.next();
  }

  // 로그인 + onboarded 쿠키 없음 → /onboarding 리디렉트
  if (request.cookies.get("onboarded")?.value !== "1") {
    const onboardingUrl = new URL("/onboarding", request.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // Role-based redirect for admin-only pages.
  // 'member' 역할만 명시 차단. 쿠키가 없으면(로딩 상태 또는 첫 진입) 통과시킨다.
  if (isAdminOnlyPath(pathname)) {
    const userRole = request.cookies.get("user_role")?.value;
    if (userRole === "member") {
      const url = request.nextUrl.clone();
      url.pathname = "/schedule";
      url.search = "";
      url.searchParams.set("toast", "permission_denied");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/students/:path*",
    "/subjects/:path*",
    "/teachers/:path*",
    "/schedule/:path*",
    "/design-explorations/:path*",
  ],
};
