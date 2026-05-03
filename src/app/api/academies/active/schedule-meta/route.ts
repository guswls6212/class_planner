import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyId } from "@/lib/resolveAcademyId";
import { logger } from "@/lib/logger";

/**
 * 활성 academy의 schedule meta 조회 (schedule 페이지 헤더 갱신 시각 표시용).
 * 가벼운 응답 — polling 30s 호출 부담 최소화.
 *
 * 응답:
 *   { academyId, academyName, scheduleUpdatedAt }
 *
 * scheduleUpdatedAt은 sessions 테이블 INSERT/UPDATE/DELETE 시 trigger로 자동 bump.
 * 따라서 이 값이 멈춰 있으면 서버에 데이터가 도달하지 않았다는 강한 신호.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const academyId = await resolveAcademyId(userId);
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("academies")
      .select("id, name, schedule_updated_at")
      .eq("id", academyId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "academy not found" }, { status: 404 });
    }

    return NextResponse.json({
      academyId: data.id,
      academyName: data.name,
      scheduleUpdatedAt: data.schedule_updated_at,
    });
  } catch (err) {
    logger.error("schedule-meta 조회 실패", { userId }, err as Error);
    return NextResponse.json(
      { error: "no academy mapping" },
      { status: 404 },
    );
  }
}
