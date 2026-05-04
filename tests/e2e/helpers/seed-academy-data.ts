/**
 * Service role client으로 진짜 academy 스코프 데이터 seed.
 *
 * 사용처: e2e spec의 beforeEach/before에서 진짜 templates/sessions 등 시드.
 * cleanup-test-data가 academy 기준으로 정리하므로 spec 후 데이터 격리됨.
 *
 * 주의: SUPABASE_SERVICE_ROLE_KEY env 필수. CI는 secrets에서 주입.
 *       로컬은 .env.local에 있어야.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

let cachedAdminClient: SupabaseClient | null = null;
let cachedAcademyId: string | null = null;

function getAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "[seed-academy-data] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 누락 — " +
        "CI secrets 또는 .env.local 확인.",
    );
  }
  cachedAdminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdminClient;
}

function getAcademyId(): string {
  if (cachedAcademyId) return cachedAcademyId;
  // global-setup.ts가 저장한 session.json에서 academyId 추출
  const file = path.join(process.cwd(), "playwright/.auth/session.json");
  if (!fs.existsSync(file)) {
    throw new Error("[seed-academy-data] session.json 없음 — globalSetup 실행됐는지 확인.");
  }
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { academyId?: string };
  if (!data.academyId) {
    throw new Error(
      "[seed-academy-data] session.json에 academyId 없음 — setup-e2e-test-user.ts 실행 필요.",
    );
  }
  cachedAcademyId = data.academyId;
  return cachedAcademyId;
}

function getUserId(): string {
  const file = path.join(process.cwd(), "playwright/.auth/session.json");
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as { userId: string };
  return data.userId;
}

/**
 * 진짜 templates row를 academy에 INSERT. spec 후 cleanup-test-data가 academy 기준 삭제.
 *
 * @returns INSERT된 template id
 */
export async function seedRealTemplate(opts: {
  name: string;
  description?: string | null;
  templateData: {
    version: string;
    sessions: Array<{
      subjectId: string;
      subjectName?: string;
      subjectColor?: string;
      studentIds: string[];
      studentNames?: string[];
      teacherId?: string;
      teacherName?: string;
      weekday: number;
      startsAt: string;
      endsAt: string;
      yPosition?: number;
    }>;
  };
}): Promise<string> {
  const sb = getAdminClient();
  const academyId = getAcademyId();
  const userId = getUserId();
  const { data, error } = await sb
    .from("templates")
    .insert({
      academy_id: academyId,
      name: opts.name,
      description: opts.description ?? null,
      template_data: opts.templateData,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`[seedRealTemplate] INSERT 실패: ${error?.message}`);
  }
  return data.id;
}

/**
 * 두 번째 academy + admin 멤버 seed (멱등). multi-academy switch e2e용.
 */
export async function seedSecondAcademy(opts?: {
  name?: string;
}): Promise<{ id: string; name: string }> {
  const sb = getAdminClient();
  const userId = getUserId();
  const primaryAcademyId = getAcademyId();
  const name = opts?.name ?? "E2E Test Academy 2";

  const { data: existing } = await sb
    .from("academies")
    .select("id, name")
    .eq("name", name)
    .eq("created_by", userId)
    .maybeSingle();
  if (existing && existing.id !== primaryAcademyId) {
    return { id: existing.id, name: existing.name };
  }

  const { data: newAcademy, error: academyErr } = await sb
    .from("academies")
    .insert({ name, created_by: userId })
    .select("id, name")
    .single();
  if (academyErr || !newAcademy) {
    throw new Error(`[seedSecondAcademy] academies INSERT 실패: ${academyErr?.message}`);
  }
  const { error: memberErr } = await sb.from("academy_members").insert({
    academy_id: newAcademy.id,
    user_id: userId,
    role: "admin",
  });
  if (memberErr) {
    throw new Error(`[seedSecondAcademy] academy_members INSERT 실패: ${memberErr.message}`);
  }
  return { id: newAcademy.id, name: newAcademy.name };
}

/**
 * 두 번째 이상 academy 모두 삭제 (primary 보존). spec 후 격리.
 */
export async function clearSecondAcademies(): Promise<void> {
  const sb = getAdminClient();
  const userId = getUserId();
  const primaryAcademyId = getAcademyId();

  const { data: extras } = await sb
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .neq("academy_id", primaryAcademyId);

  for (const row of extras ?? []) {
    const aid = row.academy_id as string;
    await sb.from("academy_members").delete().eq("academy_id", aid);
    await sb.from("academies").delete().eq("id", aid);
  }
}

/**
 * 모든 templates 삭제 (spec 후 격리). academy 스코프.
 */
export async function clearRealTemplates(): Promise<void> {
  const sb = getAdminClient();
  const academyId = getAcademyId();
  await sb.from("templates").delete().eq("academy_id", academyId);
}
