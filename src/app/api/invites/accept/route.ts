import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
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

    // 1. Look up token + join academy name
    const { data: inviteData, error: tokenError } = await client
      .from("invite_tokens")
      .select("id, academy_id, role, expires_at, used_by, created_by, teacher_id, email, academies(name)")
      .eq("token", token)
      .single();

    if (tokenError || !inviteData) {
      return toErrorResponse(new AppError("VALIDATION_FAILED", { statusHint: 404 }));
    }

    if (inviteData.used_by) {
      return toErrorResponse(new AppError("INVITE_TOKEN_USED", { statusHint: 410 }));
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      return toErrorResponse(new AppError("INVITE_TOKEN_EXPIRED", { statusHint: 410 }));
    }

    // Email matching validation (M4)
    const inviteEmail = (inviteData as unknown as { email: string | null }).email;
    if (inviteEmail) {
      const { data: authData } = await client.auth.admin.getUserById(userId);
      const userEmail = authData.user?.email;

      if (!userEmail || userEmail !== inviteEmail) {
        return NextResponse.json(
          {
            success: false,
            error: "이 초대는 다른 이메일 주소 용입니다.",
            error_code: "email_mismatch",
          },
          { status: 403 }
        );
      }
    }

    // 2. Idempotency check — already a member?
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

    // 3. Insert academy_members row
    const { error: insertError } = await client
      .from("academy_members")
      .insert({
        academy_id: inviteData.academy_id,
        user_id: userId,
        role: inviteData.role,
        invited_by: inviteData.created_by,
      });

    if (insertError) {
      logger.error("Member insert failed", { userId, academyId: inviteData.academy_id }, insertError as Error);
      return toErrorResponse(new AppError("INVITE_MEMBER_INSERT_FAILED", { statusHint: 500 }));
    }

    // 4. Link teacher record (only when teacher_id is set on the invite)
    const teacherId = (inviteData as unknown as { teacher_id: string | null }).teacher_id;
    if (teacherId) {
      const { error: linkError } = await client
        .from("teachers")
        .update({ user_id: userId })
        .eq("id", teacherId)
        .is("user_id", null); // only link if currently unlinked
      if (linkError) {
        // UNIQUE INDEX violation = already linked by race condition.
        // Mark token as consumed even on link failure — prevents orphaned reusable token.
        await client
          .from("invite_tokens")
          .update({ used_by: userId, used_at: new Date().toISOString() })
          .eq("id", inviteData.id);
        return NextResponse.json({ success: false, error: "TEACHER_ALREADY_LINKED" }, { status: 409 });
      }
    }

    // 5. Mark token as consumed
    await client
      .from("invite_tokens")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteData.id);

    logger.info("Invite accepted", {
      userId,
      academyId: inviteData.academy_id,
      role: inviteData.role,
      teacherId,
    });

    const response = NextResponse.json({
      success: true,
      academyId: inviteData.academy_id,
      academyName: (inviteData.academies as unknown as { name: string } | null)?.name ?? "",
    });
    response.headers.set("set-cookie", ONBOARDED_COOKIE);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
