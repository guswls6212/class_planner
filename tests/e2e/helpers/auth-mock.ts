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
      // rank 5-A InlineTour — fake session user 도 자동 walkthrough 시작 차단 (e2e 회귀 가드)
      localStorage.setItem(`onboarding_completed_${uid}`, new Date().toISOString());
      localStorage.setItem(`onboarding_login_completed_${uid}`, new Date().toISOString());
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
  //
  // useMyRole sessionStorage cache pre-seed (PR #357 후속):
  // production 사용자의 first-paint race 회피용 cache가 e2e 환경에선 매 spec
  // fresh sessionStorage라 무용 → useMyRole의 /api/members fetch async 동안
  // canManage=false → TemplateMenuV2 등 conditional UI 안 렌더 → 15s timeout
  // (templates-apply-delete.spec.ts 회귀 원인). owner 역할로 pre-seed해서 첫
  // render부터 canManage=true로 hydrate.
  await page.addInitScript(
    ({ ref, uid, session, academyId: acadId }) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
      localStorage.setItem("supabase_user_id", uid);
      // rank 5-A InlineTour — E2E 환경에서 자동 walkthrough 시작 차단.
      // dim overlay 가 viewport interaction 막아 switcher click 등 회귀 발생 (PR #476 발견).
      // tour 자체를 검증할 e2e spec 은 명시적으로 이 key 를 removeItem 한 후 진입.
      localStorage.setItem(`onboarding_completed_${uid}`, new Date().toISOString());
      localStorage.setItem(`onboarding_login_completed_${uid}`, new Date().toISOString());
      // useMyRole cache pre-seed — academies 필드도 사전 시드. 이전엔 `[]` 였는데
      // (PR #357) Sidebar 의 activeAcademy=undefined → aria-label="학원" → e2e
      // locator `/E2E Test Academy/` fail (multi-academy.spec.ts:54 회귀, issue #398).
      // globalSetup 의 academyId 를 그대로 시드 — first paint 부터 switcher 가
      // "E2E Test Academy" 텍스트로 렌더. 두 번째 academy 는 MemberContext 의
      // /api/academies/mine fetch 가 채움 (spec waitForResponse 로 대기).
      sessionStorage.setItem(
        `useMyRole_v1_${uid}`,
        JSON.stringify({
          role: "owner",
          canManage: true,
          academies: acadId
            ? [{ id: acadId, name: "E2E Test Academy", slug: null, role: "owner" }]
            : [],
          linkedTeacherId: null,
          linkedTeacherName: null,
          linkedTeacherColor: null,
          adminCount: 1,
        }),
      );
    },
    { ref: projectRef, uid: userId, session: sessionPayload, academyId },
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

/**
 * 인증 페이지 진입 + AuthGuard race 회피.
 *
 * 사용 흐름:
 *   await injectRealSession(page);
 *   await page.route("**\/api\/...", mock); // GET fulfill 등록
 *   await gotoAuthenticated(page, "/settings"); // /login redirect 자동 retry
 *
 * 배경 (flaky audit 2026-05-19, share-link/teachers-crud root cause):
 * - injectRealSession 의 addInitScript localStorage seed (sb-{ref}-auth-token) 후
 *   page.route 등록 → page.goto 흐름에서 ~10-20% 빈도로 AuthGuard 의 첫 mount
 *   getSession() 이 null 반환 → /login redirect 발생. (PR #355 atoms SSOT v2 +
 *   PR #356 name-min-length-v2 머지 후 표면화. PR #355/#356 admin override 임시방편)
 * - 정확한 race source: SW(/api/* NetworkOnly, ADR-007) + page.route NetworkInterceptor
 *   + Supabase SDK initialize 의 storage read 가 첫 paint 시점에 미동기. addInitScript
 *   가 navigation 전 실행되지만 SW 가 cached HTML (이전 spec 의 /login) 반환 가능성.
 * - 완전 root cause 직접 fix 는 SW + Playwright route + Supabase SDK 3 레이어 변경 필요.
 *   본 helper 는 검증 + reload retry 로 spec 안정성 보강.
 *
 * 동작:
 * 1. page.goto(path) — domcontentloaded 까지
 * 2. URL 이 /login 이면 한 번 reload (addInitScript 재실행 → SDK 재 init → storage 인지 chance)
 * 3. 그래도 /login 이면 throw — spec 자체 fail (재시도는 playwright retries 가 처리)
 */
export async function gotoAuthenticated(
  page: Page,
  path: string,
  opts?: { reloadOnRedirect?: boolean },
): Promise<void> {
  const reloadOnRedirect = opts?.reloadOnRedirect ?? true;

  await page.goto(path, { waitUntil: "domcontentloaded" });

  if (page.url().endsWith("/login") && reloadOnRedirect) {
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  if (page.url().endsWith("/login")) {
    throw new Error(
      `[gotoAuthenticated] /login redirect persisted after reload. ` +
        `injectRealSession storage seed 가 인지되지 않음. ` +
        `SW caching 또는 addInitScript timing 의심. path=${path}, url=${page.url()}`,
    );
  }
}
