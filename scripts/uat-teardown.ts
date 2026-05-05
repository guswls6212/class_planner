/**
 * UAT 시드 데이터 cleanup — academy/user 자체는 보존, scope 데이터만 삭제.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-teardown.ts
 *   (또는 npm run uat:teardown)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   UAT_TEST_USER_ID  (setup-uat-test-user.ts 출력)
 *
 * 동작:
 *   uat-cleanup-helper.cleanupAcademyScopedDataForUser() 호출.
 *   sessions/students/subjects/teachers/enrollments/session_enrollments/templates 등 삭제.
 *   academy_members + academies 보존 (다음 uat:seed에서 같은 academy 재사용).
 *
 * 멱등 — 데이터 없어도 안전.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { cleanupAcademyScopedDataForUser } from "./uat-cleanup-helper";

interface EnvFile {
  [key: string]: string;
}

function loadDotEnv(file: string): EnvFile {
  const result: EnvFile = {};
  if (!fs.existsSync(file)) return result;
  const content = fs.readFileSync(file, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.UAT_TEST_USER_ID ?? envLocal.UAT_TEST_USER_ID;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }
  if (!userId) {
    console.error(
      "❌ UAT_TEST_USER_ID 누락. setup-uat-test-user.ts 먼저 실행 + .env.local 작성.",
    );
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🧹 UAT cleanup: userId=${userId.slice(0, 8)}...`);
  await cleanupAcademyScopedDataForUser(sbAdmin, userId);

  console.log("");
  console.log("✅ UAT cleanup 완료. academy/user 자체는 보존됨.");
  console.log("   다음 사이클: npm run uat:seed → 같은 academy에 재시드.");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
