import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "템플릿 삭제 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const { error } = await client
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("academy_id", academyId);

    if (error) {
      logger.error("템플릿 삭제 실패", { id, userId }, error as Error);
      return NextResponse.json({ success: false, error: "템플릿 삭제에 실패했습니다." }, { status: 500 });
    }

    logger.info("템플릿 삭제", { id, userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
