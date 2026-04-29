import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
  }

  let academyId: string;
  try {
    ({ academyId } = await resolveAcademyMembership(userId));
  } catch (error) {
    // academy_members에 row가 없는 사용자 — 온보딩 미완 상태
    logger.warn("멤버 조회: 학원 없는 사용자", { userId });
    return NextResponse.json({ success: true, data: [], hasAcademy: false });
  }

  try {
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("academy_members")
      .select("user_id, role, joined_at, users:user_id(email, raw_user_meta_data)")
      .eq("academy_id", academyId)
      .order("joined_at");

    if (error) {
      logger.error("멤버 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "멤버 목록 조회에 실패했습니다." }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = (data ?? []).map((row: any) => ({
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      email: row.users?.email ?? null,
      name: row.users?.raw_user_meta_data?.full_name ?? null,
    }));

    return NextResponse.json({ success: true, data: members, hasAcademy: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
