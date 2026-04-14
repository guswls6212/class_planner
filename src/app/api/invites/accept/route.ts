import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json({ success: false, error: "token is required" }, { status: 400 });
    }

    const client = getServiceRoleClient();

    // 1. 토큰 조회 + 학원명 join
    const { data: inviteData, error: tokenError } = await client
      .from("invite_tokens")
      .select("id, academy_id, role, expires_at, used_by, created_by, academies(name)")
      .eq("token", token)
      .single();

    if (tokenError || !inviteData) {
      return NextResponse.json({ success: false, error: "유효하지 않은 초대 링크입니다." }, { status: 404 });
    }

    if (inviteData.used_by) {
      return NextResponse.json({ success: false, error: "이미 사용된 초대 링크입니다." }, { status: 410 });
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "만료된 초대 링크입니다." }, { status: 410 });
    }

    // 2. 이미 멤버인지 확인 (멱등)
    const { data: existingMember } = await client
      .from("academy_members")
      .select("academy_id, role")
      .eq("user_id", userId)
      .eq("academy_id", inviteData.academy_id)
      .single();

    if (existingMember) {
      const response = NextResponse.json({
        success: true,
        academyId: inviteData.academy_id,
        alreadyMember: true,
      });
      response.headers.set("set-cookie", ONBOARDED_COOKIE);
      return response;
    }

    // 3. academy_members INSERT
    const { error: insertError } = await client
      .from("academy_members")
      .insert({
        academy_id: inviteData.academy_id,
        user_id: userId,
        role: inviteData.role,
        invited_by: inviteData.created_by,
      });

    if (insertError) {
      logger.error("멤버 가입 실패", { userId, academyId: inviteData.academy_id }, insertError as Error);
      return NextResponse.json({ success: false, error: "멤버 등록에 실패했습니다." }, { status: 500 });
    }

    // 4. 토큰 사용 처리
    await client
      .from("invite_tokens")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteData.id);

    logger.info("초대 수락 완료", {
      userId,
      academyId: inviteData.academy_id,
      role: inviteData.role,
    });

    const response = NextResponse.json({
      success: true,
      academyId: inviteData.academy_id,
      academyName: (inviteData.academies as unknown as { name: string } | null)?.name ?? "",
    });
    response.headers.set("set-cookie", ONBOARDED_COOKIE);
    return response;
  } catch (error) {
    logger.error("POST /api/invites/accept 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
