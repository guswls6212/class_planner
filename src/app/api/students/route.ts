import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { isPaginatedRequest, parsePaginationParams } from "@/lib/pagination";
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
    const paginationOpts = parsePaginationParams(searchParams);

    if (isPaginatedRequest(paginationOpts)) {
      const result = await getStudentService().getAllStudentsPaginated(
        academyId,
        paginationOpts,
      );
      return NextResponse.json({
        success: true,
        data: result.items,
        nextCursor: result.nextCursor,
      });
    }

    // 기존 흐름 (회귀 0) — 옵션 없으면 모두 반환
    const students = await getStudentService().getAllStudents(academyId);
    return NextResponse.json({ success: true, data: students });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, gender, birthDate } = body;
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
    // Local-first: client UUID 수용. server는 받은 id를 INSERT에 사용 → 후속 PUT
    // 시 id 매칭 보장. 응답 data.id가 보낸 id와 다르면 클라가 reconcile.
    const newStudent = await getStudentService().addStudent(
      {
        ...(id && typeof id === "string" && { id }),
        name,
        gender,
        birthDate,
      },
      academyId
    );
    // status 200: idempotent — repo가 새로 만들었든 기존 row를 반환했든 동일 처리.
    return NextResponse.json({ success: true, data: newStudent });
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
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
