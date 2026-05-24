import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CATEGORIES = ["bug", "feature", "difficulty", "general"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];
const MAX_BODY_LENGTH = 4000;

function isCategory(value: unknown): value is Category {
  return (
    typeof value === "string" &&
    (ALLOWED_CATEGORIES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 },
      );
    }

    // 학원 멤버 (owner/admin/member) 만 작성. share-token viewer 차단.
    // resolveAcademyMembership 가 academy 없는 user 에 throw 또는 role: null 반환.
    let academyId: string;
    let role: string;
    try {
      const membership = await resolveAcademyMembership(userId);
      academyId = membership.academyId;
      role = membership.role;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_REQUIRES_ACADEMY: 학원 멤버만 피드백 작성 가능합니다.",
        },
        { status: 403 },
      );
    }

    if (!role || !["owner", "admin", "member"].includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_REQUIRES_MEMBER: 학원 멤버만 피드백 작성 가능합니다.",
        },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const body = typeof raw.body === "string" ? raw.body.trim() : "";
    const category: Category = isCategory(raw.category) ? raw.category : "general";
    const url = typeof raw.url === "string" ? raw.url.slice(0, 500) : null;
    const userAgent =
      typeof raw.userAgent === "string" ? raw.userAgent.slice(0, 500) : null;

    if (body.length === 0) {
      return NextResponse.json(
        { success: false, error: "FEEDBACK_BODY_REQUIRED: 내용을 입력해주세요." },
        { status: 400 },
      );
    }
    if (body.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `FEEDBACK_BODY_TOO_LONG: 최대 ${MAX_BODY_LENGTH}자까지 작성 가능합니다.`,
        },
        { status: 400 },
      );
    }

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("feedback")
      .insert({
        academy_id: academyId,
        user_id: userId,
        category,
        body,
        url,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();

    if (error) {
      logger.error(
        "피드백 저장 실패",
        { userId, academyId, category },
        error as Error,
      );
      return NextResponse.json(
        {
          success: false,
          error: "FEEDBACK_INSERT_FAILED: 피드백 저장에 실패했습니다.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: data.id, createdAt: data.created_at },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
