import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

interface BulkRecord {
  studentId: string;
  status?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { sessionId, date, records } = body;

    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }
    if (!Array.isArray(records)) {
      return NextResponse.json({ success: false, error: "records is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    const now = new Date().toISOString();
    const rows = records.map((r: BulkRecord) => ({
      academy_id: academyId,
      session_id: sessionId,
      student_id: r.studentId,
      date: date ?? new Date().toISOString().slice(0, 10),
      status: r.status ?? "present",
      notes: r.notes ?? null,
      marked_by: userId,
      marked_at: now,
    }));

    const { data, error } = await client
      .from("attendance")
      .upsert(rows, { onConflict: "session_id,student_id,date" })
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: "출석 일괄 저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
