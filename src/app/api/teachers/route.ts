import { ServiceFactory } from "@/application/services/ServiceFactory";
import { toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { NextRequest, NextResponse } from "next/server";

export function getTeacherService() {
  return ServiceFactory.createTeacherService();
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

    logger.debug("API GET /api/teachers", { userId });

    const academyId = await resolveAcademyId(userId);
    const teachers = await getTeacherService().getAllTeachers(academyId);
    return NextResponse.json({ success: true, data: teachers });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, userId: bodyUserId } = body;
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
    const newTeacher = await getTeacherService().addTeacher(
      { name, color, userId: bodyUserId ?? null },
      academyId
    );
    return NextResponse.json({ success: true, data: newTeacher }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "GET, POST, OPTIONS" },
  });
}
