import { ServiceFactory } from "@/application/services/ServiceFactory";
import { toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireRole, requireOwnTeacher, pickAllowedFields } from "@/lib/auth/permissions";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
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
    let body = await request.json();
    const { name, color, userId: bodyUserId, email, phone, role, notes } = body;
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

    const { role: memberRole, academyId } = await resolveAcademyMembership(userId);

    if (memberRole === "member") {
      // Member can only update their own teacher's private contact fields
      await requireOwnTeacher(userId, id);
      body = pickAllowedFields(body, ["email", "phone", "notes"]);
      if (Object.keys(body).length === 0) {
        return NextResponse.json({ error: "FORBIDDEN: no allowed fields" }, { status: 403 });
      }
    } else if (!["owner", "admin"].includes(memberRole)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const updated = await getTeacherService().updateTeacher(
      id,
      memberRole === "member"
        ? {
            email: "email" in body ? (body.email ?? null) : undefined,
            phone: "phone" in body ? (body.phone ?? null) : undefined,
            notes: "notes" in body ? (body.notes ?? null) : undefined,
          }
        : {
            name,
            color,
            userId: "userId" in body ? bodyUserId : undefined,
            email: "email" in body ? (email ?? null) : undefined,
            phone: "phone" in body ? (phone ?? null) : undefined,
            role: "role" in body ? (role ?? null) : undefined,
            notes: "notes" in body ? (notes ?? null) : undefined,
          },
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    await getTeacherService().deleteTeacher(id, academyId);
    return NextResponse.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
