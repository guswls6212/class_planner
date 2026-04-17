import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { toErrorResponse } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    let query = client
      .from("attendance")
      .select("*")
      .eq("academy_id", academyId)
      .eq("session_id", sessionId);

    if (date) {
      query = query.eq("date", date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: "출석 조회에 실패했습니다." }, { status: 500 });
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

    const body = await request.json();
    const { sessionId, studentId, date, status = "present", notes } = body;

    if (!sessionId || !studentId || !date) {
      return NextResponse.json({ success: false, error: "sessionId, studentId, date are required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("attendance")
      .upsert({
        academy_id: academyId,
        session_id: sessionId,
        student_id: studentId,
        date,
        status,
        notes: notes ?? null,
        marked_by: userId,
        marked_at: new Date().toISOString(),
      }, { onConflict: "session_id,student_id,date" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: "출석 저장에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
