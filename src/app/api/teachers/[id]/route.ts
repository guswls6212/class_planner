import { ServiceFactory } from "@/application/services/ServiceFactory";
import { toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { NextRequest, NextResponse } from "next/server";

function getTeacherService() {
  return ServiceFactory.createTeacherService();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, userId: bodyUserId } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    logger.debug("API PUT /api/teachers/[id]", { id, userId });

    const academyId = await resolveAcademyId(userId);
    const updated = await getTeacherService().updateTeacher(
      id,
      { name, color, userId: "userId" in body ? bodyUserId : undefined },
      academyId
    );
    return NextResponse.json({ success: true, data: updated });
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Teacher ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    logger.debug("API DELETE /api/teachers/[id]", { id, userId });

    const academyId = await resolveAcademyId(userId);
    await getTeacherService().deleteTeacher(id, academyId);
    return NextResponse.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
