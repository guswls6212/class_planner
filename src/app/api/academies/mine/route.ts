import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";

const ROLE_PRIORITY: Record<string, number> = { owner: 0, admin: 1, member: 2 };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const client = getServiceRoleClient();
  const { data, error } = await client
    .from("academy_members")
    .select("role, academies(id, name, slug)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "fetch failed" }, { status: 500 });

  const academies = (data ?? [])
    .map((row) => {
      const academy = row.academies as unknown as { id: string; name: string; slug: string | null };
      return { id: academy.id, name: academy.name, slug: academy.slug, role: row.role as string };
    })
    .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99));

  return NextResponse.json({ academies });
}
