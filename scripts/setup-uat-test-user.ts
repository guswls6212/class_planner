/**
 * UAT (User Acceptance Test) 전용 Supabase user 3계정을 admin API로 멱등 생성하는 일회성 setup 스크립트.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/setup-uat-test-user.ts
 *   (또는 npm run uat:setup)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 *   # 신규 (권장) — 3 계정 role 별 명시
 *   UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
 *   UAT_TEST_OWNER_PASSWORD=<강한 password>
 *   UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
 *   UAT_TEST_ADMIN_PASSWORD=<강한 password>
 *   UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
 *   UAT_TEST_MEMBER_PASSWORD=<강한 password>
 *
 *   # Legacy (deprecated, 1주일 alias 유지) — UAT_TEST_OWNER_* fallback 으로 인식
 *   UAT_TEST_USER_EMAIL=...
 *   UAT_TEST_USER_PASSWORD=...
 *
 * 동작:
 * 1. 3 계정 (owner/admin/member) 각각 admin API로 멱등 생성 (이미 있으면 password 갱신)
 * 2. ADMIN/MEMBER 환경변수 누락 시 skip (1계정 단일 검증도 부분적으로 가능 — owner 만)
 * 3. 출력: 각 계정의 user_id (선택적 .env.local 추가 안내). academy 는 매 사이클 fresh-start 모델.
 *
 * 멱등 — 여러 번 실행해도 안전. e2e와 격리 (별도 user).
 *
 * Multi-role UAT (3계정) 도입 사유: 단일 owner 계정으로는 admin/member RBAC + 초대 4-state +
 * 강사 teacher_id link + member 가 보는 /teacher-schedule view 등을 자연스럽게 검증할 수
 * 없음. ADR-019 Academy Singularity (owner 1+1) 정책 하에 owner 가 admin/member 초대로
 * 학원에 join 시키는 흐름 자체가 핵심 회귀 path.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

type RoleKey = "owner" | "admin" | "member";

interface AccountConfig {
  role: RoleKey;
  email: string;
  password: string;
  fromLegacyAlias?: boolean;
}

/**
 * 3 role × {EMAIL, PASSWORD} 쌍을 env 에서 읽음.
 * owner 는 legacy UAT_TEST_USER_* alias fallback (deprecated 경고).
 */
function readAccountConfigs(env: EnvFile): AccountConfig[] {
  const get = (k: string): string | undefined =>
    process.env[k] ?? env[k] ?? undefined;

  const configs: AccountConfig[] = [];

  const ownerEmail = get("UAT_TEST_OWNER_EMAIL") ?? get("UAT_TEST_USER_EMAIL");
  const ownerPassword =
    get("UAT_TEST_OWNER_PASSWORD") ?? get("UAT_TEST_USER_PASSWORD");
  const ownerFromLegacy = !get("UAT_TEST_OWNER_EMAIL") && !!get("UAT_TEST_USER_EMAIL");

  if (ownerEmail && ownerPassword) {
    configs.push({
      role: "owner",
      email: ownerEmail,
      password: ownerPassword,
      fromLegacyAlias: ownerFromLegacy,
    });
  }

  const adminEmail = get("UAT_TEST_ADMIN_EMAIL");
  const adminPassword = get("UAT_TEST_ADMIN_PASSWORD");
  if (adminEmail && adminPassword) {
    configs.push({ role: "admin", email: adminEmail, password: adminPassword });
  }

  const memberEmail = get("UAT_TEST_MEMBER_EMAIL");
  const memberPassword = get("UAT_TEST_MEMBER_PASSWORD");
  if (memberEmail && memberPassword) {
    configs.push({ role: "member", email: memberEmail, password: memberPassword });
  }

  return configs;
}

async function ensureUser(
  sbAdmin: SupabaseClient,
  config: AccountConfig,
): Promise<string> {
  const { data: existingUsers, error: listError } =
    await sbAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`user 목록 조회 실패 (${config.role}): ${listError.message}`);
  }
  const users = existingUsers.users as Array<{ id: string; email?: string | null }>;
  const existingUser = users.find((u) => u.email === config.email);

  if (existingUser) {
    console.log(`ℹ️  [${config.role}] 이미 존재 (id=${existingUser.id.slice(0, 8)}...) — password 갱신`);
    const { error: updateError } = await sbAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: config.password, email_confirm: true },
    );
    if (updateError) {
      throw new Error(`password 갱신 실패 (${config.role}): ${updateError.message}`);
    }
    return existingUser.id;
  }

  const { data, error } = await sbAdmin.auth.admin.createUser({
    email: config.email,
    password: config.password,
    email_confirm: true,
    user_metadata: { uat_test_user: true, uat_role: config.role },
  });
  if (error || !data.user) {
    throw new Error(
      `user 생성 실패 (${config.role}): ${error?.message ?? "no user returned"}`,
    );
  }
  console.log(`✅ [${config.role}] 신규 user 생성 (id=${data.user.id.slice(0, 8)}...)`);
  return data.user.id;
}

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락. .env.local 또는 환경 변수 확인.",
    );
    process.exit(1);
  }

  const configs = readAccountConfigs(envLocal);
  if (configs.length === 0) {
    console.error("❌ UAT 계정 환경변수 누락. .env.local 에 다음 중 하나 이상 필요:");
    console.error("");
    console.error("   UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test");
    console.error("   UAT_TEST_OWNER_PASSWORD=<강한 password>");
    console.error("   # 다중 역할 검증 시 추가");
    console.error("   UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test");
    console.error("   UAT_TEST_ADMIN_PASSWORD=<강한 password>");
    console.error("   UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test");
    console.error("   UAT_TEST_MEMBER_PASSWORD=<강한 password>");
    process.exit(1);
  }

  // Legacy alias deprecation 경고
  const ownerLegacy = configs.find((c) => c.role === "owner" && c.fromLegacyAlias);
  if (ownerLegacy) {
    console.warn(
      "⚠️  UAT_TEST_USER_* 는 legacy alias 입니다 (deprecated). " +
        "UAT_TEST_OWNER_EMAIL / UAT_TEST_OWNER_PASSWORD 로 이름 변경 권장.",
    );
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`📧 UAT test user 셋업 — ${configs.length}계정`);
  console.log("");

  const results: Array<{ role: RoleKey; email: string; userId: string }> = [];
  for (const config of configs) {
    console.log(`📌 [${config.role}] ${config.email}`);
    const userId = await ensureUser(sbAdmin, config);
    results.push({ role: config.role, email: config.email, userId });
    console.log("");
  }

  console.log("✅ UAT Setup 완료. (user 만 생성 — academy 는 매 사이클 fresh-start)");
  console.log("");
  console.log("📋 생성된 계정:");
  for (const r of results) {
    console.log(`   ${r.role.padEnd(6)} | ${r.email.padEnd(40)} | user_id = ${r.userId}`);
  }
  console.log("");
  console.log("이후 매 UAT 사이클 (.env.local 에 EMAIL/PASSWORD 만 있으면 됨):");
  console.log("  1. npm run uat:teardown           # fresh-start (3 계정 모두 reset)");
  console.log("  2. (선택) npm run uat:seed        # owner academy 자동 생성 + 시드 데이터");
  console.log("  3. (선택) npm run uat:invite      # admin/member 초대 토큰 자동 발급 + 수락 (P4/P5 빠른 진입용)");
  console.log("  4. 브라우저에서 owner/admin/member 순서로 시나리오 진행");
  console.log("  5. 끝나면 npm run uat:teardown");
  console.log("");
  console.log("💡 lookup 1회 줄이려면 (선택) .env.local 에 user_id 추가 가능:");
  for (const r of results) {
    const envVar = r.role === "owner" ? "UAT_TEST_OWNER_ID" : `UAT_TEST_${r.role.toUpperCase()}_ID`;
    console.log(`     ${envVar}=${r.userId}`);
  }
  console.log("   (academy_id 는 매 사이클 새로 생성되므로 .env.local 명시 의미 X)");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
