/**
 * UAT 인증 모드 시드 데이터 INSERT — owner academy 에 직접 INSERT.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-seed.ts
 *   (또는 npm run uat:seed)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   # 신규 권장
 *   UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
 *   UAT_TEST_OWNER_ID    (선택)
 *   UAT_TEST_OWNER_ACADEMY_ID (선택)
 *
 *   # Legacy (deprecated, owner 로 인식)
 *   UAT_TEST_USER_EMAIL=...
 *   UAT_TEST_USER_ID, UAT_TEST_ACADEMY_ID
 *
 * 동작:
 * 1. UAT_TEST_OWNER_ID/ACADEMY_ID 없으면 email 로 자동 lookup
 * 2. 같은 academy 의 기존 시드 데이터 cleanup (멱등 재시드)
 * 3. 신규 INSERT:
 *    - subjects: 수학(#FF0000), 영어(#00FF00)
 *    - teachers: 김선생(#6366f1), 이선생(#0891b2)
 *    - students: 홍길동, 김영수, 박지수
 *    - enrollments: 홍길동 + 수학
 *    - sessions: 월/수/금 09:00-10:00 (3개) + session_enrollments 연결
 *
 * Schema 참조:
 *   migration/migrations/016_create_academy_tables.sql (subjects/students/sessions/enrollments/session_enrollments)
 *   migration/migrations/024_add_teachers.sql (teachers + sessions.teacher_id)
 *
 * 멱등 — cleanup 후 재시드. admin/member 시드는 별도 uat-invite-seed.ts 사용.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import {
  cleanupAcademyScopedDataForUser,
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

async function main(): Promise<void> {
  const envLocal = loadDotEnv(path.join(process.cwd(), ".env.local"));
  const get = (k: string): string | undefined =>
    process.env[k] ?? envLocal[k] ?? undefined;

  const url = get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");

  // 신규 env 우선, legacy fallback
  const email = get("UAT_TEST_OWNER_EMAIL") ?? get("UAT_TEST_USER_EMAIL");
  let userId: string | undefined =
    get("UAT_TEST_OWNER_ID") ?? get("UAT_TEST_USER_ID");
  let academyId: string | undefined =
    get("UAT_TEST_OWNER_ACADEMY_ID") ?? get("UAT_TEST_ACADEMY_ID");

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }
  if (!email && (!userId || !academyId)) {
    console.error(
      "❌ UAT_TEST_OWNER_EMAIL 누락. .env.local 에 추가 필요. " +
        "(legacy UAT_TEST_USER_EMAIL fallback 도 인식)",
    );
    process.exit(1);
  }

  const sbAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ID 미지정 시 email로 자동 lookup
  if (!userId) {
    console.log(`🔍 owner email 로 user 조회: ${email}`);
    userId = (await findUserIdByEmail(sbAdmin, email!)) ?? undefined;
    if (!userId) {
      console.error(
        `❌ owner user 없음 (email=${email}). npm run uat:setup 먼저 실행하세요.`,
      );
      process.exit(1);
    }
  }
  if (!academyId) {
    academyId = (await findAcademyIdForOwner(sbAdmin, userId)) ?? undefined;
    // academy 없으면 자동 생성 (uat-teardown 후 fresh-start 가정)
    // S-1.5 시나리오 거치지 않고 seed 만 호출하는 케이스 대응
    if (!academyId) {
      console.log("ℹ️  owner 에게 academy 없음 — 새로 생성 (UAT Test Academy)");
      const { data: newAcademy, error: academyErr } = await sbAdmin
        .from("academies")
        .insert({ name: "UAT Test Academy", created_by: userId })
        .select("id")
        .single();
      if (academyErr || !newAcademy) {
        console.error(`❌ academies INSERT 실패: ${academyErr?.message}`);
        process.exit(1);
      }
      const newId: string = newAcademy.id;
      academyId = newId;
      const { error: memberErr } = await sbAdmin
        .from("academy_members")
        .insert({ academy_id: newId, user_id: userId, role: "owner" });
      if (memberErr) {
        console.error(
          `❌ academy_members INSERT 실패: ${memberErr.message}`,
        );
        process.exit(1);
      }
      console.log(`✅ Academy 신규 생성 (id=${newId.slice(0, 8)}...)`);
    }
  }

  // TypeScript narrow — 위 if 블록 안 어느 분기든 academyId set 보장
  if (!academyId) {
    console.error("❌ academyId 결정 실패 — 코드 흐름 버그");
    process.exit(1);
  }

  // 1. 멱등성: 같은 academy의 기존 시드 cleanup (academy/members는 보존)
  console.log(`🧹 기존 시드 cleanup (academy=${academyId.slice(0, 8)}...)`);
  await cleanupAcademyScopedDataForUser(sbAdmin, userId);

  // 2. subjects INSERT
  console.log("📚 subjects INSERT");
  const { data: subjects, error: subjectsError } = await sbAdmin
    .from("subjects")
    .insert([
      { academy_id: academyId, name: "수학", color: "#FF0000" },
      { academy_id: academyId, name: "영어", color: "#00FF00" },
    ])
    .select("id, name");
  if (subjectsError || !subjects || subjects.length !== 2) {
    console.error(`❌ subjects INSERT 실패: ${subjectsError?.message}`);
    process.exit(1);
  }
  const mathId = subjects.find((s) => s.name === "수학")!.id;

  // 3. teachers INSERT (자동 색상)
  console.log("👨‍🏫 teachers INSERT");
  const { data: teachers, error: teachersError } = await sbAdmin
    .from("teachers")
    .insert([
      { academy_id: academyId, name: "김선생", color: "#6366f1" },
      { academy_id: academyId, name: "이선생", color: "#0891b2" },
    ])
    .select("id, name");
  if (teachersError || !teachers || teachers.length !== 2) {
    console.error(`❌ teachers INSERT 실패: ${teachersError?.message}`);
    process.exit(1);
  }
  const kimTeacherId = teachers.find((t) => t.name === "김선생")!.id;

  // 4. students INSERT
  console.log("🎓 students INSERT");
  const { data: students, error: studentsError } = await sbAdmin
    .from("students")
    .insert([
      { academy_id: academyId, name: "홍길동" },
      { academy_id: academyId, name: "김영수" },
      { academy_id: academyId, name: "박지수" },
    ])
    .select("id, name");
  if (studentsError || !students || students.length !== 3) {
    console.error(`❌ students INSERT 실패: ${studentsError?.message}`);
    process.exit(1);
  }
  const hongId = students.find((s) => s.name === "홍길동")!.id;

  // 5. enrollment: 홍길동 + 수학
  console.log("📝 enrollment INSERT (홍길동 + 수학)");
  const { data: enrollment, error: enrollmentError } = await sbAdmin
    .from("enrollments")
    .insert({ student_id: hongId, subject_id: mathId })
    .select("id")
    .single();
  if (enrollmentError || !enrollment) {
    console.error(`❌ enrollments INSERT 실패: ${enrollmentError?.message}`);
    process.exit(1);
  }

  // 6. sessions: 월/수/금 09:00-10:00 + 김선생 + 수학 (teacher_id, 024에서 추가)
  console.log("📅 sessions INSERT (월/수/금 09:00-10:00)");
  const { data: sessions, error: sessionsError } = await sbAdmin
    .from("sessions")
    .insert([
      {
        academy_id: academyId,
        weekday: 0, // 월
        starts_at: "09:00",
        ends_at: "10:00",
        teacher_id: kimTeacherId,
        y_position: 1,
      },
      {
        academy_id: academyId,
        weekday: 2, // 수
        starts_at: "09:00",
        ends_at: "10:00",
        teacher_id: kimTeacherId,
        y_position: 1,
      },
      {
        academy_id: academyId,
        weekday: 4, // 금
        starts_at: "09:00",
        ends_at: "10:00",
        teacher_id: kimTeacherId,
        y_position: 1,
      },
    ])
    .select("id");
  if (sessionsError || !sessions || sessions.length !== 3) {
    console.error(`❌ sessions INSERT 실패: ${sessionsError?.message}`);
    process.exit(1);
  }

  // 7. session_enrollments: 각 session ↔ enrollment 연결
  console.log("🔗 session_enrollments INSERT");
  const { error: linkError } = await sbAdmin.from("session_enrollments").insert(
    sessions.map((s) => ({
      session_id: s.id,
      enrollment_id: enrollment.id,
    })),
  );
  if (linkError) {
    console.error(`❌ session_enrollments INSERT 실패: ${linkError.message}`);
    process.exit(1);
  }

  console.log("");
  console.log("✅ UAT 시드 완료 (owner academy):");
  console.log(`   - subjects: 2 (수학 #FF0000, 영어 #00FF00)`);
  console.log(`   - teachers: 2 (김선생 #6366f1, 이선생 #0891b2)`);
  console.log(`   - students: 3 (홍길동, 김영수, 박지수)`);
  console.log(`   - enrollments: 1 (홍길동 + 수학)`);
  console.log(`   - sessions: 3 (월/수/금 09:00-10:00, 김선생 배정)`);
  console.log("");
  console.log("📝 다음:");
  console.log(
    "  - 브라우저에서 UAT_TEST_OWNER_EMAIL 로 password 로그인 → /schedule 진입",
  );
  console.log("  - 시드 데이터 표시 확인 후 시나리오 진행");
  console.log("  - admin/member 빠른 진입 필요 시: npm run uat:invite");
  console.log("  - 끝나면 npm run uat:teardown");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
