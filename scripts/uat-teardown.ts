/**
 * UAT user fresh-start cleanup — scope 데이터 + academy_members + orphan
 * academies 까지 모두 삭제. user (auth.users) 보존 (재로그인 가능).
 *
 * 매 UAT 사이클 시작 시 호출 — user 를 신규 사용자 상태로 reset 해서 S-1.5
 * (첫 로그인 학원 자동 생성) 시나리오 자연 발동 보장.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-teardown.ts
 *   (또는 npm run uat:teardown)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   UAT_TEST_USER_EMAIL  (필수 — email 기반 자동 lookup, fresh-start 가드)
 *   UAT_TEST_USER_ID     (선택 — 적어두면 lookup 생략)
 *
 * 동작:
 *   1. UAT_TEST_USER_ID 없으면 email로 자동 lookup
 *   2. cleanupUatUserData() 호출 — scope 데이터 + academy_members + orphan academies
 *      삭제. user 자체는 보존.
 *
 * 멱등 — 데이터 없어도 안전.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupUatUserData,
  findUserIdByEmail,
} from "./uat-cleanup-helper";

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
  const email = process.env.UAT_TEST_USER_EMAIL ?? envLocal.UAT_TEST_USER_EMAIL;
  let userId: string | undefined =
    process.env.UAT_TEST_USER_ID ?? envLocal.UAT_TEST_USER_ID;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }
  if (!email && !userId) {
    console.error(
      "❌ UAT_TEST_USER_EMAIL 또는 UAT_TEST_USER_ID 둘 중 하나 필요. .env.local 작성.",
    );
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ID 미지정 시 email로 자동 lookup
  if (!userId) {
    console.log(`🔍 email로 user 조회: ${email}`);
    userId = (await findUserIdByEmail(sbAdmin, email!)) ?? undefined;
    if (!userId) {
      console.log(`ℹ️  user 없음 (email=${email}) — cleanup 불필요`);
      return;
    }
  }

  console.log(`🧹 UAT fresh-start cleanup: userId=${userId.slice(0, 8)}...`);
  await cleanupUatUserData(sbAdmin, userId);

  console.log("");
  console.log("✅ UAT cleanup 완료. user 는 보존, academy/scope 데이터 모두 삭제.");
  console.log("   다음 단계:");
  console.log("     1. 브라우저 로그인 → S-1.5 (첫 로그인 학원 자동 생성) 발동");
  console.log("     2. (선택) npm run uat:seed → 인증 시나리오용 시드 데이터 INSERT");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
