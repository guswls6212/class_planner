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
 * 모든 templates 삭제 (spec 후 격리). academy 스코프.
 */
export async function clearRealTemplates(): Promise<void> {
  const sb = getAdminClient();
  const academyId = getAcademyId();
  await sb.from("templates").delete().eq("academy_id", academyId);
}
