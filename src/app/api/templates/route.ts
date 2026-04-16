import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("templates")
      .select("id, name, description, template_data, created_by, created_at, updated_at")
      .eq("academy_id", academyId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("템플릿 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "목록 조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "템플릿 생성 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, description, templateData } = body as {
      name?: string;
      description?: string;
      templateData?: unknown;
    };

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
    }

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("templates")
      .insert({
        academy_id: academyId,
        name: name.trim(),
        description: description ?? null,
        template_data: templateData ?? { version: "1.0", sessions: [] },
        created_by: userId,
      })
      .select("id, name, description, template_data, created_by, created_at, updated_at")
      .single();

    if (error || !data) {
      logger.error("템플릿 생성 실패", { userId, academyId }, error as Error);
      return NextResponse.json({ success: false, error: "템플릿 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("템플릿 생성", { userId, academyId, templateId: data.id });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
