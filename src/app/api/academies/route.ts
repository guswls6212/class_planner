import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { AppError, toErrorResponse } from "@/lib/errors";
import { validateAcademyName } from "@/lib/validation/profileSchemas";
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

    // Phase 4: server-side validation (UI/sync 우회 방지)
    const v = validateAcademyName(name ?? "");
    if (!v.ok) throw new AppError(v.code, { statusHint: 400 });

    const client = getServiceRoleClient();
    const { error } = await client
      .from("academies")
      .update({ name: v.value })
      .eq("id", academyId);

    if (error) throw error;

    logger.info("학원 이름 변경", { userId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
