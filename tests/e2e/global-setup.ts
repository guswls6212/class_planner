/**
 * Playwright global setup — 전체 e2e 실행 전 한 번만 동작.
 *
 * 동작:
 * 1. Supabase password auth로 e2e 전용 test user 로그인
 * 2. 받은 session(access_token + refresh_token + user) JSON 파일에 저장
 * 3. 각 spec이 helpers/auth-mock.ts injectRealSession()으로 inject
 *
 * 결과: AuthGuard.getSession()이 진짜 토큰 검증 → /settings, /teachers 등 진입 가능.
 *       POST /api/teachers, /api/invites 등이 진짜 RLS 통과.
 *
 * Prerequisites (사용자 측):
 * - Supabase dashboard에서 Email/Password provider 활성화
 * - test user 사전 생성 (scripts/setup-e2e-test-user.ts 실행)
 * - .env.local 또는 GitHub secret에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   E2E_TEST_USER_EMAIL, E2E_TEST_USER_PASSWORD 설정
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

async function globalSetup(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!url || !anonKey) {
    throw new Error(
      "[e2e global-setup] NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY 누락. " +
        ".env.local 또는 GitHub secret 확인.",
    );
  }
  if (!email || !password) {
    throw new Error(
      "[e2e global-setup] E2E_TEST_USER_EMAIL 또는 E2E_TEST_USER_PASSWORD 누락. " +
        "scripts/setup-e2e-test-user.ts 실행 후 .env.local에 설정.",
    );
  }

  const sb = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw new Error(
      `[e2e global-setup] Supabase 로그인 실패: ${error?.message ?? "no session"}. ` +
        "test user 사전 생성됐는지 확인.",
    );
  }

  // sb-{ref}-auth-token 키 prefix 결정 — URL hostname에서 project ref 추출
  const projectRef = new URL(url).hostname.split(".")[0];

  const sessionPayload = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: "bearer",
    user: data.user,
  };

  const authDir = path.join(process.cwd(), "playwright/.auth");
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, "session.json"),
    JSON.stringify(
      {
        projectRef,
        userId: data.user.id,
        userEmail: data.user.email,
        sessionPayload,
        loggedInAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // process.env에 노출 — cleanup-test-data.ts가 user_id 참조
  process.env.E2E_TEST_USER_ID = data.user.id;

  // eslint-disable-next-line no-console
  console.log(
    `[e2e global-setup] 로그인 성공: ${data.user.email} (id=${data.user.id.slice(0, 8)}...) → playwright/.auth/session.json 저장`,
  );
}

export default globalSetup;
