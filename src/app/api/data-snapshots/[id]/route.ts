import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

/** 단일 snapshot 메타 + dataPayload 조회 (미리보기 / 디버깅용 — 일반적으로
 *  list는 GET / 복원은 [id]/restore POST). */
export async function GET(
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

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("data_snapshots")
      .select("*")
      .eq("id", id)
      .eq("academy_id", academyId)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "snapshot not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        academyId: data.academy_id,
        snapshotType: data.snapshot_type,
        dataPayload: data.data_payload,
        createdBy: data.created_by,
        createdAt: data.created_at,
        restoredFromId: data.restored_from_id,
        description: data.description,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** 사용자 수동 삭제 — 본인 academy의 snapshot만 (academy_id double-check). */
export async function DELETE(
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
      return NextResponse.json({ success: false, error: "백업 삭제 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const { error } = await client
      .from("data_snapshots")
      .delete()
      .eq("id", id)
      .eq("academy_id", academyId);

    if (error) {
      logger.error("data_snapshot delete 실패", { id, userId }, error as Error);
      return NextResponse.json({ success: false, error: "삭제 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
