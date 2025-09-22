import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
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

    const session = await getSessionService().getSessionById(id);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    logger.error("Error fetching session:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 }
    );
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

    const body = await request.json();
    const { enrollmentIds, subjectId, weekday, startTime, endTime, room } = body;

    if (
      !enrollmentIds ||
      !subjectId ||
      weekday === undefined ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { success: false, error: "Required fields are missing" },
        { status: 400 }
      );
    }

    const updatedSession = await getSessionService().updateSession(id, {
      enrollmentIds,
      subjectId,
      weekday,
      startsAt: startTime,
      endsAt: endTime,
      room,
    });

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: "Session updated successfully",
    });
  } catch (error) {
    logger.error("Error updating session:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
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

    await getSessionService().deleteSession(id);
    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting session:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}

