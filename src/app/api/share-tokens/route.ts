import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
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
    const { data, error } = await client
      .from("share_tokens")
      .select("id, token, label, filter_student_id, expires_at, created_at, revoked_at")
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
    const { label, filterStudentId, expiresInDays } = body as {
      label?: string;
      filterStudentId?: string;
      expiresInDays?: number;
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays ?? 30));

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("share_tokens")
      .insert({
        academy_id: academyId,
        label: label ?? null,
        filter_student_id: filterStudentId ?? null,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
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
