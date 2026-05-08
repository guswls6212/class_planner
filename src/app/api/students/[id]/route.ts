import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export function getStudentService() {
  return ServiceFactory.createStudentService();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
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
    const student = await getStudentService().getStudentById(id, academyId);

    if (!student) {
      return NextResponse.json(
        { success: false, error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: student });
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
        { success: false, error: "Student ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    // 학생 프로필 전체 필드 — UAT 2026-05-09 S-2.4 fix. 이전엔 name만 받아
    // gender/birthDate/grade/school/phone 모두 drop → 새로고침 시 server fetch가
    // 빈 값으로 덮어써 사용자 입력이 사라지는 결함.
    const { name, gender, birthDate, grade, school, phone } = body;
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    const updatedStudent = await getStudentService().updateStudent(
      id,
      { name, gender, birthDate, grade, school, phone },
      academyId
    );

    return NextResponse.json({
      success: true,
      data: updatedStudent,
      message: "Student updated successfully",
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
    const { searchParams } = new URL(request.url);
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    await getStudentService().deleteStudent(id, academyId);
    return NextResponse.json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
