# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate logged-in users without an academy behind an `/onboarding` page (academy name + role input), using Next.js Middleware + cookie cache to avoid per-request DB overhead.

**Architecture:** Next.js Middleware checks an `onboarded` cookie for logged-in users on data pages (`/students`, `/subjects`, `/schedule`). Missing cookie triggers a one-time `GET /api/onboarding/status` call. No academy → redirect to `/onboarding`. The onboarding page POSTs academy name + role, sets the cookie, and redirects to `/students`.

**Tech Stack:** Next.js 15 Middleware, Supabase Auth cookies, React 19, Tailwind CSS 4

**Branch:** `feature/onboarding-flow` (already created from `dev`)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/middleware.ts` | Create | Onboarding guard — cookie check, status API fallback, redirect |
| `src/app/onboarding/page.tsx` | Create | Onboarding UI — academy name input, role radio, submit |
| `src/app/api/onboarding/route.ts` | Modify | Accept `academyName` + `role` params, set `onboarded` cookie |
| `src/app/api/onboarding/status/route.ts` | Create | GET endpoint — check academy existence, set cookie if found |
| `src/hooks/useGlobalDataInitialization.ts` | Modify | Remove auto-onboarding call (lines 139-153) |
| `src/components/organisms/LoginButton.tsx` | Modify | Clear `onboarded` cookie on logout |
| `src/app/login/page.tsx` | Modify | Unify redirect to `/` (already does this) |
| `src/app/api/onboarding/__tests__/route.test.ts` | Modify | Update tests for new params |
| `src/app/api/onboarding/status/__tests__/route.test.ts` | Create | Tests for status endpoint |
| `src/middleware.test.ts` | Create | Tests for middleware logic |

---

### Task 1: GET /api/onboarding/status endpoint

**Files:**
- Create: `src/app/api/onboarding/status/route.ts`
- Create: `src/app/api/onboarding/status/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/onboarding/status/__tests__/route.test.ts`:

```typescript
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMemberSelect = vi.fn();

vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          limit: () => ({
            single: mockMemberSelect,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GET /api/onboarding/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("userId가 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost:3000/api/onboarding/status");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("academy가 있는 사용자는 hasAcademy: true + Set-Cookie를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({
      data: { academy_id: "academy-123" },
      error: null,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=user-123"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(true);
    expect(data.academyId).toBe("academy-123");
    expect(res.headers.get("set-cookie")).toContain("onboarded=1");
  });

  it("academy가 없는 사용자는 hasAcademy: false를 반환한다", async () => {
    mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const req = new NextRequest(
      "http://localhost:3000/api/onboarding/status?userId=new-user"
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.hasAcademy).toBe(false);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/app/api/onboarding/status/__tests__/route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `src/app/api/onboarding/status/route.ts`:

```typescript
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();
    const { data } = await client
      .from("academy_members")
      .select("academy_id")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (data?.academy_id) {
      const response = NextResponse.json({
        success: true,
        hasAcademy: true,
        academyId: data.academy_id,
      });
      response.headers.set("set-cookie", ONBOARDED_COOKIE);
      return response;
    }

    return NextResponse.json({ success: true, hasAcademy: false });
  } catch (error) {
    logger.error("온보딩 상태 확인 오류", undefined, error as Error);
    return NextResponse.json(
      { success: false, error: "상태 확인 실패" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/app/api/onboarding/status/__tests__/route.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/onboarding/status/
git commit -m "feat(onboarding): add GET /api/onboarding/status endpoint"
```

---

### Task 2: Modify POST /api/onboarding to accept academyName + role

**Files:**
- Modify: `src/app/api/onboarding/route.ts`
- Modify: `src/app/api/onboarding/__tests__/route.test.ts`

- [ ] **Step 1: Update the existing test for new parameters**

In `src/app/api/onboarding/__tests__/route.test.ts`, update the "신규 사용자" test:

```typescript
// Change the request to include body with academyName and role:
const request = new NextRequest(
  "http://localhost:3000/api/onboarding?userId=new-user-id",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ academyName: "테스트학원", role: "owner" }),
  }
);
```

Add a new test for missing academyName:

```typescript
it("academyName이 없으면 400을 반환해야 한다", async () => {
  mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

  const request = new NextRequest(
    "http://localhost:3000/api/onboarding?userId=new-user-id",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

  const response = await POST(request);
  expect(response.status).toBe(400);
});
```

Add a test that the response includes Set-Cookie:

```typescript
it("신규 생성 시 onboarded 쿠키를 설정해야 한다", async () => {
  // Same setup as 신규 사용자 test...
  mockMemberSelect.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  mockGetById.mockResolvedValue({
    data: { user: { id: "new-user-id", email: "test@example.com", user_metadata: {} } },
    error: null,
  });
  mockAcademyInsert.mockResolvedValue({ data: { id: "new-academy-id" }, error: null });
  mockMemberInsert.mockImplementation((fn: (val: { error: null }) => unknown) => fn({ error: null }));

  const request = new NextRequest(
    "http://localhost:3000/api/onboarding?userId=new-user-id",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academyName: "테스트학원", role: "admin" }),
    }
  );

  const response = await POST(request);
  expect(response.headers.get("set-cookie")).toContain("onboarded=1");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- src/app/api/onboarding/__tests__/route.test.ts`
Expected: FAIL — new tests fail (no body parsing, no cookie)

- [ ] **Step 3: Modify the route implementation**

In `src/app/api/onboarding/route.ts`:

1. Add cookie constant at top:
```typescript
const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";
```

2. After the idempotency check returns `isNew: false`, add cookie:
```typescript
if (existing?.academy_id) {
  const response = NextResponse.json({
    success: true,
    academyId: existing.academy_id,
    isNew: false,
  });
  response.headers.set("set-cookie", ONBOARDED_COOKIE);
  return response;
}
```

3. After the idempotency check, parse request body and validate:
```typescript
const body = await request.json().catch(() => ({}));
const { academyName, role } = body as { academyName?: string; role?: string };

if (!academyName || academyName.trim().length < 2) {
  return NextResponse.json(
    { success: false, error: "학원명은 2글자 이상 입력해주세요." },
    { status: 400 }
  );
}

const validRoles = ["owner", "admin", "member"];
const selectedRole = validRoles.includes(role ?? "") ? role! : "owner";
```

4. Replace the auto academy name logic (delete lines 46-63 that fetch user metadata and compute `displayName`). Use `academyName.trim()` directly in the INSERT:
```typescript
const { data: academy, error: academyError } = await client
  .from("academies")
  .insert({
    name: academyName.trim(),
    created_by: userId,
  })
  .select("id")
  .single();
```

5. Use `selectedRole` in the member INSERT:
```typescript
const { error: memberError } = await client
  .from("academy_members")
  .insert({
    academy_id: academy.id,
    user_id: userId,
    role: selectedRole,
    invited_by: null,
  });
```

6. Add cookie to the 201 response:
```typescript
const response = NextResponse.json(
  { success: true, academyId: academy.id, isNew: true },
  { status: 201 }
);
response.headers.set("set-cookie", ONBOARDED_COOKIE);
return response;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- src/app/api/onboarding/__tests__/route.test.ts`
Expected: PASS (all tests including new ones)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/onboarding/
git commit -m "feat(onboarding): accept academyName + role, set onboarded cookie"
```

---

### Task 3: Next.js Middleware guard

**Files:**
- Create: `src/middleware.ts`
- Create: `src/__tests__/middleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/middleware.test.ts`:

```typescript
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
    // NextResponse.next() returns undefined status or 200
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeUndefined;
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/__tests__/middleware.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

/**
 * 온보딩 가드 Middleware.
 *
 * 로그인한 사용자가 데이터 페이지 접근 시 onboarded 쿠키를 확인한다.
 * 쿠키가 없으면 /onboarding으로 리디렉트한다.
 * 비로그인 사용자는 Anonymous-First 정책에 따라 그대로 통과시킨다.
 *
 * DB 오버헤드 0: 쿠키만 체크. 쿠키가 없는 기존 사용자는
 * /onboarding 페이지에서 GET /api/onboarding/status를 호출하여 쿠키를 복구한다.
 */

const GUARDED_PATHS = ["/students", "/subjects", "/schedule"];

function isGuardedPath(pathname: string): boolean {
  return GUARDED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function hasSupabaseSession(request: NextRequest): boolean {
  // Supabase JS SDK stores session in cookies prefixed with sb-{projectRef}-auth-token
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isGuardedPath(pathname)) {
    return NextResponse.next();
  }

  // 비로그인 → Anonymous-First 통과
  if (!hasSupabaseSession(request)) {
    return NextResponse.next();
  }

  // 로그인 + onboarded 쿠키 있음 → 통과
  if (request.cookies.get("onboarded")?.value === "1") {
    return NextResponse.next();
  }

  // 로그인 + 쿠키 없음 → /onboarding 리디렉트
  const onboardingUrl = new URL("/onboarding", request.url);
  return NextResponse.redirect(onboardingUrl);
}

export const config = {
  matcher: ["/students/:path*", "/subjects/:path*", "/schedule/:path*"],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/__tests__/middleware.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts src/__tests__/middleware.test.ts
git commit -m "feat(onboarding): add Next.js Middleware guard with cookie check"
```

---

### Task 4: /onboarding page UI

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create the onboarding page**

Create `src/app/onboarding/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

type Role = "owner" | "admin" | "member";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "원장", description: "학원 전체를 관리합니다" },
  { value: "admin", label: "강사", description: "수업과 학생을 관리합니다" },
  { value: "member", label: "직원", description: "시간표를 조회합니다" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [academyName, setAcademyName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;
      setUserId(uid);
      setUserName(
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        ""
      );

      // 이미 온보딩 완료된 사용자인지 확인
      try {
        const res = await fetch(
          `/api/onboarding/status?userId=${encodeURIComponent(uid)}`
        );
        const data = await res.json();
        if (data.hasAcademy) {
          router.replace("/schedule");
          return;
        }
      } catch {
        // status 확인 실패 시 폼 표시 (최악의 경우 중복 생성은 idempotency가 방어)
        logger.warn("온보딩 상태 확인 실패");
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [router]);

  const isValid = academyName.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !userId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/onboarding?userId=${encodeURIComponent(userId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ academyName: academyName.trim(), role }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "학원 생성에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }

      logger.info("온보딩 완료", { academyId: data.academyId });
      router.push("/students");
    } catch {
      setError("네트워크 연결을 확인해주세요.");
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">확인 중...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div
        className="bg-white w-full max-w-[440px] rounded-2xl p-10"
        style={{ boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)" }}
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          학원 정보 설정
        </h1>
        {userName && (
          <p className="text-gray-500 text-center mb-8">
            {userName}님, 환영합니다!
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* 학원명 입력 */}
          <div>
            <label
              htmlFor="academyName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              학원명
            </label>
            <input
              id="academyName"
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="예: 해피수학학원"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
              disabled={isSubmitting}
            />
            {academyName.length > 0 && academyName.trim().length < 2 && (
              <p className="text-red-500 text-sm mt-1">
                학원명은 2글자 이상 입력해주세요.
              </p>
            )}
          </div>

          {/* 역할 선택 */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              역할
            </legend>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === option.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={() => setRole(option.value)}
                    className="accent-purple-600"
                    disabled={isSubmitting}
                  />
                  <div>
                    <span className="font-medium text-gray-800">
                      {option.label}
                    </span>
                    <p className="text-sm text-gray-500">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* 에러 표시 */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm"
            >
              {error}
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isValid && !isSubmitting
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : undefined,
              backgroundColor: !isValid || isSubmitting ? "#d1d5db" : undefined,
            }}
          >
            {isSubmitting ? "생성 중..." : "시작하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat(onboarding): add /onboarding page with academy name + role form"
```

---

### Task 5: Remove auto-onboarding from useGlobalDataInitialization

**Files:**
- Modify: `src/hooks/useGlobalDataInitialization.ts`

- [ ] **Step 1: Remove the auto-onboarding call**

In `src/hooks/useGlobalDataInitialization.ts`, delete lines 139-153 (the `// 온보딩 확인` block):

```typescript
// DELETE THIS BLOCK:
// 온보딩 확인
try {
  const onboardingRes = await fetch(
    `/api/onboarding?userId=${encodeURIComponent(userId)}`,
    { method: "POST" }
  );
  const onboardingData = await onboardingRes.json();
  if (onboardingData.isNew) {
    logger.info("온보딩 완료 - 신규 사용자", {
      academyId: onboardingData.academyId,
    });
  }
} catch {
  logger.warn("온보딩 호출 실패 (기존 사용자이거나 네트워크 오류)");
}
```

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/hooks/__tests__/`
Expected: PASS (existing hook tests still pass)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGlobalDataInitialization.ts
git commit -m "refactor(init): remove auto-onboarding call (middleware guard handles it)"
```

---

### Task 6: Clear onboarded cookie on logout

**Files:**
- Modify: `src/components/organisms/LoginButton.tsx`

- [ ] **Step 1: Add cookie clearing to handleLogout**

In `src/components/organisms/LoginButton.tsx`, inside the `handleLogout` function, after `localStorage.removeItem("supabase_user_id")` (line 173), add:

```typescript
// onboarded 쿠키 삭제
document.cookie = "onboarded=; Path=/; Max-Age=0";
```

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/LoginButton.tsx
git commit -m "fix(auth): clear onboarded cookie on logout"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run all tests**

Run: `npm run check:quick`
Expected: tsc PASS, all tests PASS

- [ ] **Step 2: Run build**

Run: `npm run check`
Expected: tsc + tests + next build all PASS

- [ ] **Step 3: Update docs**

Update `UI_SPEC.md` — add `/onboarding` to §2 페이지별 UI:

```markdown
### 2.7 온보딩 (`/onboarding`)

**컴포넌트 트리:**
\```
OnboardingPage
  └── 카드형 중앙 정렬 UI (login과 동일 스타일)
        ├── "학원 정보 설정" 타이틀
        ├── 환영 메시지 (사용자 이름)
        ├── 학원명 입력 (필수, 2글자 이상)
        ├── 역할 선택 (라디오: 원장/강사/직원)
        └── "시작하기" 버튼 → /students 리디렉트
\```

- 비로그인 접근 → `/login` 리디렉트
- 이미 온보딩 완료 → `/schedule` 리디렉트
- Middleware가 `/students`, `/subjects`, `/schedule` 접근 시 온보딩 완료 여부 가드
```

Add `/onboarding` to §8 검증 라우트 매핑:

```markdown
| `src/app/onboarding/**` | `/onboarding` |
| `src/middleware.ts` | `/students`, `/subjects`, `/schedule` (가드) |
```

Update `ARCHITECTURE.md` — add `onboarding/page.tsx` to Pages section.

Update `tree.txt` — add `src/app/onboarding/page.tsx`, `src/middleware.ts`, `src/app/api/onboarding/status/`.

Update `TASKS.md` — mark onboarding as completed.

- [ ] **Step 4: Commit docs**

```bash
git add UI_SPEC.md ARCHITECTURE.md tree.txt TASKS.md
git commit -m "docs: add onboarding flow to UI_SPEC, ARCHITECTURE, tree.txt, TASKS"
```

- [ ] **Step 5: Push and create PR**

```bash
git push -u origin feature/onboarding-flow
gh pr create --base dev --title "feat: onboarding flow with Middleware guard + cookie cache" --body "..."
```

---

## Verification Checklist

After all tasks:
- [ ] `npm run check` passes (tsc + tests + build)
- [ ] Browser: New user login → redirected to `/onboarding`
- [ ] Browser: Enter academy name + role → redirected to `/students`
- [ ] Browser: Subsequent visits to `/schedule` → no redirect (cookie works)
- [ ] Browser: Logout → login as different user → redirected to `/onboarding`
- [ ] Browser: Anonymous user → `/schedule` works directly (no guard)
