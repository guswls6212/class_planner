import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export function getStudentService() {
  return ServiceFactory.createStudentService();
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

    logger.debug("API GET /api/students", { userId });

    const academyId = await resolveAcademyId(userId);
    const students = await getStudentService().getAllStudents(academyId);
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gender, birthDate } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
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
    const newStudent = await getStudentService().addStudent({ name, gender, birthDate }, academyId);
    return NextResponse.json(
      { success: true, data: newStudent },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, gender, birthDate } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: "ID and name are required" },
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
    const updatedStudent = await getStudentService().updateStudent(
      id,
      { name, gender, birthDate },
      academyId
    );
    return NextResponse.json({ success: true, data: updatedStudent });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
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
    await getStudentService().deleteStudent(id, academyId);
    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
