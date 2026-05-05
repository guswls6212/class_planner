/* eslint-env browser */
/* eslint-disable no-console */
// ⚠️ DEPRECATED — public/uat/console-tools.js 로 통합 (uat.seed() 함수).
//    localhost:3000 진입 후 콘솔에서 uat.seed() 호출만으로 동일 동작.
//    이 파일은 legacy 사용자 위해 보존.
//
// UAT 기본 시드 데이터 (익명 모드)
//
// 사용:
//   1. localhost:3000 에서 DevTools 콘솔 열기
//   2. 본 파일 전체를 복사해 paste → Enter
//   3. 새로고침 후 학생 3명/과목 2개/강사 2명/세션 3개 표시 확인
//
// 주의:
//   - Schema 출처: src/lib/planner.ts (Student/Subject/Teacher/Enrollment/Session)
//   - Storage 키: src/lib/localStorageCrud.ts ANONYMOUS_STORAGE_KEY = "classPlannerData:anonymous"
//   - Schema 변경 시 본 파일도 업데이트 필수.
//   - 인증 사용자는 키가 다름 (classPlannerData:{userId}:{academyId}). 익명 모드 전용.
//   - 실행 전 기존 데이터를 보존하려면 uat.clearAll() 호출 X.
(function seedUAT() {
  if (typeof window === "undefined" || !window.localStorage) {
    console.error("[seed-uat] localStorage 미지원 환경");
    return;
  }

  const KEY = "classPlannerData:anonymous";
  const uuid = () => crypto.randomUUID();

  // KST 기준 이번 주 월요일 (YYYY-MM-DD)
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dayFromMon = (kst.getUTCDay() + 6) % 7; // 0=Mon ... 6=Sun
  kst.setUTCDate(kst.getUTCDate() - dayFromMon);
  const weekStartDate = kst.toISOString().slice(0, 10);

  const students = [
    { id: uuid(), name: "홍길동" },
    { id: uuid(), name: "김영수" },
    { id: uuid(), name: "박지수" },
  ];
  const subjects = [
    { id: uuid(), name: "수학", color: "#FF0000" },
    { id: uuid(), name: "영어", color: "#00FF00" },
  ];
  const teachers = [
    { id: uuid(), name: "김선생", color: "#6366f1", role: "member", userId: null },
    { id: uuid(), name: "이선생", color: "#0891b2", role: "member", userId: null },
  ];

  // 홍길동 + 수학 enrollment 1개 → 월/수/금 세션 3개에 공유
  const enrollment = {
    id: uuid(),
    studentId: students[0].id,
    subjectId: subjects[0].id,
  };

  const baseSession = {
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate,
    enrollmentIds: [enrollment.id],
    subjectId: subjects[0].id,
    teacherId: teachers[0].id,
    yPosition: 1,
  };
  const sessions = [
    { id: uuid(), weekday: 0, ...baseSession }, // 월
    { id: uuid(), weekday: 2, ...baseSession }, // 수
    { id: uuid(), weekday: 4, ...baseSession }, // 금
  ];

  const data = {
    students,
    subjects,
    sessions,
    enrollments: [enrollment],
    teachers,
    version: "1.0",
    lastModified: new Date().toISOString(),
  };

  localStorage.setItem(KEY, JSON.stringify(data));
  console.log("[seed-uat] 시드 완료:", {
    weekStartDate,
    학생: students.length,
    과목: subjects.length,
    강사: teachers.length,
    세션: sessions.length,
  });
  window.location.reload();
})();
