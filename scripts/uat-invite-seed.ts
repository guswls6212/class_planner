/**
 * UAT 초대 fast-path — owner academy 에 admin/member 자동 초대 + 수락.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-invite-seed.ts            # 두 역할 모두 (default)
 *   npx tsx scripts/uat-invite-seed.ts --role admin
 *   npx tsx scripts/uat-invite-seed.ts --role member
 *   (또는 npm run uat:invite -- --role admin)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   UAT_TEST_OWNER_EMAIL    (owner academy 가 이미 존재해야 함 — uat:seed 또는 S-1.5 후)
 *   UAT_TEST_ADMIN_EMAIL    (--role admin 또는 default 시 필수)
 *   UAT_TEST_MEMBER_EMAIL   (--role member 또는 default 시 필수)
 *
 * 동작 (admin):
 *   1. owner academy 의 invite_tokens INSERT (role=admin, email=admin)
 *   2. admin user 를 academy_members 에 INSERT (role=admin)
 *   3. invite_tokens.used_by/used_at 마크 (consumed 처리)
 *
 * 동작 (member):
 *   1. owner academy 에 "강사_uat" teacher row 생성 (미링크 상태)
 *   2. invite_tokens INSERT (role=member, email=member, teacher_id=teacher)
 *   3. member user 를 academy_members 에 INSERT (role=member)
 *   4. teachers.user_id 를 member user 로 link (UPDATE WHERE user_id IS NULL)
 *   5. invite_tokens.used_by/used_at 마크
 *
 * 왜 fast-path:
 *   - UI 초대 흐름 자체 (S-19/S-20) 도 SEPARATE 시나리오로 직접 검증 의무
 *   - 본 스크립트는 그 외 시나리오 (admin 권한 검증 / member RBAC / /teacher-schedule view) 진입을
 *     빠르게 만들기 위한 alt path. invite UI flow 가 회귀해도 본 스크립트 결과는 안 영향
 *
 * 멱등 — 같은 user 가 이미 academy_members 면 skip, 같은 teacher 이름이면 reuse.
 *
 * 위험: admin API 사용 — RLS 우회. owner academy 에 직접 INSERT 하므로 잘못된 owner email
 *       전달 시 본인 계정 손실. UAT_TEST_OWNER_EMAIL 만 신뢰.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  findAcademyIdForOwner,
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

type InviteRole = "admin" | "member";

function parseRoleFlag(argv: string[]): "all" | InviteRole {
  const idx = argv.findIndex((a) => a === "--role" || a === "-r");
  if (idx < 0) return "all";
  const val = argv[idx + 1];
  if (val === "admin" || val === "member" || val === "all") return val;
  console.error(`❌ --role 잘못됨: ${val}. 유효값: all|admin|member`);
  process.exit(1);
}

/**
 * 한 invite role 을 처리. 멱등.
 *  - admin: academy_members 에 INSERT (role=admin), teacher 미생성
 *  - member: teacher 생성 (이름 "강사_uat" 또는 reuse) + academy_members INSERT (role=member) + teacher.user_id link
 *
 * 두 경우 모두 invite_tokens row 생성 + used 마크 (UI 가 "이미 사용된 초대" 분기 인지하도록).
 */
async function processInviteForRole(
  sbAdmin: SupabaseClient,
  args: {
    role: InviteRole;
    academyId: string;
    ownerId: string;
    inviteeEmail: string;
    inviteeUserId: string;
  },
): Promise<void> {
  const { role, academyId, ownerId, inviteeEmail, inviteeUserId } = args;

  // 1. (member 만) teacher 생성/lookup — 이름 "강사_uat"
  let teacherId: string | null = null;
  if (role === "member") {
    const teacherName = "강사_uat";
    // 같은 이름 reuse
    const { data: existingTeacher } = await sbAdmin
      .from("teachers")
      .select("id, user_id")
      .eq("academy_id", academyId)
      .eq("name", teacherName)
      .maybeSingle();
    if (existingTeacher) {
      teacherId = existingTeacher.id as string;
      console.log(`ℹ️  teacher "${teacherName}" 재사용 (id=${teacherId.slice(0, 8)}...)`);
    } else {
      const { data: newTeacher, error: teacherErr } = await sbAdmin
        .from("teachers")
        .insert({
          academy_id: academyId,
          name: teacherName,
          color: "#10b981",
        })
        .select("id")
        .single();
      if (teacherErr || !newTeacher) {
        throw new Error(`teacher INSERT 실패: ${teacherErr?.message}`);
      }
      teacherId = newTeacher.id as string;
      console.log(`✅ teacher "${teacherName}" 생성 (id=${teacherId.slice(0, 8)}...)`);
    }
  }

  // 2. invite_tokens INSERT — UI 가 "이 사이클에 발급된 초대 토큰" 인지 가능
  const { data: invite, error: inviteErr } = await sbAdmin
    .from("invite_tokens")
    .insert({
      academy_id: academyId,
      role,
      email: inviteeEmail,
      teacher_id: teacherId,
      created_by: ownerId,
    })
    .select("id, token")
    .single();
  if (inviteErr || !invite) {
    throw new Error(`invite_tokens INSERT 실패 (${role}): ${inviteErr?.message}`);
  }

  // 3. academy_members INSERT — 이미 있으면 skip
  const { data: existingMembership } = await sbAdmin
    .from("academy_members")
    .select("id, role")
    .eq("academy_id", academyId)
    .eq("user_id", inviteeUserId)
    .maybeSingle();

  if (existingMembership) {
    console.log(
      `ℹ️  ${role} 이미 멤버 (role=${existingMembership.role}) — academy_members skip`,
    );
  } else {
    const { error: memberErr } = await sbAdmin.from("academy_members").insert({
      academy_id: academyId,
      user_id: inviteeUserId,
      role,
      invited_by: ownerId,
    });
    if (memberErr) {
      throw new Error(`academy_members INSERT 실패 (${role}): ${memberErr.message}`);
    }
    console.log(`✅ academy_members INSERT (${role})`);
  }

  // 4. (member 만) teacher.user_id link
  if (role === "member" && teacherId) {
    const { error: linkErr } = await sbAdmin
      .from("teachers")
      .update({ user_id: inviteeUserId })
      .eq("id", teacherId)
      .is("user_id", null);
    if (linkErr) {
      console.warn(
        `⚠️  teacher.user_id link 실패 (이미 link 됐을 수 있음): ${linkErr.message}`,
      );
    } else {
      console.log(`✅ teacher.user_id link 완료`);
    }
  }

  // 5. invite_tokens used 마크
  const { error: usedErr } = await sbAdmin
    .from("invite_tokens")
    .update({ used_by: inviteeUserId, used_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (usedErr) {
    console.warn(`⚠️  invite used 마크 실패: ${usedErr.message}`);
  } else {
    console.log(`✅ invite_token consumed 처리 (token=${(invite.token as string).slice(0, 12)}...)`);
  }
}

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const get = (k: string): string | undefined =>
    process.env[k] ?? envLocal[k] ?? undefined;

  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }

  const role = parseRoleFlag(process.argv.slice(2));

  const ownerEmail = get("UAT_TEST_OWNER_EMAIL") ?? get("UAT_TEST_USER_EMAIL");
  if (!ownerEmail) {
    console.error("❌ UAT_TEST_OWNER_EMAIL 누락 (legacy UAT_TEST_USER_EMAIL fallback 포함)");
    process.exit(1);
  }

  const adminEmail = get("UAT_TEST_ADMIN_EMAIL");
  const memberEmail = get("UAT_TEST_MEMBER_EMAIL");

  if ((role === "all" || role === "admin") && !adminEmail) {
    console.error("❌ UAT_TEST_ADMIN_EMAIL 누락 (--role admin 또는 default 모드)");
    process.exit(1);
  }
  if ((role === "all" || role === "member") && !memberEmail) {
    console.error("❌ UAT_TEST_MEMBER_EMAIL 누락 (--role member 또는 default 모드)");
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // owner academy lookup
  console.log(`🔍 owner email 로 user 조회: ${ownerEmail}`);
  const ownerId = await findUserIdByEmail(sbAdmin, ownerEmail);
  if (!ownerId) {
    console.error(`❌ owner user 없음 (email=${ownerEmail}). npm run uat:setup 먼저.`);
    process.exit(1);
  }
  const academyId = await findAcademyIdForOwner(sbAdmin, ownerId);
  if (!academyId) {
    console.error(
      `❌ owner academy 없음. npm run uat:seed 또는 브라우저에서 학원 먼저 생성 (S-1.5).`,
    );
    process.exit(1);
  }
  console.log(
    `📌 academy=${academyId.slice(0, 8)}..., owner=${ownerId.slice(0, 8)}...`,
  );
  console.log("");

  // admin 처리
  if ((role === "all" || role === "admin") && adminEmail) {
    console.log(`📌 [admin] ${adminEmail}`);
    const adminUserId = await findUserIdByEmail(sbAdmin, adminEmail);
    if (!adminUserId) {
      console.error(
        `❌ admin user 없음 (email=${adminEmail}). npm run uat:setup 먼저.`,
      );
      process.exit(1);
    }
    await processInviteForRole(sbAdmin, {
      role: "admin",
      academyId,
      ownerId,
      inviteeEmail: adminEmail,
      inviteeUserId: adminUserId,
    });
    console.log("");
  }

  // member 처리
  if ((role === "all" || role === "member") && memberEmail) {
    console.log(`📌 [member] ${memberEmail}`);
    const memberUserId = await findUserIdByEmail(sbAdmin, memberEmail);
    if (!memberUserId) {
      console.error(
        `❌ member user 없음 (email=${memberEmail}). npm run uat:setup 먼저.`,
      );
      process.exit(1);
    }
    await processInviteForRole(sbAdmin, {
      role: "member",
      academyId,
      ownerId,
      inviteeEmail: memberEmail,
      inviteeUserId: memberUserId,
    });
    console.log("");
  }

  console.log("✅ UAT invite seed 완료.");
  console.log("");
  console.log("📝 다음:");
  console.log("  - 브라우저에서 admin/member 계정으로 password 로그인 → /schedule 진입");
  console.log("  - admin: 학생/과목/강사/세션/템플릿 CUD 가능 (owner 강등은 불가)");
  console.log("  - member: /teacher-schedule 진입, 본인 강사 (teachers.name=\"강사_uat\") 세션만 노출");
  console.log("  - invite UI 자체 검증 (S-19/S-20) 은 본 스크립트 결과 무관, 별도 cycle 에서 직접 발급 검증");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
