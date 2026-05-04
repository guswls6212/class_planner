/**
 * E2E test user의 모든 데이터를 manual cleanup — 일회성 정리 스크립트.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/cleanup-e2e-test-user.ts
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_USER_EMAIL (또는 E2E_TEST_USER_ID 직접 지정)
 *
 * 동작:
 * 1. test user의 모든 academies → academy_members + 모든 academy 스코프 데이터 삭제
 * 2. user 자체는 보존 (auth.users) — setup-e2e-test-user.ts 다시 실행 시 재사용
 *
 * 멱등 — 데이터 없어도 안전.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_TEST_USER_EMAIL ?? envLocal.E2E_TEST_USER_EMAIL;
  const explicitUserId =
    process.env.E2E_TEST_USER_ID ?? envLocal.E2E_TEST_USER_ID;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }
  if (!email && !explicitUserId) {
    console.error("❌ E2E_TEST_USER_EMAIL 또는 E2E_TEST_USER_ID 누락");
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. user id 결정
  let userId = explicitUserId;
  if (!userId) {
    const { data: users, error } = await sbAdmin.auth.admin.listUsers();
    if (error) {
      console.error(`❌ user 조회 실패: ${error.message}`);
      process.exit(1);
    }
    const user = users.users.find((u) => u.email === email);
    if (!user) {
      console.log(`ℹ️  user 없음 (email=${email}) — cleanup 불필요`);
      return;
    }
    userId = user.id;
  }

  console.log(`🧹 Cleanup 대상: userId=${userId}`);

  // 2. user의 academies 조회
  const { data: memberships, error: memberError } = await sbAdmin
    .from("academy_members")
    .select("academy_id, role")
    .eq("user_id", userId);
  if (memberError) {
    console.error(`❌ academy_members 조회 실패: ${memberError.message}`);
    process.exit(1);
  }
  const academyIds = (memberships ?? []).map((m) => m.academy_id as string);
  console.log(`📋 user의 academies: ${academyIds.length}개`);
  for (const aid of academyIds) {
    const role = memberships!.find((m) => m.academy_id === aid)?.role;
    console.log(`   - ${aid.slice(0, 8)}... (role=${role})`);
  }

  // 3. academy 스코프 데이터 삭제 (FK 의존성 순서)
  const academyScopedTables = [
    "session_enrollments",
    "sessions",
    "enrollments",
    "templates",
    "share_tokens",
    "invites",
    "teacher_subjects",
    "teachers",
    "students",
    "subjects",
  ];

  for (const aid of academyIds) {
    console.log(`\n🗑️  academy ${aid.slice(0, 8)}... 데이터 삭제`);
    for (const table of academyScopedTables) {
      const { error, count } = await sbAdmin
        .from(table)
        .delete({ count: "exact" })
        .eq("academy_id", aid);
      if (error && !error.message.includes("does not exist") && !error.message.includes("column")) {
        console.warn(`   ⚠️  ${table}: ${error.message}`);
      } else if (count && count > 0) {
        console.log(`   ✓ ${table}: ${count}개 삭제`);
      }
    }
  }

  // 4. academy_members + academies
  const { error: memberDelError, count: memberDelCount } = await sbAdmin
    .from("academy_members")
    .delete({ count: "exact" })
    .eq("user_id", userId);
  if (memberDelError) {
    console.warn(`⚠️  academy_members 삭제: ${memberDelError.message}`);
  } else {
    console.log(`\n✓ academy_members: ${memberDelCount ?? 0}개 삭제`);
  }

  let academyDelCount = 0;
  for (const aid of academyIds) {
    const { error, count } = await sbAdmin
      .from("academies")
      .delete({ count: "exact" })
      .eq("id", aid);
    if (error) {
      console.warn(`⚠️  academies (${aid.slice(0, 8)}...): ${error.message}`);
    } else {
      academyDelCount += count ?? 0;
    }
  }
  console.log(`✓ academies: ${academyDelCount}개 삭제`);

  console.log("\n✅ Cleanup 완료. user 자체는 보존됨.");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
