import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
// import { trackDatabaseError } from "@/lib/errorTracker";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the session service (for testing purposes)
export function getSessionService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createSessionService();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const academyId = await resolveAcademyId(userId);
    const session = await getSessionService().getSessionById(id, academyId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      enrollmentIds,
      subjectId,
      weekday,
      weekStartDate,
      startTime,
      endTime,
      startsAt: startsAtBody,
      endsAt: endsAtBody,
      room,
      teacherId,
      public_description,
      internal_note,
    } = body;
    const resolvedStart = startTime ?? startsAtBody;
    const resolvedEnd = endTime ?? endsAtBody;

    if (
      !enrollmentIds ||
      !Array.isArray(enrollmentIds) ||
      !subjectId ||
      weekday === undefined ||
      !resolvedStart ||
      !resolvedEnd
    ) {
      return NextResponse.json(
        { success: false, error: "Required fields are missing" },
        { status: 400 }
      );
    }

    // 빈 배열 거부 — session_enrollments 전부 DELETE만 일어나서 dangling이 되는
    // 경로 차단 (2026-05-12 테스트학원 사고).
    if (enrollmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "enrollmentIds must be non-empty" },
        { status: 400 }
      );
    }

    // 세션 메타 편집은 owner/admin 만 (permissions.ts § member: sessions read-only).
    // member(강사)는 출결만 /api/attendance 로 가능 (assertAttendancePermission 본인 수업 강제).
    // teacher-schedule 은 read-only — member 의 정당한 PUT 경로 없음.
    // (이전: member 허용 + public_description 만 차단 → subject/time/teacher 재배정 우회 가능했던 gap 마감)
    // requireRole verifies academy membership; academyId is threaded to the service
    // so the repository scopes the UPDATE to the correct academy_id row.
    const { academyId } = await requireRole(userId, ["owner", "admin"]);

    const updatedSession = await getSessionService().updateSession(id, {
      enrollmentIds,
      subjectId,
      weekday,
      startsAt: resolvedStart,
      endsAt: resolvedEnd,
      room,
      // weekStartDate: 다른 주로 이동 시 forward. 미지정 시 기존 값 유지.
      ...(weekStartDate !== undefined && { weekStartDate }),
      ...(teacherId !== undefined && { teacherId: teacherId ?? null }),
      ...(public_description !== undefined && { public_description }),
      ...(internal_note !== undefined && { internal_note }),
    }, academyId);

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: "Session updated successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // requireRole verifies academy membership; academyId is threaded to the service
    // so the repository scopes the DELETE to the correct academy_id row.
    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    await getSessionService().deleteSession(id, academyId);
    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
