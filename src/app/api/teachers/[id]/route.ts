import { ServiceFactory } from "@/application/services/ServiceFactory";
import { toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireRole, requireOwnTeacher, pickAllowedFields } from "@/lib/auth/permissions";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { NextRequest, NextResponse } from "next/server";

// Fields any owner/admin can update
const PUBLIC_FIELDS = ["name", "color"] as const;
// Fields owner/admin can always update; member can update only on their own teacher
const PRIVATE_FIELDS = ["email", "phone", "notes"] as const;
// All allowed fields combined (used to filter unknown/readonly fields)
const ALL_ALLOWED_FIELDS = [...PUBLIC_FIELDS, ...PRIVATE_FIELDS] as const;
type AllowedField = (typeof ALL_ALLOWED_FIELDS)[number];

function getTeacherService() {
  return ServiceFactory.createTeacherService();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    const client = getServiceRoleClient();

    // Fetch current teacher row to verify existence and ownership
    const { data: teacher, error: fetchError } = await client
      .from("teachers")
      .select("id, name, color, email, phone, notes, user_id, academy_id")
      .eq("id", id)
      .eq("academy_id", academyId)
      .single();

    if (fetchError || !teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    // Filter to only fields that exist in the allowed set
    const requestedFields = Object.keys(body).filter((k): k is AllowedField =>
      (ALL_ALLOWED_FIELDS as readonly string[]).includes(k)
    );

    if (requestedFields.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields provided" },
        { status: 400 }
      );
    }

    // Field-level permission check for members
    if (role === "member") {
      const hasPublicFields = requestedFields.some((f) =>
        (PUBLIC_FIELDS as readonly string[]).includes(f)
      );

      if (hasPublicFields) {
        return NextResponse.json(
          { success: false, error: "Forbidden: members cannot update name or color" },
          { status: 403 }
        );
      }

      // Private fields allowed only for own teacher
      if (teacher.user_id !== userId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: members can only update their own teacher profile" },
          { status: 403 }
        );
      }
    }

    // Build updates object with only the requested allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of requestedFields) {
      updates[field] = body[field];
    }

    // Build before snapshot (only changed fields)
    const before: Record<string, unknown> = {};
    for (const field of requestedFields) {
      before[field] = (teacher as Record<string, unknown>)[field] ?? null;
    }

    // Execute update
    const { data: updated, error: updateError } = await client
      .from("teachers")
      .update(updates)
      .eq("id", id)
      .eq("academy_id", academyId)
      .select()
      .single();

    if (updateError || !updated) {
      logger.error("PATCH /api/teachers/[id] update failed", { id, userId }, updateError as Error);
      return NextResponse.json(
        { success: false, error: "Failed to update teacher" },
        { status: 500 }
      );
    }

    // Write audit log entry (fire-and-forget — do not block response on failure)
    client
      .from("audit_log")
      .insert({
        academy_id: academyId,
        actor_id: userId,
        action: "teacher.updated",
        target_type: "teacher",
        target_id: id,
        before,
        after: updates,
      })
      .then(({ error: auditError }) => {
        if (auditError) {
          logger.error("audit_log insert failed", { id, userId }, auditError as Error);
        }
      });

    logger.info("PATCH /api/teachers/[id]", { id, userId, fields: requestedFields });

    return NextResponse.json({ success: true, teacher: updated });
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
    let body = await request.json();
    const { name, color, userId: bodyUserId, email, phone, role: bodyRole, notes } = body;
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

    const membership = await resolveAcademyMembership(userId);
    const { academyId } = membership;

    const VALID_ROLES = ["owner", "admin", "member"] as const;
    const role = membership.role as (typeof VALID_ROLES)[number] | string;
    if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (role === "member") {
      // Member can only update their own teacher's private contact fields
      await requireOwnTeacher(userId, id);
      body = pickAllowedFields(body, ["email", "phone", "notes"]);
      if (Object.keys(body).length === 0) {
        return NextResponse.json({ error: "FORBIDDEN: no editable fields" }, { status: 403 });
      }
    }
    // owner/admin: body unchanged

    const updated = await getTeacherService().updateTeacher(
      id,
      role === "member"
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
            role: "role" in body ? (bodyRole ?? null) : undefined,
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
