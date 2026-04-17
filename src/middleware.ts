import { NextRequest, NextResponse } from "next/server";

/**
 * 온보딩 가드 Middleware.
 *
 * 로그인한 사용자가 데이터 페이지 접근 시 onboarded 쿠키를 확인한다.
 * 쿠키가 없으면 /onboarding으로 리디렉트한다.
 * 비로그인 사용자는 Anonymous-First 정책에 따라 그대로 통과시킨다.
 *
 * DB 오버헤드 0: 쿠키만 체크. 쿠키가 없는 기존 사용자는
 * /onboarding 페이지에서 GET /api/onboarding/status를 호출하여 쿠키를 복구한다.
 */

const GUARDED_PATHS = ["/students", "/subjects", "/teachers", "/schedule", "/teacher-schedule"];

function isGuardedPath(pathname: string): boolean {
  return GUARDED_PATHS.some(
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

  if (!isGuardedPath(pathname)) {
    return NextResponse.next();
  }

  // 비로그인 → Anonymous-First 통과
  if (!hasSupabaseSession(request)) {
    return NextResponse.next();
  }

  // 로그인 + onboarded 쿠키 있음 → 통과
  if (request.cookies.get("onboarded")?.value === "1") {
    return NextResponse.next();
  }

  // 로그인 + 쿠키 없음 → /onboarding 리디렉트
  const onboardingUrl = new URL("/onboarding", request.url);
  return NextResponse.redirect(onboardingUrl);
}

export const config = {
  matcher: ["/students/:path*", "/subjects/:path*", "/teachers/:path*", "/schedule/:path*", "/teacher-schedule/:path*"],
};
