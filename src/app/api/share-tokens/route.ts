import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import {
  validateShareTokenLabel,
  validateExpiresInDays,
} from "@/lib/validation/profileSchemas";
import {
  PAGINATION_DEFAULT_LIMIT,
  decodeCursor,
  encodeCursor,
  isPaginatedRequest,
  parsePaginationParams,
} from "@/lib/pagination";
import { NextRequest, NextResponse } from "next/server";

function canManageShareTokens(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageShareTokens(role)) {
      return NextResponse.json({ success: false, error: "공유 링크 관리 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const paginationOpts = parsePaginationParams(searchParams);

    if (isPaginatedRequest(paginationOpts)) {
      // Paginated mode — cursor (created_at + id tie-break) + limit + q (label search)
      let query = client
        .from("share_tokens")
        .select("id, token, label, filter_student_id, expires_at, created_at, revoked_at, access_code")
        .eq("academy_id", academyId)
        .is("revoked_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (paginationOpts.q) {
        query = query.ilike("label", `%${paginationOpts.q}%`);
      }
      if (paginationOpts.cursor) {
        const decoded = decodeCursor(paginationOpts.cursor);
        if (decoded) {
          query = query.or(
            `created_at.gt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.gt.${decoded.id})`,
          );
        }
      }
      const limit = paginationOpts.limit ?? PAGINATION_DEFAULT_LIMIT;
      query = query.limit(limit + 1);

      const { data, error } = await query;
      if (error) {
        logger.error("공유 링크 페이징 조회 실패", { userId }, error as Error);
        return NextResponse.json({ success: false, error: "목록 조회에 실패했습니다." }, { status: 500 });
      }

      const rows = data ?? [];
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      let nextCursor: string | null = null;
      if (hasMore && items.length > 0) {
        const last = items[items.length - 1];
        nextCursor = encodeCursor({
          createdAt: last.created_at as string,
          id: last.id as string,
        });
      }
      return NextResponse.json({ success: true, data: items, nextCursor });
    }

    // 기존 흐름 (회귀 0) — 옵션 없으면 모두 반환
    const { data, error } = await client
      .from("share_tokens")
      .select("id, token, label, filter_student_id, expires_at, created_at, revoked_at, access_code")
      .eq("academy_id", academyId)
      .is("revoked_at", null);

    if (error) {
      logger.error("공유 링크 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "목록 조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageShareTokens(role)) {
      return NextResponse.json({ success: false, error: "공유 링크 생성 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { label, filterStudentId, expiresInDays, teacherId } = body as {
      label?: string;
      filterStudentId?: string;
      expiresInDays?: number;
      teacherId?: string;
    };

    // Phase 6: server-side validation — label 길이 + expiresInDays 범위
    const lv = validateShareTokenLabel(label);
    if (!lv.ok) throw new AppError(lv.code, { statusHint: 400 });
    const days = expiresInDays ?? 30;
    const ev = validateExpiresInDays(days);
    if (!ev.ok) throw new AppError(ev.code, { statusHint: 400 });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("share_tokens")
      .insert({
        academy_id: academyId,
        label: label ?? null,
        filter_student_id: filterStudentId ?? null,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
        teacher_id: teacherId ?? null,
        watermark_meta: teacherId
          ? { issuedAt: new Date().toISOString(), source: "teacher_add_modal" }
          : null,
      })
      .select("id, token, label, filter_student_id, expires_at, created_at")
      .single();

    if (error || !data) {
      logger.error("공유 토큰 생성 실패", { userId, academyId }, error as Error);
      return NextResponse.json({ success: false, error: "공유 링크 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("공유 토큰 생성", { userId, academyId });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
