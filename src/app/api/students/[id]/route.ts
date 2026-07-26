import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import { validateStudentInput } from "@/lib/validation/profileSchemas";
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/apiAuth";

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
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

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
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    // Phase 4: 학생 프로필 전체 필드 검증 — UAT 2026-05-09 S-2.4 fix. 이전엔 name만
    // 받아 gender/birthDate/grade/school/phone 모두 drop. 이제 모든 필드 검증 후 저장.
    const v = validateStudentInput(body);
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });
    const safe = v.data;

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    const updatedStudent = await getStudentService().updateStudent(
      id,
      {
        name: safe.name!,
        gender: safe.gender,
        birthDate: safe.birthDate,
        grade: safe.grade,
        school: safe.school,
        phone: safe.phone,
      },
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
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
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
