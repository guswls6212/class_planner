/**
 * UAT 콘솔 도구 — dev 모드 자동 inject (layout.tsx가 NODE_ENV=development 일 때만 로드).
 *
 * 노출:
 *   window.uat = { clearAll, isAnonymous, countAPIcalls, forceFetch500,
 *                  expireToken, inspect, seed }
 *
 * 사용:
 *   localhost:3000 진입만으로 자동 로드. DevTools 콘솔에서 즉시 호출.
 *   uat.seed()      // 익명 모드 시드
 *   uat.clearAll()  // 깨끗한 상태
 *   const r = uat.forceFetch500('/api/templates'); ...; r();  // S-7.2 등
 *
 * Schema 참조:
 *   - Storage 키: src/lib/localStorageCrud.ts ANONYMOUS_STORAGE_KEY
 *   - Entity 타입: src/lib/planner.ts (Student/Subject/Teacher/Enrollment/Session)
 *
 * Production 빌드:
 *   layout.tsx의 process.env.NODE_ENV === "development" 분기로 inject 차단.
 *   이 파일은 public/에 있어 정적 서빙은 되지만 production에선 layout이 <script> 안 만듦.
 */
/* eslint-disable no-console */
(function installUat() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const ANONYMOUS_KEY = "classPlannerData:anonymous";

  window.uat = {
    /** ⚠️ localStorage/sessionStorage/쿠키 모두 삭제 + 새로고침 — 데이터 날아감. */
    clearAll() {
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
      window.location.reload();
    },

    /** 익명 모드 여부. */
    isAnonymous() {
      return !localStorage.getItem("supabase_user_id");
    },

    /** 특정 path를 포함한 fetch resource 호출 횟수. */
    countAPIcalls(path) {
      return performance
        .getEntriesByType("resource")
        .filter((r) => r.name.includes(path)).length;
    },

    /**
     * 특정 path 매칭된 fetch 요청을 강제로 500으로 응답. 복구 함수 반환.
     * 사용: const restore = uat.forceFetch500('/api/templates'); ...; restore();
     */
    forceFetch500(pathPattern) {
      const orig = window.fetch;
      window.fetch = (...args) => {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes(pathPattern)) {
          return Promise.resolve(
            new Response('{"error":"UAT forced 500"}', {
              status: 500,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return orig(...args);
      };
      return () => {
        window.fetch = orig;
      };
    },

    /** Supabase auth token 강제 만료 (cookie + localStorage 삭제 + reload). */
    expireToken() {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
      window.location.reload();
    },

    /** 현재 active 키와 데이터 통계 출력. */
    inspect() {
      const userId = localStorage.getItem("supabase_user_id");
      const academyId = userId
        ? localStorage.getItem(`active_academy:${userId}`)
        : null;
      let key = ANONYMOUS_KEY;
      if (userId && academyId) key = `classPlannerData:${userId}:${academyId}`;
      else if (userId) key = `classPlannerData:${userId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return console.log("[uat] 저장된 데이터 없음", { key });
      const d = JSON.parse(raw);
      console.log("[uat] inspect", {
        key,
        학생: d.students?.length ?? 0,
        과목: d.subjects?.length ?? 0,
        강사: d.teachers?.length ?? 0,
        세션: d.sessions?.length ?? 0,
        enrollments: d.enrollments?.length ?? 0,
        lastModified: d.lastModified,
      });
    },

    /**
     * 익명 모드 시드 — 학생 3 / 과목 2 / 강사 2 / 세션 3 (월/수/금 09:00-10:00).
     * 인증 모드 시드는 서버에서 (`npm run uat:seed`).
     */
    seed() {
      const uuid = () => crypto.randomUUID();

      // KST 기준 이번 주 월요일 (YYYY-MM-DD)
      const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const dayFromMon = (kst.getUTCDay() + 6) % 7;
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

      localStorage.setItem(ANONYMOUS_KEY, JSON.stringify(data));
      console.log("[uat] 익명 시드 완료:", {
        weekStartDate,
        학생: students.length,
        과목: subjects.length,
        강사: teachers.length,
        세션: sessions.length,
      });
      window.location.reload();
    },
  };

  console.log("[uat] window.uat 노출됨:", Object.keys(window.uat));
})();
