import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/apiAuth";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";

export async function POST(request: NextRequest) {
  // userId 는 body 로 오지만 신뢰하지 않는다 — 쿠키를 심는 엔드포인트라
  // 남의 userId 로 active academy 를 지정하지 못하게 세션과 대조한다.
  const { userId: claimedUserId, academyId } = await request
    .json()
    .catch(() => ({}));

  const auth = await requireSessionUser(request, claimedUserId);
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  if (!academyId) {
    return NextResponse.json({ error: "academyId required" }, { status: 400 });
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
