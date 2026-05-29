import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();
    const { data } = await client
      .from("academy_members")
      .select("academy_id")
      .eq("user_id", userId);

    // 전체 멤버십 academy_id 목록 (멀티-academy). 클라이언트(useGlobalDataInitialization)가
    // stale active_academy 를 이 목록과 대조해 conflict 체크 전에 reconcile → 삭제/탈퇴된
    // 학원의 localStorage 를 잘못 읽어 데이터가 다른 학원에 부활하는 사고를 차단한다.
    const academyIds = (data ?? [])
      .map((r: { academy_id: string | null }) => r.academy_id)
      .filter((id): id is string => Boolean(id));

    if (academyIds.length > 0) {
      const response = NextResponse.json({
        success: true,
        hasAcademy: true,
        academyId: academyIds[0], // backward compat — 기존 단일 필드 소비처 유지
        academyIds,
      });
      response.headers.set("set-cookie", ONBOARDED_COOKIE);
      return response;
    }

    return NextResponse.json({ success: true, hasAcademy: false });
  } catch (error) {
    logger.error("온보딩 상태 확인 오류", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "상태 확인 실패" },
      { status: 500 }
    );
  }
}
