import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "../route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/set-role-cookie", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/auth/set-role-cookie", () => {
  it("owner 역할을 받으면 user_role 쿠키를 설정한다", async () => {
    const res = await POST(makeRequest({ role: "owner" }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("user_role=owner");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Path=/");
  });

  it("admin 역할도 허용한다", async () => {
    const res = await POST(makeRequest({ role: "admin" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("user_role=admin");
  });

  it("member 역할도 허용한다", async () => {
    const res = await POST(makeRequest({ role: "member" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("user_role=member");
  });

  it("허용되지 않은 role 값은 400을 반환한다", async () => {
    const res = await POST(makeRequest({ role: "superuser" }));
    expect(res.status).toBe(400);
  });

  it("role 필드가 없으면 400을 반환한다", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("body가 JSON이 아니면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/set-role-cookie", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
