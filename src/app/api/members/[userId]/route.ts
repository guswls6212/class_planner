import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get("userId");
    const { userId: targetUserId } = await params;

    if (!requesterId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    if (requesterId === targetUserId) {
      return NextResponse.json({ success: false, error: "원장 본인은 제거할 수 없습니다." }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(requesterId);

    if (role !== "owner") {
      return NextResponse.json({ success: false, error: "멤버 제거는 원장만 가능합니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();

    const { error } = await client
      .from("academy_members")
      .delete()
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId);

    if (error) {
      logger.error("멤버 제거 실패", { requesterId, targetUserId }, error as Error);
      return NextResponse.json({ success: false, error: "멤버 제거에 실패했습니다." }, { status: 500 });
    }

    logger.info("멤버 제거 완료", { requesterId, targetUserId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/members/[userId] 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
