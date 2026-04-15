import { NextRequest, NextResponse } from "next/server";
import { requireDeveloper } from "@/lib/adminGuard";
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";

// Allowed values for filtering
const ALLOWED_LEVELS = new Set(["error", "warn", "info", "debug"]);
const ALLOWED_SOURCES = new Set(["server", "client"]);

type LogRow = {
  id: string;
  ts: string;
  level: string;
  source: string;
  code: string | null;
  message: string;
  context: Record<string, unknown> | null;
  user_id: string | null;
  academy_id: string | null;
  request_id: string | null;
  user_agent: string | null;
  url: string | null;
  stack: string | null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const guard = await requireDeveloper(request);
  if (!guard.ok) return guard.response;

  // ── Query params ───────────────────────────────────────────────────────────
  const sp = request.nextUrl.searchParams;

  // level — default "error,warn"
  const levelParam = sp.get("level") ?? "error,warn";
  const levels = levelParam
    .split(",")
    .map((l) => l.trim())
    .filter((l) => ALLOWED_LEVELS.has(l));
  // If all supplied values were invalid, fall back to defaults to avoid empty IN clause
  const effectiveLevels = levels.length > 0 ? levels : ["error", "warn"];

  // source — default: all (omit filter)
  const sourceParam = sp.get("source");
  const sources = sourceParam
    ? sourceParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ALLOWED_SOURCES.has(s))
    : [];

  // code, q, academyId
  const code = sp.get("code") ?? "";
  const q = sp.get("q") ?? "";
  const academyId = sp.get("academyId") ?? "";

  // limit / offset — clamp limit between 1 and 200
  const limit = Math.min(Math.max(1, Number(sp.get("limit")) || 50), 200);
  const offset = Math.max(0, Number(sp.get("offset")) || 0);

  // ── Build Supabase query ───────────────────────────────────────────────────
  const client = getServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = client
    .from("app_logs")
    .select(
      "id, ts, level, source, code, message, context, user_id, academy_id, request_id, user_agent, url, stack",
      { count: "exact" }
    );

  query = query.in("level", effectiveLevels);

  if (sources.length > 0) {
    query = query.in("source", sources);
  }

  if (code) {
    query = query.ilike("code", `%${code}%`);
  }

  if (q) {
    query = query.ilike("message", `%${q}%`);
  }

  if (academyId) {
    query = query.eq("academy_id", academyId);
  }

  query = query.order("ts", { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({
    items: (data as LogRow[]) ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
