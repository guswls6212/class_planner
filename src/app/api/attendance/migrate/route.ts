import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { assertAttendancePermission } from "@/lib/auth/attendancePermission";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/attendance/migrate?userId=...
 *   body: { sessionId, oldDate, newDate }
 *
 * 출석 record 의 date column 만 oldDate → newDate 로 변경 (atomic single UPDATE).
 * session 이 다른 weekday 로 이동했을 때 attendance 도 따라 이동시키는 흐름.
 *
 * 사용자 명시 정책 (2026-05-28 mockup attendance-on-move-policy 선택):
 *   - session schedule 이동 시 출석 정보도 함께 이동 (Option B move)
 *   - 5/26 출석 record → 5/27 로 옮김. 5/26 에는 record 사라짐.
 *
 * Why endpoint 분리 (markAttendance 반복 호출 X):
 *   1. atomic — partial failure 시 일부만 옮김 risk 차단
 *   2. 1 API call (vs 2N: copy + delete)
 *   3. (session_id, student_id, date) unique constraint 정확히 처리 — 같은 date 충돌 시 fail
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { sessionId, oldDate, newDate } = body;

    if (!sessionId || !oldDate || !newDate) {
      return NextResponse.json(
        { success: false, error: "sessionId, oldDate, newDate are required" },
        { status: 400 },
      );
    }

    if (oldDate === newDate) {
      // no-op
      return NextResponse.json({ success: true, data: [] });
    }

    const { academyId } = await assertAttendancePermission(userId, sessionId);
    const client = getServiceRoleClient();

    // Atomic UPDATE — date 만 변경. (session_id, student_id, date) unique constraint 로
    // 같은 newDate 에 이미 record 있으면 23505 error → 사용자 toast 가이드.
    const { data, error } = await client
      .from("attendance")
      .update({
        date: newDate,
        marked_by: userId,
        marked_at: new Date().toISOString(),
      })
      .eq("academy_id", academyId)
      .eq("session_id", sessionId)
      .eq("date", oldDate)
      .select();

    if (error) {
      // unique violation — 같은 newDate 에 이미 record 있음 (e.g. 사용자가 이미 newDate 출석 마킹)
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "이미 새 날짜에 출결 기록이 있습니다. 기존 기록 충돌로 이동 안 됨.",
            code: "DUPLICATE_DATE",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: "출석 이동에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
