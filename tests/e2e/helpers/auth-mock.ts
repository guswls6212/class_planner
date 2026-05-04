/**
 * Supabase auth e2e helpers — 인증된 사용자 시뮬레이션 + auth API mock.
 *
 * 두 가지 패턴:
 * 1. injectSupabaseSession + mockSupabaseAuthApi (fake token + page.route mock)
 *    — 단순 localStorage 표시 시나리오용. AuthGuard.getSession() 통과 못 함.
 * 2. injectRealSession (PR C 신규) — global-setup이 저장한 진짜 Supabase 토큰 inject.
 *    AuthGuard 통과 + 진짜 RLS/sync 검증 가능. settings/teachers 페이지 진입용.
 */
import type { Page, Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const TEST_USER_ID = "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391";
const TEST_USER_EMAIL = "e2e-user@example.com";
const FAKE_ACCESS_TOKEN = "fake-jwt-access-token-for-e2e";
const FAKE_REFRESH_TOKEN = "fake-jwt-refresh-token-for-e2e";

interface MockAuthOptions {
  userId?: string;
  email?: string;
  /** Supabase project ref — `sb-${ref}-auth-token` 키 prefix 결정. 기본은 wildcard */
  projectRef?: string;
}

/**
 * 인증된 사용자 상태를 localStorage에 inject.
 *
 * 사용법:
 *   await injectSupabaseSession(page);
 *   await page.goto('/schedule');
 *
 * 주의: getSession() API mock은 mockSupabaseAuthApi를 별도로 호출해야 한다.
 */
export async function injectSupabaseSession(
  page: Page,
  opts: MockAuthOptions = {},
): Promise<{ userId: string; email: string }> {
  const userId = opts.userId ?? TEST_USER_ID;
  const email = opts.email ?? TEST_USER_EMAIL;
  const projectRef = opts.projectRef ?? "e2etest";

  await page.addInitScript(
    ({ uid, mail, ref, access, refresh }) => {
      const sessionPayload = {
        access_token: access,
        refresh_token: refresh,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: uid,
          email: mail,
          aud: "authenticated",
          role: "authenticated",
          email_confirmed_at: new Date().toISOString(),
        },
      };
      // Supabase JS SDK가 사용하는 표준 키 (storage key 패턴)
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sessionPayload));
      localStorage.setItem("supabase_user_id", uid);
    },
    {
      uid: userId,
      mail: email,
      ref: projectRef,
      access: FAKE_ACCESS_TOKEN,
      refresh: FAKE_REFRESH_TOKEN,
    },
  );

  return { userId, email };
}

/**
 * Supabase auth REST endpoint mock — getSession()이 실제 서버 호출 시 fulfill.
 *
 * 호출 패턴:
 *   GET  /auth/v1/user
 *   POST /auth/v1/token?grant_type=refresh_token
 */
export async function mockSupabaseAuthApi(
  page: Page,
  opts: MockAuthOptions = {},
): Promise<void> {
  const userId = opts.userId ?? TEST_USER_ID;
  const email = opts.email ?? TEST_USER_EMAIL;

  await page.route("**/auth/v1/user**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: userId,
        email,
        aud: "authenticated",
        role: "authenticated",
      }),
    });
  });

  await page.route("**/auth/v1/token**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: FAKE_ACCESS_TOKEN,
        refresh_token: FAKE_REFRESH_TOKEN,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: userId, email },
      }),
    });
  });
}

export const E2E_TEST_USER = {
  id: TEST_USER_ID,
  email: TEST_USER_EMAIL,
};

/**
 * 진짜 Supabase 세션 inject — global-setup.ts가 저장한 session.json 사용.
 *
 * 사용법:
 *   await injectRealSession(page);
 *   await page.goto("/settings"); // AuthGuard 통과
 *
 * AuthGuard.getSession()이 진짜 토큰 검증 → server에 /auth/v1/user 호출 → 200 응답.
 * POST /api/teachers 등은 진짜 RLS 통과 — test user 데이터로 격리됨.
 *
 * PR D — academyId가 session.json에 있으면:
 *   - localStorage `active_academy:{userId}` 설정 (client 측)
 *   - cookie `active_academy_id` + `onboarded=1` 설정 (server 측 resolveAcademyId 동작)
 *
 * 매 테스트 후 cleanupTestUserData()로 데이터 격리 유지 권장.
 */
export interface RealSessionInfo {
  userId: string;
  userEmail: string;
  projectRef: string;
  academyId: string | null;
}

let cachedRealSession: {
  projectRef: string;
  userId: string;
  userEmail: string;
  academyId: string | null;
  sessionPayload: unknown;
} | null = null;

function loadRealAuthState() {
  if (cachedRealSession) return cachedRealSession;
  const file = path.join(process.cwd(), "playwright/.auth/session.json");
  if (!fs.existsSync(file)) {
    throw new Error(
      `[injectRealSession] ${file} 없음. globalSetup이 실행됐는지 확인 — ` +
        "playwright.config.ts에 globalSetup: './tests/e2e/global-setup.ts' 등록 필요.",
    );
  }
  cachedRealSession = JSON.parse(fs.readFileSync(file, "utf-8"));
  return cachedRealSession!;
}

export async function injectRealSession(page: Page): Promise<RealSessionInfo> {
  const { projectRef, userId, userEmail, academyId, sessionPayload } = loadRealAuthState();

  // 진짜 session token만 inject. server는 academy_members 조회로 academyId 자체 resolve.
  // 이전 시도에서 active_academy:{uid} localStorage + active_academy_id cookie 추가했더니
  // settings/teachers 페이지 진입이 깨짐 (이전 cycle 통과한 시나리오까지 fail).
  // 단순화: setup script가 academy + owner role만 부여하면 server가 알아서 처리.
  await page.addInitScript(
    ({ ref, uid, session }) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
      localStorage.setItem("supabase_user_id", uid);
    },
    { ref: projectRef, uid: userId, session: sessionPayload },
  );

  return { userId, userEmail, projectRef, academyId };
}

/**
 * Reset cached session — 테스트 간 session refresh가 필요한 경우만 호출.
 * 일반적으로 globalSetup 한 번이면 모든 spec에서 동일 session 재사용.
 */
export function resetRealSessionCache(): void {
  cachedRealSession = null;
}
