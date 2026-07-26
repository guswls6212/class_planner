import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/permissions";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AppError, toErrorResponse } from "@/lib/errors";
import { ErrorCodes } from "@/lib/errors/codes";
import { logger } from "@/lib/logger";
import { requireSessionUser } from "@/lib/auth/apiAuth";

/**
 * POST /api/teachers/owner-link?userId=<owner-user-id>
 *
 * Body:
 *   { displayName: string, color: string, subjectIds: string[] }
 *
 * 원장(owner)이 본인을 강사로 등록 + 담당 과목 설정하는 통합 endpoint.
 *
 * - existing teacher (academy_id + user_id 일치) 있으면 → teacher_subjects reset
 * - 없으면 → teachers INSERT + teacher_subjects INSERT (user_id = owner)
 *
 * 이 endpoint 의 의도:
 *  - rank 5-A teacher-owner-overlap A2 의 owner card 의 "과목 변경" first-time setup
 *  - 사용자는 owner card 안 modal 만 보고 → 백그라운드에서 teacher row + linked 자동
 *  - 같은 사람 2 개 등록 회피 (linked_user_id reverse 활용)
 *
 * 권한: requireRole(userId, ["owner"]) — owner 만 본인 강사 등록 가능.
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireSessionUser(request, searchParams.get("userId"));
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const body = (await request.json()) as {
      displayName?: string;
      color?: string;
      subjectIds?: string[];
    };
    const displayName = body.displayName?.trim();
    const color = body.color?.trim();
    const subjectIds = Array.isArray(body.subjectIds) ? body.subjectIds : [];

    if (!displayName) {
      throw new AppError(ErrorCodes.TEACHER_NAME_REQUIRED, { statusHint: 400 });
    }
    if (!color) {
      return NextResponse.json(
        { success: false, error: "Color is required" },
        { status: 400 },
      );
    }

    const { academyId } = await requireRole(userId, ["owner"]);

    const client = getServiceRoleClient();

    const { data: existing, error: existingErr } = await client
      .from("teachers")
      .select("id")
      .eq("academy_id", academyId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle();

    if (existingErr) throw existingErr;

    let teacherId: string;
    if (existing) {
      teacherId = existing.id as string;
      logger.info("owner-link: existing teacher found", { teacherId, academyId, userId });
    } else {
      const { data: inserted, error: insertErr } = await client
        .from("teachers")
        .insert({
          academy_id: academyId,
          user_id: userId,
          name: displayName,
          color,
          role: "owner",
        })
        .select("id")
        .single();
      if (insertErr || !inserted) {
        throw insertErr ?? new Error("Failed to insert owner teacher");
      }
      teacherId = inserted.id as string;
      logger.info("owner-link: new teacher inserted", { teacherId, academyId, userId });
    }

    // subject_ids reset — m:n teacher_subjects (DELETE all + INSERT new)
    const { error: delErr } = await client
      .from("teacher_subjects")
      .delete()
      .eq("teacher_id", teacherId);
    if (delErr) throw delErr;

    if (subjectIds.length > 0) {
      const rows = subjectIds.map((subjectId) => ({
        teacher_id: teacherId,
        subject_id: subjectId,
        academy_id: academyId,
      }));
      const { error: subErr } = await client.from("teacher_subjects").insert(rows);
      if (subErr) throw subErr;
    }

    const { data: teacher, error: fetchErr } = await client
      .from("teachers")
      .select("id, name, color, user_id, academy_id, email, phone, role, notes, created_at, updated_at")
      .eq("id", teacherId)
      .single();
    if (fetchErr || !teacher) {
      throw fetchErr ?? new Error("Failed to fetch teacher after upsert");
    }

    return NextResponse.json({
      success: true,
      data: { ...teacher, subjectIds },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "POST, OPTIONS" },
  });
}
