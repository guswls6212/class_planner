import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";

export async function POST(request: NextRequest) {
  const { userId, academyId } = await request.json().catch(() => ({}));
  if (!userId || !academyId) {
    return NextResponse.json({ error: "userId and academyId required" }, { status: 400 });
  }

  // Verify user belongs to this academy
  const client = getServiceRoleClient();
  const { data } = await client
    .from("academy_members")
    .select("role")
    .eq("user_id", userId)
    .eq("academy_id", academyId)
    .single();

  if (!data) {
    return NextResponse.json({ error: "해당 학원의 멤버가 아닙니다." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_academy_id", academyId, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
