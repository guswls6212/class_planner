import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

/**
 * 회귀 가드 — middleware 의 member route-guard "쿠키 미설정 윈도우" 계약.
 *
 * 배경 (UAT 감사 finding S-20.3, uat-audit-findings-2026-05-30.md:428):
 *   user_role 쿠키는 useMyRole 훅이 비동기로 POST /api/auth/set-role-cookie 해서
 *   설정한다. 첫 로그인 / 쿠키 삭제 / set-role-cookie 완료 전 첫 네비게이션 시점엔
 *   쿠키가 아직 없다. 이 윈도우에서 member 가 /students 등 admin-only 경로에
 *   직접 진입하면 middleware 는 redirect 하지 **않고 통과**시킨다.
 *
 *   이는 의도된 동작이다 (middleware.ts docstring): middleware 는 UX 가이드일 뿐
 *   보안 경계가 아니다. 진짜 권한 강제는 페이지 UI (canManage=false) + API 계층의
 *   requireRole(403) 이 담당한다. 따라서 쿠키 없으면 통과 = 정상.
 *
 * 이 spec 이 잠그는 계약:
 *   1. user_role 쿠키 부재/빈문자열 → admin-only 경로 통과 (200, redirect 안 함)
 *   2. user_role === "member" 명시 → admin-only 경로 차단 (307 → /schedule?toast=permission_denied)
 *   3. /schedule 은 admin-only 아님 → member 도 항상 통과
 *
 * 회귀 시나리오: 누군가 middleware 를 "보안 경계"로 오인해 쿠키 부재 시 차단(redirect)
 * 하도록 바꾸면 (1) 이 깨진다 — 첫 진입 윈도우에서 정상 사용자를 잘못 튕긴다.
 * 반대로 쿠키=member 차단 로직을 제거하면 (2) 가 깨진다.
 *
 * cf. 기존 src/__tests__/middleware.test.ts 는 단일 케이스만 커버 — 본 spec 은
 * admin-only 3 경로 × 쿠키 상태 매트릭스로 윈도우 계약을 명시 고정.
 */

const SESSION_COOKIE = "sb-iqzcnyujkagwgshbecpg-auth-token";

function makeRequest(
  url: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const req = new NextRequest(new URL(url, "http://localhost:3000"));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

// 로그인 + 온보딩 완료 — role 체크 단계까지 도달시키는 baseline.
// (onboarded 쿠키가 없으면 role 체크 전에 /onboarding 으로 먼저 튕기므로 필수)
const ONBOARDED_SESSION: Record<string, string> = {
  [SESSION_COOKIE]: "session-data",
  onboarded: "1",
};

const ADMIN_ONLY_PATHS = ["/students", "/subjects", "/teachers"] as const;

describe("middleware — member route-guard 쿠키 미설정 윈도우 (S-20.3 회귀 가드)", () => {
  describe("쿠키 미설정 윈도우 → admin-only 경로 통과 (의도된 동작, 보안 경계 아님)", () => {
    for (const path of ADMIN_ONLY_PATHS) {
      it(`user_role 쿠키 부재 시 ${path} 통과 (200, redirect 안 함)`, () => {
        const res = middleware(makeRequest(path, ONBOARDED_SESSION));
        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
      });

      it(`user_role 빈 문자열(쿠키 부분 기록 중)이면 ${path} 통과`, () => {
        const res = middleware(
          makeRequest(path, { ...ONBOARDED_SESSION, user_role: "" })
        );
        expect(res.status).toBe(200);
        expect(res.headers.get("location")).toBeNull();
      });
    }

    it("nested admin-only 경로(/students/123)도 쿠키 부재 시 통과", () => {
      const res = middleware(makeRequest("/students/123", ONBOARDED_SESSION));
      expect(res.status).toBe(200);
    });
  });

  describe("쿠키 설정 완료 후 → member 차단 (steady-state)", () => {
    for (const path of ADMIN_ONLY_PATHS) {
      it(`user_role=member 이면 ${path} 차단 → /schedule?toast=permission_denied`, () => {
        const res = middleware(
          makeRequest(path, { ...ONBOARDED_SESSION, user_role: "member" })
        );
        expect(res.status).toBe(307);
        const location = res.headers.get("location") ?? "";
        expect(location).toContain("/schedule");
        expect(location).toContain("toast=permission_denied");
      });
    }

    it("nested admin-only 경로(/students/123)도 member 면 차단", () => {
      const res = middleware(
        makeRequest("/students/123", {
          ...ONBOARDED_SESSION,
          user_role: "member",
        })
      );
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toContain("toast=permission_denied");
    });
  });

  describe("admin-only 가 아닌 경로는 윈도우 무관 (member 도 통과)", () => {
    it("user_role=member 라도 /schedule 은 통과", () => {
      const res = middleware(
        makeRequest("/schedule", { ...ONBOARDED_SESSION, user_role: "member" })
      );
      expect(res.status).toBe(200);
    });

    it("user_role 부재여도 /schedule 은 통과", () => {
      const res = middleware(makeRequest("/schedule", ONBOARDED_SESSION));
      expect(res.status).toBe(200);
    });
  });

  describe("윈도우 계약 경계 — admin/owner 는 항상 통과", () => {
    it("user_role=admin 이면 /students 통과", () => {
      const res = middleware(
        makeRequest("/students", { ...ONBOARDED_SESSION, user_role: "admin" })
      );
      expect(res.status).toBe(200);
    });

    it("user_role=owner 이면 /students 통과", () => {
      const res = middleware(
        makeRequest("/students", { ...ONBOARDED_SESSION, user_role: "owner" })
      );
      expect(res.status).toBe(200);
    });
  });

  describe("선행 가드 우선순위 — 온보딩 미완료가 role 체크보다 먼저", () => {
    it("member 라도 onboarded 쿠키 없으면 role 차단 전에 /onboarding 으로 먼저 redirect", () => {
      const res = middleware(
        makeRequest("/students", {
          [SESSION_COOKIE]: "session-data",
          user_role: "member",
        })
      );
      expect(res.status).toBe(307);
      // permission_denied 가 아니라 onboarding 으로 — 가드 순서 검증
      expect(res.headers.get("location")).toContain("/onboarding");
    });

    it("비로그인(세션 쿠키 없음)은 Anonymous-First 로 통과 — role 체크 자체에 도달 안 함", () => {
      const res = middleware(makeRequest("/students", { user_role: "member" }));
      expect(res.status).toBe(200);
    });
  });
});
