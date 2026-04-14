import { getServiceRoleClient } from "./supabaseServiceRole";

export interface AcademyMembership {
  academyId: string;
  role: string;
}

/**
 * userId로 소속 academyId와 role을 함께 반환한다.
 * 초대/멤버 관리 API에서 권한 체크와 academyId 조회를 한 번에 처리하기 위해 사용.
 *
 * @throws userId에 매핑된 academy가 없으면 에러
 */
export async function resolveAcademyMembership(
  userId: string
): Promise<AcademyMembership> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("academy_members")
    .select("academy_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `사용자(${userId})에 매핑된 학원을 찾을 수 없습니다. 온보딩이 완료되지 않은 사용자입니다.`
    );
  }

  return { academyId: data.academy_id as string, role: data.role as string };
}
