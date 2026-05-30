# Teacher Invite Redesign — Plan B: Invite Flows + TeacherAddModal + Share-link Security

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 초대 수락 4-state 페이지(이메일 매칭/로그인 분기) + TeacherAddModal Smart CTA + share_tokens teacher_id 연결로 share_only 상태 완성.

**Architecture:** 3개 migration(invite email, share teacher_id+watermark, 선택 admin boundary) + 4개 API 변경 + invite/[token] 전면 재작성 + TeacherAddModal 신규 + InviteModal 이메일 경고 추가. Plan A의 TeacherStatusPill/settings unified list 위에 올라간다.

**Tech Stack:** Next.js 15, TypeScript, Supabase, Vitest, Tailwind CSS 4, supabase-js v2

**Spec 참조:** `docs/superpowers/specs/2026-05-02-teacher-invite-ux-redesign-design.md` §3, §5

**Plan A 선행 완료:** migration 032/035/036, PATCH /api/teachers/[id], TeacherStatusPill, Settings 통합 리스트

**Plan C 예고:** Phase 6 — Session note 2-tier(sessions.public_description/internal_note) + admin/owner RLS boundary

---

## File Map

| 역할 | 파일 | 작업 |
|------|------|------|
| Migration | `migration/migrations/037_invite_tokens_email.sql` | 신규 |
| Migration | `migration/migrations/038_share_tokens_teacher.sql` | 신규 |
| API | `src/app/api/invites/route.ts` | 수정 (POST: email 저장 + 24h expiry) |
| API | `src/app/api/invites/check/route.ts` | 수정 (inviteEmail 반환) |
| API | `src/app/api/invites/accept/route.ts` | 수정 (email 매칭 검증) |
| API | `src/app/api/share-tokens/from-invite/route.ts` | **신규** ("링크만 받기") |
| API | `src/app/api/share-tokens/route.ts` | 수정 (teacher_id + watermark_meta) |
| API | `src/app/api/teachers/route.ts` | 수정 (share_only status join) |
| UI | `src/app/invite/[token]/page.tsx` | 전면 재작성 (4-state) |
| UI | `src/components/molecules/InviteModal.tsx` | 수정 (teacher email 경고) |
| UI | `src/components/molecules/TeacherAddModal.tsx` | **신규** (Smart CTA) |
| UI | `src/app/settings/page.tsx` | 수정 (TeacherAddModal 연결) |
| Test | `src/app/api/invites/__tests__/route.test.ts` | 수정 |
| Test | `src/app/api/invites/accept/__tests__/route.test.ts` | **신규** |
| Test | `src/app/api/share-tokens/from-invite/__tests__/route.test.ts` | **신규** |

---

## 시작: 작업 브랜치 생성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/teacher-invite-flows
```

---

## Task 1: Migration 037 — invite_tokens.email

**Files:**
- Create: `migration/migrations/037_invite_tokens_email.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- migration/migrations/037_invite_tokens_email.sql
-- invite_tokens에 email 컬럼 추가 (M4: 초대 대상 이메일 특정, 수락 시 검증용)
ALTER TABLE public.invite_tokens
  ADD COLUMN IF NOT EXISTS email text;

COMMENT ON COLUMN public.invite_tokens.email IS
  'The specific email address this invite is intended for. If set, acceptance is restricted to users with a matching email.';
```

- [ ] **Step 2: DB 적용**

```bash
psql "$DATABASE_URL" -f migration/migrations/037_invite_tokens_email.sql
# 또는
npx supabase db push
```

- [ ] **Step 3: 컬럼 존재 확인**

```bash
npx supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'invite_tokens' AND column_name = 'email';"
```

예상: 1 row with `email`.

- [ ] **Step 4: Commit**

```bash
git add migration/migrations/037_invite_tokens_email.sql
git commit -m "feat(db): add invite_tokens.email for M4 email-bound invites"
```

---

## Task 2: Migration 038 — share_tokens.teacher_id + watermark_meta

**Files:**
- Create: `migration/migrations/038_share_tokens_teacher.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- migration/migrations/038_share_tokens_teacher.sql
-- share_tokens에 teacher_id FK 추가 → TeacherStatusPill의 share_only 상태 연결
-- watermark_meta jsonb 추가 → share 페이지 하단 발급자 표시
-- created_by NOT NULL 해제 → from-invite 엔드포인트(비로그인 생성) 지원

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL;

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS watermark_meta jsonb;

-- from-invite: auth user 없이 share_token 생성 허용
ALTER TABLE share_tokens
  ALTER COLUMN created_by DROP NOT NULL;
-- watermark_meta 예시: {"teacherName": "박영희", "issuedAt": "2026-05-02"}

CREATE INDEX IF NOT EXISTS idx_share_tokens_teacher_id ON share_tokens(teacher_id)
  WHERE teacher_id IS NOT NULL;
```

- [ ] **Step 2: DB 적용**

```bash
psql "$DATABASE_URL" -f migration/migrations/038_share_tokens_teacher.sql
```

- [ ] **Step 3: 확인**

```bash
npx supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'share_tokens' ORDER BY ordinal_position;"
```

예상: teacher_id, watermark_meta 포함.

- [ ] **Step 4: Commit**

```bash
git add migration/migrations/038_share_tokens_teacher.sql
git commit -m "feat(db): share_tokens — add teacher_id FK + watermark_meta (M5)"
```

---

## Task 3: POST /api/invites — email 저장 + 24h expiry (M4)

**Files:**
- Modify: `src/app/api/invites/route.ts`
- Modify: `src/app/api/invites/__tests__/route.test.ts`

### Step 3a: 실패 테스트 추가

- [ ] **Step 1: 기존 테스트 파일 읽기**

```bash
cat src/app/api/invites/__tests__/route.test.ts
```

- [ ] **Step 2: 실패 테스트 추가**

기존 `POST /api/invites` 테스트 블록에 아래 케이스 추가:

```typescript
it('invite 생성 시 teacher의 email이 invite_tokens.email에 저장된다', async () => {
  mockResolveAcademyMembership.mockResolvedValue({ academyId: 'academy-1', role: 'owner' })

  // teacher 조회에서 email 반환
  mockSupabase.single
    .mockResolvedValueOnce({ data: { id: 'teacher-1', user_id: null, email: 'park@example.com' }, error: null }) // teacher fetch
    .mockResolvedValueOnce({ data: { id: 'new-invite', token: 'tok123', role: 'member', expires_at: new Date(Date.now() + 86400000).toISOString() }, error: null }) // insert result

  const req = new NextRequest('http://localhost/api/invites?userId=user-owner', {
    method: 'POST',
    body: JSON.stringify({ role: 'member', teacherId: 'teacher-1' }),
  })
  const { POST } = await import('../route')
  const res = await POST(req)
  expect(res.status).toBe(200)

  // Verify insert call included email
  // 주의: 기존 invites/__tests__/route.test.ts의 mock 패턴에 따라 insert mock이
  // .mockReturnThis()로 체이닝될 경우 mock.calls 대신 mockSupabase.insert.mock.calls[0][0] 로
  // 검증. 실제 파일을 먼저 읽어서 패턴 확인 후 조정할 것.
  const insertCall = mockSupabase.insert.mock.calls[0][0]
  expect(insertCall.email).toBe('park@example.com')
})

it('invite 만료 시간이 24시간으로 설정된다', async () => {
  mockResolveAcademyMembership.mockResolvedValue({ academyId: 'academy-1', role: 'owner' })
  mockSupabase.single
    .mockResolvedValueOnce({ data: { id: 'teacher-1', user_id: null, email: 'test@example.com' }, error: null })
    .mockResolvedValueOnce({ data: { id: 'inv-1', token: 'tok', role: 'member', expires_at: '' }, error: null })

  const before = Date.now()
  const req = new NextRequest('http://localhost/api/invites?userId=user-owner', {
    method: 'POST',
    body: JSON.stringify({ role: 'member', teacherId: 'teacher-1' }),
  })
  const { POST } = await import('../route')
  await POST(req)

  const insertCall = mockSupabase.insert.mock.calls[0][0]
  const expiresAt = new Date(insertCall.expires_at).getTime()
  const expectedMin = before + 23 * 60 * 60 * 1000
  const expectedMax = before + 25 * 60 * 60 * 1000
  expect(expiresAt).toBeGreaterThan(expectedMin)
  expect(expiresAt).toBeLessThan(expectedMax)
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "invites/__tests__/route"
```

### Step 3b: 구현

- [ ] **Step 4: invites/route.ts POST 수정**

기존 POST 핸들러에서 invite_tokens INSERT 부분을 찾아서 수정:

1. teacher 조회 시 email 포함: `.select('id, user_id, email')`
2. INSERT payload에 `email: teacher.email ?? null` 추가
3. `expires_at` 계산을 7일 → 24시간으로 변경:

```typescript
// 변경 전
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

// 변경 후
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
```

INSERT 시 email 포함:
```typescript
const { data: invite, error: insertError } = await client
  .from("invite_tokens")
  .insert({
    academy_id: academyId,
    role: body.role,
    teacher_id: body.teacherId ?? null,
    email: teacher?.email ?? null,   // ← 추가
    expires_at: expiresAt,
  })
  .select("id, token, role, expires_at")
  .single()
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm run check:quick
```

예상: 전체 pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/invites/route.ts src/app/api/invites/__tests__/route.test.ts
git commit -m "feat(api): invites POST — 24h expiry + store teacher email (M4)"
```

---

## Task 4: GET /api/invites/check — inviteEmail 반환

**Files:**
- Modify: `src/app/api/invites/check/route.ts`

- [ ] **Step 1: 현재 파일 읽기**

```bash
cat src/app/api/invites/check/route.ts
```

- [ ] **Step 2: SELECT에 email 추가 + 응답에 inviteEmail 포함**

check 라우트의 SELECT를 수정:

```typescript
const { data, error } = await client
  .from("invite_tokens")
  .select("id, role, expires_at, used_by, teacher_id, email, academies(name), teachers(name)")
  .eq("token", token)
  .single()
```

성공 응답에 `inviteEmail` 추가:
```typescript
return NextResponse.json({
  valid: true,
  id: data.id,
  role: data.role,
  academyName,
  expiresAt: data.expires_at,
  teacherName,
  inviteEmail: data.email ?? null,   // ← 추가 (null이면 이메일 제한 없음)
})
```

- [ ] **Step 3: 타입 업데이트**

invite/[token]/page.tsx의 `InviteInfo` 인터페이스 (또는 check route 인근):
```typescript
interface InviteInfo {
  valid: boolean;
  reason?: string;
  id?: string;
  role?: string;
  academyName?: string;
  expiresAt?: string;
  teacherName?: string | null;
  inviteEmail?: string | null;  // ← 추가
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run check:quick
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invites/check/route.ts
git commit -m "feat(api): invites/check — return inviteEmail for 4-state page (M4)"
```

---

## Task 5: POST /api/invites/accept — email 매칭 검증 (M4)

**Files:**
- Modify: `src/app/api/invites/accept/route.ts`
- Create: `src/app/api/invites/accept/__tests__/route.test.ts`

### Step 5a: 실패 테스트

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/app/api/invites/accept/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn(),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makeRequest(body: object, userId = 'user-1') {
  return new NextRequest(`http://localhost/api/invites/accept?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/invites/accept', () => {
  const validInvite = {
    id: 'invite-1',
    token: 'tok123',
    academy_id: 'academy-1',
    role: 'member',
    used_by: null,
    teacher_id: 'teacher-1',
    email: 'park@example.com',
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    academies: { name: '현진학원' },
  }

  it('초대 이메일과 사용자 이메일이 일치하면 200', async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: validInvite, error: null })           // token fetch
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // member check (not exists)
      .mockResolvedValueOnce({ data: { id: 'mem-1' }, error: null })       // insert member
    mockSupabase.auth.admin.getUserById.mockResolvedValue({ data: { user: { email: 'park@example.com' } } })
    mockSupabase.update.mockReturnThis()
    mockSupabase.eq.mockReturnThis()

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ token: 'tok123' }))
    expect(res.status).toBe(200)
  })

  it('초대 이메일과 사용자 이메일이 불일치하면 403', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: validInvite, error: null })
    mockSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { email: 'other@example.com' } },
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ token: 'tok123' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error_code).toBe('email_mismatch')
  })

  it('초대에 email이 없으면 이메일 검증 없이 수락', async () => {
    const inviteNoEmail = { ...validInvite, email: null }
    mockSupabase.single
      .mockResolvedValueOnce({ data: inviteNoEmail, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'mem-1' }, error: null })
    mockSupabase.update.mockReturnThis()
    mockSupabase.eq.mockReturnThis()

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ token: 'tok123' }))
    expect(res.status).toBe(200)
    // getUserById should NOT be called when no invite email
    expect(mockSupabase.auth.admin.getUserById).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "invites/accept"
```

### Step 5b: 구현

- [ ] **Step 3: accept/route.ts 수정**

토큰 fetch SELECT에 email 추가: `.select("id, ..., email, ...")`

이메일 검증 로직 추가 (토큰 유효성 확인 직후, academy_members INSERT 전):

```typescript
// invite.email이 있으면 수락자의 이메일 검증
if (inviteData.email) {
  const client = getServiceRoleClient()
  const { data: authData } = await client.auth.admin.getUserById(userId)
  const userEmail = authData.user?.email

  if (!userEmail || userEmail !== inviteData.email) {
    return NextResponse.json(
      {
        success: false,
        error: '이 초대는 다른 이메일 주소 용입니다.',
        error_code: 'email_mismatch',
      },
      { status: 403 }
    )
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run check:quick
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invites/accept/route.ts src/app/api/invites/accept/__tests__/route.test.ts
git commit -m "feat(api): invites/accept — email matching validation (M4)"
```

---

## Task 6: POST /api/share-tokens/from-invite — "링크만 받기" (State A)

**Files:**
- Create: `src/app/api/share-tokens/from-invite/route.ts`
- Create: `src/app/api/share-tokens/from-invite/__tests__/route.test.ts`

### 흐름 설계

초대받은 사람이 가입 없이 시간표만 보고 싶을 때:
1. `token` (invite token) 을 파라미터로 받음 — 인증 대신 invite token이 권한 역할
2. invite_tokens에서 `teacher_id`, `academy_id` 조회
3. 해당 teacher_id에 share_token 생성 (30일 expiry, watermark_meta 포함)
4. audit_log에 기록 → owner가 Settings에서 확인 가능
5. share-link URL 반환

### Step 6a: 테스트

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/app/api/share-tokens/from-invite/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))

const mockInsert = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSingle = vi.fn()
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: mockSelect,
  eq: mockEq,
  insert: mockInsert,
  single: mockSingle,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

describe('POST /api/share-tokens/from-invite', () => {
  it('유효한 초대 토큰으로 share_token 생성 → 200 + shareUrl 반환', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: {
          id: 'invite-1',
          teacher_id: 'teacher-1',
          academy_id: 'academy-1',
          used_by: null,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          teachers: { name: '박영희' },
        },
        error: null,
      }) // invite fetch
      .mockResolvedValueOnce({
        data: { id: 'share-1', token: 'sharetoken123' },
        error: null,
      }) // share_token insert

    const req = new NextRequest('http://localhost/api/share-tokens/from-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteToken: 'invitetok' }),
    })
    const { POST } = await import('../route')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.shareUrl).toContain('sharetoken123')
  })

  it('존재하지 않는 invite token → 404', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const req = new NextRequest('http://localhost/api/share-tokens/from-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteToken: 'bad' }),
    })
    const { POST } = await import('../route')
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('만료된 invite token → 410', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'inv', teacher_id: 't1', academy_id: 'a1',
        used_by: null,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        teachers: { name: '박영희' },
      },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/share-tokens/from-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteToken: 'expired' }),
    })
    const { POST } = await import('../route')
    const res = await POST(req)
    expect(res.status).toBe(410)
  })

  it('teacher_id 없는 초대(admin role) → 400', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'inv', teacher_id: null, academy_id: 'a1',
        used_by: null,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        teachers: null,
      },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/share-tokens/from-invite', {
      method: 'POST',
      body: JSON.stringify({ inviteToken: 'admin-invite' }),
    })
    const { POST } = await import('../route')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

### Step 6b: 구현

- [ ] **Step 2: 실패 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "from-invite"
```

- [ ] **Step 3: 라우트 구현**

```typescript
// src/app/api/share-tokens/from-invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { logger } from '@/lib/logger'
import { toErrorResponse } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const { inviteToken } = await request.json()
    if (!inviteToken) {
      return NextResponse.json({ success: false, error: 'inviteToken required' }, { status: 400 })
    }

    const client = getServiceRoleClient()

    // 1. invite_token 검증 (인증 없이 invite token 자체가 권한)
    const { data: invite, error: inviteError } = await client
      .from('invite_tokens')
      .select('id, teacher_id, academy_id, used_by, expires_at, teachers(name)')
      .eq('token', inviteToken)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ success: false, error: '유효하지 않은 초대입니다.' }, { status: 404 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: '만료된 초대입니다.' }, { status: 410 })
    }

    if (!invite.teacher_id) {
      return NextResponse.json(
        { success: false, error: '강사 역할 초대에만 시간표 공유 링크를 발급할 수 있습니다.' },
        { status: 400 }
      )
    }

    const teacherName = (invite.teachers as unknown as { name: string } | null)?.name ?? '강사'

    // 2. share_token 생성 (30일 expiry, teacher_id 연결, watermark_meta)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: shareToken, error: shareError } = await client
      .from('share_tokens')
      .insert({
        academy_id: invite.academy_id,
        teacher_id: invite.teacher_id,
        label: `${teacherName} 시간표 공유`,
        expires_at: expiresAt,
        created_by: invite.academy_id, // placeholder — no auth user here
        watermark_meta: {
          teacherName,
          issuedAt: new Date().toISOString(),
          source: 'invite_declined_share',
        },
      })
      .select('id, token')
      .single()

    if (shareError || !shareToken) {
      logger.error('share_token 생성 실패 (from-invite)', { inviteToken }, shareError as Error)
      return NextResponse.json({ success: false, error: 'share_token 생성에 실패했습니다.' }, { status: 500 })
    }

    // 3. audit_log에 기록 (owner가 Settings에서 확인 가능)
    await client.from('audit_log').insert({
      academy_id: invite.academy_id,
      actor_id: null, // 비로그인 사용자
      action: 'share_link.created_via_invite_decline',
      target_type: 'share_token',
      target_id: shareToken.id,
      before: null,
      after: { teacherName, inviteId: invite.id },
    })

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://class-planner.info365.studio'}/share/${shareToken.token}`

    return NextResponse.json({ success: true, shareUrl, token: shareToken.token })
  } catch (error) {
    return toErrorResponse(error)
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run check:quick
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/share-tokens/from-invite/route.ts src/app/api/share-tokens/from-invite/__tests__/route.test.ts
git commit -m "feat(api): POST /api/share-tokens/from-invite — State A '링크만 받기' endpoint"
```

---

## Task 7: invite/[token]/page.tsx — 4-state 재작성

**Files:**
- Modify: `src/app/invite/[token]/page.tsx` (전면 재작성, 207줄 → ~280줄)

현재 파일 먼저 읽고 시작:
```bash
cat src/app/invite/[token]/page.tsx
```

4-state 로직:
- **State A** (`!session`): Google OAuth CTA + "시간표만 받기" 버튼
- **State B** (`session` + email matches OR no inviteEmail): "초대 수락" 버튼
- **State C** (`session` + email mismatch): 하드 리젝 경고 + "전환하기" 버튼
- **State D** (`accept` returns `alreadyMember: true`): redirect 메시지

이메일 불일치 감지:
1. check API에서 `inviteEmail` 반환 (Task 4에서 추가)
2. `session.user.email`과 비교
3. 불일치 시 즉시 State C 표시 (accept 시도 없이)

- [ ] **Step 1: 현재 파일 전체 읽기**

```bash
cat src/app/invite/\[token\]/page.tsx
```

- [ ] **Step 2: 파일 전체 재작성**

```tsx
// src/app/invite/[token]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { logger } from "../../../lib/logger";

const PENDING_INVITE_KEY = "pending_invite_token";

type InviteState = "loading" | "invalid" | "state-a" | "state-b" | "state-c" | "state-d" | "accepting" | "error";

interface InviteInfo {
  id: string;
  role: string;
  academyName: string;
  expiresAt: string;
  teacherName: string | null;
  inviteEmail: string | null;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>("loading");
  const [invalidReason, setInvalidReason] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resolve token from params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Main init: fetch invite info + session
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [checkRes, { data: sessionData }] = await Promise.all([
          fetch(`/api/invites/check?token=${token}`),
          supabase.auth.getSession(),
        ]);
        const invite = await checkRes.json();

        if (!invite.valid) {
          const messages: Record<string, string> = {
            expired: "이 초대 링크는 만료되었습니다.",
            used: "이미 사용된 초대 링크입니다.",
            not_found: "유효하지 않은 초대 링크입니다.",
          };
          setInvalidReason(messages[invite.reason] ?? "유효하지 않은 초대입니다.");
          setInviteState("invalid");
          return;
        }

        setInviteInfo({
          id: invite.id,
          role: invite.role,
          academyName: invite.academyName,
          expiresAt: invite.expiresAt,
          teacherName: invite.teacherName ?? null,
          inviteEmail: invite.inviteEmail ?? null,
        });

        const session = sessionData.session;

        if (!session) {
          // Check if returning from OAuth redirect
          const pendingToken = localStorage.getItem(PENDING_INVITE_KEY);
          if (pendingToken === token) {
            // OAuth completed but no session yet — wait for auth state change
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s?.user) {
                subscription.unsubscribe();
                localStorage.removeItem(PENDING_INVITE_KEY);
                determineStateWithSession(s.user.email ?? null, invite);
              }
            });
          } else {
            setInviteState("state-a");
          }
        } else {
          determineStateWithSession(session.user.email ?? null, invite);
        }
      } catch (err) {
        logger.error("invite page init error", {}, err as Error);
        setInviteState("error");
        setError("초대 정보를 불러오는 중 오류가 발생했습니다.");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function determineStateWithSession(userEmail: string | null, invite: { inviteEmail: string | null; id: string }) {
    if (invite.inviteEmail && userEmail && invite.inviteEmail !== userEmail) {
      setInviteState("state-c");
    } else {
      setInviteState("state-b");
    }
  }

  async function handleGoogleLogin() {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  }

  async function handleShareLinkOnly() {
    if (!token) return;
    setInviteState("loading");
    try {
      const res = await fetch("/api/share-tokens/from-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "시간표 링크 생성에 실패했습니다.");
        setInviteState("state-a");
        return;
      }
      setShareUrl(data.shareUrl);
      setInviteState("state-a"); // stay on page but show link
    } catch {
      setError("시간표 링크 생성에 실패했습니다.");
      setInviteState("state-a");
    }
  }

  async function handleAccept() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !inviteInfo || !token) return;

    setInviteState("accepting");
    try {
      const res = await fetch(`/api/invites/accept?userId=${session.user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error_code === "email_mismatch") {
          setInviteState("state-c");
          return;
        }
        setError(data.error ?? "초대 수락에 실패했습니다.");
        setInviteState("state-b");
        return;
      }

      if (data.alreadyMember) {
        setInviteState("state-d");
        return;
      }

      router.push("/schedule");
    } catch {
      setError("초대 수락 중 오류가 발생했습니다.");
      setInviteState("state-b");
    }
  }

  async function handleSwitchAccount() {
    if (!token) return;
    localStorage.setItem(PENDING_INVITE_KEY, token);
    await supabase.auth.signOut();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/invite/${token}` },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (inviteState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400 text-sm">초대 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (inviteState === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
          <p className="text-red-400 font-semibold mb-2">초대 링크 오류</p>
          <p className="text-slate-400 text-sm">{invalidReason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        {/* Academy Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-xl font-bold text-amber-400">
            {inviteInfo?.academyName?.[0] ?? "학"}
          </div>
          <div>
            <p className="font-bold text-slate-100 text-lg">{inviteInfo?.academyName}</p>
            <p className="text-sm text-slate-400">
              {inviteInfo?.role === "admin" ? "관리자" : "강사"} 역할로 초대받았습니다
            </p>
          </div>
        </div>

        {/* Invite meta */}
        {inviteInfo?.teacherName && (
          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">담당 강사</p>
            <p className="text-sm font-semibold text-slate-200">{inviteInfo.teacherName}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* ── State A: Not logged in ── */}
        {inviteState === "state-a" && (
          <>
            {shareUrl ? (
              <div className="rounded-xl border border-blue-700/50 bg-blue-900/20 p-4 mb-4">
                <p className="text-sm text-blue-300 mb-2 font-semibold">시간표 보기 링크가 준비됐습니다</p>
                <p className="text-xs text-slate-400 mb-3">이 링크를 저장해두세요. 로그인 없이 시간표를 볼 수 있습니다.</p>
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                >
                  링크 복사하기
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="mb-3 w-full rounded-lg bg-white py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-base">G</span> Google 계정으로 가입하기
                </button>
                <p className="mb-4 text-center text-xs text-slate-500">
                  가입하면 시간표 확인·알림 등 더 많은 기능을 이용할 수 있습니다.
                </p>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-slate-500 text-center mb-2">지금 가입하지 않아도 괜찮아요.</p>
                  <button
                    onClick={handleShareLinkOnly}
                    className="w-full rounded-lg border border-slate-600 py-2.5 text-sm text-slate-300 hover:border-slate-500 transition-colors"
                  >
                    시간표 보기 링크만 받기 →
                  </button>
                  <p className="mt-2 text-center text-xs text-slate-600">
                    (로그인 없이 내 수업만 확인할 수 있는 링크)
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {/* ── State B: Logged in, email matches ── */}
        {(inviteState === "state-b" || inviteState === "accepting") && (
          <>
            {inviteInfo?.inviteEmail && (
              <div className="mb-4 rounded-lg bg-emerald-900/20 border border-emerald-700/50 px-4 py-3">
                <p className="text-xs text-emerald-400 font-semibold mb-0.5">이 초대는 회원님 계정과 일치합니다</p>
                <p className="text-xs text-slate-400">수락하면 {inviteInfo.academyName} 강사로 합류됩니다</p>
              </div>
            )}
            <button
              onClick={handleAccept}
              disabled={inviteState === "accepting"}
              className="w-full rounded-lg bg-amber-500 py-3 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {inviteState === "accepting" ? "처리 중..." : `${inviteInfo?.academyName} 초대 수락`}
            </button>
          </>
        )}

        {/* ── State C: Email mismatch ── */}
        {inviteState === "state-c" && (
          <>
            <div className="mb-4 rounded-lg bg-red-900/20 border border-red-700/50 px-4 py-3">
              <p className="text-sm text-red-400 font-semibold mb-1">이 초대는 다른 계정 용입니다</p>
              <p className="text-xs text-slate-400">
                {inviteInfo?.inviteEmail
                  ? `이 초대는 ${inviteInfo.inviteEmail} 계정으로 발급됐습니다. 해당 계정으로 전환 후 진행해주세요.`
                  : "현재 로그인된 계정으로는 이 초대를 수락할 수 없습니다."}
              </p>
            </div>
            <button
              onClick={handleSwitchAccount}
              className="mb-3 w-full rounded-lg border border-red-600/50 py-2.5 text-sm text-red-400 hover:border-red-500 transition-colors"
            >
              {inviteInfo?.inviteEmail ? `${inviteInfo.inviteEmail} 으로 전환하기` : "다른 계정으로 전환하기"}
            </button>
            <p className="text-center text-xs text-slate-600">
              초대 링크를 잘못 받은 것 같다면 학원장에게 문의해주세요.
            </p>
          </>
        )}

        {/* ── State D: Already member ── */}
        {inviteState === "state-d" && (
          <>
            <div className="mb-4 rounded-lg bg-purple-900/20 border border-purple-700/50 px-4 py-3 text-center">
              <p className="text-sm text-purple-300 font-semibold mb-1">이미 {inviteInfo?.academyName}의 멤버입니다</p>
              <p className="text-xs text-slate-400">강사로 이미 합류되어 있어 재수락이 필요 없습니다.</p>
            </div>
            <button
              onClick={() => router.push("/schedule")}
              className="w-full rounded-lg bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-500 transition-colors"
            >
              {inviteInfo?.academyName}으로 이동하기
            </button>
          </>
        )}

        {/* ── Error fallback ── */}
        {inviteState === "error" && (
          <div className="rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-center">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run check
```

- [ ] **Step 4: Dev 서버 시작 + Playwright 검증**

```bash
npm run dev
```

Playwright MCP로 `http://localhost:3000/invite/test-token-that-doesnt-exist` 접속:
- 비로그인 상태 → "유효하지 않은 초대 링크" 에러 표시 확인 (not_found)

실제 초대 토큰으로 검증:
- State A(비로그인): Google 버튼 + "시간표 보기 링크만 받기" 표시 확인
- Screenshot 저장

UI Verification sentinel:
```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo 'session')" "Invite 4-state page verified via Playwright" > .claude/ui-verified
```

- [ ] **Step 5: Commit**

```bash
git add src/app/invite/\\[token\\]/page.tsx
git commit -m "feat(ui): invite 4-state page — A(비로그인/링크만받기) B(수락) C(이메일불일치) D(이미멤버)"
```

---

## Task 8: InviteModal.tsx — teacher email 경고

**Files:**
- Modify: `src/components/molecules/InviteModal.tsx`

현재 InviteModal은 member 초대 시 teacher를 드롭다운으로 선택. email 없는 강사를 선택하면 경고 표시 추가.

- [ ] **Step 1: 현재 파일 읽기**

```bash
cat src/components/molecules/InviteModal.tsx
```

- [ ] **Step 2: unlinked teachers API에 email 포함 확인**

`GET /api/teachers?unlinked=true`의 응답에 email 필드가 있는지 확인 (Plan A에서 GET handler가 `email` 포함 SELECT함). 있으면 그대로 사용.

- [ ] **Step 3: 선택된 강사의 email 없으면 경고 추가**

teacher 드롭다운 선택 후 아래 경고 추가:

```tsx
{selectedTeacher && !selectedTeacher.email && (
  <div className="mt-2 rounded-lg bg-yellow-900/20 border border-yellow-700/50 px-3 py-2">
    <p className="text-xs text-yellow-400">
      이 강사의 이메일이 등록되지 않았습니다.
    </p>
    <p className="text-xs text-slate-500 mt-0.5">
      이메일 없이도 초대할 수 있지만, 다른 사람이 초대 링크를 사용할 수 있습니다. 강사 정보에서 이메일을 먼저 등록하면 보안이 강화됩니다.
    </p>
  </div>
)}
```

`selectedTeacher` 상태 변수는 이미 있거나 드롭다운 변경 시 설정. 현재 파일 구조 파악 후 적절히 추가.

- [ ] **Step 4: 만료 표시 텍스트 업데이트**

링크 생성 후 표시되는 만료 안내를 "D-7" → "24시간 후 만료" 로 업데이트:
```tsx
<p className="text-xs text-slate-500">
  이 링크는 <strong className="text-yellow-400">24시간 후</strong> 만료됩니다.
</p>
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run check:quick
```

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/InviteModal.tsx
git commit -m "feat(ui): InviteModal — teacher email warning + 24h expiry display"
```

---

## Task 9: TeacherAddModal Smart CTA (Phase 4)

**Files:**
- Create: `src/components/molecules/TeacherAddModal.tsx`
- Modify: `src/app/settings/page.tsx` (연결)

- [ ] **Step 1: TeacherAddModal.tsx 작성**

```tsx
// src/components/molecules/TeacherAddModal.tsx
"use client";

import { useState } from "react";

interface TeacherAddModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type AddAction = "invite" | "share" | "add_only";

export function TeacherAddModal({ open, userId, onClose, onSuccess }: TeacherAddModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEmail = email.trim().length > 0;

  if (!open) return null;

  async function handleSubmit(action: AddAction) {
    if (!name.trim()) {
      setError("이름은 필수입니다.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. 강사 생성
      const teacherRes = await fetch(`/api/teachers?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      if (!teacherRes.ok) {
        const err = await teacherRes.json();
        setError(err.error ?? "강사 추가에 실패했습니다.");
        setLoading(false);
        return;
      }
      const { teacher } = await teacherRes.json();

      // 2. 액션별 후속 처리
      if (action === "invite" && teacher?.id) {
        const inviteRes = await fetch(`/api/invites?userId=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "member", teacherId: teacher.id }),
        });
        if (!inviteRes.ok) {
          // 강사는 추가됐지만 초대 실패 — 부분 성공
          console.warn("Teacher created but invite failed");
        }
      } else if (action === "share" && teacher?.id) {
        await fetch(`/api/share-tokens?userId=${userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: teacher.id,
            label: `${name.trim()} 시간표 공유`,
            expiresInDays: 30,
          }),
        });
      }
      // action === "add_only": nothing more to do

      onSuccess();
      handleClose();
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  function handleClose() {
    setName("");
    setEmail("");
    setPhone("");
    setError(null);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h3 className="font-semibold text-slate-100">강사 추가</h3>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 text-lg">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">이름 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="강사 이름"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
            {hasEmail ? (
              <p className="mt-1 text-[11px] text-emerald-400">
                {email} 으로 초대 링크를 특정합니다 (보안 강화)
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                이메일을 입력하면 초대 보안이 강화됩니다
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">전화번호</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* Footer — Smart CTA */}
        <div className="border-t border-slate-700 px-5 py-4 space-y-2">
          {hasEmail ? (
            <>
              <button
                onClick={() => handleSubmit("invite")}
                disabled={loading}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                추가 + 초대 링크 발송
              </button>
              <button
                onClick={() => handleSubmit("share")}
                disabled={loading}
                className="w-full rounded-lg border border-slate-600 py-2.5 text-sm text-slate-300 hover:border-slate-500 transition-colors"
              >
                추가 + 시간표 공유 링크만
              </button>
            </>
          ) : (
            <button
              onClick={() => handleSubmit("share")}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              추가 + 공유 링크 발급
            </button>
          )}
          <button
            onClick={() => handleSubmit("add_only")}
            disabled={loading}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            일단 추가만 (나중에 결정)
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: settings/page.tsx 연결**

기존 "강사 추가" 버튼이 여는 로직을 TeacherAddModal로 교체:

```typescript
// settings/page.tsx 상단에 추가
import { TeacherAddModal } from '@/components/molecules/TeacherAddModal'

// state 추가
const [addTeacherOpen, setAddTeacherOpen] = useState(false)
```

"강사 추가" 버튼의 `onClick`:
```tsx
onClick={() => setAddTeacherOpen(true)}
```

페이지 어딘가에 모달 렌더:
```tsx
<TeacherAddModal
  open={addTeacherOpen}
  userId={userId ?? ''}
  onClose={() => setAddTeacherOpen(false)}
  onSuccess={() => {
    setAddTeacherOpen(false)
    fetchData()  // settings/page.tsx의 데이터 리프레시 함수. 파일을 먼저 읽어서 실제 함수명 확인 (fetchData, loadData 등)
  }}
/>
```

- [ ] **Step 3: share-tokens POST에 teacherId 지원 추가**

`src/app/api/share-tokens/route.ts`의 POST 핸들러에서 body에서 `teacherId` 받아서 INSERT에 포함:

```typescript
// POST body에서 teacherId 추출
const { label, filterStudentId, expiresInDays, teacherId } = body

// INSERT 시 teacher_id 포함
.insert({
  academy_id: academyId,
  token: undefined,  // DB default
  label: label ?? null,
  filter_student_id: filterStudentId ?? null,
  teacher_id: teacherId ?? null,   // ← 추가
  expires_at: expiresAt,
  created_by: userId,
  watermark_meta: teacherId ? {
    issuedAt: new Date().toISOString(),
    source: 'teacher_add_modal',
  } : null,
})
```

- [ ] **Step 4: 빌드 + Playwright 검증**

```bash
npm run check
npm run dev
```

Settings 페이지에서 "강사 추가" 클릭:
- 모달 열림 확인
- 이메일 입력 전: Primary = "추가 + 공유 링크 발급"
- 이메일 입력 후: Primary = "추가 + 초대 링크 발송" + Secondary = "추가 + 시간표 공유 링크만"
- Screenshot

```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo 'session')" "TeacherAddModal Smart CTA verified via Playwright" > .claude/ui-verified
```

- [ ] **Step 5: Commit**

```bash
git add src/components/molecules/TeacherAddModal.tsx src/app/settings/page.tsx src/app/api/share-tokens/route.ts
git commit -m "feat(ui): TeacherAddModal Smart CTA — email-adaptive 3-button add flow (Phase 4)"
```

---

## Task 10: teachers GET share_only status (Phase 5)

**Files:**
- Modify: `src/app/api/teachers/route.ts`
- Modify: `src/app/api/teachers/__tests__/route.test.ts`

Plan A에서 share_only 상태를 "Phase 5 전까지 표시 안 함"으로 남겼음. Migration 038 이후 share_tokens.teacher_id FK가 생겼으므로 이제 join 가능.

- [ ] **Step 1: 실패 테스트 추가**

기존 status test에 share_only 케이스 추가:

```typescript
it('share_token이 연결된 teacher는 status share_only', async () => {
  // mockFrom이 share_tokens 테이블에서 teacher_id = 't5' 반환하도록
  // 기존 makeTeacher 헬퍼 사용

  const teacher5 = makeTeacher({ id: 't5', userId: null })
  // ... mock setup for share_tokens returning [{ teacher_id: 't5' }]

  // GET 호출 후 body.teachers 중 t5의 status === 'share_only' 확인
})
```

(기존 테스트 파일의 mockFrom 패턴에 맞게 작성)

- [ ] **Step 2: teachers GET handler에 share_tokens join 추가**

현재 GET handler에서 invite_tokens 2번 쿼리 후에 share_tokens 쿼리 추가:

```typescript
// 기존: share_tokens에 teacher_id 없어서 스킵했던 부분을 활성화
const { data: shareLinks, error: shareError } = await supabase
  .from('share_tokens')
  .select('teacher_id')
  .eq('academy_id', membership.academyId)
  .is('revoked_at', null)
  .gt('expires_at', new Date().toISOString())
  .not('teacher_id', 'is', null)

if (shareError) {
  logger.error('share_tokens 조회 실패 for status join', {}, shareError as Error)
}

const shareTeacherIds = new Set((shareLinks ?? []).map((s) => String(s.teacher_id)))
```

status 계산에서 `share_only` 조건 활성화:

```typescript
const teachersWithStatus = (teachers ?? []).map((t) => {
  const dto = t.toJSON()
  const id = dto.id

  let status: TeacherStatus
  if (dto.userId !== null) {
    status = 'active'
  } else if (pendingMap.has(id)) {
    status = 'invite_pending'
  } else if (expiredSet.has(id)) {
    status = 'invite_expired'
  } else if (shareTeacherIds.has(id)) {   // ← 이 부분 활성화
    status = 'share_only'
  } else {
    status = 'none'
  }
  // ... rest unchanged
})
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npm run check:quick
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/teachers/route.ts src/app/api/teachers/__tests__/route.test.ts
git commit -m "feat(api): teachers GET — enable share_only status via share_tokens.teacher_id join"
```

---

## Plan B 완료 체크리스트

- [ ] migration 037: invite_tokens.email 컬럼 존재
- [ ] migration 038: share_tokens.teacher_id + watermark_meta 컬럼 존재
- [ ] POST /api/invites: teacher email 저장 + 24h expiry
- [ ] GET /api/invites/check: inviteEmail 반환
- [ ] POST /api/invites/accept: 이메일 불일치 시 403 + error_code: 'email_mismatch'
- [ ] POST /api/share-tokens/from-invite: invite token으로 share_token 생성
- [ ] /invite/[token]/page.tsx: 4가지 state 렌더링 (A/B/C/D)
- [ ] InviteModal: email 없는 강사 경고 + 24h 표시
- [ ] TeacherAddModal: email 유무에 따라 Smart CTA 버튼 변경
- [ ] teachers GET: share_only status 반환
- [ ] `npm run check`: 전체 통과
- [ ] UI Verification: Playwright로 invite 페이지 + settings 모달 확인

---

## Plan C 예고 (Phase 6)

Plan B 머지 후 `docs/superpowers/plans/2026-05-02-teacher-session-admin-boundary.md` 작성:
- Phase 6a: Session note 2-tier — `sessions.public_description` (owner only) + `sessions.internal_note` (staff)
- Phase 6b: Admin/owner RLS boundary — admin은 owner를 강등할 수 없음
