import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { inviteToken } = body as { inviteToken?: string };

    if (!inviteToken) {
      return NextResponse.json(
        { success: false, error: "inviteToken required" },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    const { data: invite, error: inviteError } = await client
      .from("invite_tokens")
      .select("id, teacher_id, academy_id, used_by, expires_at, teachers(name)")
      .eq("token", inviteToken)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 초대입니다." },
        { status: 404 }
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "만료된 초대입니다." },
        { status: 410 }
      );
    }

    if (!invite.teacher_id) {
      return NextResponse.json(
        {
          success: false,
          error: "강사 역할 초대에만 시간표 공유 링크를 발급할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    const teacherName =
      (invite.teachers as unknown as { name: string } | null)?.name ?? "강사";

    const expiresAt = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: shareToken, error: shareError } = await client
      .from("share_tokens")
      .insert({
        academy_id: invite.academy_id,
        teacher_id: invite.teacher_id,
        label: `${teacherName} 시간표 공유`,
        expires_at: expiresAt,
        created_by: null,
        watermark_meta: {
          teacherName,
          issuedAt: new Date().toISOString(),
          source: "invite_declined_share",
        },
      })
      .select("id, token")
      .single();

    if (shareError || !shareToken) {
      logger.error(
        "share_token 생성 실패 (from-invite)",
        { inviteToken },
        shareError as Error
      );
      return NextResponse.json(
        { success: false, error: "share_token 생성에 실패했습니다." },
        { status: 500 }
      );
    }

    // Fire-and-forget audit log
    client
      .from("audit_log")
      .insert({
        academy_id: invite.academy_id,
        actor_id: null,
        action: "share_link.created_via_invite_decline",
        target_type: "share_token",
        target_id: shareToken.id,
        before: null,
        after: { teacherName, inviteId: invite.id },
      })
      .then(({ error: auditError }: { error: Error | null }) => {
        if (auditError)
          logger.error("audit_log insert failed", {}, auditError as Error);
      });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://class-planner.info365.studio";
    const shareUrl = `${appUrl}/share/${shareToken.token}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      token: shareToken.token,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
