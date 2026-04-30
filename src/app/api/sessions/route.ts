import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { NextRequest, NextResponse } from "next/server";

export function getSessionService() {
  return ServiceFactory.createSessionService();
}

export async function GET(request: NextRequest) {
  try {
    // corsMiddleware는 POST/PUT/DELETE에만 적용 — GET은 same-origin 브라우저 요청이
    // Origin 헤더를 보내지 않으므로 403이 발생함 (students/enrollments와 동일 패턴)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const weekStartDate = searchParams.get("weekStartDate");
    const academyId = await resolveAcademyId(userId);
    const sessions = await getSessionService().getAllSessions(academyId, {
      weekStartDate: weekStartDate ?? undefined,
    });
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { subjectId, startsAt, endsAt, enrollmentIds, weekday, weekStartDate } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

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

    if (!weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartDate)) {
      return NextResponse.json(
        { success: false, error: "weekStartDate (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const academyId = await resolveAcademyId(userId);
    const newSession = await getSessionService().addSession(
      {
        subjectId,
        startsAt,
        endsAt,
        enrollmentIds,
        weekday: Number(weekday),
        weekStartDate,
      },
      academyId
    );
    return NextResponse.json(
      { success: true, data: newSession },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
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
      startsAt,
      endsAt,
      enrollmentIds,
      weekday: Number(weekday),
    });
    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
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
    return toErrorResponse(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
