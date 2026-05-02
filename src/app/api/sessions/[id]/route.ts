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

    // requireRole verifies academy membership; academyId is threaded to the service
    // so the repository scopes the UPDATE to the correct academy_id row.
    const { academyId, role } = await requireRole(userId, ["owner", "admin", "member"]);

    // public_description은 owner/admin만 편집 가능
    if (role === "member" && public_description != null) {
      return NextResponse.json(
        { success: false, error: "Forbidden: only owner/admin may set public_description" },
        { status: 403 }
      );
    }

    const updatedSession = await getSessionService().updateSession(id, {
      enrollmentIds,
      subjectId,
      weekday,
      startsAt: resolvedStart,
      endsAt: resolvedEnd,
      room,
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
