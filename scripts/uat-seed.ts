/**
 * UAT 인증 모드 시드 데이터 INSERT — owner academy 에 풍부한 케이스 일괄 INSERT.
 *
 * 실행:
 *   cd class-planner
 *   npx tsx scripts/uat-seed.ts
 *   (또는 npm run uat:seed)
 *
 * 데이터 설계 (2026-05-21 풍부화):
 *   - subjects 8개: 다양한 색상 + 12자 edge (`중등수학심화`)
 *   - teachers 6개: 일반 5 + `강사_uat` (Phase 5 member view 검증용)
 *   - students 10개: 한국 이름 3~4자 + 영문 edge (`TomLee` 6자)
 *   - enrollments: 학생당 1~3과목, 다양한 조합
 *   - sessions 25개: 월~일 7요일 채움
 *       · 시간 충돌 2건 — 같은 weekday/시각에 y_position 1/2 분리
 *       · 강사 미배정 3건 — teacher_id null (미술)
 *       · 강사_uat 담당 3건 — 화·목·토 사회 (S-20.5)
 *       · 다인원(4-5명) 2건 — 토요 영어, 금 수학
 *       · 길이 다양 — 1h / 1.5h / 2h 수업 혼재
 *       · 오전/오후/저녁 시간대 모두 포함
 *
 * 시나리오 커버:
 *   - 캘린더 전체 채우기 → 빈 슬롯 없는 schedule 시각 검증
 *   - 시간 충돌 stacking → y_position UI 검증
 *   - 다양한 enrollment 조합 → 필터/CRUD 검증
 *   - edge case 입력값 (12자 과목, 6자 영문 학생, 강사 미배정) → validation UI 검증
 *   - Phase 5 member view (S-20.5/20.6/20.7) — uat:invite 가 강사_uat 를 user_id link 만 처리하면 즉시 진입 가능
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
 * Schema 참조:
 *   migration/migrations/016_create_academy_tables.sql (subjects/students/sessions/enrollments/session_enrollments)
 *   migration/migrations/024_add_teachers.sql (teachers + sessions.teacher_id)
 *   supabase/migrations/031_add_week_start_date_to_sessions.sql (week_start_date NOT NULL — 주별 격리)
 *   migration/migrations/039_sessions_notes.sql (public_description, internal_note)
 *
 * 멱등 — cleanup 후 재시드. admin/member 시드는 별도 uat-invite-seed.ts 사용.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { getWeekStartDate } from "../src/lib/weekStart";
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

// ─────────────────────────────────────────────────────────────────────────
// 시드 데이터 정의 — 한 곳에 모아서 가독성 + 향후 확장 용이.
// ─────────────────────────────────────────────────────────────────────────

interface SubjectSeed {
  name: string; // 2-12자
  color: string; // #rrggbb
}

interface TeacherSeed {
  name: string; // 2-6자
  color: string;
}

interface StudentSeed {
  name: string; // 2-6자
}

interface EnrollmentSeed {
  studentName: string;
  subjectName: string;
}

interface SessionSeed {
  weekday: number; // 0=월 ~ 6=일
  startsAt: string; // "HH:MM"
  endsAt: string;
  teacherName: string | null; // null = 강사 미배정
  yPosition: number;
  /** 이 session 에 연결할 (student, subject) 쌍 목록 — 모두 enrollments 에 존재해야 함 */
  attendees: Array<{ studentName: string; subjectName: string }>;
  publicDescription?: string;
  internalNote?: string;
}

const SEED_SUBJECTS: SubjectSeed[] = [
  { name: "수학", color: "#EF4444" }, // 빨강
  { name: "영어", color: "#3B82F6" }, // 파랑
  { name: "국어", color: "#14B8A6" }, // teal (강사_uat #10b981 과 시각 구분)
  { name: "과학", color: "#F59E0B" }, // 주황
  { name: "사회", color: "#8B5CF6" }, // 보라
  { name: "코딩", color: "#EC4899" }, // 분홍
  { name: "미술", color: "#06B6D4" }, // 청록
  { name: "중등수학심화", color: "#7C3AED" }, // 12자 edge (긴 과목명 UI 검증)
];

// "강사_uat" 는 uat-invite-seed.ts (member 분기) 의 reuse 대상 — 이름 일치 의무.
// 색상은 uat-invite-seed.ts 의 fallback (#10b981) 과 일치시켜 일관성 유지.
// member user link 후 /teacher-schedule view 검증 (S-20.5) 을 위해 본인 session 3개 미리 배정.
const SEED_TEACHERS: TeacherSeed[] = [
  { name: "김선생", color: "#6366f1" },
  { name: "이선생", color: "#0891b2" },
  { name: "박코치", color: "#7c3aed" },
  { name: "최쌤", color: "#ea580c" }, // 2자 edge (짧은 이름)
  { name: "윤멘토교육", color: "#be185d" }, // 5자
  { name: "강사_uat", color: "#10b981" }, // Phase 5 member view (S-20.5)
];

const SEED_STUDENTS: StudentSeed[] = [
  { name: "홍길동" },
  { name: "김영수" },
  { name: "박지수" },
  { name: "정수아" },
  { name: "최민준" },
  { name: "강서연" },
  { name: "한도윤" },
  { name: "김지우" },
  { name: "이서준" },
  { name: "TomLee" }, // 6자 영문 edge
];

const SEED_ENROLLMENTS: EnrollmentSeed[] = [
  // 홍길동: 다과목 등록 (수학/영어/코딩)
  { studentName: "홍길동", subjectName: "수학" },
  { studentName: "홍길동", subjectName: "영어" },
  { studentName: "홍길동", subjectName: "코딩" },
  // 김영수: 수학 + 과학
  { studentName: "김영수", subjectName: "수학" },
  { studentName: "김영수", subjectName: "과학" },
  // 박지수: 영어 + 국어
  { studentName: "박지수", subjectName: "영어" },
  { studentName: "박지수", subjectName: "국어" },
  // 정수아: 영어 + 사회
  { studentName: "정수아", subjectName: "영어" },
  { studentName: "정수아", subjectName: "사회" },
  // 최민준: 다과목 (수학/과학/사회)
  { studentName: "최민준", subjectName: "수학" },
  { studentName: "최민준", subjectName: "과학" },
  { studentName: "최민준", subjectName: "사회" },
  // 강서연: 미술 단일
  { studentName: "강서연", subjectName: "미술" },
  // 한도윤: 긴 과목명 edge (중등수학심화)
  { studentName: "한도윤", subjectName: "중등수학심화" },
  { studentName: "한도윤", subjectName: "수학" },
  // 김지우: 영어 + 코딩
  { studentName: "김지우", subjectName: "영어" },
  { studentName: "김지우", subjectName: "코딩" },
  // 이서준: 사회 + 미술
  { studentName: "이서준", subjectName: "사회" },
  { studentName: "이서준", subjectName: "미술" },
  // TomLee: 코딩 단일 (영문 학생 edge)
  { studentName: "TomLee", subjectName: "코딩" },
];

const SEED_SESSIONS: SessionSeed[] = [
  // ─── 월요일 (weekday=0) ───
  {
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    teacherName: "김선생",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "수학" },
      { studentName: "김영수", subjectName: "수학" },
      { studentName: "최민준", subjectName: "수학" },
    ],
    publicDescription: "월요일 정규 수학반",
  },
  {
    // 충돌 케이스 1: 월 09:00 같은 시간 다른 과목 (y_position=2)
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    teacherName: "이선생",
    yPosition: 2,
    attendees: [
      { studentName: "박지수", subjectName: "영어" },
      { studentName: "정수아", subjectName: "영어" },
      { studentName: "김지우", subjectName: "영어" },
    ],
  },
  {
    // 1.5시간 수업 edge
    weekday: 0,
    startsAt: "14:00",
    endsAt: "15:30",
    teacherName: "박코치",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "코딩" },
      { studentName: "김지우", subjectName: "코딩" },
      { studentName: "TomLee", subjectName: "코딩" },
    ],
  },
  {
    // 강사 미배정 edge 1
    weekday: 0,
    startsAt: "19:00",
    endsAt: "20:00",
    teacherName: null,
    yPosition: 1,
    attendees: [{ studentName: "강서연", subjectName: "미술" }],
    internalNote: "강사 배정 필요 — 임시",
  },

  // ─── 화요일 (weekday=1) ───
  {
    weekday: 1,
    startsAt: "10:00",
    endsAt: "11:00",
    teacherName: "이선생",
    yPosition: 1,
    attendees: [
      { studentName: "김영수", subjectName: "과학" },
      { studentName: "최민준", subjectName: "과학" },
    ],
  },
  {
    // 강사_uat session #1 — Phase 5 member view (S-20.5)
    weekday: 1,
    startsAt: "11:00",
    endsAt: "12:00",
    teacherName: "강사_uat",
    yPosition: 1,
    attendees: [
      { studentName: "정수아", subjectName: "사회" },
      { studentName: "최민준", subjectName: "사회" },
    ],
  },
  {
    weekday: 1,
    startsAt: "14:00",
    endsAt: "15:00",
    teacherName: "최쌤",
    yPosition: 1,
    attendees: [
      { studentName: "정수아", subjectName: "사회" },
      { studentName: "최민준", subjectName: "사회" },
      { studentName: "이서준", subjectName: "사회" },
    ],
  },
  {
    weekday: 1,
    startsAt: "16:00",
    endsAt: "17:00",
    teacherName: "윤멘토교육",
    yPosition: 1,
    attendees: [{ studentName: "박지수", subjectName: "국어" }],
  },

  // ─── 수요일 (weekday=2) ───
  {
    weekday: 2,
    startsAt: "09:00",
    endsAt: "10:00",
    teacherName: "김선생",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "수학" },
      { studentName: "김영수", subjectName: "수학" },
      { studentName: "최민준", subjectName: "수학" },
    ],
  },
  {
    // 1.5시간 수업
    weekday: 2,
    startsAt: "11:00",
    endsAt: "12:30",
    teacherName: "이선생",
    yPosition: 1,
    attendees: [
      { studentName: "박지수", subjectName: "영어" },
      { studentName: "정수아", subjectName: "영어" },
      { studentName: "김지우", subjectName: "영어" },
    ],
  },
  {
    weekday: 2,
    startsAt: "15:00",
    endsAt: "16:00",
    teacherName: "박코치",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "코딩" },
      { studentName: "김지우", subjectName: "코딩" },
      { studentName: "TomLee", subjectName: "코딩" },
    ],
  },
  {
    // 긴 과목명 edge (`중등수학심화`)
    weekday: 2,
    startsAt: "18:00",
    endsAt: "19:30",
    teacherName: "김선생",
    yPosition: 1,
    attendees: [{ studentName: "한도윤", subjectName: "중등수학심화" }],
  },

  // ─── 목요일 (weekday=3) ───
  {
    weekday: 3,
    startsAt: "10:00",
    endsAt: "11:00",
    teacherName: "이선생",
    yPosition: 1,
    attendees: [
      { studentName: "김영수", subjectName: "과학" },
      { studentName: "최민준", subjectName: "과학" },
    ],
  },
  {
    // 강사_uat session #2 — Phase 5 member view (S-20.5)
    weekday: 3,
    startsAt: "11:00",
    endsAt: "12:00",
    teacherName: "강사_uat",
    yPosition: 1,
    attendees: [
      { studentName: "이서준", subjectName: "사회" },
      { studentName: "최민준", subjectName: "사회" },
    ],
  },
  {
    // 충돌 케이스 2: 목 14:00 사회 + 미술 (강사 미배정 stack)
    weekday: 3,
    startsAt: "14:00",
    endsAt: "15:00",
    teacherName: "최쌤",
    yPosition: 1,
    attendees: [
      { studentName: "정수아", subjectName: "사회" },
      { studentName: "최민준", subjectName: "사회" },
      { studentName: "이서준", subjectName: "사회" },
    ],
  },
  {
    weekday: 3,
    startsAt: "14:00",
    endsAt: "15:00",
    teacherName: null, // 강사 미배정 edge 2
    yPosition: 2,
    attendees: [
      { studentName: "강서연", subjectName: "미술" },
      { studentName: "이서준", subjectName: "미술" },
    ],
  },
  {
    weekday: 3,
    startsAt: "16:00",
    endsAt: "17:00",
    teacherName: "윤멘토교육",
    yPosition: 1,
    attendees: [{ studentName: "박지수", subjectName: "국어" }],
  },

  // ─── 금요일 (weekday=4) ───
  {
    // 다인원 케이스: 5명
    weekday: 4,
    startsAt: "09:00",
    endsAt: "10:00",
    teacherName: "김선생",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "수학" },
      { studentName: "김영수", subjectName: "수학" },
      { studentName: "최민준", subjectName: "수학" },
      { studentName: "한도윤", subjectName: "수학" },
    ],
  },
  {
    weekday: 4,
    startsAt: "13:00",
    endsAt: "14:00",
    teacherName: "이선생",
    yPosition: 1,
    attendees: [
      { studentName: "박지수", subjectName: "영어" },
      { studentName: "정수아", subjectName: "영어" },
      { studentName: "김지우", subjectName: "영어" },
      { studentName: "홍길동", subjectName: "영어" },
    ],
  },
  {
    weekday: 4,
    startsAt: "16:00",
    endsAt: "17:00",
    teacherName: "박코치",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "코딩" },
      { studentName: "김지우", subjectName: "코딩" },
      { studentName: "TomLee", subjectName: "코딩" },
    ],
  },
  {
    // 긴 저녁 수업 + 긴 과목명 + 1.5시간
    weekday: 4,
    startsAt: "19:00",
    endsAt: "20:30",
    teacherName: "김선생",
    yPosition: 1,
    attendees: [{ studentName: "한도윤", subjectName: "중등수학심화" }],
    publicDescription: "금요일 심화반 — 주간 마무리 문제풀이",
  },

  // ─── 토요일 (weekday=5) ───
  {
    // 강사_uat session #3 — Phase 5 member view (S-20.5)
    weekday: 5,
    startsAt: "09:00",
    endsAt: "10:00",
    teacherName: "강사_uat",
    yPosition: 1,
    attendees: [{ studentName: "정수아", subjectName: "사회" }],
  },
  {
    // 다인원 + 긴 수업 (2시간) 케이스
    weekday: 5,
    startsAt: "10:00",
    endsAt: "12:00",
    teacherName: "이선생",
    yPosition: 1,
    attendees: [
      { studentName: "박지수", subjectName: "영어" },
      { studentName: "정수아", subjectName: "영어" },
      { studentName: "김지우", subjectName: "영어" },
      { studentName: "홍길동", subjectName: "영어" },
    ],
  },
  {
    weekday: 5,
    startsAt: "14:00",
    endsAt: "15:00",
    teacherName: null, // 강사 미배정 edge 3
    yPosition: 1,
    attendees: [{ studentName: "강서연", subjectName: "미술" }],
  },

  // ─── 일요일 (weekday=6) — 주말 특강 ───
  {
    // 주말 + 2시간 + 적은 인원
    weekday: 6,
    startsAt: "14:00",
    endsAt: "16:00",
    teacherName: "박코치",
    yPosition: 1,
    attendees: [
      { studentName: "홍길동", subjectName: "코딩" },
      { studentName: "TomLee", subjectName: "코딩" },
    ],
    publicDescription: "일요일 코딩 특강 (격주)",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 메인 흐름
// ─────────────────────────────────────────────────────────────────────────

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

  if (!academyId) {
    console.error("❌ academyId 결정 실패 — 코드 흐름 버그");
    process.exit(1);
  }

  // 1. 멱등성: 같은 academy의 기존 시드 cleanup (academy/members는 보존)
  console.log(`🧹 기존 시드 cleanup (academy=${academyId.slice(0, 8)}...)`);
  await cleanupAcademyScopedDataForUser(sbAdmin, userId);

  // 2. subjects INSERT
  console.log(`📚 subjects INSERT (${SEED_SUBJECTS.length}개)`);
  const { data: subjects, error: subjectsError } = await sbAdmin
    .from("subjects")
    .insert(SEED_SUBJECTS.map((s) => ({ academy_id: academyId, ...s })))
    .select("id, name");
  if (subjectsError || !subjects || subjects.length !== SEED_SUBJECTS.length) {
    console.error(`❌ subjects INSERT 실패: ${subjectsError?.message}`);
    process.exit(1);
  }
  const subjectIdByName = new Map(subjects.map((s) => [s.name, s.id]));

  // 3. teachers INSERT
  console.log(`👨‍🏫 teachers INSERT (${SEED_TEACHERS.length}개)`);
  const { data: teachers, error: teachersError } = await sbAdmin
    .from("teachers")
    .insert(SEED_TEACHERS.map((t) => ({ academy_id: academyId, ...t })))
    .select("id, name");
  if (teachersError || !teachers || teachers.length !== SEED_TEACHERS.length) {
    console.error(`❌ teachers INSERT 실패: ${teachersError?.message}`);
    process.exit(1);
  }
  const teacherIdByName = new Map(teachers.map((t) => [t.name, t.id]));

  // 4. students INSERT
  console.log(`🎓 students INSERT (${SEED_STUDENTS.length}명)`);
  const { data: students, error: studentsError } = await sbAdmin
    .from("students")
    .insert(SEED_STUDENTS.map((s) => ({ academy_id: academyId, ...s })))
    .select("id, name");
  if (studentsError || !students || students.length !== SEED_STUDENTS.length) {
    console.error(`❌ students INSERT 실패: ${studentsError?.message}`);
    process.exit(1);
  }
  const studentIdByName = new Map(students.map((s) => [s.name, s.id]));

  // 5. enrollments INSERT
  console.log(`📝 enrollments INSERT (${SEED_ENROLLMENTS.length}건)`);
  const enrollmentRows = SEED_ENROLLMENTS.map((e) => {
    const studentId = studentIdByName.get(e.studentName);
    const subjectId = subjectIdByName.get(e.subjectName);
    if (!studentId || !subjectId) {
      throw new Error(
        `enrollment 매핑 실패: ${e.studentName} + ${e.subjectName}`,
      );
    }
    return { student_id: studentId, subject_id: subjectId };
  });
  const { data: enrollments, error: enrollmentError } = await sbAdmin
    .from("enrollments")
    .insert(enrollmentRows)
    .select("id, student_id, subject_id");
  if (
    enrollmentError ||
    !enrollments ||
    enrollments.length !== SEED_ENROLLMENTS.length
  ) {
    console.error(`❌ enrollments INSERT 실패: ${enrollmentError?.message}`);
    process.exit(1);
  }
  // (student_id, subject_id) → enrollment_id 매핑
  const enrollmentIdByPair = new Map<string, string>();
  for (const e of enrollments) {
    enrollmentIdByPair.set(`${e.student_id}::${e.subject_id}`, e.id);
  }

  // 6. sessions INSERT — 주별 격리 모델 (migration 031). 모두 이번주(KST 월요일)에 시드.
  //    schedule UI 의 default view 가 "이번주" 라 진입 즉시 데이터 노출.
  //    다음주/저번주 검증이 필요해지면 SessionSeed 에 weekOffset 옵션 추가 권장.
  const currentWeekStart = getWeekStartDate(new Date());
  console.log(
    `📅 sessions INSERT (${SEED_SESSIONS.length}개, week_start_date=${currentWeekStart})`,
  );
  const sessionRows = SEED_SESSIONS.map((s) => ({
    academy_id: academyId,
    weekday: s.weekday,
    starts_at: s.startsAt,
    ends_at: s.endsAt,
    teacher_id: s.teacherName ? teacherIdByName.get(s.teacherName) ?? null : null,
    y_position: s.yPosition,
    week_start_date: currentWeekStart,
    public_description: s.publicDescription ?? null,
    internal_note: s.internalNote ?? null,
  }));
  const { data: sessionRecords, error: sessionsError } = await sbAdmin
    .from("sessions")
    .insert(sessionRows)
    .select("id");
  if (
    sessionsError ||
    !sessionRecords ||
    sessionRecords.length !== SEED_SESSIONS.length
  ) {
    console.error(`❌ sessions INSERT 실패: ${sessionsError?.message}`);
    process.exit(1);
  }

  // 7. session_enrollments INSERT — 각 session 의 attendees 를 enrollment_id 로 변환 후 batch
  console.log("🔗 session_enrollments INSERT");
  const linkRows: Array<{ session_id: string; enrollment_id: string }> = [];
  SEED_SESSIONS.forEach((seed, idx) => {
    const sessionId = sessionRecords[idx].id;
    for (const a of seed.attendees) {
      const studentId = studentIdByName.get(a.studentName);
      const subjectId = subjectIdByName.get(a.subjectName);
      if (!studentId || !subjectId) {
        throw new Error(
          `session attendee 매핑 실패 (session #${idx}): ${a.studentName} + ${a.subjectName}`,
        );
      }
      const enrollmentId = enrollmentIdByPair.get(`${studentId}::${subjectId}`);
      if (!enrollmentId) {
        throw new Error(
          `session attendee enrollment 없음 (session #${idx}): ${a.studentName} 는 ${a.subjectName} 를 수강하지 않음. ` +
            `SEED_ENROLLMENTS 에 추가 필요.`,
        );
      }
      linkRows.push({ session_id: sessionId, enrollment_id: enrollmentId });
    }
  });
  const { error: linkError } = await sbAdmin
    .from("session_enrollments")
    .insert(linkRows);
  if (linkError) {
    console.error(`❌ session_enrollments INSERT 실패: ${linkError.message}`);
    process.exit(1);
  }

  // 통계
  const unassignedSessions = SEED_SESSIONS.filter((s) => s.teacherName === null).length;
  const conflictPairs = (() => {
    const slotMap = new Map<string, number>();
    for (const s of SEED_SESSIONS) {
      const slot = `${s.weekday}-${s.startsAt}`;
      slotMap.set(slot, (slotMap.get(slot) ?? 0) + 1);
    }
    return Array.from(slotMap.values()).filter((n) => n >= 2).length;
  })();

  const uatTeacherSessions = SEED_SESSIONS.filter((s) => s.teacherName === "강사_uat").length;

  console.log("");
  console.log("✅ UAT 풍부 시드 완료 (owner academy):");
  console.log(`   - subjects: ${SEED_SUBJECTS.length} (12자 edge 포함)`);
  console.log(`   - teachers: ${SEED_TEACHERS.length} (강사_uat 포함 — Phase 5 member view)`);
  console.log(`   - students: ${SEED_STUDENTS.length} (영문 edge 포함)`);
  console.log(`   - enrollments: ${SEED_ENROLLMENTS.length}`);
  console.log(
    `   - sessions: ${SEED_SESSIONS.length} (요일 7개 모두 포함, ${unassignedSessions}건 강사 미배정, ${conflictPairs}건 시간 충돌, ${uatTeacherSessions}건 강사_uat 담당)`,
  );
  console.log(`   - session_enrollments: ${linkRows.length} 연결`);
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
