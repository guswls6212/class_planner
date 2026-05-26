// src/lib/auth/attendancePermission.ts
//
// Attendance 출결 권한 가드 (attendance-permission-fix Phase 1 Step 3, 2026-05-27).
//
// 정책:
// - owner/admin: 모든 session 의 출결 read/write 가능
// - member (강사): sessions.teacher_id === 본인 teacher.id 인 session 만 read/write
//   - session.teacher_id 가 NULL (legacy) 이면 member 차단 — owner/admin 만
//
// 적용처: /api/attendance (GET, POST), /api/attendance/bulk (POST)
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { requireRole, type AcademyRole } from "@/lib/auth/permissions";
import { AppError } from "@/lib/errors/AppError";
import { ErrorCodes } from "@/lib/errors/codes";

export async function assertAttendancePermission(
  userId: string,
  sessionId: string,
): Promise<{ academyId: string; role: AcademyRole }> {
  const { academyId, role } = await requireRole(userId, [
    "owner",
    "admin",
    "member",
  ]);

  if (role === "member") {
    const client = getServiceRoleClient();

    const { data: session, error: sErr } = await client
      .from("sessions")
      .select("teacher_id, academy_id")
      .eq("id", sessionId)
      .single();
    if (sErr || !session) {
      throw new AppError(ErrorCodes.SESSION_NOT_FOUND, { statusHint: 404 });
    }
    if (session.academy_id !== academyId) {
      throw new AppError(ErrorCodes.FORBIDDEN, { statusHint: 403 });
    }
    if (!session.teacher_id) {
      // legacy NULL teacher_id session — member 접근 차단
      throw new AppError(ErrorCodes.FORBIDDEN, { statusHint: 403 });
    }

    const { data: myTeacher, error: tErr } = await client
      .from("teachers")
      .select("id")
      .eq("academy_id", academyId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!myTeacher || myTeacher.id !== session.teacher_id) {
      throw new AppError(ErrorCodes.FORBIDDEN, { statusHint: 403 });
    }
  }

  return { academyId, role };
}
