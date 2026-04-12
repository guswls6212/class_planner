import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";
import { corsMiddleware, handleCorsOptions } from "@/middleware/cors";
import { NextRequest, NextResponse } from "next/server";

export function getSubjectService() {
  return ServiceFactory.createSubjectService();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    logger.debug("API GET /api/subjects", { userId });

    const academyId = await resolveAcademyId(userId);
    const subjects = await getSubjectService().getAllSubjects(academyId);
    return NextResponse.json({ success: true, data: subjects });
  } catch (error) {
    logger.error("Error fetching subjects:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { name, color } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!name || !color) {
      return NextResponse.json(
        { success: false, error: "Name and color are required" },
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
    const newSubject = await getSubjectService().addSubject(
      { name, color },
      academyId
    );
    return NextResponse.json(
      { success: true, data: newSubject },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error adding subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to add subject" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const corsResponse = corsMiddleware(request);
    if (corsResponse !== null && corsResponse.status !== 200) {
      return corsResponse;
    }

    const body = await request.json();
    const { id, name, color } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id || !name || !color) {
      return NextResponse.json(
        { success: false, error: "ID, name and color are required" },
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
    const updatedSubject = await getSubjectService().updateSubject(
      id,
      { name, color },
      academyId
    );
    return NextResponse.json({ success: true, data: updatedSubject });
  } catch (error) {
    logger.error("Error updating subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to update subject" },
      { status: 500 }
    );
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
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subject ID is required" },
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
    await getSubjectService().deleteSubject(id, academyId);
    return NextResponse.json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting subject:", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subject" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
