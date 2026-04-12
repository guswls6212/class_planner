import { getServiceRoleClient } from "./supabaseServiceRole";

/**
 * userId로 소속 academy_id를 조회한다.
 * academy_members 테이블에서 첫 번째 academy를 반환.
 *
 * @throws userId에 매핑된 academy가 없으면 에러 (S4 온보딩 전까지는 migration으로 매핑 완료된 사용자만 존재)
 */
export async function resolveAcademyId(userId: string): Promise<string> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `사용자(${userId})에 매핑된 학원을 찾을 수 없습니다. 온보딩이 완료되지 않은 사용자입니다.`
    );
  }

  return data.academy_id as string;
}
