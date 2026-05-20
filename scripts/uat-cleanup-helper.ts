/**
 * UAT user 의 fresh-start cleanup helper + email 기반 user/academy lookup.
 *
 * 매 UAT 사이클 시작 시 user 를 신규 사용자 상태로 reset — S-1.5 (첫 로그인 학원 자동 생성)
 * 시나리오 매 사이클 자연 발동 보장 + 3-role 시나리오 (owner/admin/member) 가 깨끗한 상태에서 시작하도록 한다.
 *
 * tests/e2e/helpers/cleanup-test-data.ts 와 같은 academy-scoped table 목록을 공유 (참조 일치 의무).
 *
 * uat-seed.ts / uat-teardown.ts / uat-invite-seed.ts 가 공통으로 사용.
 *
 * 2026-05-20 갱신:
 * - `invites` → `invite_tokens` fix (실제 테이블명, 020 migration 참조).
 * - `attendance` + `data_snapshots` 추가 (둘 다 academy_id scope, 시드/사이클 잔재 남으면 S-15/S-14 회귀).
 * - `cleanupMultipleUatUsers` helper 신설 — owner/admin/member 3 계정 batch teardown 지원.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * email로 user_id 조회. 없으면 null.
 * UAT_TEST_*_USER_ID 환경변수가 비어있어도 email로 자동 lookup 가능하게.
 */
export async function findUserIdByEmail(
  sbAdmin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await sbAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error(`user 조회 실패: ${error.message}`);
  }
  const users = data.users as Array<{ id: string; email?: string | null }>;
  const user = users.find((u) => u.email === email);
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
 * Academy-scoped 테이블 목록 (FK 의존성 child → parent 순).
 *
 * tests/e2e/helpers/cleanup-test-data.ts 의 academyScopedTables 와 일치 의무.
 * 새 academy_id-scoped 테이블 추가 시 양쪽 동시 갱신.
 */
export const ACADEMY_SCOPED_TABLES = [
  "attendance",          // 040 이전 추가, 학생 단위 출석 마킹
  "session_enrollments", // FK: sessions, enrollments
  "sessions",
  "enrollments",
  "templates",
  "share_tokens",        // access_code 컬럼 포함 (별도 access_codes 테이블 없음)
  "invite_tokens",       // 020_create_invite_tokens.sql — 이전 잘못된 "invites" fix
  "teacher_subjects",
  "teachers",
  "students",
  "subjects",
  "data_snapshots",      // 충돌 직전/자동/수동 백업 — academy scope, 사이클 잔재 누적 차단
] as const;

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

  for (const aid of academyIds) {
    for (const table of ACADEMY_SCOPED_TABLES) {
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
 * 주어진 user 의 fresh-start cleanup — scope 데이터 + academy_members + orphan academies 까지
 * 모두 삭제. user (auth.users) 자체는 보존 (재로그인 가능).
 *
 * 동작 (FK 의존성 child first):
 *   1. cleanupAcademyScopedDataForUser() — scope 데이터 삭제
 *   2. user 의 academy_members row 삭제
 *   3. orphan academies (해당 user 외 멤버 없는 academy) 삭제
 *
 * 호출 후 그 user 로 재로그인 시 → academy 없는 신규 상태 → S-1.5 (학원 자동 생성)
 * 시나리오 발동.
 *
 * 위험: user 의 모든 학원 데이터 영구 삭제. UAT_TEST_* 같은 격리 user 에서만 사용.
 * 본인 OAuth 계정에 호출하면 자기 학원 데이터 손실 — uat-teardown.ts 가 EMAIL
 * 환경변수 (UAT_TEST_*_EMAIL) 가드 의무.
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

/**
 * UAT 역할 — 환경변수 prefix 도 결정한다.
 *   owner  → UAT_TEST_OWNER_EMAIL (legacy: UAT_TEST_USER_EMAIL)
 *   admin  → UAT_TEST_ADMIN_EMAIL
 *   member → UAT_TEST_MEMBER_EMAIL
 */
export type UatRole = "owner" | "admin" | "member";

export interface UatAccountSpec {
  role: UatRole;
  email: string;
  /** lookup 결과 캐싱용 — 호출 측이 채워주면 listUsers 1회로 끝. */
  userId?: string;
}

/**
 * 여러 UAT 계정의 cleanupUatUserData 를 한 번에 실행.
 *
 * 순서: member → admin → owner (역할 무관하지만, owner 의 invite_tokens 가
 * admin/member 의 academy_members row 와 FK 로 묶이지 않으므로 동시 삭제 안전).
 * 그러나 academy 가 owner 외 멤버 없게 만들어 orphan delete 가 동작하려면
 * admin/member 의 academy_members 먼저 delete 가 자연스러우므로 이 순서 사용.
 *
 * 멱등 — 일부 계정이 존재하지 않아도 계속 진행 (skip + 메시지).
 *
 * 반환: 각 계정 처리 결과.
 */
export async function cleanupMultipleUatUsers(
  sbAdmin: SupabaseClient,
  accounts: UatAccountSpec[],
): Promise<Array<{ role: UatRole; email: string; userId: string | null; status: "cleaned" | "skipped-not-found" }>> {
  const results: Array<{ role: UatRole; email: string; userId: string | null; status: "cleaned" | "skipped-not-found" }> = [];

  // listUsers 1회 — N email lookup 합치기.
  const { data, error } = await sbAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error(`user 목록 조회 실패: ${error.message}`);
  }
  const users = data.users as Array<{ id: string; email?: string | null }>;
  const byEmail = new Map<string, string>();
  for (const u of users) {
    if (u.email) byEmail.set(u.email, u.id);
  }

  // 처리 순서: member → admin → owner
  const order: UatRole[] = ["member", "admin", "owner"];
  const sorted = [...accounts].sort(
    (a, b) => order.indexOf(a.role) - order.indexOf(b.role),
  );

  for (const acc of sorted) {
    const userId = acc.userId ?? byEmail.get(acc.email) ?? null;
    if (!userId) {
      // eslint-disable-next-line no-console
      console.log(
        `ℹ️  ${acc.role} (${acc.email}) — user 없음, skip`,
      );
      results.push({ role: acc.role, email: acc.email, userId: null, status: "skipped-not-found" });
      continue;
    }
    // eslint-disable-next-line no-console
    console.log(
      `🧹 ${acc.role} cleanup: userId=${userId.slice(0, 8)}... (${acc.email})`,
    );
    await cleanupUatUserData(sbAdmin, userId);
    results.push({ role: acc.role, email: acc.email, userId, status: "cleaned" });
  }

  return results;
}
