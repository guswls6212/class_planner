import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

// 강사 보관/복구 토글 (PR 6 Phase 1 — design-exploration teacher-replace-ux Variant C).
// body { archived: true | false } — true 면 archived_at = NOW(), false 면 NULL 로 복원.
// 별도 endpoint 분리 이유: 기존 PATCH 의 다중 field/검증/validation 흐름과 분리해서 단순화.

export async function POST(
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

    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "강사 보관 권한이 없습니다." }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { archived?: unknown };
    if (typeof body.archived !== "boolean") {
      return NextResponse.json(
        { success: false, error: "body.archived 는 boolean 이어야 합니다." },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    const { data: existing, error: fetchError } = await client
      .from("teachers")
      .select("id, name, academy_id, archived_at")
      .eq("id", id)
      .eq("academy_id", academyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: "강사를 찾을 수 없습니다." }, { status: 404 });
    }

    const newArchivedAt = body.archived ? new Date().toISOString() : null;

    const { data, error: updateError } = await client
      .from("teachers")
      .update({ archived_at: newArchivedAt })
      .eq("id", id)
      .eq("academy_id", academyId)
      .select("id, name, archived_at")
      .single();

    if (updateError || !data) {
      logger.error("강사 보관 토글 실패", { id, userId, archived: body.archived }, updateError as Error);
      return NextResponse.json(
        { success: false, error: "강사 보관 처리에 실패했습니다." },
        { status: 500 }
      );
    }

    logger.info("강사 보관 토글", {
      id,
      userId,
      academyId,
      archived: body.archived,
      previous: existing.archived_at,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
