import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
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

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    logger.error("GET /api/members 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
