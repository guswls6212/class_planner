import { ServiceFactory } from "@/application/services/ServiceFactory";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import { validateSubjectInput } from "@/lib/validation/profileSchemas";
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
    const { id, color } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!color) {
      return NextResponse.json(
        { success: false, error: "Color is required" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Phase 4: server-side validation (UI/sync 우회 방지)
    const v = validateSubjectInput(body);
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    // Local-first: client UUID 수용. 응답 data.id가 보낸 id와 다르면 클라가 reconcile.
    const newSubject = await getSubjectService().addSubject(
      {
        ...(id && typeof id === "string" && { id }),
        name: v.data.name!,
        color,
      },
      academyId
    );
    // status 200: idempotent
    return NextResponse.json({ success: true, data: newSubject });
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
    const { id, color } = body;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id || !color) {
      return NextResponse.json(
        { success: false, error: "ID and color are required" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const v = validateSubjectInput(body);
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    const updatedSubject = await getSubjectService().updateSubject(
      id,
      { name: v.data.name!, color },
      academyId
    );
    return NextResponse.json({ success: true, data: updatedSubject });
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    await getSubjectService().deleteSubject(id, academyId);
    return NextResponse.json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}
