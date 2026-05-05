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

  // 2. UAT 전용 academy 셋업 (owner role)
  console.log("");
  console.log(`🏫 UAT Academy 셋업: user ${userId.slice(0, 8)}...`);
  const { data: existingMembership, error: memberSelectError } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (memberSelectError) {
    console.error(`❌ academy_members 조회 실패: ${memberSelectError.message}`);
    process.exit(1);
  }

  let academyId: string;
  if (existingMembership) {
    academyId = existingMembership.academy_id;
    console.log(
      `ℹ️  이미 owner인 academy 존재 (id=${academyId.slice(0, 8)}...)`,
    );
  } else {
    const { data: newAcademy, error: academyInsertError } = await sbAdmin
      .from("academies")
      .insert({ name: "UAT Test Academy", created_by: userId })
      .select("id")
      .single();
    if (academyInsertError || !newAcademy) {
      console.error(
        `❌ academies INSERT 실패: ${academyInsertError?.message}`,
      );
      process.exit(1);
    }
    academyId = newAcademy.id;
    const { error: memberInsertError } = await sbAdmin
      .from("academy_members")
      .insert({ academy_id: academyId, user_id: userId, role: "owner" });
    if (memberInsertError) {
      console.error(
        `❌ academy_members INSERT 실패: ${memberInsertError.message}`,
      );
      process.exit(1);
    }
    console.log(`✅ Academy 신규 생성 (id=${academyId})`);
  }

  console.log("");
  console.log("✅ UAT Setup 완료.");
  console.log("");
  console.log("📝 다음 단계 — .env.local에 다음 두 줄 추가:");
  console.log(`     UAT_TEST_USER_ID=${userId}`);
  console.log(`     UAT_TEST_ACADEMY_ID=${academyId}`);
  console.log("");
  console.log("이후 매 UAT 사이클:");
  console.log("  1. npm run uat:seed       # 시드 데이터 INSERT");
  console.log("  2. 브라우저에서 UAT_TEST_USER_EMAIL로 password 로그인");
  console.log("  3. /schedule 진입 → 시나리오 진행");
  console.log("  4. npm run uat:teardown   # 데이터 cleanup");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
