/**
 * UAT (User Acceptance Test) 전용 Supabase user를 admin API로 생성하는 일회성 setup 스크립트.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/setup-uat-test-user.ts
 *   (또는 npm run uat:setup)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   UAT_TEST_USER_EMAIL=uat-test@class-planner.test
 *   UAT_TEST_USER_PASSWORD=<강한 password>
 *
 * 동작:
 * 1. UAT user를 admin API로 생성 (이미 있으면 password 갱신)
 * 2. UAT 전용 academy + academy_members(owner role) 자동 부여 (이미 있으면 skip)
 * 3. 출력: UAT_TEST_USER_ID, UAT_TEST_ACADEMY_ID 를 .env.local에 추가하라 안내
 *
 * 멱등 — 여러 번 실행해도 안전. e2e와 격리 (별도 user/academy).
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
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.UAT_TEST_USER_EMAIL ?? envLocal.UAT_TEST_USER_EMAIL;
  const password =
    process.env.UAT_TEST_USER_PASSWORD ?? envLocal.UAT_TEST_USER_PASSWORD;

  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락. " +
        ".env.local 또는 환경 변수 확인.",
    );
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "❌ UAT_TEST_USER_EMAIL 또는 UAT_TEST_USER_PASSWORD 누락. .env.local에 추가 필요.",
    );
    console.error("  예시:");
    console.error("    UAT_TEST_USER_EMAIL=uat-test@class-planner.test");
    console.error("    UAT_TEST_USER_PASSWORD=<강한 password>");
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📧 UAT test user 셋업: ${email}`);

  // 1. 기존 user 검색
  const { data: existingUsers, error: listError } =
    await sbAdmin.auth.admin.listUsers();
  if (listError) {
    console.error(`❌ user 목록 조회 실패: ${listError.message}`);
    process.exit(1);
  }
  const existingUser = existingUsers.users.find((u) => u.email === email);

  let userId: string;
  if (existingUser) {
    console.log(`ℹ️  이미 존재 (id=${existingUser.id}) — password 갱신`);
    const { error: updateError } = await sbAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password, email_confirm: true },
    );
    if (updateError) {
      console.error(`❌ password 갱신 실패: ${updateError.message}`);
      process.exit(1);
    }
    userId = existingUser.id;
  } else {
    const { data, error } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { uat_test_user: true },
    });
    if (error || !data.user) {
      console.error(`❌ user 생성 실패: ${error?.message ?? "no user"}`);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`✅ 신규 user 생성 (id=${userId})`);
  }

  // (academy 셋업 제거 — 2026-05-07 사용자 결정 fresh-start default)
  // 매 UAT 사이클: uat:teardown 으로 academy 까지 cleanup → S-1.5 (browser 로그인) 또는
  // uat:seed 가 academy 자동 생성. setup 은 user 만 생성.

  console.log("");
  console.log("✅ UAT Setup 완료. (user 만 생성 — academy 는 매 사이클 fresh-start)");
  console.log("");
  console.log(`   user_id = ${userId}`);
  console.log("");
  console.log("이후 매 UAT 사이클 (.env.local 에 EMAIL/PASSWORD 만 있으면 됨):");
  console.log("  1. npm run uat:teardown   # fresh-start (이전 사이클 academy/scope 모두 삭제)");
  console.log("  2. 시나리오 진행 두 옵션:");
  console.log("     (a) S-1.5 검증 — 브라우저 로그인 → 학원 자동 생성 → 인증 시나리오");
  console.log("     (b) S-1.5 skip — npm run uat:seed → 학원 + 시드 자동 생성 → 시나리오");
  console.log("  3. 끝나면 npm run uat:teardown");
  console.log("");
  console.log("💡 lookup 1회 줄이려면 (선택) .env.local 에 한 줄 추가 가능:");
  console.log(`     UAT_TEST_USER_ID=${userId}`);
  console.log("   (UAT_TEST_ACADEMY_ID 는 매 사이클 새로 생성되므로 .env.local 명시 의미 X)");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
