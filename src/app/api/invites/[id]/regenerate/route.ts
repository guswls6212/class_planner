import { randomBytes } from "node:crypto";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

// "새 링크 발급" — 기존 invite row 의 token / expires_at / created_at 을 atomic 하게
// 갱신한다. id, academy_id, role, teacher_id, email, invitee_label 은 보존. 클라이언트의
// DELETE + POST 2회 호출 대비 race-safe (단일 UPDATE) 이고, 멤버 목록에서 같은 invite
// row 의 id 가 유지되어 UI 상태가 일관됨.

export async function POST(
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

    const { data: existing, error: fetchError } = await client
      .from("invite_tokens")
      .select("id, academy_id, used_by, role")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: "초대를 찾을 수 없습니다." }, { status: 404 });
    }

    if (existing.academy_id !== academyId) {
      return NextResponse.json({ success: false, error: "접근 권한이 없습니다." }, { status: 403 });
    }

    if (existing.used_by) {
      return NextResponse.json({ success: false, error: "이미 사용된 초대입니다." }, { status: 410 });
    }

    const inviteExpiresHours = Number(process.env.INVITE_EXPIRES_HOURS) || 24;
    const newExpiresAt = new Date(Date.now() + inviteExpiresHours * 60 * 60 * 1000).toISOString();
    const newToken = randomBytes(32).toString("hex");

    const { data, error: updateError } = await client
      .from("invite_tokens")
      .update({
        token: newToken,
        expires_at: newExpiresAt,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, token, role, expires_at, created_at, invitee_label")
      .single();

    if (updateError || !data) {
      logger.error("초대 재발급 실패", { id, userId }, updateError as Error);
      return NextResponse.json({ success: false, error: "초대 재발급에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 재발급", { id, userId, academyId, role: existing.role });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
