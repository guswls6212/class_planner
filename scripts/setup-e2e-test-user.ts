/**
 * E2E test 전용 Supabase user를 admin API로 생성하는 일회성 setup 스크립트.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/setup-e2e-test-user.ts
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # admin API 호출용
 *   E2E_TEST_USER_EMAIL=e2e-test@class-planner.test
 *   E2E_TEST_USER_PASSWORD=<강한 password>
 *
 * 동작:
 * 1. Supabase admin API로 user 생성 (email_confirm: true 즉시 활성)
 * 2. 이미 존재하면 password 갱신
 * 3. 출력: user id (E2E_TEST_USER_ID로 .env.local에 추가하면 globalSetup이 더 빠름)
 *
 * 멱등성: 여러 번 실행해도 안전 — 동일 email이면 password update.
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
  const email = process.env.E2E_TEST_USER_EMAIL ?? envLocal.E2E_TEST_USER_EMAIL;
  const password =
    process.env.E2E_TEST_USER_PASSWORD ?? envLocal.E2E_TEST_USER_PASSWORD;

  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락. " +
        ".env.local 또는 환경 변수 확인.",
    );
    process.exit(1);
  }
  if (!email || !password) {
    console.error(
      "❌ E2E_TEST_USER_EMAIL 또는 E2E_TEST_USER_PASSWORD 누락. .env.local 작성 필요.",
    );
    console.error("  예시:");
    console.error("    E2E_TEST_USER_EMAIL=e2e-test@class-planner.test");
    console.error("    E2E_TEST_USER_PASSWORD=<강한 password>");
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📧 Test user 셋업: ${email}`);

  // 1. 기존 user 검색
  const { data: existingUsers, error: listError } = await sbAdmin.auth.admin.listUsers();
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
      user_metadata: { e2e_test_user: true },
    });
    if (error || !data.user) {
      console.error(`❌ user 생성 실패: ${error?.message ?? "no user"}`);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`✅ 신규 user 생성 (id=${userId})`);
  }

  // PR D — academy + owner role 자동 부여 (멱등)
  console.log("");
  console.log(`🏫 Academy 셋업: user ${userId.slice(0, 8)}...`);
  // 2026-05-18 hotfix: `.maybeSingle()` 대신 `.limit(1)` — 이전 cleanup teardown 의
  // academy_members DELETE 실패 (audit_log RESTRICT FK 등) 로 multiple owner rows 가
  // 누적되면 maybeSingle 이 "multiple (or no) rows returned" error 로 fail → setup
  // 전체 차단 → 모든 후속 PR 의 E2E job fail. multiple row 발견 시 첫 row 만 사용
  // 하고 나머지는 graceful 무시 (cleanup race 영향 격리). 자세히: ci.yml E2E job log.
  const { data: existingMemberships, error: memberSelectError } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1);
  if (memberSelectError) {
    console.error(`❌ academy_members 조회 실패: ${memberSelectError.message}`);
    process.exit(1);
  }
  const existingMembership = existingMemberships?.[0] ?? null;

  let academyId: string;
  if (existingMembership) {
    academyId = existingMembership.academy_id;
    console.log(`ℹ️  이미 owner인 academy 존재 (id=${academyId.slice(0, 8)}...)`);
  } else {
    const { data: newAcademy, error: academyInsertError } = await sbAdmin
      .from("academies")
      .insert({ name: "E2E Test Academy", created_by: userId })
      .select("id")
      .single();
    if (academyInsertError || !newAcademy) {
      console.error(`❌ academies INSERT 실패: ${academyInsertError?.message}`);
      process.exit(1);
    }
    academyId = newAcademy.id;
    const { error: memberInsertError } = await sbAdmin
      .from("academy_members")
      .insert({ academy_id: academyId, user_id: userId, role: "owner" });
    if (memberInsertError) {
      console.error(`❌ academy_members INSERT 실패: ${memberInsertError.message}`);
      process.exit(1);
    }
    console.log(`✅ Academy 신규 생성 (id=${academyId})`);
  }

  console.log("");
  console.log("✅ Setup 완료.");
  console.log("");
  console.log("📝 다음 단계:");
  console.log("  1. .env.local에 추가 (선택 — globalSetup이 더 빨라짐):");
  console.log(`     E2E_TEST_USER_ID=${userId}`);
  console.log(`     E2E_TEST_ACADEMY_ID=${academyId}`);
  console.log("");
  console.log("  2. GitHub Actions secrets 등록:");
  console.log("     - NEXT_PUBLIC_SUPABASE_URL (있으면 skip)");
  console.log("     - NEXT_PUBLIC_SUPABASE_ANON_KEY (있으면 skip)");
  console.log("     - E2E_TEST_USER_EMAIL");
  console.log("     - E2E_TEST_USER_PASSWORD");
  console.log("     - SUPABASE_SERVICE_ROLE_KEY (cleanup용)");
  console.log("");
  console.log("  3. e2e 실행:");
  console.log(
    "     npm exec -- playwright test tests/e2e/teachers-crud.spec.ts --project=chromium",
  );
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
