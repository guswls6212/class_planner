import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
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
      .select("id, token, role, expires_at, created_at, teachers(name)")
      .eq("academy_id", academyId)
      .is("used_by", null)
      .gt("expires_at", now);

    if (error) {
      logger.error("초대 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 목록 조회에 실패했습니다." }, { status: 500 });
    }

    const items = (data ?? []).map((row) => ({
      id: row.id,
      token: row.token,
      role: row.role,
      expires_at: row.expires_at,
      created_at: row.created_at,
      teacherName: (row.teachers as unknown as { name: string } | null)?.name ?? null,
    }));

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return toErrorResponse(error);
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
    const { role: inviteRole, teacherId } = body as { role?: string; teacherId?: string };

    if (!inviteRole || !["admin", "member"].includes(inviteRole)) {
      return NextResponse.json(
        { success: false, error: "role은 'admin' 또는 'member'여야 합니다." },
        { status: 400 }
      );
    }

    if (inviteRole === "member" && !teacherId) {
      return NextResponse.json(
        { success: false, error: "INVITE_MEMBER_REQUIRES_TEACHER: member 초대에는 강사 연동이 필요합니다" },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    if (teacherId) {
      const { data: teacher, error: teacherError } = await client
        .from("teachers")
        .select("id, user_id")
        .eq("id", teacherId)
        .eq("academy_id", academyId)
        .single();

      if (teacherError || !teacher) {
        return NextResponse.json(
          { success: false, error: "TEACHER_NOT_FOUND: 해당 강사를 찾을 수 없습니다" },
          { status: 400 }
        );
      }

      if (teacher.user_id !== null) {
        return NextResponse.json(
          { success: false, error: "TEACHER_ALREADY_LINKED: 이미 다른 계정과 연동된 강사입니다" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await client
      .from("invite_tokens")
      .insert({
        academy_id: academyId,
        role: inviteRole,
        created_by: userId,
        teacher_id: teacherId ?? null,
      })
      .select("id, token, role, expires_at, created_at")
      .single();

    if (error || !data) {
      logger.error("초대 토큰 생성 실패", { userId, academyId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 링크 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 토큰 생성", { userId, academyId, role: inviteRole, teacherId });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
