/**
 * POST /api/onboarding
 *
 * 신규 사용자 첫 로그인 시 academy + academy_member를 생성한다.
 * 멱등성 보장: 이미 academy가 있으면 생성 없이 기존 academyId를 반환한다.
 * 두 경우 모두 onboarded 쿠키를 설정한다.
 */

import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";

export async function POST(request: NextRequest) {
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

    // 1. 이미 academy_member가 있는지 확인 (멱등성)
    const { data: existing } = await client
      .from("academy_members")
      .select("academy_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (existing?.academy_id) {
      logger.debug("온보딩 - 기존 academy 확인", {
        userId,
        academyId: existing.academy_id,
      });
      const response = NextResponse.json({
        success: true,
        academyId: existing.academy_id,
        isNew: false,
      });
      response.headers.set("set-cookie", ONBOARDED_COOKIE);
      return response;
    }

    // 2. 요청 본문에서 academyName, role 추출
    const body = await request.json().catch(() => ({}));
    const { academyName, role } = body as { academyName?: string; role?: string };

    if (!academyName || academyName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "학원명은 2글자 이상 입력해주세요." },
        { status: 400 }
      );
    }

    const validRoles = ["owner", "admin", "member"];
    const selectedRole = validRoles.includes(role ?? "") ? role! : "owner";

    // 3. academy INSERT
    const { data: academy, error: academyError } = await client
      .from("academies")
      .insert({
        name: academyName.trim(),
        created_by: userId,
      })
      .select("id")
      .single();

    if (academyError || !academy) {
      logger.error("온보딩 - academy 생성 실패", { userId }, academyError as Error);
      return NextResponse.json(
        { success: false, error: "학원 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    // 4. academy_members INSERT
    const { error: memberError } = await client
      .from("academy_members")
      .insert({
        academy_id: academy.id,
        user_id: userId,
        role: selectedRole,
        invited_by: null,
      });

    if (memberError) {
      logger.error(
        "온보딩 - academy_member 생성 실패",
        { userId, academyId: academy.id },
        memberError as Error
      );
      return NextResponse.json(
        { success: false, error: "학원 멤버 등록에 실패했습니다." },
        { status: 500 }
      );
    }

    logger.info("온보딩 완료 - 신규 academy 생성", {
      userId,
      academyId: academy.id,
      academyName: academyName.trim(),
    });

    const response = NextResponse.json(
      {
        success: true,
        academyId: academy.id,
        isNew: true,
      },
      { status: 201 }
    );
    response.headers.set("set-cookie", ONBOARDED_COOKIE);
    return response;
  } catch (error) {
    logger.error("온보딩 처리 중 오류", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "온보딩 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
