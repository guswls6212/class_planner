import { getTeacherService } from "@/lib/server/teacherServiceFactory";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { toErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { requireRole } from "@/lib/auth/permissions";
import { isPaginatedRequest, parsePaginationParams } from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

export type TeacherStatus = "active" | "invite_pending" | "invite_expired" | "share_only" | "none";

export interface TeacherWithStatus {
  id: string;
  name: string;
  color: string;
  email: string | null;
  phone: string | null;
  userId: string | null;
  status: TeacherStatus;
  inviteExpiresAt?: string | null;
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

    const unlinkedOnly = searchParams.get("unlinked") === "true";
    const paginationOpts = parsePaginationParams(searchParams);

    const academyId = await resolveAcademyId(userId);

    if (isPaginatedRequest(paginationOpts)) {
      // Paginated mode — invite token status enrich는 skip (page-by-page라 부담).
      // client UI에서 status 필요한 경우 별도 endpoint 호출 또는 미래 enrich 옵션 추가.
      const result = await getTeacherService().getAllTeachersPaginated(
        academyId,
        paginationOpts,
      );
      return NextResponse.json({
        success: true,
        data: result.items,
        nextCursor: result.nextCursor,
      });
    }

    const teachers = await getTeacherService().getAllTeachers(academyId);

    if (unlinkedOnly) {
      const result = teachers.filter((t) => t.userId === null);
      return NextResponse.json({ success: true, data: result });
    }

    // Fetch invite token status for each teacher
    const client = getServiceRoleClient();
    const now = new Date().toISOString();

    const [pendingResult, expiredResult] = await Promise.all([
      client
        .from("invite_tokens")
        .select("teacher_id, expires_at")
        .eq("academy_id", academyId)
        .is("used_by", null)
        .gt("expires_at", now),
      client
        .from("invite_tokens")
        .select("teacher_id")
        .eq("academy_id", academyId)
        .is("used_by", null)
        .lte("expires_at", now),
    ]);

    if (pendingResult.error) {
      logger.error("Failed to fetch pending invites for status join", {}, pendingResult.error as Error);
    }
    if (expiredResult.error) {
      logger.error("Failed to fetch expired invites for status join", {}, expiredResult.error as Error);
    }

    const pendingMap = new Map<string, string>();
    for (const row of pendingResult.data ?? []) {
      if (row.teacher_id) {
        pendingMap.set(row.teacher_id, row.expires_at as string);
      }
    }

    const expiredSet = new Set<string>();
    for (const row of expiredResult.data ?? []) {
      if (row.teacher_id) {
        expiredSet.add(row.teacher_id);
      }
    }

    // share_tokens with teacher_id — enables share_only status (Phase 5)
    const { data: shareLinks, error: shareError } = await client
      .from("share_tokens")
      .select("teacher_id")
      .eq("academy_id", academyId)
      .is("revoked_at", null)
      .gt("expires_at", now)
      .not("teacher_id", "is", null);

    if (shareError) {
      logger.error("share_tokens 조회 실패 for status join", {}, shareError as Error);
    }

    const shareTeacherIds = new Set(
      (shareLinks ?? [])
        .map((s) => (s.teacher_id ? String(s.teacher_id) : null))
        .filter((id): id is string => id !== null)
    );

    const result = teachers.map((t) => {
      let status: TeacherStatus;
      let inviteExpiresAt: string | undefined;
      const dto = t.toJSON();
      const teacherIdStr = dto.id;

      if (dto.userId !== null) {
        status = "active";
      } else if (pendingMap.has(teacherIdStr)) {
        status = "invite_pending";
        inviteExpiresAt = pendingMap.get(teacherIdStr);
      } else if (expiredSet.has(teacherIdStr)) {
        status = "invite_expired";
      } else if (shareTeacherIds.has(teacherIdStr)) {
        status = "share_only";
      } else {
        status = "none";
      }

      const base = { ...dto, status };
      if (inviteExpiresAt !== undefined) {
        return { ...base, inviteExpiresAt };
      }
      return base;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, color, userId: bodyUserId, email, phone, role, notes } = body;
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

    const { academyId } = await requireRole(userId, ["owner", "admin"]);
    // Local-first: client UUID 수용. 응답 data.id가 보낸 id와 다르면 클라가 reconcile.
    const newTeacher = await getTeacherService().addTeacher(
      {
        ...(id && typeof id === "string" && { id }),
        name,
        color,
        userId: bodyUserId ?? null,
        email: email ?? null,
        phone: phone ?? null,
        role: role ?? null,
        notes: notes ?? null,
      },
      academyId
    );
    // status 200: idempotent
    return NextResponse.json({ success: true, data: newTeacher });
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
