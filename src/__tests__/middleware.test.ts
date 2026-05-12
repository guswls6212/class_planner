import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function makeRequest(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(url, "http://localhost:3000"));
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

describe("onboarding middleware", () => {
  it("비로그인 사용자는 통과시킨다", () => {
    const res = middleware(makeRequest("/students"));
    expect(res.status).toBe(200);
  });

  it("로그인 + onboarded 쿠키가 있으면 통과시킨다", () => {
    const res = middleware(
      makeRequest("/students", {
        "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
        onboarded: "1",
      })
    );
    expect(res.status).toBe(200);
  });

  it("로그인 + onboarded 쿠키가 없으면 /onboarding으로 리디렉트한다", () => {
    const res = middleware(
      makeRequest("/schedule", {
        "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/onboarding");
  });

  it("제외 경로(/about)는 체크하지 않는다", () => {
    const res = middleware(
      makeRequest("/about", {
        "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
      })
    );
    expect(res.status).toBe(200);
  });

  it("/onboarding 경로 자체는 체크하지 않는다", () => {
    const res = middleware(
      makeRequest("/onboarding", {
        "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
      })
    );
    expect(res.status).toBe(200);
  });
});

describe("role-based route guard", () => {
  const SESSION_COOKIES = {
    "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
    onboarded: "1",
  };

  it("member 역할은 /students 접근 시 /schedule?toast=permission_denied 로 리디렉트", () => {
    const res = middleware(
      makeRequest("/students", { ...SESSION_COOKIES, user_role: "member" })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/schedule");
    expect(location).toContain("toast=permission_denied");
  });

  it("member 역할은 /subjects 접근 시 차단", () => {
    const res = middleware(
      makeRequest("/subjects", { ...SESSION_COOKIES, user_role: "member" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("toast=permission_denied");
  });

  it("member 역할은 /teachers 접근 시 차단", () => {
    const res = middleware(
      makeRequest("/teachers", { ...SESSION_COOKIES, user_role: "member" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("toast=permission_denied");
  });

  it("admin 역할은 /students 접근을 통과시킨다", () => {
    const res = middleware(
      makeRequest("/students", { ...SESSION_COOKIES, user_role: "admin" })
    );
    expect(res.status).toBe(200);
  });

  it("owner 역할은 /students 접근을 통과시킨다", () => {
    const res = middleware(
      makeRequest("/students", { ...SESSION_COOKIES, user_role: "owner" })
    );
    expect(res.status).toBe(200);
  });

  it("user_role 쿠키가 없으면(로딩 상태) /students 접근을 통과시킨다", () => {
    const res = middleware(makeRequest("/students", SESSION_COOKIES));
    expect(res.status).toBe(200);
  });

  it("member 역할이라도 /schedule 접근은 통과시킨다 (admin-only 라우트 아님)", () => {
    const res = middleware(
      makeRequest("/schedule", { ...SESSION_COOKIES, user_role: "member" })
    );
    expect(res.status).toBe(200);
  });
});

describe("design-explorations production guard", () => {
  // process.env.NODE_ENV는 module-level 상수처럼 사용되므로 vi.stubEnv로 동적 변경
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("production 환경", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });

    it("/design-explorations 루트 접근 시 404 반환", () => {
      const res = middleware(makeRequest("/design-explorations"));
      expect(res.status).toBe(404);
    });

    it("/design-explorations/notifications 접근 시 404 반환", () => {
      const res = middleware(makeRequest("/design-explorations/notifications"));
      expect(res.status).toBe(404);
    });

    it("/design-explorations/option-c 같은 기존 sibling 라우트도 차단", () => {
      const res = middleware(makeRequest("/design-explorations/option-c"));
      expect(res.status).toBe(404);
    });

    it("로그인 + onboarded 사용자도 동일하게 차단 (인증 무관)", () => {
      const res = middleware(
        makeRequest("/design-explorations/notifications", {
          "sb-iqzcnyujkagwgshbecpg-auth-token": "session-data",
          onboarded: "1",
        }),
      );
      expect(res.status).toBe(404);
    });

    it("/schedule 같은 다른 GUARDED 경로는 영향 없음 (비로그인 통과)", () => {
      const res = middleware(makeRequest("/schedule"));
      expect(res.status).toBe(200);
    });
  });

  describe("development / test 환경", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "development");
    });

    it("/design-explorations/notifications 접근 시 200 통과 (mockup 검토 가능)", () => {
      const res = middleware(makeRequest("/design-explorations/notifications"));
      expect(res.status).toBe(200);
    });

    it("/design-explorations 루트 접근 시 200 통과", () => {
      const res = middleware(makeRequest("/design-explorations"));
      expect(res.status).toBe(200);
    });
  });
});
