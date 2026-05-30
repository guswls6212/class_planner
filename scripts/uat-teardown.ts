/**
 * UAT user fresh-start cleanup — scope 데이터 + academy_members + orphan academies 까지 모두 삭제.
 * user (auth.users) 자체는 보존 (재로그인 가능).
 *
 * 매 UAT 사이클 시작 시 호출 — 3 계정 (owner/admin/member) 을 모두 신규 사용자 상태로 reset 해서
 * S-1.5 (첫 로그인 학원 자동 생성) + multi-role 시나리오 (P2~P5) 자연 발동 보장.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-teardown.ts                    # default: all (owner+admin+member)
 *   npx tsx scripts/uat-teardown.ts --user owner       # 특정 역할만
 *   npx tsx scripts/uat-teardown.ts --user admin
 *   npx tsx scripts/uat-teardown.ts --user member
 *   (또는 npm run uat:teardown -- --user owner)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   # 신규 권장 — 3 계정 명시
 *   UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
 *   UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
 *   UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
 *
 *   # Legacy (deprecated, fallback only) — owner 로 인식
 *   UAT_TEST_USER_EMAIL=...
 *
 * 동작:
 *   1. 환경변수에서 OWNER/ADMIN/MEMBER 의 EMAIL 읽기 (legacy USER_EMAIL → OWNER fallback)
 *   2. --user flag 로 단일 역할만 처리 옵션
 *   3. cleanupMultipleUatUsers() — member → admin → owner 순으로 cleanupUatUserData 호출
 *
 * 멱등 — 데이터 없어도 안전. 일부 계정 환경변수 누락 시 skip 으로 진행.
 *
 * 위험 가드:
 *   - email 환경변수가 없으면 process.exit(1) — 본인 OAuth 계정 손실 방지.
 *   - UAT_TEST_*_EMAIL 만 신뢰. user_id 환경변수는 lookup 캐싱용 보조.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupMultipleUatUsers,
  type UatAccountSpec,
  type UatRole,
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

/**
 * --user flag 파싱. default "all". 유효값: all | owner | admin | member.
 */
function parseUserFlag(argv: string[]): "all" | UatRole {
  const idx = argv.findIndex((a) => a === "--user" || a === "-u");
  if (idx < 0) return "all";
  const val = argv[idx + 1];
  if (val === "all" || val === "owner" || val === "admin" || val === "member") {
    return val;
  }
  console.error(`❌ --user 값 잘못됨: ${val}. 유효값: all|owner|admin|member`);
  process.exit(1);
}

function readAccounts(env: EnvFile, target: "all" | UatRole): UatAccountSpec[] {
  const get = (k: string): string | undefined =>
    process.env[k] ?? env[k] ?? undefined;

  const accounts: UatAccountSpec[] = [];

  if (target === "all" || target === "owner") {
    const email = get("UAT_TEST_OWNER_EMAIL") ?? get("UAT_TEST_USER_EMAIL");
    const userId = get("UAT_TEST_OWNER_ID") ?? get("UAT_TEST_USER_ID");
    if (email) {
      accounts.push({ role: "owner", email, userId });
    } else if (target === "owner") {
      console.error("❌ UAT_TEST_OWNER_EMAIL 누락 (--user owner 요청). .env.local 작성.");
      process.exit(1);
    }
  }

  if (target === "all" || target === "admin") {
    const email = get("UAT_TEST_ADMIN_EMAIL");
    const userId = get("UAT_TEST_ADMIN_ID");
    if (email) {
      accounts.push({ role: "admin", email, userId });
    } else if (target === "admin") {
      console.error("❌ UAT_TEST_ADMIN_EMAIL 누락 (--user admin 요청).");
      process.exit(1);
    }
  }

  if (target === "all" || target === "member") {
    const email = get("UAT_TEST_MEMBER_EMAIL");
    const userId = get("UAT_TEST_MEMBER_ID");
    if (email) {
      accounts.push({ role: "member", email, userId });
    } else if (target === "member") {
      console.error("❌ UAT_TEST_MEMBER_EMAIL 누락 (--user member 요청).");
      process.exit(1);
    }
  }

  return accounts;
}

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }

  const target = parseUserFlag(process.argv.slice(2));
  const accounts = readAccounts(envLocal, target);

  if (accounts.length === 0) {
    console.error(
      "❌ UAT 계정 환경변수 누락. .env.local 에 최소 UAT_TEST_OWNER_EMAIL 필요. " +
        "(legacy UAT_TEST_USER_EMAIL fallback 도 인식)",
    );
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `🧹 UAT fresh-start cleanup — target=${target}, accounts=${accounts.map((a) => a.role).join(",")}`,
  );
  console.log("");

  const results = await cleanupMultipleUatUsers(sbAdmin, accounts);

  console.log("");
  console.log("✅ UAT cleanup 완료. user 는 보존, academy/scope 데이터 모두 삭제.");
  console.log("");
  console.log("📋 결과:");
  for (const r of results) {
    const statusLabel =
      r.status === "cleaned" ? "✅ cleaned" : "⊘  skipped (user not found)";
    console.log(`   ${r.role.padEnd(6)} | ${r.email.padEnd(40)} | ${statusLabel}`);
  }
  console.log("");
  console.log("   다음 단계:");
  console.log("     1. (Phase 2) owner 로 브라우저 로그인 → S-1.5 (첫 로그인 학원 자동 생성)");
  console.log("     2. (선택) npm run uat:seed → owner academy 에 시드 데이터 INSERT");
  console.log("     3. (Phase 4/5) npm run uat:invite 또는 UI 에서 admin/member 초대");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
