import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, reason: "missing_token" }, { status: 400 });
    }

    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("invite_tokens")
      .select("id, role, expires_at, used_by, academies(name)")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    if (data.used_by) {
      return NextResponse.json({ valid: false, reason: "used" });
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    const academyName = (data.academies as { name: string } | null)?.name ?? "";

    return NextResponse.json({
      valid: true,
      id: data.id,
      role: data.role,
      academyName,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    logger.error("GET /api/invites/check 오류", undefined, error as Error);
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
  }
}
