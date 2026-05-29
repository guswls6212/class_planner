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
  // T0' fix: audit_log 추가. audit_log.academy_id 의 FK delete_rule 이 NO ACTION 이라
  // academies DELETE 시 RESTRICT 됨 (다른 academy_id table 은 모두 CASCADE).
  // 결과: cleanup 의 academies DELETE silent fail → orphan academies 잔존 → 다음 cycle
  // setup 시 새 academies INSERT + academy_members INSERT → DB 혼란 → e2e flaky.
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
    "audit_log",
    "attendance",
    "invite_tokens",
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

  // 2026-05-29 (proposal ci-concurrent-e2e-user-collision): academy 껍데기
  // (academies + academy_members)는 **삭제하지 않는다**. 위 academyScopedTables
  // (자식 데이터)만 비운다.
  //
  // 근본 원인 fix: 기존엔 teardown 이 academy_members + academies 를 DELETE 했다.
  // shard↔user 고정(e2e-test-1~6)이라 동시 PR 2건이 같은 user 공유 시, PR-A teardown 이
  // academy 삭제 직후 PR-B globalSetup(academy_members 조회)이 '부재' throw → 동시 e2e
  // 전멸 (2026-05-29 PR570+PR572 동시 실행 실측).
  //
  // setup(setup-e2e-test-user.ts ensureOwnerAcademy)은 'academy_members 있으면 재사용,
  // 없으면 생성'(limit(1), idempotent). academy 껍데기를 남기면:
  //   (a) 동시 PR 이 같은 academy 안전 공유(재사용 — destructive 동작 0) → 충돌 구조적 제거,
  //   (b) 자식 데이터는 매 teardown 에서 비워져 다음 run leakage 없음 (teardown 본래 목적 유지).
  // 트레이드오프: academy/academy_members row 누적되나 setup 의 limit(1) graceful 처리.
  // (academies DELETE 의 audit_log FK RESTRICT throw 문제도 함께 사라짐.)
}

// concurrent-verify-b: teardown-fix 동시 검증용 trivial 변경 (2026-05-29)
