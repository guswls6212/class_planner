import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

function canManageInvites(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageInvites(role)) {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from("invite_tokens")
      .select("id, token, role, expires_at, created_at")
      .eq("academy_id", academyId)
      .is("used_by", null)
      .gt("expires_at", now);

    if (error) {
      logger.error("초대 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 목록 조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    logger.error("GET /api/invites 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageInvites(role)) {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { role: inviteRole } = body as { role?: string };

    if (!inviteRole || !["admin", "member"].includes(inviteRole)) {
      return NextResponse.json(
        { success: false, error: "role은 'admin' 또는 'member'여야 합니다." },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("invite_tokens")
      .insert({
        academy_id: academyId,
        role: inviteRole,
        created_by: userId,
      })
      .select("id, token, role, expires_at, created_at")
      .single();

    if (error || !data) {
      logger.error("초대 토큰 생성 실패", { userId, academyId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 링크 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 토큰 생성", { userId, academyId, role: inviteRole });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/invites 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
