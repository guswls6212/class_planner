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
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (data?.academy_id) {
      const response = NextResponse.json({
        success: true,
        hasAcademy: true,
        academyId: data.academy_id,
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
