// src/lib/auth/apiAuth.ts
//
// API 라우트의 신원 확인 SSOT.
//
// 배경 (P0 인가 우회, 2026-07-26):
//   라우트 40개가 acting user 를 `?userId=` 쿼리에서 받아 그대로 requireRole /
//   resolveAcademyMembership 에 넘겼다. 쿼리는 클라이언트가 정하는 값이라 인증이
//   전혀 없었다 — 유효한 UUID 만 알면 그 사용자 권한으로 전 학원 데이터 read/write.
//
// 왜 Bearer 토큰인가:
//   세션이 쿠키가 아니라 localStorage 에 있다 (`utils/supabaseClient.ts` 는 쿠키
//   스토리지 어댑터 없이 persistSession 만 쓴다). 서버가 요청에서 읽을 수 있는
//   자격증명이 쿠키에 없으므로 미들웨어를 인증 게이트로 쓸 수 없고,
//   `Authorization: Bearer <access_token>` 이 유일한 경로다.
//
// 왜 `?userId=` 를 안 걷어내는가:
//   local-first 저장키(`classPlannerData:{userId}:{academyId}`)와 클라 호출부가
//   그 형태에 묶여 있다. 파라미터는 그대로 받되 **인가는 세션 값으로만** 하고,
//   쿼리는 불일치 검사(403) 대상으로만 쓴다.
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * 토큰 검증 전용 anon 클라이언트.
 * service_role 을 쓰면 안 된다 — 검증은 anon 권한으로 충분하고, 이 모듈은
 * 모든 API 요청 경로에 있으므로 특권 키 사용 표면을 넓히지 않는다.
 */
const authClient =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : null;

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

/**
 * `Authorization: Bearer <jwt>` 를 Supabase 로 검증해 사용자를 돌려준다.
 * 헤더가 없거나 토큰이 무효/만료면 null (fail-closed).
 *
 * 본 프로젝트의 토큰 검증 지점은 여기 하나다 — 다른 곳에서 getUser(jwt) 를
 * 새로 부르지 말고 이 함수를 쓸 것.
 */
export async function verifyBearerUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  if (!authClient) {
    logger.error(
      "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set",
      { module: "apiAuth" }
    );
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const jwt = authHeader.slice("Bearer ".length).trim();
  if (!jwt) return null;

  const { data, error } = await authClient.auth.getUser(jwt);
  if (error || !data.user?.id) {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? null };
}

/** 검증된 userId 만 필요할 때. */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const user = await verifyBearerUser(request);
  return user?.id ?? null;
}

export type SessionUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * academy API 라우트의 표준 게이트.
 *
 *   const auth = await requireSessionUser(request, searchParams.get("userId"));
 *   if (!auth.ok) return auth.response;
 *   const userId = auth.userId;   // ← 검증된 값. 쿼리 값 쓰지 말 것.
 *
 * - 유효한 세션 토큰 없음 → 401 (인가 판단 전에 먼저 — 존재 여부 노출 방지)
 * - `claimedUserId` 가 있고 세션 사용자와 다름 → 403
 * - `claimedUserId` 가 없으면 세션 userId 를 그대로 반환 (쿼리 파라미터는 선택)
 */
export async function requireSessionUser(
  request: NextRequest,
  claimedUserId?: string | null
): Promise<SessionUserResult> {
  const user = await verifyBearerUser(request);

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (claimedUserId && claimedUserId !== user.id) {
    logger.warn("API userId mismatch — 쿼리 userId 가 세션 사용자와 다름", {
      module: "apiAuth",
      sessionUserId: user.id,
      claimedUserId,
      path: request.nextUrl?.pathname,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}
