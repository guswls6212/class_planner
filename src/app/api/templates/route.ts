import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

// T2 (ADR-008): free tier 의 academy 당 슬롯 quota.
// 슬롯 3-N 은 "추후 업데이트 예정" disabled UI 로 client 에서 차단되지만, server quota
// 도 강제 (직접 API 호출 또는 client 우회 방어).
const FREE_TIER_SLOT_QUOTA = 2;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("templates")
      .select("id, name, description, template_data, slot_index, created_by, created_at, updated_at")
      .eq("academy_id", academyId)
      .order("slot_index", { ascending: true });

    if (error) {
      logger.error("템플릿 목록 조회 실패", { userId }, error as Error);
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

    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "템플릿 생성 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, templateData } = body as {
      name?: string;
      description?: string;
      templateData?: unknown;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
    }

    const client = getServiceRoleClient();

    // T2: quota check + first-empty slot_index 자동 결정.
    // 기존 templates 조회 → count >= 2 시 TEMPLATES_QUOTA_EXCEEDED reject.
    // 그 외 사용 중인 slot_index 외 first-empty (0, 1 중) 자동 부여.
    const { data: existing, error: existingError } = await client
      .from("templates")
      .select("slot_index")
      .eq("academy_id", academyId);

    if (existingError) {
      logger.error("템플릿 quota 조회 실패", { userId, academyId }, existingError as Error);
      return NextResponse.json({ success: false, error: "템플릿 생성에 실패했습니다." }, { status: 500 });
    }

    const usedSlots = new Set((existing ?? []).map((r) => r.slot_index));
    if (usedSlots.size >= FREE_TIER_SLOT_QUOTA) {
      return NextResponse.json(
        {
          success: false,
          error: "TEMPLATES_QUOTA_EXCEEDED",
          message: `프리 티어는 academy 당 최대 ${FREE_TIER_SLOT_QUOTA}개 템플릿까지 사용할 수 있습니다. (추후 업데이트 예정)`,
        },
        { status: 403 },
      );
    }

    const slotIndex = usedSlots.has(0) ? 1 : 0;

    const { data, error } = await client
      .from("templates")
      .insert({
        academy_id: academyId,
        name: name.trim(),
        description: description ?? null,
        template_data: templateData ?? { version: "1.0", sessions: [] },
        slot_index: slotIndex,
        created_by: userId,
      })
      .select("id, name, description, template_data, slot_index, created_by, created_at, updated_at")
      .single();

    if (error || !data) {
      logger.error("템플릿 생성 실패", { userId, academyId, slotIndex }, error as Error);
      return NextResponse.json({ success: false, error: "템플릿 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("템플릿 생성", { userId, academyId, templateId: data.id, slotIndex });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
