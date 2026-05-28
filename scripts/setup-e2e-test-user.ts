/**
 * E2E test 전용 Supabase user 6개를 admin API로 idempotent 셋업.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/setup-e2e-test-user.ts
 *
 * Prerequisites (.env.local 또는 GitHub secret):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   E2E_TEST_USER_PASSWORD (legacy single-user, USER_1 의 default)
 *   E2E_USER_PASSWORD_2 ~ E2E_USER_PASSWORD_6 (옵션 A shard 분리용)
 *
 * 동작:
 * 1. 6 user (e2e-test-1@ ~ e2e-test-6@ class-planner.test) 각각 idempotent 셋업
 *    - 있으면 password 갱신 / 없으면 createUser
 * 2. 각 user 의 owner academy 1 자동 생성 (cleanup race 안전)
 *
 * Race 격리 (proposal ci-shard-user-isolation 2026-05-28):
 * shard 별 다른 user → DB row 격리 → academy data race 영구 해소.
 *
 * 멱등성: 여러 번 실행해도 안전.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

interface EnvFile {
  [key: string]: string;
}

interface UserSpec {
  index: number;
  email: string;
  password: string;
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

function getEnv(key: string, envLocal: EnvFile): string | undefined {
  return process.env[key] ?? envLocal[key];
}

function buildUserSpecs(envLocal: EnvFile): UserSpec[] {
  const fallbackPassword = getEnv("E2E_TEST_USER_PASSWORD", envLocal);
  return Array.from({ length: 6 }, (_, i) => {
    const index = i + 1;
    const specificPassword = getEnv(`E2E_USER_PASSWORD_${index}`, envLocal);
    return {
      index,
      email: `e2e-test-${index}@class-planner.test`,
      password: specificPassword ?? fallbackPassword ?? "",
    };
  });
}

async function ensureUser(
  sbAdmin: SupabaseClient,
  spec: UserSpec,
): Promise<string> {
  const { data: existingUsers, error: listError } =
    await sbAdmin.auth.admin.listUsers();
  if (listError) {
    throw new Error(`user list 조회 실패: ${listError.message}`);
  }
  const existing = existingUsers.users.find((u) => u.email === spec.email);
  if (existing) {
    const { error: updateError } = await sbAdmin.auth.admin.updateUserById(
      existing.id,
      { password: spec.password, email_confirm: true },
    );
    if (updateError) {
      throw new Error(`password 갱신 실패 (${spec.email}): ${updateError.message}`);
    }
    return existing.id;
  }
  const { data, error } = await sbAdmin.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: true,
    user_metadata: { e2e_test_user: true, shard_index: spec.index },
  });
  if (error || !data.user) {
    throw new Error(`user 생성 실패 (${spec.email}): ${error?.message ?? "no user"}`);
  }
  return data.user.id;
}

async function ensureOwnerAcademy(
  sbAdmin: SupabaseClient,
  userId: string,
  spec: UserSpec,
): Promise<string> {
  // 2026-05-18 hotfix 흐름 유지: maybeSingle 대신 limit(1).
  // multiple owner row 누적 시 첫 row 사용 — cleanup race graceful.
  const { data: existingMemberships, error: memberSelectError } = await sbAdmin
    .from("academy_members")
    .select("academy_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .limit(1);
  if (memberSelectError) {
    throw new Error(`academy_members 조회 실패 (user ${userId.slice(0, 8)}...): ${memberSelectError.message}`);
  }
  const existing = existingMemberships?.[0];
  if (existing) {
    return existing.academy_id;
  }
  // 옵션 A fix (2026-05-28): seedSecondAcademy 의 hardcoded "E2E Test Academy 2"
  // 와 충돌 회피. user 2 의 owner academy 이름이 "E2E Test Academy 2" 면 spec 의
  // seedSecondAcademy 가 owner academy 와 일치 → early return → 두 academy 안 생김
  // → multi-academy spec fail. "E2E Owner Academy {index}" 패턴으로 격리.
  const academyName = `E2E Owner Academy ${spec.index}`;
  const { data: newAcademy, error: academyInsertError } = await sbAdmin
    .from("academies")
    .insert({ name: academyName, created_by: userId })
    .select("id")
    .single();
  if (academyInsertError || !newAcademy) {
    throw new Error(`academies INSERT 실패 (${academyName}): ${academyInsertError?.message}`);
  }
  const { error: memberInsertError } = await sbAdmin
    .from("academy_members")
    .insert({ academy_id: newAcademy.id, user_id: userId, role: "owner" });
  if (memberInsertError) {
    throw new Error(`academy_members INSERT 실패: ${memberInsertError.message}`);
  }
  return newAcademy.id;
}

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL", envLocal);
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", envLocal);

  if (!url || !serviceKey) {
    console.error(
      "❌ NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락. .env.local 또는 환경 변수 확인.",
    );
    process.exit(1);
  }

  const userSpecs = buildUserSpecs(envLocal);
  const missingPasswords = userSpecs.filter((s) => !s.password);
  if (missingPasswords.length > 0) {
    console.error("❌ 다음 user 의 password 누락:");
    for (const s of missingPasswords) {
      console.error(
        `   - ${s.email} → E2E_USER_PASSWORD_${s.index} (또는 fallback E2E_TEST_USER_PASSWORD) 설정 필요`,
      );
    }
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("📧 E2E test user 6 셋업 시작 (옵션 A — shard 별 격리)");
  console.log("");

  for (const spec of userSpecs) {
    console.log(`▶ ${spec.email} (shard ${spec.index})`);
    const userId = await ensureUser(sbAdmin, spec);
    const academyId = await ensureOwnerAcademy(sbAdmin, userId, spec);
    console.log(
      `  ✅ user id=${userId.slice(0, 8)}... / academy id=${academyId.slice(0, 8)}...`,
    );
  }

  console.log("");
  console.log("✅ 6 user 셋업 완료.");
  console.log("");
  console.log("📝 GitHub Actions secrets (5 set 추가 필요 — USER_1 은 기존 E2E_TEST_USER_PASSWORD 활용):");
  console.log("  - E2E_USER_PASSWORD_2");
  console.log("  - E2E_USER_PASSWORD_3");
  console.log("  - E2E_USER_PASSWORD_4");
  console.log("  - E2E_USER_PASSWORD_5");
  console.log("  - E2E_USER_PASSWORD_6");
  console.log("");
  console.log("👤 ci.yml matrix 의 user_index 가 1~6 — 각 shard 가 다른 user.");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
