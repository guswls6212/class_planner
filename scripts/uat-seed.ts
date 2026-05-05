/**
 * UAT 인증 모드 시드 데이터 INSERT — UAT_TEST_USER의 academy에 직접 INSERT.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-seed.ts
 *   (또는 npm run uat:seed)
 *
 * Prerequisites (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   UAT_TEST_USER_EMAIL  (필수 — email 기반 자동 lookup)
 *   UAT_TEST_USER_ID, UAT_TEST_ACADEMY_ID  (선택 — 적어두면 lookup 생략)
 *
 * 동작:
 * 1. UAT_TEST_USER_ID/ACADEMY_ID 없으면 email로 자동 lookup
 * 2. 같은 academy의 기존 시드 데이터 cleanup (uat-teardown.ts 와 동일 로직)
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
 * 멱등 — cleanup 후 재시드.
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
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? envLocal.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? envLocal.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.UAT_TEST_USER_EMAIL ?? envLocal.UAT_TEST_USER_EMAIL;
  let userId: string | undefined =
    process.env.UAT_TEST_USER_ID ?? envLocal.UAT_TEST_USER_ID;
  let academyId: string | undefined =
    process.env.UAT_TEST_ACADEMY_ID ?? envLocal.UAT_TEST_ACADEMY_ID;

  if (!url || !serviceKey) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 누락");
    process.exit(1);
  }
  if (!email && (!userId || !academyId)) {
    console.error(
      "❌ UAT_TEST_USER_EMAIL 누락. .env.local에 추가 필요. " +
        "(또는 UAT_TEST_USER_ID + UAT_TEST_ACADEMY_ID 둘 다 직접 지정)",
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
      console.error(
        `❌ user 없음 (email=${email}). npm run uat:setup 먼저 실행하세요.`,
      );
      process.exit(1);
    }
  }
  if (!academyId) {
    academyId = (await findAcademyIdForOwner(sbAdmin, userId)) ?? undefined;
    if (!academyId) {
      console.error(
        `❌ user의 owner academy 없음 (userId=${userId.slice(0, 8)}...). npm run uat:setup 먼저 실행.`,
      );
      process.exit(1);
    }
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

  // 6. sessions: 월/수/금 09:00-10:00 + 김선생 + 수학 (teacher_id, 014에서 추가)
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
  console.log("✅ UAT 시드 완료:");
  console.log(`   - subjects: 2 (수학 #FF0000, 영어 #00FF00)`);
  console.log(`   - teachers: 2 (김선생 #6366f1, 이선생 #0891b2)`);
  console.log(`   - students: 3 (홍길동, 김영수, 박지수)`);
  console.log(`   - enrollments: 1 (홍길동 + 수학)`);
  console.log(`   - sessions: 3 (월/수/금 09:00-10:00, 김선생 배정)`);
  console.log("");
  console.log("📝 다음:");
  console.log(
    "  - 브라우저에서 UAT_TEST_USER_EMAIL로 password 로그인 → /schedule 진입",
  );
  console.log("  - 시드 데이터 표시 확인 후 시나리오 진행");
  console.log("  - 끝나면 npm run uat:teardown");
}

main().catch((err) => {
  console.error("❌ 예외:", err);
  process.exit(1);
});
