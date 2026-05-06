import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Snapshot 복원 — 본인 academy의 snapshot dataPayload 반환.
 * 클라이언트가 받아서 setClassPlannerData로 localStorage에 적용.
 *
 * Server side data(students/subjects/sessions 등 entity)는 직접 갱신하지
 * 않음 — 다음 사용자 mutation 시 syncXxxUpdate가 자연 sync. (단순화)
 *
 * (Phase 2B 또는 후속 PR에서 server-side full restore 옵션 검토 — 필요 시
 *  fullDataMigration 패턴 재활용)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);
    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "복원 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("data_snapshots")
      .select("id, snapshot_type, data_payload, created_at, description")
      .eq("id", id)
      .eq("academy_id", academyId)
      .single();

    if (error || !data) {
      logger.warn("restore: snapshot not found", { id, userId });
      return NextResponse.json({ success: false, error: "snapshot을 찾을 수 없습니다." }, { status: 404 });
    }

    logger.info("data_snapshot 복원 — payload 응답", {
      snapshotId: data.id,
      snapshotType: data.snapshot_type,
      createdAt: data.created_at,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        snapshotType: data.snapshot_type,
        dataPayload: data.data_payload,
        createdAt: data.created_at,
        description: data.description,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
