import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "학원 이름을 입력해주세요." }, { status: 400 });
    }

    const client = getServiceRoleClient();
    const { error } = await client
      .from("academies")
      .update({ name: name.trim() })
      .eq("id", academyId);

    if (error) throw error;

    logger.info("학원 이름 변경", { userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
