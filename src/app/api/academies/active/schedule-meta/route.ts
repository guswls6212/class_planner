import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";
import { requireSessionUser } from "@/lib/auth/apiAuth";

/**
 * 활성 academy의 schedule meta 조회 (schedule 페이지 헤더 갱신 시각 표시용).
 * 가벼운 응답 — polling 30s 호출 부담 최소화.
 *
 * 응답:
 *   { academyId, academyName, scheduleUpdatedAt, memberJoinedAt }
 *
 * scheduleUpdatedAt은 sessions 테이블 INSERT/UPDATE/DELETE 시 trigger로 자동 bump.
 * 따라서 이 값이 멈춰 있으면 서버에 데이터가 도달하지 않았다는 강한 신호.
 *
 * memberJoinedAt 은 academy_members.joined_at — 사용자가 이 academy 에 합류한 시점.
 * useScheduleMeta 가 schedule_updated_at <= memberJoinedAt 면 자동 ack 처리 (가입 이전
 * 변동은 알릴 가치 없음, 사용자 보고 2026-05-23 박관리자 케이스).
 *
 * Query:
 *   - userId (required)
 *   - academyId (optional) — 명시 시 그 academy 만 조회 (multi-academy 정확성). 미명시
 *     시 resolveAcademyId(userId) backward-compat (legacy single-academy 경로).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const auth = await requireSessionUser(request, searchParams.get("userId"));
  if (!auth.ok) return auth.response;
  const userId = auth.userId;
  const requestedAcademyId = searchParams.get("academyId");
  try {
    const academyId = requestedAcademyId ?? (await resolveAcademyId(userId));
    const client = getServiceRoleClient();

    // academy 정보 + 사용자의 이 academy 합류 시각을 한 번에 조회.
    // academy_members 행 없으면 memberJoinedAt = null (사용자가 그 academy 의 멤버 아님 —
    // 본 endpoint 는 schedule_updated_at 표시용이라 RLS 강제하지 않음; 안전하게 null 반환).
    const [academyResult, memberResult] = await Promise.all([
      client
        .from("academies")
        .select("id, name, schedule_updated_at")
        .eq("id", academyId)
        .single(),
      client
        .from("academy_members")
        .select("joined_at")
        .eq("academy_id", academyId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const { data, error } = academyResult;
    if (error || !data) {
      return NextResponse.json({ error: "academy not found" }, { status: 404 });
    }

    return NextResponse.json({
      academyId: data.id,
      academyName: data.name,
      scheduleUpdatedAt: data.schedule_updated_at,
      memberJoinedAt: memberResult.data?.joined_at ?? null,
    });
  } catch (err) {
    logger.error("schedule-meta 조회 실패", { userId, requestedAcademyId }, err as Error);
    return NextResponse.json(
      { error: "no academy mapping" },
      { status: 404 },
    );
  }
}
