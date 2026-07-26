import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/apiAuth";

export function getEnrollmentService() {
  return ServiceFactory.createEnrollmentService();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    const academyId = await resolveAcademyId(userId);
    const studentId = searchParams.get("studentId");

    // studentId 필터 옵션 — 1 학생 enrollments만 (N+M 부담 회피).
    // 옵션 없으면 기존 getAllEnrollments (회귀 0).
    if (studentId) {
      const filtered = await getEnrollmentService().getEnrollmentsByStudent(
        studentId,
        academyId,
      );
      return NextResponse.json({ success: true, data: filtered });
    }

    const enrollments = await getEnrollmentService().getAllEnrollments(academyId);
    return NextResponse.json({ success: true, data: enrollments });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, studentId, subjectId } = body;
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (!studentId || !subjectId) {
      return NextResponse.json(
        { success: false, error: "studentId and subjectId are required" },
        { status: 400 }
      );
    }

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    // Local-first: client UUID 수용. session_enrollments FK 매칭 위해 필수.
    const newEnrollment = await getEnrollmentService().addEnrollment(
      {
        ...(id && typeof id === "string" && { id }),
        studentId,
        subjectId,
      },
      academyId
    );
    // status 200: idempotent — repo가 새로 만들었든 기존 row를 반환했든 동일 처리.
    // 클라이언트는 응답 data.id가 보낸 id와 다르면 localStorage를 reconcile.
    return NextResponse.json({ success: true, data: newEnrollment });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Enrollment ID is required" },
        { status: 400 }
      );
    }

    // userId는 권한 확인용 (requireRole로 academy 검증 + role 체크)
    await requireRole(userId, ["owner", "admin"]);
    await getEnrollmentService().deleteEnrollment(id);
    return NextResponse.json({
      success: true,
      message: "Enrollment deleted successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
