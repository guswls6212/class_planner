/**
 * UAT user의 fresh-start cleanup + email 기반 user/academy lookup.
 *
 * 매 UAT 사이클 시작 시 user 를 신규 사용자 상태로 reset — S-1.5 (첫 로그인
 * 학원 자동 생성) 시나리오 매 사이클 자연 발동 보장.
 *
 * tests/e2e/helpers/cleanup-test-data.ts 와 동일 패턴 (academy 까지 삭제). 이전엔
 * UAT 만 academy 보존 모델이었지만 (2026-05-07 이전), 옵션 늘리는 것보다
 * fresh-start default 가 단순 (사용자 결정).
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
 * 주어진 user 의 모든 academy scope 데이터만 삭제 — academy_members + academies 보존.
 * uat-seed.ts 멱등 재시드 용 (기존 academy 재사용).
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

/**
 * 주어진 user 의 fresh-start cleanup — scope 데이터 + academy_members + orphan
 * academies 까지 모두 삭제. user (auth.users) 자체는 보존 (재로그인 가능).
 *
 * 동작 (FK 의존성 child first):
 *   1. cleanupAcademyScopedDataForUser() — scope 데이터 삭제
 *   2. user 의 academy_members row 삭제
 *   3. orphan academies (해당 user 외 멤버 없는 academy) 삭제
 *
 * 호출 후 그 user 로 재로그인 시 → academy 없는 신규 상태 → S-1.5 (학원 자동 생성)
 * 시나리오 발동.
 *
 * uat-teardown.ts 가 매 사이클 호출 (사용자 결정 2026-05-07 — 옵션 X, default
 * fresh-start).
 *
 * 위험: user 의 모든 학원 데이터 영구 삭제. UAT_TEST_USER 같은 격리 user 에서만 사용.
 * 본인 OAuth 계정에 호출하면 자기 학원 데이터 손실 — uat-teardown.ts 가 EMAIL
 * 환경변수 (UAT_TEST_USER_EMAIL) 가드 의무.
 */
export async function cleanupUatUserData(
  sbAdmin: SupabaseClient,
  userId: string,
): Promise<void> {
  // 1. scope 데이터 삭제 (재사용)
  const { data: userAcademies } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId);

  const academyIds = (userAcademies ?? []).map(
    (m) => m.academy_id as string,
  );

  await cleanupAcademyScopedDataForUser(sbAdmin, userId);

  // 2. user 의 academy_members row 삭제
  const { error: amErr } = await sbAdmin
    .from("academy_members")
    .delete()
    .eq("user_id", userId);
  if (amErr) {
    // eslint-disable-next-line no-console
    console.warn(`[uat-cleanup] academy_members 삭제 실패: ${amErr.message}`);
  }

  // 3. orphan academies 삭제 (해당 user 외 멤버 없는 academy 만)
  for (const aid of academyIds) {
    const { count } = await sbAdmin
      .from("academy_members")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", aid);
    if (!count || count === 0) {
      const { error: acErr } = await sbAdmin
        .from("academies")
        .delete()
        .eq("id", aid);
      if (acErr) {
        // eslint-disable-next-line no-console
        console.warn(
          `[uat-cleanup] academies (${aid.slice(0, 8)}...) 삭제 실패: ${acErr.message}`,
        );
      }
    }
  }
}
