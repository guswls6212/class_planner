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
      return NextResponse.json({ success: false, error: "공유 링크 관리 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const { error } = await client
      .from("share_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("academy_id", academyId);

    if (error) {
      logger.error("공유 토큰 취소 실패", { id, userId }, error as Error);
      return NextResponse.json({ success: false, error: "공유 링크 취소에 실패했습니다." }, { status: 500 });
    }

    logger.info("공유 토큰 취소", { id, userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
