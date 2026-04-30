import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // IP별 분당 30회 제한 (DDoS 방어)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(`share:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 }
    );
  }

  try {
    const client = getServiceRoleClient();

    // 1. Validate token
    const { data: tokenRow, error: tokenError } = await client
      .from("share_tokens")
      .select("id, token, academy_id, label, filter_student_id, expires_at, revoked_at, last_viewed_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return NextResponse.json({ success: false, error: "링크를 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date();
    if (new Date(tokenRow.expires_at) < now) {
      return NextResponse.json({ success: false, error: "만료된 링크입니다." }, { status: 410 });
    }
    if (tokenRow.revoked_at && new Date(tokenRow.revoked_at) < now) {
      return NextResponse.json({ success: false, error: "취소된 링크입니다." }, { status: 410 });
    }

    const academyId: string = tokenRow.academy_id;

    // 2. Fetch academy name + change tracking timestamp
    const { data: academyRow } = await client
      .from("academies")
      .select("name, schedule_updated_at")
      .eq("id", academyId)
      .single();

    // 3. Fetch schedule data
    // enrollments 테이블에는 academy_id가 없으므로 students → enrollments 순으로 조회
    const [sessionsRes, studentsRes, subjectsRes, teachersRes] = await Promise.all([
      client.from("sessions").select("*").eq("academy_id", academyId),
      client.from("students").select("*").eq("academy_id", academyId),
      client.from("subjects").select("*").eq("academy_id", academyId),
      client.from("teachers").select("*").eq("academy_id", academyId),
    ]);

    const studentIds = (studentsRes.data ?? []).map((s: { id: string }) => s.id);
    const enrollmentsRes = studentIds.length > 0
      ? await client.from("enrollments").select("*").in("student_id", studentIds)
      : { data: [] };

    // 4. Apply student filter if set
    let sessions = sessionsRes.data ?? [];
    let students = studentsRes.data ?? [];
    const filterStudentId: string | null = tokenRow.filter_student_id;

    if (filterStudentId) {
      const enrollmentsForStudent = (enrollmentsRes.data ?? []).filter(
        (e: { student_id: string }) => e.student_id === filterStudentId
      );
      const enrollmentIds = new Set(enrollmentsForStudent.map((e: { id: string }) => e.id));
      sessions = sessions.filter((s: { enrollment_ids?: string[] }) =>
        (s.enrollment_ids ?? []).some((eid: string) => enrollmentIds.has(eid))
      );
      students = students.filter((st: { id: string }) => st.id === filterStudentId);
    }

    // 5. Determine change badge data before updating last_viewed_at
    const previousLastViewedAt: string | null = tokenRow.last_viewed_at ?? null;
    const scheduleUpdatedAt: string = academyRow?.schedule_updated_at ?? new Date().toISOString();
    const hasChanges: boolean =
      previousLastViewedAt !== null &&
      new Date(scheduleUpdatedAt) > new Date(previousLastViewedAt);

    // 6. Update last_viewed_at to now (sequential to ensure consistency)
    await client
      .from("share_tokens")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    logger.info("공유 링크 데이터 조회", { token: token.slice(0, 8) + "...", academyId, hasChanges });

    return NextResponse.json({
      success: true,
      data: {
        academyName: academyRow?.name ?? "학원",
        label: tokenRow.label,
        sessions,
        students,
        subjects: subjectsRes.data ?? [],
        enrollments: enrollmentsRes.data ?? [],
        teachers: teachersRes.data ?? [],
        scheduleUpdatedAt,
        lastViewedAt: previousLastViewedAt,
        hasChanges,
      },
    });
  } catch (error) {
    logger.error("공유 링크 데이터 조회 실패", { token: token.slice(0, 8) + "..." }, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
