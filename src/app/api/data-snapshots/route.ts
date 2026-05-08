import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

type SnapshotType = "auto_template" | "before_conflict" | "manual";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

// Retention 정책 — 쓰기 시 atomic enforce (cron 불필요)
const AUTO_TEMPLATE_MAX_COUNT = 10;
const AUTO_TEMPLATE_RETENTION_DAYS = 30;
const MANUAL_MAX_COUNT = 5; // 프리미엄 슬롯 (현재 무료=0)

interface JsonBag {
  students?: unknown[];
  subjects?: unknown[];
  sessions?: unknown[];
  enrollments?: unknown[];
  teachers?: unknown[];
}

function countsFromPayload(
  payload: JsonBag | { local?: JsonBag; server?: JsonBag },
): {
  students: number;
  subjects: number;
  sessions: number;
  enrollments: number;
  teachers: number;
} {
  // before_conflict 백업은 { local, server } 형태 — 양쪽 합 또는 server만? UI 표시용은 server 우선
  const bag: JsonBag =
    "students" in payload
      ? (payload as JsonBag)
      : ((payload as { server?: JsonBag }).server ?? {});
  return {
    students: bag.students?.length ?? 0,
    subjects: bag.subjects?.length ?? 0,
    sessions: bag.sessions?.length ?? 0,
    enrollments: bag.enrollments?.length ?? 0,
    teachers: bag.teachers?.length ?? 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      throw new AppError("VALIDATION_FAILED", { statusHint: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("data_snapshots")
      .select("id, academy_id, snapshot_type, data_payload, created_by, created_at, restored_from_id, description")
      .eq("academy_id", academyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("data_snapshots 조회 실패", { userId }, error as Error);
      throw new AppError("SNAPSHOT_LIST_FAILED", {
        statusHint: 500,
        cause: error,
      });
    }

    // dataPayload 미리 stripping + counts 미리 계산 (대역폭 절약)
    const meta = (data ?? []).map((row) => ({
      id: row.id,
      academyId: row.academy_id,
      snapshotType: row.snapshot_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      restoredFromId: row.restored_from_id,
      description: row.description,
      counts: countsFromPayload(row.data_payload as JsonBag),
    }));

    return NextResponse.json({ success: true, data: meta });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      throw new AppError("VALIDATION_FAILED", { statusHint: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);
    if (!canManage(role)) {
      throw new AppError("SNAPSHOT_PERMISSION_DENIED", { statusHint: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      type?: SnapshotType;
      payload?: unknown;
      description?: string | null;
    };
    const { type, payload, description } = body;

    if (!type || !["auto_template", "before_conflict", "manual"].includes(type)) {
      throw new AppError("SNAPSHOT_TYPE_INVALID", { statusHint: 400 });
    }
    if (!payload) {
      throw new AppError("SNAPSHOT_PAYLOAD_REQUIRED", { statusHint: 400 });
    }

    const client = getServiceRoleClient();

    // 1) INSERT
    const { data: inserted, error: insertError } = await client
      .from("data_snapshots")
      .insert({
        academy_id: academyId,
        snapshot_type: type,
        data_payload: payload,
        created_by: userId,
        description: description ?? null,
      })
      .select("id, academy_id, snapshot_type, created_by, created_at, restored_from_id, description")
      .single();

    if (insertError || !inserted) {
      logger.error("data_snapshot insert 실패", { userId, type }, insertError as Error);
      throw new AppError("SNAPSHOT_INSERT_FAILED", {
        statusHint: 500,
        cause: insertError ?? new Error("Insert returned null"),
      });
    }

    // 2) Retention atomic enforce (type별 정책)
    if (type === "auto_template") {
      // 30일 이전 auto_template 삭제
      const cutoff = new Date(Date.now() - AUTO_TEMPLATE_RETENTION_DAYS * 24 * 3600_000).toISOString();
      await client
        .from("data_snapshots")
        .delete()
        .eq("academy_id", academyId)
        .eq("snapshot_type", "auto_template")
        .lt("created_at", cutoff);

      // 11번째 들어왔으면 가장 오래된 auto_template 1개 삭제
      const { data: autos } = await client
        .from("data_snapshots")
        .select("id, created_at")
        .eq("academy_id", academyId)
        .eq("snapshot_type", "auto_template")
        .order("created_at", { ascending: true });
      if (autos && autos.length > AUTO_TEMPLATE_MAX_COUNT) {
        const toDelete = autos.slice(0, autos.length - AUTO_TEMPLATE_MAX_COUNT).map((s) => s.id);
        await client.from("data_snapshots").delete().in("id", toDelete);
      }
    } else if (type === "manual") {
      // 5개 초과 시 가장 오래된 것 삭제 (FIFO)
      const { data: manuals } = await client
        .from("data_snapshots")
        .select("id, created_at")
        .eq("academy_id", academyId)
        .eq("snapshot_type", "manual")
        .order("created_at", { ascending: true });
      if (manuals && manuals.length > MANUAL_MAX_COUNT) {
        const toDelete = manuals.slice(0, manuals.length - MANUAL_MAX_COUNT).map((s) => s.id);
        await client.from("data_snapshots").delete().in("id", toDelete);
      }
    }
    // before_conflict — 무제한, retention 없음

    return NextResponse.json({
      success: true,
      data: {
        id: inserted.id,
        academyId: inserted.academy_id,
        snapshotType: inserted.snapshot_type,
        createdBy: inserted.created_by,
        createdAt: inserted.created_at,
        description: inserted.description,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
