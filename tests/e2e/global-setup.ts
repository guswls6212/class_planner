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

  // PR D — academy_members 조회 (owner role) → injectRealSession이 active_academy 설정에 사용.
  // 환경 변수 E2E_TEST_ACADEMY_ID로 override 가능 (.env.local의 setup script 출력값).
  let academyId: string | null = process.env.E2E_TEST_ACADEMY_ID ?? null;
  if (!academyId) {
    // 인증된 sb client (RLS는 academy_members SELECT 본인만 허용)
    const sbAuthed = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
    const { data: membership } = await sbAuthed
      .from("academy_members")
      .select("academy_id")
      .eq("user_id", data.user.id)
      .eq("role", "owner")
      .maybeSingle();
    academyId = membership?.academy_id ?? null;
  }

  // T0' instrumentation (PR-α): academyId null 이면 spec 시작 전 fail 로 즉시 표면화.
  // 가설 3 (setup script 의 academy/academy_members INSERT 실패 → continue-on-error
  // 로 무시 → academy 없이 spec 진행 → useMyRole me=undefined → canManage=false →
  // auth-dependent button visible timeout) 가 root cause 인 경우 spec timeout 보다
  // 본 throw 가 먼저 발생해 CI logs 에 명확 노출.
  // fork PR (secrets 누락) 은 위 line 28-38 의 secrets check 가 먼저 throw 하므로
  // 본 분기까지 도달 안 함 — fork 보호 유지.
  if (!academyId) {
    throw new Error(
      "[e2e global-setup] Owner academy 부재. 가능 원인: " +
        "(1) scripts/setup-e2e-test-user.ts 의 academy/academy_members INSERT 실패 " +
        "(ci.yml 의 'Setup E2E test user' step logs 확인), " +
        "(2) globalTeardown 의 cleanupTestUserData partial failure 로 academy_members 만 삭제. " +
        "회복: setup-e2e-test-user.ts 재실행 또는 academy_members SELECT 으로 직접 확인.",
    );
  }

  const authDir = path.join(process.cwd(), "playwright/.auth");
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(
    path.join(authDir, "session.json"),
    JSON.stringify(
      {
        projectRef,
        userId: data.user.id,
        userEmail: data.user.email,
        academyId,
        sessionPayload,
        loggedInAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // process.env에 노출 — cleanup-test-data.ts가 참조
  process.env.E2E_TEST_USER_ID = data.user.id;
  if (academyId) process.env.E2E_TEST_ACADEMY_ID = academyId;

  // eslint-disable-next-line no-console
  console.log(
    `[e2e global-setup] 로그인 성공: ${data.user.email} (id=${data.user.id.slice(0, 8)}...) ` +
      `${academyId ? `+ academy ${academyId.slice(0, 8)}...` : "(academy 없음 — setup script 실행 필요)"} ` +
      `→ playwright/.auth/session.json 저장`,
  );
}

export default globalSetup;
