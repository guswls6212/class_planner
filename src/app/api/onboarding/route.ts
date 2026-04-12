/**
 * POST /api/onboarding
 *
 * 신규 사용자 첫 로그인 시 academy + academy_member(owner)를 자동 생성한다.
 * 멱등성 보장: 이미 academy가 있으면 생성 없이 기존 academyId를 반환한다.
 */

import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

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
      return NextResponse.json({
        success: true,
        academyId: existing.academy_id,
        isNew: false,
      });
    }

    // 2. 사용자 메타데이터로 학원명 생성
    const { data: userRecord, error: userError } =
      await client.auth.admin.getUserById(userId);

    if (userError || !userRecord?.user) {
      logger.error("온보딩 - 사용자 조회 실패", { userId }, userError as Error);
      return NextResponse.json(
        { success: false, error: "사용자 정보를 조회할 수 없습니다." },
        { status: 500 }
      );
    }

    const { user } = userRecord;
    const displayName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "사용자";
    const academyName = `${displayName}의 학원`;

    // 3. academy INSERT
    const { data: academy, error: academyError } = await client
      .from("academies")
      .insert({
        name: academyName,
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

    // 4. academy_members INSERT (owner)
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
      academyName,
    });

    return NextResponse.json(
      {
        success: true,
        academyId: academy.id,
        isNew: true,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("온보딩 처리 중 오류", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "온보딩 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
