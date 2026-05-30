import { getServiceRoleClient } from "./supabaseServiceRole";

export interface AcademyMembership {
  academyId: string;
  role: string;
}

const ROLE_PRIORITY: Record<string, number> = { owner: 0, admin: 1, member: 2 };

/**
 * userId로 소속 academyId와 role을 함께 반환한다.
 * 초대/멤버 관리 API에서 권한 체크와 academyId 조회를 한 번에 처리하기 위해 사용.
 *
 * - 여러 학원에 속한 경우 role 우선순위(owner > admin > member)로 정렬하여 첫 번째를 반환.
 * - preferredAcademyId가 주어지고 사용자가 해당 학원의 멤버이면 그 학원을 반환.
 *
 * @throws userId에 매핑된 academy가 없으면 에러
 */
export async function resolveAcademyMembership(
  userId: string,
  preferredAcademyId?: string
): Promise<AcademyMembership> {
  const client = getServiceRoleClient();

  // If a preferred academy is specified, try it first
  if (preferredAcademyId) {
    const { data: preferred } = await client
      .from("academy_members")
      .select("academy_id, role")
      .eq("user_id", userId)
      .eq("academy_id", preferredAcademyId)
      .single();

    if (preferred) {
      return { academyId: preferred.academy_id as string, role: preferred.role as string };
    }
  }

  // Get all memberships and sort by role priority
  const { data, error } = await client
    .from("academy_members")
    .select("academy_id, role")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    throw new Error(
      `사용자(${userId})에 매핑된 학원을 찾을 수 없습니다. 온보딩이 완료되지 않은 사용자입니다.`
    );
  }

  const sorted = [...data].sort(
    (a, b) => (ROLE_PRIORITY[a.role as string] ?? 99) - (ROLE_PRIORITY[b.role as string] ?? 99)
  );

  return { academyId: sorted[0].academy_id as string, role: sorted[0].role as string };
}
