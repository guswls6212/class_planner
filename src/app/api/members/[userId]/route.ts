import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
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
      return NextResponse.json({ success: false, error: "본인은 제거할 수 없습니다." }, { status: 400 });
    }

    const { academyId, role: actorRole } = await resolveAcademyMembership(requesterId);

    if (actorRole !== "owner" && actorRole !== "admin") {
      return NextResponse.json({ success: false, error: "멤버 제거 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();

    const { data: targetRow, error: targetError } = await client
      .from("academy_members")
      .select("role")
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId)
      .single();

    if (targetError || !targetRow) {
      return NextResponse.json(
        { success: false, error: "해당 학원에 소속된 멤버가 아닙니다." },
        { status: 404 }
      );
    }

    // owner 는 제거 불가 — last_owner_check 동시 충족 (단일 owner 보장)
    if (targetRow.role === "owner") {
      return NextResponse.json(
        { success: false, error: "원장은 제거할 수 없습니다." },
        { status: 403 }
      );
    }

    // admin 은 member 만 제거 가능. 다른 admin 제거는 owner 만 가능.
    if (actorRole === "admin" && targetRow.role === "admin") {
      return NextResponse.json(
        { success: false, error: "관리자 제거는 원장만 가능합니다." },
        { status: 403 }
      );
    }

    const { error: deleteError } = await client
      .from("academy_members")
      .delete()
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId);

    if (deleteError) {
      logger.error("멤버 제거 실패", { requesterId, targetUserId }, deleteError as Error);
      return NextResponse.json({ success: false, error: "멤버 제거에 실패했습니다." }, { status: 500 });
    }

    // 데이터 보존: 같은 academy 의 teachers.user_id = NULL 로 복원.
    // 강사 row + 담당 수업 + 공유 링크 모두 보존. 재초대 시 새 invite_token 으로 다시 연결.
    // 실패해도 핵심 academy_members DELETE 는 이미 commit — graceful warn 으로 처리.
    const { error: teacherUnlinkError } = await client
      .from("teachers")
      .update({ user_id: null })
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId);

    if (teacherUnlinkError) {
      logger.warn(
        "멤버 제거 후 teachers.user_id 복원 실패 (academy_members 는 이미 삭제됨)",
        { requesterId, targetUserId, academyId },
        teacherUnlinkError as Error,
      );
    }

    logger.info("멤버 제거 완료", {
      requesterId,
      targetUserId,
      academyId,
      removedRole: targetRow.role,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

const ALLOWED_TARGET_ROLES = ["admin", "member"] as const;
type AllowedTargetRole = (typeof ALLOWED_TARGET_ROLES)[number];

function isAllowedTargetRole(value: unknown): value is AllowedTargetRole {
  return typeof value === "string" && (ALLOWED_TARGET_ROLES as readonly string[]).includes(value);
}

export async function PATCH(
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
      return NextResponse.json(
        { success: false, error: "본인의 역할은 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    const { academyId, role: actorRole } = await resolveAcademyMembership(requesterId);

    if (actorRole !== "owner") {
      return NextResponse.json(
        { success: false, error: "역할 변경은 원장만 가능합니다." },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as { role?: unknown };
    const nextRole = body.role;

    if (!isAllowedTargetRole(nextRole)) {
      return NextResponse.json(
        { success: false, error: "role은 'admin' 또는 'member'여야 합니다." },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    // Look up current role of the target member to enforce owner-demotion ban.
    const { data: targetRow, error: targetError } = await client
      .from("academy_members")
      .select("role")
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId)
      .single();

    if (targetError || !targetRow) {
      return NextResponse.json(
        { success: false, error: "해당 학원에 소속된 멤버가 아닙니다." },
        { status: 404 }
      );
    }

    if (targetRow.role === "owner") {
      return NextResponse.json(
        { success: false, error: "원장은 강등할 수 없습니다." },
        { status: 403 }
      );
    }

    const { data: updatedRows, error: updateError } = await client
      .from("academy_members")
      .update({ role: nextRole })
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId)
      .select("user_id, role");

    if (updateError || !updatedRows || updatedRows.length === 0) {
      if (updateError) {
        logger.error(
          "멤버 역할 변경 실패",
          { requesterId, targetUserId, nextRole },
          updateError as Error
        );
      }
      return NextResponse.json(
        { success: false, error: "역할 변경에 실패했습니다." },
        { status: updateError ? 500 : 404 }
      );
    }

    logger.info("멤버 역할 변경 완료", {
      requesterId,
      targetUserId,
      academyId,
      previousRole: targetRow.role,
      nextRole,
    });
    return NextResponse.json({ success: true, data: { userId: targetUserId, role: nextRole } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
