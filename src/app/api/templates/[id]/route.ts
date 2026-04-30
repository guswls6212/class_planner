import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "권한 없음" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, template_data } = body;

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("templates")
      .update({ name, description, template_data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("academy_id", academyId)
      .select("*")
      .single();

    if (error) {
      logger.error("템플릿 수정 실패", { userId, id }, error as Error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    logger.info("템플릿 수정", { id, userId, academyId });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "템플릿 삭제 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const { error } = await client
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("academy_id", academyId);

    if (error) {
      logger.error("템플릿 삭제 실패", { id, userId }, error as Error);
      return NextResponse.json({ success: false, error: "템플릿 삭제에 실패했습니다." }, { status: 500 });
    }

    logger.info("템플릿 삭제", { id, userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
