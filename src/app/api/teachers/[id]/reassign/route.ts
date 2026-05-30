import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

// 강사 교체 (PR 8 Phase 2 — design-exploration teacher-replace-ux Variant B).
// body { to: newTeacherId, archiveOriginal?: boolean } — 원 강사의 sessions.teacher_id 를
// 새 강사로 일괄 이전. archiveOriginal default true → 원 강사 자동 보관 (Phase 1 archive 흐름).
// Atomic 보장 단순 — sessions UPDATE + teachers UPDATE 순서대로. 실패 시 graceful 보고.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "강사 교체 권한이 없습니다." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      to?: unknown;
      archiveOriginal?: unknown;
    };

    const toId = typeof body.to === "string" ? body.to : null;
    if (!toId) {
      return NextResponse.json(
        { success: false, error: "body.to (대체 강사 id) 가 필요합니다." },
        { status: 400 }
      );
    }
    if (toId === originalId) {
      return NextResponse.json(
        { success: false, error: "원 강사와 대체 강사가 같을 수 없습니다." },
        { status: 400 }
      );
    }
    const archiveOriginal = body.archiveOriginal !== false; // default true

    const client = getServiceRoleClient();

    // 두 강사 모두 같은 academy 검증.
    const { data: targets, error: targetsError } = await client
      .from("teachers")
      .select("id, name, academy_id, archived_at")
      .in("id", [originalId, toId])
      .eq("academy_id", academyId);

    if (targetsError || !targets || targets.length !== 2) {
      return NextResponse.json(
        { success: false, error: "강사를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const newTeacher = targets.find((t) => t.id === toId);
    if (newTeacher?.archived_at) {
      return NextResponse.json(
        { success: false, error: "보관된 강사로는 교체할 수 없습니다." },
        { status: 400 }
      );
    }

    // sessions teacher_id 일괄 이전.
    const { data: updatedSessions, error: sessionsError } = await client
      .from("sessions")
      .update({ teacher_id: toId })
      .eq("academy_id", academyId)
      .eq("teacher_id", originalId)
      .select("id");

    if (sessionsError) {
      logger.error(
        "강사 교체 — sessions update 실패",
        { originalId, toId, userId },
        sessionsError as Error
      );
      return NextResponse.json(
        { success: false, error: "수업 이전에 실패했습니다." },
        { status: 500 }
      );
    }

    const reassignedCount = updatedSessions?.length ?? 0;

    // 원 강사 자동 보관 (default).
    let archivedOk = true;
    if (archiveOriginal) {
      const { error: archiveError } = await client
        .from("teachers")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", originalId)
        .eq("academy_id", academyId);
      if (archiveError) {
        archivedOk = false;
        logger.warn(
          "강사 교체 — 원 강사 자동 보관 실패 (sessions 이전은 commit)",
          { originalId, userId },
          archiveError as Error,
        );
      }
    }

    logger.info("강사 교체", {
      originalId,
      toId,
      userId,
      academyId,
      reassignedCount,
      archiveOriginal,
      archivedOk,
    });

    return NextResponse.json({
      success: true,
      data: { reassignedCount, archiveOriginal, archivedOk },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
