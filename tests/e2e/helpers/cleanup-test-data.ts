/**
 * E2E test user 데이터 cleanup — 매 spec 후 또는 globalTeardown에서 호출.
 *
 * SUPABASE_SERVICE_ROLE_KEY로 admin client 생성 → RLS 우회하여 test user의
 * sessions/students/subjects/teachers/enrollments/templates 등 모두 삭제.
 *
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE_KEY 환경 변수 (GitHub secret 또는 .env.local)
 * - global-setup.ts가 process.env.E2E_TEST_USER_ID를 설정한 후 실행
 */
import { createClient } from "@supabase/supabase-js";

/**
 * test user의 모든 데이터를 삭제. spec teardown에서 호출.
 *
 * 각 테이블은 user_id 컬럼으로 연결되었다고 가정. 스키마 변경 시 이 목록 갱신.
 */
export async function cleanupTestUserData(opts?: { userId?: string }): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = opts?.userId ?? process.env.E2E_TEST_USER_ID;

  if (!url || !serviceKey) {
    // service role key 없으면 cleanup 건너뜀 — 로컬 dev에서 옵션
    // eslint-disable-next-line no-console
    console.warn(
      "[cleanupTestUserData] SUPABASE_SERVICE_ROLE_KEY 누락 — cleanup 건너뜀. " +
        "test 간 데이터 leakage 가능.",
    );
    return;
  }
  if (!userId) {
    throw new Error(
      "[cleanupTestUserData] E2E_TEST_USER_ID 누락 — globalSetup이 정상 실행됐는지 확인.",
    );
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // PR D — schema는 academy_id로 scope. user의 academies 조회 후 그 academy_id로 모든 데이터 삭제.
  // 마지막에 academy_members + academies 정리.
  const { data: userAcademies } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId);

  const academyIds = (userAcademies ?? []).map((m) => m.academy_id as string);

  // FK 의존성 순서대로 — child first (sessions/enrollments) → parent (students/subjects/teachers)
  const academyScopedTables = [
    "session_enrollments",
    "sessions",
    "enrollments",
    "templates",
    "share_tokens",
    "invites",
    "teacher_subjects",
    "teachers",
    "students",
    "subjects",
  ];

  for (const aid of academyIds) {
    for (const table of academyScopedTables) {
      const { error } = await sbAdmin.from(table).delete().eq("academy_id", aid);
      if (error && !error.message.includes("does not exist") && !error.message.includes("column")) {
        // eslint-disable-next-line no-console
        console.warn(`[cleanupTestUserData] ${table} (academy_id=${aid.slice(0, 8)}...) 삭제 실패: ${error.message}`);
      }
    }
  }

  // academy_members + academies 마지막
  await sbAdmin.from("academy_members").delete().eq("user_id", userId);
  for (const aid of academyIds) {
    const { error } = await sbAdmin.from("academies").delete().eq("id", aid);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[cleanupTestUserData] academies (${aid.slice(0, 8)}...) 삭제 실패: ${error.message}`);
    }
  }
}
