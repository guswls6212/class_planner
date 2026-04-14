# Member Invite Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학원 owner/admin이 초대 링크를 생성하여 공유하고, 초대받은 사람이 로그인 후 1클릭으로 academy 멤버로 합류할 수 있게 한다.

**Architecture:** invite_tokens 전용 테이블로 1회용 7일 만료 토큰 관리. API Routes는 getServiceRoleClient()를 직접 사용하는 온보딩 패턴 踏襲. /settings 페이지와 /invite/[token] 페이지를 신규로 추가.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL + service role), Tailwind CSS 4, Vitest + React Testing Library

**Branch:** `feature/member-invite`

---

## File Map

**New files:**
- `migration/migrations/020_create_invite_tokens.sql`
- `migration/migrations/021_academy_members_delete_policy.sql`
- `src/lib/resolveAcademyMembership.ts` — userId → { academyId, role }
- `src/lib/__tests__/resolveAcademyMembership.test.ts`
- `src/app/api/invites/route.ts` — GET (list), POST (create)
- `src/app/api/invites/__tests__/route.test.ts`
- `src/app/api/invites/[id]/route.ts` — DELETE (cancel)
- `src/app/api/invites/[id]/__tests__/route.test.ts`
- `src/app/api/invites/accept/route.ts` — POST (accept)
- `src/app/api/invites/accept/__tests__/route.test.ts`
- `src/app/api/invites/check/route.ts` — GET public (token info for invite page)
- `src/app/api/invites/check/__tests__/route.test.ts`
- `src/app/api/members/route.ts` — GET (list members)
- `src/app/api/members/[userId]/route.ts` — DELETE (remove member)
- `src/app/api/members/__tests__/route.test.ts`
- `src/app/settings/page.tsx`
- `src/app/settings/__tests__/page.test.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/app/invite/[token]/__tests__/page.test.tsx`

**Modified files:**
- `src/app/layout.tsx` — navItems에 설정(/settings) 링크 추가
- `ARCHITECTURE.md` — invite_tokens 테이블, /settings, /invite 라우트 추가
- `UI_SPEC.md` — 신규 컴포넌트 인벤토리 추가
- `TASKS.md` — 체크박스 업데이트
- `tree.txt` — 파일 구조 업데이트

---

## Task 1: DB Migrations

**Files:**
- Create: `migration/migrations/020_create_invite_tokens.sql`
- Create: `migration/migrations/021_academy_members_delete_policy.sql`

- [ ] **Step 1: Create 020_create_invite_tokens.sql**

```sql
-- Migration: 020_create_invite_tokens.sql
-- Description: 초대 토큰 테이블 생성 (운영자 초대 기능)

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id UUID NOT NULL REFERENCES public.academies(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role       TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_academy_id ON public.invite_tokens(academy_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON public.invite_tokens(token);

-- RLS 활성화
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- SELECT: 해당 academy의 owner/admin만 조회 가능
CREATE POLICY "invite_tokens_select_by_academy_admins"
  ON public.invite_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- INSERT: 해당 academy의 owner/admin만 생성 가능
CREATE POLICY "invite_tokens_insert_by_academy_admins"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: 해당 academy의 owner/admin만 삭제 가능
CREATE POLICY "invite_tokens_delete_by_academy_admins"
  ON public.invite_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members
      WHERE academy_id = invite_tokens.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

- [ ] **Step 2: Create 021_academy_members_delete_policy.sql**

```sql
-- Migration: 021_academy_members_delete_policy.sql
-- Description: academy_members에 DELETE 정책 추가 (owner가 멤버 제거)

-- owner만 다른 멤버를 제거할 수 있다. 본인 제거는 API 레벨에서 차단.
CREATE POLICY "academy_members_delete_by_owner"
  ON public.academy_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.academy_members am
      WHERE am.academy_id = academy_members.academy_id
        AND am.user_id = auth.uid()
        AND am.role = 'owner'
    )
  );
```

- [ ] **Step 3: Apply migrations via Supabase MCP**

Apply 020 first, then 021. Both via `mcp__claude_ai_Supabase__apply_migration` with project_id `iqzcnyujkagwgshbecpg`.

- [ ] **Step 4: Verify tables**

Run `mcp__claude_ai_Supabase__list_tables` and confirm `invite_tokens` appears in the list.

---

## Task 2: resolveAcademyMembership helper

**Files:**
- Create: `src/lib/resolveAcademyMembership.ts`
- Create: `src/lib/__tests__/resolveAcademyMembership.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/resolveAcademyMembership.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAcademyMembership } from "../resolveAcademyMembership";

vi.mock("../supabaseServiceRole", () => ({
  getServiceRoleClient: vi.fn(),
}));

import { getServiceRoleClient } from "../supabaseServiceRole";

describe("resolveAcademyMembership", () => {
  const mockClient = {
    from: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceRoleClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);
  });

  it("academyId와 role을 반환한다", async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { academy_id: "academy-123", role: "owner" },
              error: null,
            }),
          }),
        }),
      }),
    });

    const result = await resolveAcademyMembership("user-123");
    expect(result).toEqual({ academyId: "academy-123", role: "owner" });
  });

  it("academy가 없으면 에러를 던진다", async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error("not found"),
            }),
          }),
        }),
      }),
    });

    await expect(resolveAcademyMembership("user-xyz")).rejects.toThrow(
      "온보딩이 완료되지 않은 사용자"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npx vitest run src/lib/__tests__/resolveAcademyMembership.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement resolveAcademyMembership**

```typescript
// src/lib/resolveAcademyMembership.ts
import { getServiceRoleClient } from "./supabaseServiceRole";

export interface AcademyMembership {
  academyId: string;
  role: string;
}

/**
 * userId로 소속 academyId와 role을 함께 반환한다.
 * 초대/멤버 관리 API에서 권한 체크와 academyId 조회를 한 번에 처리하기 위해 사용.
 *
 * @throws userId에 매핑된 academy가 없으면 에러
 */
export async function resolveAcademyMembership(
  userId: string
): Promise<AcademyMembership> {
  const client = getServiceRoleClient();

  const { data, error } = await client
    .from("academy_members")
    .select("academy_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(
      `사용자(${userId})에 매핑된 학원을 찾을 수 없습니다. 온보딩이 완료되지 않은 사용자입니다.`
    );
  }

  return { academyId: data.academy_id as string, role: data.role as string };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/lib/__tests__/resolveAcademyMembership.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/resolveAcademyMembership.ts src/lib/__tests__/resolveAcademyMembership.test.ts
git commit -m "feat(invite): add resolveAcademyMembership helper"
```

---

## Task 3: GET + POST /api/invites

**Files:**
- Create: `src/app/api/invites/route.ts`
- Create: `src/app/api/invites/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/invites/__tests__/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMembership = vi.fn();
vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET, POST } from "../route";

describe("GET /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 pending 초대 목록을 조회할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockResolvedValue({
              data: [
                { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14" },
              ],
              error: null,
            }),
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].role).toBe("admin");
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("userId 없으면 400을 반환한다", async () => {
    const req = new NextRequest("http://localhost/api/invites");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/invites", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 admin 역할 초대 토큰을 생성할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", token: "abc123", role: "admin", expires_at: "2099-01-01", created_at: "2026-04-14" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBe("abc123");
  });

  it("잘못된 role은 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "owner" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites?userId=user-1", {
      method: "POST",
      body: JSON.stringify({ role: "admin" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/invites/__tests__/route.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement GET + POST /api/invites**

```typescript
// src/app/api/invites/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

function canManageInvites(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageInvites(role)) {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from("invite_tokens")
      .select("id, token, role, expires_at, created_at")
      .eq("academy_id", academyId)
      .is("used_by", null)
      .gt("expires_at", now);

    if (error) {
      logger.error("초대 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 목록 조회에 실패했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (error) {
    logger.error("GET /api/invites 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (!canManageInvites(role)) {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { role: inviteRole } = body as { role?: string };

    if (!inviteRole || !["admin", "member"].includes(inviteRole)) {
      return NextResponse.json(
        { success: false, error: "role은 'admin' 또는 'member'여야 합니다." },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("invite_tokens")
      .insert({
        academy_id: academyId,
        role: inviteRole,
        created_by: userId,
      })
      .select("id, token, role, expires_at, created_at")
      .single();

    if (error || !data) {
      logger.error("초대 토큰 생성 실패", { userId, academyId }, error as Error);
      return NextResponse.json({ success: false, error: "초대 링크 생성에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 토큰 생성", { userId, academyId, role: inviteRole });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    logger.error("POST /api/invites 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/invites/__tests__/route.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invites/route.ts src/app/api/invites/__tests__/route.test.ts
git commit -m "feat(invite): add GET/POST /api/invites"
```

---

## Task 4: DELETE /api/invites/[id] + GET /api/invites/check

**Files:**
- Create: `src/app/api/invites/[id]/route.ts`
- Create: `src/app/api/invites/[id]/__tests__/route.test.ts`
- Create: `src/app/api/invites/check/route.ts`
- Create: `src/app/api/invites/check/__tests__/route.test.ts`

- [ ] **Step 1: Write failing tests for DELETE /api/invites/[id]**

```typescript
// src/app/api/invites/[id]/__tests__/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMembership = vi.fn();
vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { DELETE } from "../route";

describe("DELETE /api/invites/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 초대를 취소할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", academy_id: "acad-1", used_by: null },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(200);
  });

  it("이미 사용된 초대는 410을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "tok-1", academy_id: "acad-1", used_by: "some-user" },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(410);
  });

  it("member는 403을 받는다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "member" });
    const req = new NextRequest("http://localhost/api/invites/tok-1?userId=user-1");
    const res = await DELETE(req, { params: Promise.resolve({ id: "tok-1" }) });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Write failing tests for GET /api/invites/check**

```typescript
// src/app/api/invites/check/__tests__/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockFrom = vi.fn();
vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET } from "../route";

describe("GET /api/invites/check", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 토큰이면 초대 정보를 반환한다", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              role: "admin",
              expires_at: futureDate,
              used_by: null,
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=abc123");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(body.academyName).toBe("수학의 정석");
    expect(body.role).toBe("admin");
  });

  it("만료된 토큰은 valid:false를 반환한다", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              role: "admin",
              expires_at: pastDate,
              used_by: null,
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=abc123");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.valid).toBe(false);
    expect(body.reason).toBe("expired");
  });

  it("없는 토큰은 404를 반환한다", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/invites/check?token=notexist");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/app/api/invites/[id]/__tests__/route.test.ts src/app/api/invites/check/__tests__/route.test.ts
```

- [ ] **Step 4: Implement DELETE /api/invites/[id]**

```typescript
// src/app/api/invites/[id]/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const { id } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(userId);

    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ success: false, error: "초대 권한이 없습니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();

    // 토큰 존재 + 미사용 확인
    const { data: token, error: fetchError } = await client
      .from("invite_tokens")
      .select("id, academy_id, used_by")
      .eq("id", id)
      .single();

    if (fetchError || !token) {
      return NextResponse.json({ success: false, error: "초대를 찾을 수 없습니다." }, { status: 404 });
    }

    if (token.academy_id !== academyId) {
      return NextResponse.json({ success: false, error: "접근 권한이 없습니다." }, { status: 403 });
    }

    if (token.used_by) {
      return NextResponse.json({ success: false, error: "이미 사용된 초대입니다." }, { status: 410 });
    }

    const { error: deleteError } = await client
      .from("invite_tokens")
      .delete()
      .eq("id", id);

    if (deleteError) {
      logger.error("초대 취소 실패", { id }, deleteError as Error);
      return NextResponse.json({ success: false, error: "초대 취소에 실패했습니다." }, { status: 500 });
    }

    logger.info("초대 취소", { id, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/invites/[id] 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Implement GET /api/invites/check**

```typescript
// src/app/api/invites/check/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, reason: "missing_token" }, { status: 400 });
    }

    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("invite_tokens")
      .select("id, role, expires_at, used_by, academies(name)")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    if (data.used_by) {
      return NextResponse.json({ valid: false, reason: "used" });
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    const academyName = (data.academies as { name: string } | null)?.name ?? "";

    return NextResponse.json({
      valid: true,
      id: data.id,
      role: data.role,
      academyName,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    logger.error("GET /api/invites/check 오류", undefined, error as Error);
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/app/api/invites/[id]/__tests__/route.test.ts src/app/api/invites/check/__tests__/route.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/api/invites/[id]/route.ts src/app/api/invites/[id]/__tests__/route.test.ts \
        src/app/api/invites/check/route.ts src/app/api/invites/check/__tests__/route.test.ts
git commit -m "feat(invite): add DELETE /api/invites/[id] and GET /api/invites/check"
```

---

## Task 5: POST /api/invites/accept

**Files:**
- Create: `src/app/api/invites/accept/route.ts`
- Create: `src/app/api/invites/accept/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/invites/accept/__tests__/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockFrom = vi.fn();
vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { POST } from "../route";

const VALID_FUTURE = new Date(Date.now() + 86400000).toISOString();

describe("POST /api/invites/accept", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 토큰으로 멤버 가입 성공", async () => {
    // Step 1: token lookup
    const mockSelect = vi.fn();
    const mockInsert = vi.fn();
    const mockUpdate = vi.fn();

    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { select: mockSelect, insert: mockInsert, update: mockUpdate };
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.academyId).toBe("acad-1");
  });

  it("이미 멤버인 경우 멱등 처리", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "invite_tokens") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "tok-1",
                  academy_id: "acad-1",
                  role: "admin",
                  expires_at: VALID_FUTURE,
                  used_by: null,
                  created_by: "owner-user",
                  academies: { name: "수학의 정석" },
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "academy_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { academy_id: "acad-1", role: "admin" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const req = new NextRequest("http://localhost/api/invites/accept?userId=existing-user", {
      method: "POST",
      body: JSON.stringify({ token: "abc123" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alreadyMember).toBe(true);
  });

  it("만료된 토큰은 410 반환", async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "tok-1",
              academy_id: "acad-1",
              role: "admin",
              expires_at: pastDate,
              used_by: null,
              created_by: "owner-user",
              academies: { name: "수학의 정석" },
            },
            error: null,
          }),
        }),
      }),
    }));

    const req = new NextRequest("http://localhost/api/invites/accept?userId=new-user", {
      method: "POST",
      body: JSON.stringify({ token: "expired" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("userId 없으면 400 반환", async () => {
    const req = new NextRequest("http://localhost/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token: "abc" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/invites/accept/__tests__/route.test.ts
```

- [ ] **Step 3: Implement POST /api/invites/accept**

```typescript
// src/app/api/invites/accept/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const ONBOARDED_COOKIE = "onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json({ success: false, error: "token is required" }, { status: 400 });
    }

    const client = getServiceRoleClient();

    // 1. 토큰 조회 + 학원명 join
    const { data: inviteData, error: tokenError } = await client
      .from("invite_tokens")
      .select("id, academy_id, role, expires_at, used_by, created_by, academies(name)")
      .eq("token", token)
      .single();

    if (tokenError || !inviteData) {
      return NextResponse.json({ success: false, error: "유효하지 않은 초대 링크입니다." }, { status: 404 });
    }

    if (inviteData.used_by) {
      return NextResponse.json({ success: false, error: "이미 사용된 초대 링크입니다." }, { status: 410 });
    }

    if (new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "만료된 초대 링크입니다." }, { status: 410 });
    }

    // 2. 이미 멤버인지 확인 (멱등)
    const { data: existingMember } = await client
      .from("academy_members")
      .select("academy_id, role")
      .eq("user_id", userId)
      .eq("academy_id", inviteData.academy_id)
      .single();

    if (existingMember) {
      const response = NextResponse.json({
        success: true,
        academyId: inviteData.academy_id,
        alreadyMember: true,
      });
      response.headers.set("set-cookie", ONBOARDED_COOKIE);
      return response;
    }

    // 3. academy_members INSERT
    const { error: insertError } = await client
      .from("academy_members")
      .insert({
        academy_id: inviteData.academy_id,
        user_id: userId,
        role: inviteData.role,
        invited_by: inviteData.created_by,
      });

    if (insertError) {
      logger.error("멤버 가입 실패", { userId, academyId: inviteData.academy_id }, insertError as Error);
      return NextResponse.json({ success: false, error: "멤버 등록에 실패했습니다." }, { status: 500 });
    }

    // 4. 토큰 사용 처리
    await client
      .from("invite_tokens")
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq("id", inviteData.id);

    logger.info("초대 수락 완료", {
      userId,
      academyId: inviteData.academy_id,
      role: inviteData.role,
    });

    const response = NextResponse.json({
      success: true,
      academyId: inviteData.academy_id,
      academyName: (inviteData.academies as { name: string } | null)?.name ?? "",
    });
    response.headers.set("set-cookie", ONBOARDED_COOKIE);
    return response;
  } catch (error) {
    logger.error("POST /api/invites/accept 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/invites/accept/__tests__/route.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invites/accept/route.ts src/app/api/invites/accept/__tests__/route.test.ts
git commit -m "feat(invite): add POST /api/invites/accept"
```

---

## Task 6: GET /api/members + DELETE /api/members/[userId]

**Files:**
- Create: `src/app/api/members/route.ts`
- Create: `src/app/api/members/[userId]/route.ts`
- Create: `src/app/api/members/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/app/api/members/__tests__/route.test.ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

const mockMembership = vi.fn();
vi.mock("@/lib/resolveAcademyMembership", () => ({
  resolveAcademyMembership: mockMembership,
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabaseServiceRole", () => ({
  getServiceRoleClient: () => ({ from: mockFrom }),
}));

import { GET } from "../route";
import { DELETE } from "../[userId]/route";

describe("GET /api/members", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("멤버 목록을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { user_id: "u1", role: "owner", joined_at: "2026-04-01", users: { email: "owner@test.com", raw_user_meta_data: { full_name: "김원장" } } },
              { user_id: "u2", role: "admin", joined_at: "2026-04-10", users: { email: "admin@test.com", raw_user_meta_data: { full_name: "박강사" } } },
            ],
            error: null,
          }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/members?userId=u1");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].role).toBe("owner");
  });
});

describe("DELETE /api/members/[userId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("owner가 다른 멤버를 제거할 수 있다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const req = new NextRequest("http://localhost/api/members/u2?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u2" }) });
    expect(res.status).toBe(200);
  });

  it("owner가 본인을 제거하려 하면 400을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "owner" });

    const req = new NextRequest("http://localhost/api/members/u1?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u1" }) });
    expect(res.status).toBe(400);
  });

  it("owner가 아니면 403을 반환한다", async () => {
    mockMembership.mockResolvedValue({ academyId: "acad-1", role: "admin" });

    const req = new NextRequest("http://localhost/api/members/u2?userId=u1");
    const res = await DELETE(req, { params: Promise.resolve({ userId: "u2" }) });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/api/members/__tests__/route.test.ts
```

- [ ] **Step 3: Implement GET /api/members**

```typescript
// src/app/api/members/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const { academyId } = await resolveAcademyMembership(userId);
    const client = getServiceRoleClient();

    const { data, error } = await client
      .from("academy_members")
      .select("user_id, role, joined_at, users:user_id(email, raw_user_meta_data)")
      .eq("academy_id", academyId)
      .order("joined_at");

    if (error) {
      logger.error("멤버 목록 조회 실패", { userId }, error as Error);
      return NextResponse.json({ success: false, error: "멤버 목록 조회에 실패했습니다." }, { status: 500 });
    }

    const members = (data ?? []).map((row: any) => ({
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      email: row.users?.email ?? null,
      name: row.users?.raw_user_meta_data?.full_name ?? null,
    }));

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    logger.error("GET /api/members 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement DELETE /api/members/[userId]**

```typescript
// src/app/api/members/[userId]/route.ts
import { getServiceRoleClient } from "@/lib/supabaseServiceRole";
import { resolveAcademyMembership } from "@/lib/resolveAcademyMembership";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get("userId");
    const { userId: targetUserId } = await params;

    if (!requesterId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    if (requesterId === targetUserId) {
      return NextResponse.json({ success: false, error: "원장 본인은 제거할 수 없습니다." }, { status: 400 });
    }

    const { academyId, role } = await resolveAcademyMembership(requesterId);

    if (role !== "owner") {
      return NextResponse.json({ success: false, error: "멤버 제거는 원장만 가능합니다." }, { status: 403 });
    }

    const client = getServiceRoleClient();

    const { error } = await client
      .from("academy_members")
      .delete()
      .eq("academy_id", academyId)
      .eq("user_id", targetUserId);

    if (error) {
      logger.error("멤버 제거 실패", { requesterId, targetUserId }, error as Error);
      return NextResponse.json({ success: false, error: "멤버 제거에 실패했습니다." }, { status: 500 });
    }

    logger.info("멤버 제거 완료", { requesterId, targetUserId, academyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/members/[userId] 오류", undefined, error as Error);
    return NextResponse.json({ success: false, error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/app/api/members/__tests__/route.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/members/route.ts src/app/api/members/[userId]/route.ts \
        src/app/api/members/__tests__/route.test.ts
git commit -m "feat(invite): add GET /api/members and DELETE /api/members/[userId]"
```

---

## Task 7: /settings page

**Files:**
- Create: `src/app/settings/page.tsx`
- Create: `src/app/settings/__tests__/page.test.tsx`

- [ ] **Step 1: Write basic failing tests**

```typescript
// src/app/settings/__tests__/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      }),
    },
  },
}));

global.fetch = vi.fn();

describe("Settings Page", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("페이지 제목이 렌더된다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("학원 설정")).toBeInTheDocument();
    });
  });

  it("초대하기 버튼이 존재한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("+ 초대하기")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/settings/__tests__/page.test.tsx
```

- [ ] **Step 3: Implement /settings/page.tsx**

```typescript
// src/app/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { logger } from "../../lib/logger";

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

interface Member {
  userId: string;
  role: string;
  email: string | null;
  name: string | null;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [myRole, setMyRole] = useState<string>("member");
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
    });
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/members?userId=${userId}`),
        fetch(`/api/invites?userId=${userId}`),
      ]);

      if (membersRes.ok) {
        const { data } = await membersRes.json();
        setMembers(data ?? []);
        const me = (data ?? []).find((m: Member) => m.userId === userId);
        if (me) setMyRole(me.role);
      }

      if (invitesRes.ok) {
        const { data } = await invitesRes.json();
        setInvites(data ?? []);
      }
    } catch (err) {
      logger.error("설정 데이터 로드 실패", undefined, err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  const handleCreateInvite = async () => {
    if (!userId) return;
    setIsCreatingInvite(true);
    try {
      const res = await fetch(`/api/invites?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const link = `${window.location.origin}/invite/${data.data.token}`;
        setGeneratedLink(link);
        await fetchData();
      }
    } catch (err) {
      logger.error("초대 링크 생성 실패", undefined, err as Error);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    if (!userId) return;
    await fetch(`/api/invites/${id}?userId=${userId}`, { method: "DELETE" });
    await fetchData();
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!userId || !confirm("이 멤버를 제거하시겠습니까?")) return;
    await fetch(`/api/members/${targetUserId}?userId=${userId}`, { method: "DELETE" });
    await fetchData();
  };

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowInviteModal(false);
    setGeneratedLink(null);
    setInviteRole("member");
    setCopied(false);
  };

  const canManage = myRole === "owner" || myRole === "admin";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">학원 설정</h1>

      {/* 멤버 섹션 */}
      <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 mb-4 border border-[var(--color-border)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            멤버 ({members.length}명)
          </h2>
          {canManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              + 초대하기
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.userId}
              className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-bg-primary)]"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {member.name || member.email || member.userId.slice(0, 8)}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    member.role === "owner"
                      ? "bg-purple-100 text-purple-700"
                      : member.role === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ROLE_LABEL[member.role] ?? member.role}
                </span>
                {member.userId === userId && (
                  <span className="text-xs text-[var(--color-text-secondary)]">본인</span>
                )}
              </div>
              {myRole === "owner" && member.userId !== userId && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="text-xs px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                >
                  제거
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 대기 중인 초대 섹션 */}
      {canManage && invites.length > 0 && (
        <section className="bg-[var(--color-bg-secondary)] rounded-xl p-5 border border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            대기 중인 초대 ({invites.length}개)
          </h2>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => {
              const link = `${window.location.origin}/invite/${invite.token}`;
              return (
                <div
                  key={invite.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <div>
                    <span className="text-sm text-amber-800">
                      {ROLE_LABEL[invite.role] ?? invite.role} 역할 초대
                    </span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      만료: {new Date(invite.expiresAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(link)}
                      className="text-xs px-3 py-1 border border-gray-300 text-[var(--color-text-secondary)] rounded-md hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      📋 복사
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 초대 모달 */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl p-7 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-1">멤버 초대</h3>
            <p className="text-sm text-gray-500 mb-5">초대 링크를 생성하여 공유하세요</p>

            {!generatedLink ? (
              <>
                <fieldset className="mb-5">
                  <legend className="text-sm font-medium text-gray-700 mb-2">역할 선택</legend>
                  <div className="flex gap-3">
                    {(["member", "admin"] as const).map((r) => (
                      <label
                        key={r}
                        className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-colors ${
                          inviteRole === r
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="inviteRole"
                          value={r}
                          checked={inviteRole === r}
                          onChange={() => setInviteRole(r)}
                          className="sr-only"
                        />
                        <div className="font-medium text-sm text-gray-800">{ROLE_LABEL[r]}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {r === "member" ? "시간표 조회" : "학생·수업 관리 + 초대"}
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    disabled={isCreatingInvite}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isCreatingInvite ? "생성 중..." : "링크 생성"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-gray-700 block mb-2">초대 링크</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500 truncate border border-gray-200">
                    {generatedLink}
                  </div>
                  <button
                    onClick={() => handleCopyLink(generatedLink)}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 whitespace-nowrap"
                  >
                    {copied ? "복사됨!" : "📋 복사"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-5">7일 후 만료 · 1회만 사용 가능</p>
                <button
                  onClick={closeModal}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/settings/__tests__/page.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/settings/__tests__/page.test.tsx
git commit -m "feat(invite): add /settings page with member list and invite modal"
```

---

## Task 8: /invite/[token] page

**Files:**
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/app/invite/[token]/__tests__/page.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// src/app/invite/[token]/__tests__/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithOAuth: vi.fn(),
    },
  },
}));

global.fetch = vi.fn();

describe("Invite Accept Page", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 초대 링크면 학원명과 역할을 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        academyName: "수학의 정석",
        role: "admin",
        expiresAt: "2099-01-01",
      }),
    });

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "abc123" })} />);

    await waitFor(() => {
      expect(screen.getByText("수학의 정석")).toBeInTheDocument();
    });
  });

  it("만료된 초대면 에러 메시지를 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, reason: "expired" }),
    });

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "expired-token" })} />);

    await waitFor(() => {
      expect(screen.getByText(/만료/)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run "src/app/invite/\[token\]/__tests__/page.test.tsx"
```

- [ ] **Step 3: Implement /invite/[token]/page.tsx**

```typescript
// src/app/invite/[token]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { logger } from "../../../lib/logger";

const ROLE_LABEL: Record<string, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

const PENDING_INVITE_KEY = "pending_invite_token";

interface InviteInfo {
  valid: boolean;
  reason?: string;
  id?: string;
  role?: string;
  academyName?: string;
  expiresAt?: string;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // token 파라미터 추출
  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  // 초대 정보 + 로그인 상태 로드
  useEffect(() => {
    if (!token) return;

    const init = async () => {
      setIsLoading(true);
      try {
        const [inviteRes, sessionData] = await Promise.all([
          fetch(`/api/invites/check?token=${token}`).then((r) => r.json()),
          supabase.auth.getSession(),
        ]);

        setInvite(inviteRes);
        if (sessionData.data.session?.user.id) {
          setUserId(sessionData.data.session.user.id);
        }

        // OAuth 리다이렉트 후 자동 수락 체크
        const pendingToken = localStorage.getItem(PENDING_INVITE_KEY);
        if (pendingToken === token && sessionData.data.session?.user.id) {
          localStorage.removeItem(PENDING_INVITE_KEY);
          // 자동 수락 실행 (로그인 후 돌아온 케이스)
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [token]);

  const handleLogin = async (provider: "google" | "kakao") => {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  };

  const handleAccept = async () => {
    if (!userId || !token) return;
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/invites/accept?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        logger.info("초대 수락 완료", { academyId: data.academyId });
        router.push("/schedule");
      } else {
        setAcceptError(data.error || "초대 수락에 실패했습니다.");
      }
    } catch {
      setAcceptError("네트워크 연결을 확인해주세요.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">초대 정보를 확인하는 중...</p>
      </div>
    );
  }

  if (!invite) return null;

  const isInvalid = !invite.valid;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", minHeight: "calc(100vh - 60px)" }}
    >
      <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl">
        {isInvalid ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {invite.reason === "expired"
                ? "만료된 초대 링크"
                : invite.reason === "used"
                ? "이미 사용된 초대 링크"
                : "유효하지 않은 초대 링크"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {invite.reason === "expired"
                ? "7일이 지난 초대 링크입니다. 새로운 초대 링크를 요청하세요."
                : invite.reason === "used"
                ? "이미 사용된 초대 링크입니다."
                : "초대 링크가 올바르지 않습니다."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              홈으로 이동
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">학원 초대</h2>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{invite.academyName}</strong>에서
            </p>
            <span className="inline-block bg-purple-100 text-purple-700 text-sm px-3 py-0.5 rounded-full mb-6">
              {ROLE_LABEL[invite.role ?? ""] ?? invite.role} 역할
            </span>
            <p className="text-sm text-gray-500 mb-6">로 초대했습니다</p>

            {!userId ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">초대를 수락하려면 먼저 로그인하세요</p>
                </div>
                <button
                  onClick={() => handleLogin("google")}
                  className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 mb-2 flex items-center justify-center gap-2"
                >
                  <span>🔵</span> Google로 로그인
                </button>
              </>
            ) : (
              <>
                {acceptError && (
                  <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
                    {acceptError}
                  </div>
                )}
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 mb-2"
                >
                  {isAccepting ? "수락 중..." : "초대 수락하기"}
                </button>
              </>
            )}

            <p className="text-xs text-gray-400 mt-2">
              만료: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString("ko-KR") : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run "src/app/invite/\[token\]/__tests__/page.test.tsx"
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/invite/[token]/page.tsx" "src/app/invite/[token]/__tests__/page.test.tsx"
git commit -m "feat(invite): add /invite/[token] accept page"
```

---

## Task 9: Navigation + Full Test Suite + Docs

**Files:**
- Modify: `src/app/layout.tsx` — navItems에 설정 링크 추가
- Modify: `ARCHITECTURE.md`
- Modify: `UI_SPEC.md`
- Modify: `TASKS.md`
- Modify: `tree.txt`

- [ ] **Step 1: Add /settings link to navigation**

In `src/app/layout.tsx`, update the `navItems` array (around line 32):

```typescript
const navItems = [
  { href: "/students", label: "학생" },
  { href: "/subjects", label: "과목" },
  { href: "/schedule", label: "시간표" },
  { href: "/settings", label: "설정" },
  { href: "/about", label: "소개" },
];
```

- [ ] **Step 2: Run full test suite**

```bash
npm run check:quick
```

Expected: All 1095+ tests pass, tsc clean.

- [ ] **Step 3: Update ARCHITECTURE.md**

In the data model section (after academy_members), add:

```
invite_tokens      (id UUID PK, academy_id UUID FK, token TEXT UNIQUE, role TEXT, created_by UUID FK, expires_at TIMESTAMPTZ, used_by UUID FK NULL, used_at TIMESTAMPTZ NULL)
```

In section 6 (Routes/API), add entries for:
- `GET/POST /api/invites` — 초대 토큰 목록/생성 (owner/admin)
- `DELETE /api/invites/[id]` — 초대 취소 (owner/admin)
- `GET /api/invites/check` — 토큰 공개 조회 (public)
- `POST /api/invites/accept` — 초대 수락 (로그인 사용자)
- `GET /api/members` — 멤버 목록 (학원 멤버)
- `DELETE /api/members/[userId]` — 멤버 제거 (owner)

Add page routes:
- `/settings` — 학원 설정 + 멤버/초대 관리
- `/invite/[token]` — 초대 수락 페이지

- [ ] **Step 4: Update TASKS.md**

Mark `운영자 초대 기능` as complete:
```
- [x] 운영자 초대 기능 ✅ 완료 (2026-04-14, PR#22) — 초대 링크(1회용+7일만료), /settings 페이지, /invite/[token] 수락 페이지
```

- [ ] **Step 5: Update tree.txt**

Add new directories:
```
├── src/app/settings/
│   └── page.tsx
├── src/app/invite/
│   └── [token]/page.tsx
```

Add new API routes:
```
├── api/invites/
│   ├── route.ts
│   ├── [id]/route.ts
│   ├── accept/route.ts
│   └── check/route.ts
├── api/members/
│   ├── route.ts
│   └── [userId]/route.ts
```

Add new lib file:
```
├── src/lib/resolveAcademyMembership.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx ARCHITECTURE.md UI_SPEC.md TASKS.md tree.txt
git commit -m "docs(invite): update navigation, ARCHITECTURE.md, TASKS.md, tree.txt"
```

---

## Task 10: Full Verification + PR

- [ ] **Step 1: Run full check**

```bash
npm run check
```

Expected:
- tsc: no errors
- Tests: 1095+ passed
- build: green

- [ ] **Step 2: Start dev server and run Playwright verification**

```bash
npm run dev
```

Playwright MCP로 다음을 검증:
1. `GET http://localhost:3000/settings` → "학원 설정" 제목 확인
2. 네비게이션에 "설정" 링크 확인
3. 로그아웃 상태에서 `/invite/test-token` → 초대 정보 불러오기 (404 expected for fake token)

computer-use로 추가 확인 (모달이 시각적 변경이므로):
- /settings 모달 UI 시각 검증

- [ ] **Step 3: Push + create PR**

```bash
git push -u origin feature/member-invite
gh pr create --base dev --title "feat(invite): 운영자 초대 기능 (초대 링크 + /settings + /invite/[token])" --body "..."
```

---

## Self-Review Notes

**Spec coverage check:**
- [x] invite_tokens 테이블 + RLS → Task 1
- [x] POST/GET /api/invites → Task 3
- [x] DELETE /api/invites/[id] → Task 4
- [x] POST /api/invites/accept (만료/중복/멱등) → Task 5
- [x] GET/DELETE /api/members → Task 6
- [x] /settings 페이지 (멤버 목록 + 초대 모달) → Task 7
- [x] /invite/[token] 수락 페이지 (비로그인/로그인/에러) → Task 8
- [x] 네비게이션 /settings 링크 → Task 9
- [x] OAuth 후 pending token 복구 (localStorage) → Task 8 구현에 포함

**Type consistency check:**
- `resolveAcademyMembership` 반환값 `{ academyId, role }` — Tasks 3,4,5,6 전부 구조분해 일관
- `InviteInfo.role` string | undefined — Task 8에서 null-safe 처리됨
- `Member.userId` — Task 7에서 비교 시 `member.userId === userId` 일관

**Placeholder scan:** No TBD/TODO in critical paths.
