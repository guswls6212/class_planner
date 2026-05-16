import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import {
  validateSessionMemoFields,
  validateWeekday,
} from "@/lib/validation/profileSchemas";
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
    const {
      id, // ← Local-first: client가 생성한 UUID를 서버에서 그대로 사용 (없으면 server-generated)
      subjectId,
      startsAt,
      endsAt,
      enrollmentIds,
      weekday,
      weekStartDate,
      teacherId,
      public_description,
      internal_note,
      yPosition, // ← lane 위치 (1-based). 누락 시 default 1.
      // 사용자 보고 (2026-05-16): 멀티선택 복사 후 새로고침 시 모든 lane=1 stack —
      // POST 가 yPosition 무시하여 DB default 만 저장한 회귀. addSession 경로에 전파.
    } = body;
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

    // 빈 배열 거부: enrollmentIds=[] 로 들어오면 sessions row만 만들어지고
    // session_enrollments는 비어버려 useDisplaySessions가 영원히 필터링하는
    // dangling state가 됨 (2026-05-12 테스트학원 사고).
    if (enrollmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "enrollmentIds must be non-empty" },
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

    // Phase 6: server-side validation — weekday range + memo 길이
    const wd = validateWeekday(Number(weekday));
    if (!wd.ok) throw new AppError(wd.code, { statusHint: 400 });
    const memo = validateSessionMemoFields({
      publicDescription: public_description,
      internalNote: internal_note,
    });
    if (!memo.ok) throw new AppError(memo.code, { statusHint: 400 });

    const { academyId, role } = await requireRole(userId, ["owner", "admin", "member"]);

    // public_description은 owner/admin만 편집 가능
    if (role === "member" && public_description != null) {
      return NextResponse.json(
        { success: false, error: "Forbidden: only owner/admin may set public_description" },
        { status: 403 }
      );
    }

    const newSession = await getSessionService().addSession(
      {
        ...(id && typeof id === "string" && { id }),
        subjectId,
        startsAt,
        endsAt,
        enrollmentIds,
        weekday: Number(weekday),
        weekStartDate,
        ...(teacherId !== undefined && { teacherId: teacherId ?? null }),
        ...(public_description !== undefined && { public_description }),
        ...(internal_note !== undefined && { internal_note }),
        ...(typeof yPosition === "number" && Number.isFinite(yPosition) && { yPosition }),
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
    const { id, subjectId, startsAt, endsAt, enrollmentIds, weekday, teacherId, public_description, internal_note, yPosition } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

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

    if (enrollmentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "enrollmentIds must be non-empty" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Phase 6: server-side validation — weekday range + memo 길이
    const wd = validateWeekday(Number(weekday));
    if (!wd.ok) throw new AppError(wd.code, { statusHint: 400 });
    const memo = validateSessionMemoFields({
      publicDescription: public_description,
      internalNote: internal_note,
    });
    if (!memo.ok) throw new AppError(memo.code, { statusHint: 400 });

    const { academyId, role } = await requireRole(userId, ["owner", "admin", "member"]);

    // public_description은 owner/admin만 편집 가능
    if (role === "member" && public_description != null) {
      return NextResponse.json(
        { success: false, error: "Forbidden: only owner/admin may set public_description" },
        { status: 403 }
      );
    }

    const updatedSession = await getSessionService().updateSession(id, {
      subjectId,
      startsAt,
      endsAt,
      enrollmentIds,
      weekday: Number(weekday),
      ...(teacherId !== undefined && { teacherId: teacherId ?? null }),
      ...(public_description !== undefined && { public_description }),
      ...(internal_note !== undefined && { internal_note }),
      // yPosition 전달 — PUT (full update) 도 lane 위치 변경 가능 (modal 편집 등).
      // /position 엔드포인트는 drag 전용 — 일반 PUT 은 위치 안 건드리면 그대로 유지.
      ...(typeof yPosition === "number" && Number.isFinite(yPosition) && { yPosition }),
    }, academyId);
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
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
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
    await getSessionService().deleteSession(id, academyId);
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
