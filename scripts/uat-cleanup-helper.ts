/**
 * UAT user의 academy-scoped 데이터만 cleanup + email 기반 user/academy lookup.
 *
 * tests/e2e/helpers/cleanup-test-data.ts 와 동일 패턴이지만 결정적 차이:
 * - **academy_members + academies는 보존** (UAT 재시드 위해)
 * - e2e cleanup은 academy까지 삭제 → 매번 재생성. UAT는 setup 1회 후 academy 재사용.
 *
 * uat-seed.ts (재시드 멱등성) 와 uat-teardown.ts (정리) 둘 다 사용.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * email로 user_id 조회. 없으면 null.
 * UAT_TEST_USER_ID 환경변수가 비어있어도 email로 자동 lookup 가능하게.
 */
export async function findUserIdByEmail(
  sbAdmin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await sbAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error(`user 조회 실패: ${error.message}`);
  }
  const user = data.users.find((u) => u.email === email);
  return user?.id ?? null;
}

/**
 * userId로 owner 역할의 academy_id 조회. 없으면 null.
 */
export async function findAcademyIdForOwner(
  sbAdmin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error) {
    throw new Error(`academy_members 조회 실패: ${error.message}`);
  }
  return data?.academy_id ?? null;
}

/**
 * 주어진 user의 모든 academy의 scope 데이터(sessions/students/subjects/teachers/...)만 삭제.
 * academy_members + academies 자체는 보존.
 */
export async function cleanupAcademyScopedDataForUser(
  sbAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: userAcademies } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId);

  const academyIds = (userAcademies ?? []).map(
    (m) => m.academy_id as string,
  );

  // FK 의존성 순서대로 — child first.
  // cleanup-test-data.ts 의 academyScopedTables 동일 (참조 일치 의무).
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
      const { error } = await sbAdmin
        .from(table)
        .delete()
        .eq("academy_id", aid);
      if (
        error &&
        !error.message.includes("does not exist") &&
        !error.message.includes("column")
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `[uat-cleanup] ${table} (academy_id=${aid.slice(0, 8)}...) 삭제 실패: ${error.message}`,
        );
      }
    }
  }
}
