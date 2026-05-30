/* eslint-env browser */
/* eslint-disable no-console */
// ⚠️ DEPRECATED — public/uat/console-tools.js 로 통합됨.
//    localhost:3000 진입 시 layout.tsx가 NODE_ENV=development 분기로 자동 inject → window.uat 즉시 노출.
//    이 파일은 legacy 사용자(콘솔 paste 흐름 선호) 위해 보존. 신규 helper는 console-tools.js에 추가.
//
// UAT 콘솔 헬퍼 — 시나리오에서 재사용하는 짧은 함수 모음
//
// 사용:
//   1. localhost:3000 에서 DevTools 콘솔 열기
//   2. 본 파일 전체 paste → window.uat 객체 노출
//   3. 시나리오 수행 시 uat.clearAll(), uat.forceFetch500('/api/templates') 등 호출
//
// 주의: 외부 출처 코드는 콘솔에 paste 금지. 본 파일은 자기 repo 내라 신뢰 OK.
window.uat = {
  // ⚠️ 모든 localStorage/세션/쿠키 삭제 + 새로고침. 데이터 날아감.
  clearAll() {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    window.location.reload();
  },

  // 익명 모드 여부
  isAnonymous() {
    return !localStorage.getItem("supabase_user_id");
  },

  // 특정 path를 포함한 fetch resource 호출 횟수
  countAPIcalls(path) {
    return performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes(path)).length;
  },

  // 특정 path 매칭된 fetch 요청을 강제로 500으로 응답. 복구 함수 반환.
  // 사용: const restore = uat.forceFetch500('/api/templates'); ... restore();
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

  // Supabase auth token 강제 만료 (cookie + localStorage 모두 삭제)
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

  // 데이터 통계 짧게 출력
  inspect() {
    const userId = localStorage.getItem("supabase_user_id");
    const academyId = userId
      ? localStorage.getItem(`active_academy:${userId}`)
      : null;
    let key = "classPlannerData:anonymous";
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
};
console.log("[uat-helpers] loaded:", Object.keys(window.uat));
