import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

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

    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();

    const { data: token, error: fetchError } = await client
      .from("invite_tokens")
      .select("id, academy_id, used_by")
      .eq("id", id)
      .single();

    if (fetchError || !token) {
      return NextResponse.json({ success: false, error: "초대를 찾을 수 없습니다." }, { status: 404 });
    }

    if (token.academy_id !== academyId) {
      return NextResponse.json({ success: false, error: "접근 권한이 없습니다." }, { status: 403 });
    }

    if (token.used_by) {
      return NextResponse.json({ success: false, error: "이미 사용된 초대입니다." }, { status: 410 });
    }

    const { error: deleteError } = await client
      .from("invite_tokens")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("초대 취소 실패", { id }, deleteError as Error);
      return NextResponse.json({ success: false, error: "초대 취소에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 취소", { id, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
