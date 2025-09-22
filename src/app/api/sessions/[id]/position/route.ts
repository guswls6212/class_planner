import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
// import { trackDatabaseError } from "@/lib/errorTracker";
import { NextRequest, NextResponse } from "next/server";

// Create a function to get the session service (for testing purposes)
export function getSessionService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createSessionService();
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
    const { weekday, time, endTime, yPosition } = body;

    if (!weekday || !time || !endTime) {
      return NextResponse.json(
        { success: false, error: "Weekday, time, and endTime are required" },
        { status: 400 }
      );
    }

    // 세션 위치 업데이트 (시간 변경 포함)
    const updatedSession = await getSessionService().updateSessionPosition(id, {
      weekday,
      startsAt: time,
      endsAt: endTime,
      yPosition: yPosition || 0,
    });

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: "Session position updated successfully",
    });
  } catch (error) {
    logger.error("Error updating session position:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update session position" },
      { status: 500 }
    );
  }
}

