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

    // 학원 이름 조회 (settings 페이지 표시용)
    const { data: academyRow } = await client
      .from("academies")
      .select("name")
      .eq("id", academyId)
      .single();
    const academyName = academyRow?.name ?? "";

    // academy_members만 조회 (auth.users PostgREST join은 지원 안 됨)
    const { data: rows, error } = await client
      .from("academy_members")
      .select("user_id, role, joined_at")
      .eq("academy_id", academyId)
      .order("joined_at");

    if (error) {
      logger.error("멤버 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json(
        { success: false, error: "멤버 목록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    // 각 멤버의 auth 정보를 admin API로 병렬 조회
    const members = await Promise.all(
      (rows ?? []).map(async (row) => {
        try {
          const { data: { user } } = await client.auth.admin.getUserById(row.user_id);
          return {
            userId: row.user_id,
            role: row.role,
            joinedAt: row.joined_at,
            email: user?.email ?? null,
            name: (user?.user_metadata?.full_name as string | undefined) ?? null,
          };
        } catch {
          return {
            userId: row.user_id,
            role: row.role,
            joinedAt: row.joined_at,
            email: null,
            name: null,
          };
        }
      })
    );

    return NextResponse.json({ success: true, data: members, hasAcademy: true, academyName });
  } catch (error) {
    return toErrorResponse(error);
  }
}
