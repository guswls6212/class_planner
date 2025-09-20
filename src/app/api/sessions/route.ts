import { ServiceFactory } from "@/application/services/ServiceFactory";
import { logger } from "@/lib/logger";
import { trackDatabaseError } from "@/lib/errorTracker";
import { NextRequest, NextResponse } from "next/server";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";

// Create a function to get the session service (for testing purposes)
export function getSessionService() {
  // 새로운 ServiceFactory 사용 (RepositoryRegistry 자동 초기화됨)
  return ServiceFactory.createSessionService();
}

export async function GET(request: NextRequest) {
  try {
// CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const sessions = await getSessionService().getAllSessions();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    logger.error("Error fetching sessions:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
// CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { subjectId, startsAt, endsAt, enrollmentIds, weekday } = body;

    if (
      !subjectId ||
      !startsAt ||
      !endsAt ||
      !Array.isArray(enrollmentIds) ||
      weekday === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for session" },
        { status: 400 }
      );
    }

    const newSession = await getSessionService().addSession({
      subjectId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      enrollmentIds,
      weekday: Number(weekday),
    });
    return NextResponse.json(
      { success: true, data: newSession },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error adding session:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to add session" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
// CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { id, subjectId, startsAt, endsAt, enrollmentIds, weekday } = body;

    if (
      !id ||
      !subjectId ||
      !startsAt ||
      !endsAt ||
      !Array.isArray(enrollmentIds) ||
      weekday === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for session" },
        { status: 400 }
      );
    }

    const updatedSession = await getSessionService().updateSession(id, {
      subjectId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      enrollmentIds,
      weekday: Number(weekday),
    });
    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    logger.error("Error updating session:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
// CORS 검증
    const corsResponse = corsMiddleware(request);
    if (corsResponse.status !== 200) {
      return corsResponse;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}