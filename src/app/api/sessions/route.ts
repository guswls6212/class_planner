import { SessionApplicationServiceImpl } from "@/application/services/SessionApplicationService";
import { createSessionRepository } from "@/infrastructure/RepositoryFactory";
import { NextRequest, NextResponse } from "next/server";

const sessionService = new SessionApplicationServiceImpl(
  createSessionRepository()
);

export async function GET(request: NextRequest) {
  try {
    const sessions = await sessionService.getAllSessions();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjectId, startsAt, endsAt, enrollmentIds } = body;

    if (!subjectId || !startsAt || !endsAt || !Array.isArray(enrollmentIds)) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for session" },
        { status: 400 }
      );
    }

    const newSession = await sessionService.addSession({
      subjectId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      enrollmentIds,
    });
    return NextResponse.json(
      { success: true, data: newSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add session" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, subjectId, startsAt, endsAt, enrollmentIds } = body;

    if (
      !id ||
      !subjectId ||
      !startsAt ||
      !endsAt ||
      !Array.isArray(enrollmentIds)
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields for session" },
        { status: 400 }
      );
    }

    const updatedSession = await sessionService.updateSession(id, {
      subjectId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      enrollmentIds,
    });
    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    await sessionService.deleteSession(id);
    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
