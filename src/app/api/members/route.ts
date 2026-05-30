import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
  }

  let academyId: string;
  try {
    ({ academyId } = await resolveAcademyMembership(userId));
  } catch (error) {
    // No academy_members row — user has not completed onboarding yet
    logger.warn("Member lookup: user has no academy", { userId });
    return NextResponse.json({ success: true, data: [], hasAcademy: false });
  }

  try {
    const client = getServiceRoleClient();

    // Fetch academy name + slug (displayed on the settings page)
    const { data: academyRow, error: academyError } = await client
      .from("academies")
      .select("name, slug")
      .eq("id", academyId)
      .single();

    let academyName: string;
    let academySlug: string | null;

    if (academyError) {
      // slug 컬럼이 없거나 쿼리 실패 시 name만 단독 조회로 fallback
      logger.warn("Academy name+slug query failed, falling back to name only", { academyId, error: academyError.message });
      const { data: nameOnly } = await client
        .from("academies")
        .select("name")
        .eq("id", academyId)
        .single();
      academyName = nameOnly?.name ?? "";
      academySlug = null;
    } else {
      academyName = academyRow?.name ?? "";
      academySlug = (academyRow as { name: string; slug?: string | null } | null)?.slug ?? null;
    }

    // Fetch academy_members only (auth.users join not supported via PostgREST)
    const { data: rows, error } = await client
      .from("academy_members")
      .select("user_id, role, joined_at")
      .eq("academy_id", academyId)
      .order("joined_at");

    if (error) {
      logger.error("Member list query failed", { userId }, error as Error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch member list." },
        { status: 500 }
      );
    }

    const memberRows = rows ?? [];

    // Batch-fetch linked teacher records for all member user IDs
    const memberUserIds = memberRows.map((r) => r.user_id);
    let teachersByUserId: Record<string, { id: string; name: string; color: string }> = {};
    if (memberUserIds.length > 0) {
      const { data: teacherRows } = await client
        .from("teachers")
        .select("id, name, color, user_id")
        .eq("academy_id", academyId)
        .in("user_id", memberUserIds);
      for (const t of teacherRows ?? []) {
        if (t.user_id) {
          teachersByUserId[t.user_id] = { id: t.id, name: t.name, color: t.color };
        }
      }
    }

    // listUsers 1회 + in-memory Map join — getUserById N+1 RTT 제거.
    // perPage 1000은 supabase admin API max — 일반 서비스 user 수 안전 cover.
    // 1000 초과 시 paging 필요 (학원 운영 시스템에서 매우 드문 케이스, 별도 follow-up).
    const usersById = new Map<string, { email: string | null; name: string | null }>();
    try {
      const { data: listed } = await client.auth.admin.listUsers({ perPage: 1000 });
      for (const u of listed?.users ?? []) {
        usersById.set(u.id, {
          email: u.email ?? null,
          name: (u.user_metadata?.full_name as string | undefined) ?? null,
        });
      }
    } catch (err) {
      logger.warn("api/members - auth.admin.listUsers 실패, member email/name 누락", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const members = memberRows.map((row) => {
      const linkedTeacher = teachersByUserId[row.user_id] ?? null;
      const user = usersById.get(row.user_id);
      return {
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        email: user?.email ?? null,
        name: user?.name ?? null,
        linkedTeacherId: linkedTeacher?.id ?? null,
        linkedTeacherName: linkedTeacher?.name ?? null,
        linkedTeacherColor: linkedTeacher?.color ?? null,
      };
    });

    return NextResponse.json({ success: true, data: members, hasAcademy: true, academyName, academyId, academySlug });
  } catch (error) {
    return toErrorResponse(error);
  }
}
