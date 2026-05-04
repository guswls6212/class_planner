/**
 * Supabase auth e2e helpers — 인증된 사용자 시뮬레이션 + auth API mock.
 *
 * 실제 Google OAuth flow는 e2e에서 재현 불가. 대신 Supabase가 사용하는
 * `sb-<project>-auth-token` localStorage 키 + supabase_user_id를 inject해
 * AuthGuard/getSession() 검사 통과시킨다.
 *
 * AuthGuard.tsx 동작 (line 27-29):
 *   - localStorage에 `sb-` 또는 `supabase` 키 있으면 hasAuthToken=true
 *   - 이후 supabase.auth.getSession() 호출 — fail/timeout 시 isAuthenticated=false
 *   → page.route로 supabase auth REST endpoint를 mock해야 진정한 통과
 */
import type { Page, Route } from "@playwright/test";

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
