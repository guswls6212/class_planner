import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import { validateAcademyName } from "@/lib/validation/profileSchemas";
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/apiAuth";

/**
 * POST /api/academies?userId=X
 * body: { name: string }
 *
 * 추가 학원 생성 (본인 owner 학원 2번째 이상). 첫 학원은 /api/onboarding 이 담당.
 *
 * ADR-023 (2026-05-24): 본인 학원 무제한 + 초대 무제한. ADR-019 의 1+1 supersede.
 * Premium 가치는 학원 수 limit 이 아닌 + feature (분점 통합 대시보드 등) 으로 차별화.
 *
 * owner role 강제 (ADR-019 정책 1 — 여전히 유효). active_academy 전환은 client 책임.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const body = await request.json().catch(() => ({}));
    const { name } = body as { name?: string };

    const v = validateAcademyName(name ?? "");
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });

    const client = getServiceRoleClient();

    const { data: academy, error: academyError } = await client
      .from("academies")
      .insert({ name: v.value, created_by: userId })
      .select("id, name")
      .single();

    if (academyError || !academy) {
      logger.error("학원 생성 실패", { userId }, academyError as Error);
      return toErrorResponse(new AppError("INTERNAL_ERROR", { statusHint: 500 }));
    }

    const { error: memberError } = await client
      .from("academy_members")
      .insert({
        academy_id: academy.id,
        user_id: userId,
        role: "owner",
        invited_by: null,
      });

    if (memberError) {
      logger.error(
        "학원 생성 후 owner 멤버 추가 실패 — 유령 학원 cleanup",
        { userId, academyId: academy.id },
        memberError as Error,
      );
      await client.from("academies").delete().eq("id", academy.id);
      return toErrorResponse(new AppError("INTERNAL_ERROR", { statusHint: 500 }));
    }

    logger.info("신규 학원 생성 (다중 학원 ADR-023)", {
      userId,
      academyId: academy.id,
      academyName: v.value,
    });

    return NextResponse.json(
      { success: true, academy: { id: academy.id, name: academy.name } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const { academyId, role } = await resolveAcademyMembership(userId);
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body as { name?: string };

    // Phase 4: server-side validation (UI/sync 우회 방지)
    const v = validateAcademyName(name ?? "");
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });

    const client = getServiceRoleClient();
    const { error } = await client
      .from("academies")
      .update({ name: v.value })
      .eq("id", academyId);

    if (error) throw error;

    logger.info("학원 이름 변경", { userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
