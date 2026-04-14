import { describe, expect, it } from "vitest";
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
