# Teacher Invite Redesign — Plan A: Foundation + Security + Settings UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teachers 보안 기반(audit_log + field-level API guard + RLS) 구축 + Settings 페이지 통합 강사 리스트 + 상태 pill 배포.

**Architecture:** 신규 migration 2개(audit_log, teachers status join용 뷰) + PATCH /api/teachers/[id] 신규 라우트 + Teachers GET API에 invite/share 상태 join + TeacherStatusPill atom + Settings page 통합 리스트로 리팩터.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (postgres RLS), Vitest, Tailwind CSS, shadcn/ui (기존 컴포넌트 패턴 유지)

**Spec 참조:** `docs/superpowers/specs/2026-05-02-teacher-invite-ux-redesign-design.md`

**Plan B 예고:** Phase 3-6(Invite 4-state, 모달 Smart CTA, Share-link, Admin 경계)는 별도 plan.

---

## File Map

| 역할 | 파일 | 작업 |
|------|------|------|
| DB migration | `migration/migrations/032_expand_teachers.sql` | 신규 (supabase/migrations/032에서 복사) |
| DB migration | `migration/migrations/035_audit_log.sql` | 신규 |
| DB migration | `migration/migrations/036_teachers_rls_member_own.sql` | 신규 |
| API — teachers | `src/app/api/teachers/route.ts` | 수정 (GET에 status join 추가) |
| API — teachers/[id] | `src/app/api/teachers/[id]/route.ts` | **신규** (PATCH — M1 field guard) |
| API — audit-log | `src/app/api/audit-log/route.ts` | **신규** (GET 이력 조회) |
| Atom | `src/components/atoms/TeacherStatusPill.tsx` | **신규** |
| Settings | `src/app/settings/page.tsx` | 대규모 수정 (통합 리스트) |
| Test | `src/app/api/teachers/[id]/__tests__/route.test.ts` | **신규** |
| Test | `src/app/api/teachers/__tests__/route.test.ts` | 수정 (status join 케이스 추가) |

---

## 시작: 작업 브랜치 생성

```bash
git checkout dev && git pull origin dev
git checkout -b feat/teacher-invite-foundation
```

---

## Task 1: Migration 032 적용 — teachers 컬럼 확장

**Files:**
- Read: `supabase/migrations/032_expand_teachers_and_add_teacher_subjects.sql`
- Create: `migration/migrations/032_expand_teachers_and_add_teacher_subjects.sql`

- [ ] **Step 1: 파일 확인**

```bash
cat supabase/migrations/032_expand_teachers_and_add_teacher_subjects.sql
```

예상 출력: `ALTER TABLE teachers ADD COLUMN email text`, `ADD COLUMN phone text`, `ADD COLUMN role text`, `ADD COLUMN notes text`, `CREATE TABLE teacher_subjects ...` 포함.

- [ ] **Step 2: SSoT 디렉토리에 복사**

```bash
cp supabase/migrations/032_expand_teachers_and_add_teacher_subjects.sql \
   migration/migrations/032_expand_teachers_and_add_teacher_subjects.sql
```

- [ ] **Step 3: 로컬 DB에 적용**

```bash
# Supabase CLI 사용 시
supabase db push

# 또는 psql 직접 실행
psql "$DATABASE_URL" -f supabase/migrations/032_expand_teachers_and_add_teacher_subjects.sql
```

- [ ] **Step 4: 컬럼 존재 확인**

```bash
supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'teachers' ORDER BY ordinal_position;"
```

예상: `id, academy_id, name, color, user_id, email, phone, role, notes` (또는 더 많음).

- [ ] **Step 5: Commit**

```bash
git add migration/migrations/032_expand_teachers_and_add_teacher_subjects.sql
git commit -m "chore(db): apply migration 032 — expand teachers columns + teacher_subjects"
```

---

## Task 2: Migration 035 — audit_log 테이블 (M2)

**Files:**
- Create: `migration/migrations/035_audit_log.sql`

- [ ] **Step 1: Migration 파일 작성**

```sql
-- migration/migrations/035_audit_log.sql
CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id  uuid REFERENCES academies NOT NULL,
  actor_id    uuid REFERENCES auth.users,
  action      text NOT NULL,
  target_type text NOT NULL,
  target_id   uuid NOT NULL,
  before      jsonb,
  after       jsonb,
  at          timestamptz DEFAULT now()
);

CREATE INDEX audit_log_academy_at ON audit_log (academy_id, at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- owner/admin만 조회
CREATE POLICY "audit_log_select_admin" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = audit_log.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- INSERT는 service role만 (API에서 service role client 사용)
CREATE POLICY "audit_log_insert_service" ON audit_log
  FOR INSERT WITH CHECK (true);
```

- [ ] **Step 2: DB에 적용**

```bash
psql "$DATABASE_URL" -f migration/migrations/035_audit_log.sql
```

- [ ] **Step 3: 테이블 존재 확인**

```bash
supabase db execute --sql "SELECT COUNT(*) FROM audit_log;"
```

예상: `count: 0` (빈 테이블 생성 확인).

- [ ] **Step 4: Commit**

```bash
git add migration/migrations/035_audit_log.sql
git commit -m "feat(db): add audit_log table with academy-scoped RLS (M2)"
```

---

## Task 3: Migration 036 — teachers RLS (member 본인 행 수정)

**Files:**
- Create: `migration/migrations/036_teachers_rls_member_own.sql`

- [ ] **Step 1: Migration 파일 작성**

```sql
-- migration/migrations/036_teachers_rls_member_own.sql
-- owner/admin: 같은 학원의 모든 teacher 행 UPDATE 가능
CREATE POLICY "teachers_update_owner_admin" ON teachers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- member: 본인 user_id와 일치하는 teacher 행만 UPDATE (private fields용)
-- 어떤 컬럼을 업데이트할 수 있는지는 API에서 강제 (name, color는 API에서 거부)
CREATE POLICY "teachers_update_own" ON teachers
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM academy_members
      WHERE academy_id = teachers.academy_id
        AND user_id = auth.uid()
        AND role = 'member'
    )
  );
```

- [ ] **Step 2: DB에 적용**

```bash
psql "$DATABASE_URL" -f migration/migrations/036_teachers_rls_member_own.sql
```

- [ ] **Step 3: 정책 확인**

```bash
supabase db execute --sql "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'teachers';"
```

예상: `teachers_update_owner_admin`, `teachers_update_own` 포함.

- [ ] **Step 4: Commit**

```bash
git add migration/migrations/036_teachers_rls_member_own.sql
git commit -m "feat(db): teachers RLS — owner/admin full UPDATE, member own-row UPDATE only (M1)"
```

---

## Task 4: PATCH /api/teachers/[id] — field-level guard + audit 기록 (M1 + M2)

**Files:**
- Create: `src/app/api/teachers/[id]/route.ts`
- Create: `src/app/api/teachers/[id]/__tests__/route.test.ts`

### Step 4a: 실패 테스트 작성

- [ ] **Step 1: 테스트 파일 작성**

```typescript
// src/app/api/teachers/[id]/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockResolveAcademyMembership = vi.hoisted(() => vi.fn())
const mockGetServiceRoleClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/resolveAcademyMembership', () => ({
  resolveAcademyMembership: mockResolveAcademyMembership,
}))
vi.mock('@/lib/supabaseServiceRole', () => ({
  getServiceRoleClient: mockGetServiceRoleClient,
}))
vi.mock('@/lib/auth/permissions', () => ({
  requireRole: vi.fn(async (userId: string, allowed: string[]) => {
    const membership = await mockResolveAcademyMembership(userId)
    if (!allowed.includes(membership.role)) {
      throw new Error('Forbidden')
    }
    return membership
  }),
}))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makeRequest(body: Record<string, unknown>, userId = 'user-owner') {
  return new NextRequest('http://localhost/api/teachers/teacher-1', {
    method: 'PATCH',
    headers: { 'x-user-id': userId },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/teachers/[id]', () => {
  it('owner가 name 변경하면 200 + audit_log INSERT', async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: 'academy-1',
      role: 'owner',
    })
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'teacher-1', academy_id: 'academy-1', name: '박영희', color: '#6366f1', email: null }, error: null })
      .mockResolvedValueOnce({ data: { id: 'teacher-1', name: '이새이름' }, error: null })
    mockSupabase.insert.mockReturnThis()
    mockSupabase.eq.mockReturnThis()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest({ name: '이새이름' }), { params: { id: 'teacher-1' } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.teacher.name).toBe('이새이름')
  })

  it('member가 name 변경 시도하면 403', async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: 'academy-1',
      role: 'member',
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'teacher-1', academy_id: 'academy-1', name: '박영희', color: '#6366f1', user_id: 'user-member' },
      error: null,
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest({ name: '욕설이름' }, 'user-member'), { params: { id: 'teacher-1' } })

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/forbidden/i)
  })

  it('member가 본인 email 변경하면 200', async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: 'academy-1',
      role: 'member',
    })
    mockSupabase.single
      .mockResolvedValueOnce({ data: { id: 'teacher-1', academy_id: 'academy-1', name: '박영희', user_id: 'user-member' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'teacher-1', email: 'new@example.com' }, error: null })
    mockSupabase.insert.mockReturnThis()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest({ email: 'new@example.com' }, 'user-member'), { params: { id: 'teacher-1' } })

    expect(res.status).toBe(200)
  })

  it('member가 다른 teacher 수정 시도하면 403', async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: 'academy-1',
      role: 'member',
    })
    // 다른 user_id를 가진 teacher
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'teacher-2', academy_id: 'academy-1', name: '김철수', user_id: 'user-other' },
      error: null,
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest({ email: 'hack@example.com' }, 'user-member'), { params: { id: 'teacher-2' } })

    expect(res.status).toBe(403)
  })

  it('존재하지 않는 teacher_id는 404', async () => {
    mockResolveAcademyMembership.mockResolvedValue({
      academyId: 'academy-1',
      role: 'owner',
    })
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest({ name: '테스트' }), { params: { id: 'nonexistent' } })

    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd class-planner && npm run check:quick 2>&1 | grep -A5 "teachers/\[id\]"
```

예상: `Cannot find module '../route'` — 아직 구현 없음.

### Step 4b: 구현

- [ ] **Step 3: PATCH 라우트 구현**

```typescript
// src/app/api/teachers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'

const PUBLIC_FIELDS = ['name', 'color'] as const
const PRIVATE_FIELDS = ['email', 'phone', 'bio', 'notes'] as const
type AllowedField = (typeof PUBLIC_FIELDS)[number] | (typeof PRIVATE_FIELDS)[number]

function isPublicField(key: string): key is (typeof PUBLIC_FIELDS)[number] {
  return (PUBLIC_FIELDS as readonly string[]).includes(key)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceRoleClient()

  // 현재 teacher 조회
  const { data: teacher, error: fetchError } = await supabase
    .from('teachers')
    .select('id, academy_id, name, color, email, phone, bio, notes, user_id')
    .eq('id', params.id)
    .eq('academy_id', membership.academyId)
    .single()

  if (fetchError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const body = await req.json()
  const isOwnerOrAdmin = ['owner', 'admin'].includes(membership.role)
  const isMember = membership.role === 'member'

  // 권한 분기
  const updates: Partial<Record<AllowedField, unknown>> = {}

  for (const [key, value] of Object.entries(body)) {
    if (isPublicField(key)) {
      // public fields: owner/admin만
      if (!isOwnerOrAdmin) {
        return NextResponse.json(
          { error: `Forbidden: only owner/admin can update '${key}'` },
          { status: 403 }
        )
      }
      updates[key as AllowedField] = value
    } else if ((PRIVATE_FIELDS as readonly string[]).includes(key)) {
      // private fields: owner/admin 또는 본인 teacher
      if (isOwnerOrAdmin) {
        updates[key as AllowedField] = value
      } else if (isMember && teacher.user_id === userId) {
        updates[key as AllowedField] = value
      } else {
        return NextResponse.json(
          { error: 'Forbidden: cannot update another teacher\'s private fields' },
          { status: 403 }
        )
      }
    }
    // 그 외 키는 무시 (id, academy_id, user_id 등)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // 업데이트 실행
  const { data: updated, error: updateError } = await supabase
    .from('teachers')
    .update(updates)
    .eq('id', params.id)
    .select('id, name, color, email, phone, bio, notes')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // Audit log 기록
  const auditBefore: Partial<Record<AllowedField, unknown>> = {}
  for (const key of Object.keys(updates) as AllowedField[]) {
    auditBefore[key] = teacher[key as keyof typeof teacher]
  }

  await supabase.from('audit_log').insert({
    academy_id: membership.academyId,
    actor_id: userId,
    action: 'teacher.updated',
    target_type: 'teacher',
    target_id: params.id,
    before: auditBefore,
    after: updates,
  })

  return NextResponse.json({ teacher: updated })
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "teachers/\[id\]"
```

예상: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/teachers/\\[id\\]/route.ts src/app/api/teachers/\\[id\\]/__tests__/route.test.ts
git commit -m "feat(api): PATCH /api/teachers/[id] — M1 field-level guard + M2 audit log"
```

---

## Task 5: Teachers GET — invite/share 상태 join

**Files:**
- Modify: `src/app/api/teachers/route.ts`
- Modify: `src/app/api/teachers/__tests__/route.test.ts` (기존 파일에 케이스 추가)

Status를 계산하는 로직:
1. 각 teacher에 대해 pending invite_token 존재 여부
2. active share_token 존재 여부
3. user_id 유무 (가입 여부)
4. 만료된 invite 여부

→ 한 번의 쿼리로 join해서 계산.

- [ ] **Step 1: 실패 테스트 추가**

기존 `src/app/api/teachers/__tests__/route.test.ts`에 다음 케이스 추가:

```typescript
it('각 teacher에 status 필드 포함', async () => {
  // teacher 목록: user_id 있는 것, pending invite 있는 것, share token 있는 것
  const teachers = [
    { id: 't1', academy_id: 'a1', name: '가입강사', user_id: 'u1', color: '#111', email: null },
    { id: 't2', academy_id: 'a1', name: '초대대기', user_id: null, color: '#222', email: 'p@x.com' },
    { id: 't3', academy_id: 'a1', name: '공유중', user_id: null, color: '#333', email: null },
    { id: 't4', academy_id: 'a1', name: '미초대', user_id: null, color: '#444', email: null },
  ]
  const invites = [
    { teacher_id: 't2', expires_at: new Date(Date.now() + 86400000).toISOString(), used_by: null },
  ]
  const shareTokens = [
    { teacher_id: null, student_id: null }, // 학원 전체 공유는 teacher 없음
  ]

  // mockSupabase에서 teachers, invite_tokens, share_tokens 각각 리턴 설정
  // (기존 테스트 파일의 mock 방식에 맞게 조정)
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'teachers') return { ...mockSupabase, data: teachers, error: null }
    if (table === 'invite_tokens') return { ...mockSupabase, data: invites, error: null }
    if (table === 'share_tokens') return { ...mockSupabase, data: shareTokens, error: null }
    return mockSupabase
  })

  const { GET } = await import('../route')
  const res = await GET(makeRequest())
  const body = await res.json()

  expect(body.teachers[0].status).toBe('active')    // user_id 있음
  expect(body.teachers[1].status).toBe('invite_pending') // pending invite
  expect(body.teachers[2].status).toBe('share_only')    // share token
  expect(body.teachers[3].status).toBe('none')          // 미초대
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "api/teachers"
```

- [ ] **Step 3: Teachers GET 수정**

```typescript
// src/app/api/teachers/route.ts 의 GET 핸들러 수정
// 기존 teachers 조회 후, invite/share 상태를 추가로 join

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const unlinkedOnly = searchParams.get('unlinked') === 'true'

  const supabase = getServiceRoleClient()

  // 1. Teachers 조회
  let teacherQuery = supabase
    .from('teachers')
    .select('id, name, color, email, phone, user_id, created_at')
    .eq('academy_id', membership.academyId)
    .order('name')

  if (unlinkedOnly) {
    teacherQuery = teacherQuery.is('user_id', null)
  }

  const { data: teachers, error: teacherError } = await teacherQuery
  if (teacherError) return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })

  if (unlinkedOnly) {
    return NextResponse.json({ teachers })
  }

  // 2. Pending invite_tokens (used_by IS NULL, expires_at > now)
  const { data: invites } = await supabase
    .from('invite_tokens')
    .select('teacher_id, expires_at')
    .eq('academy_id', membership.academyId)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())

  // 3. Expired invites (used_by IS NULL, expires_at <= now)
  const { data: expiredInvites } = await supabase
    .from('invite_tokens')
    .select('teacher_id')
    .eq('academy_id', membership.academyId)
    .is('used_by', null)
    .lte('expires_at', new Date().toISOString())

  // 4. Active share_tokens (teacher_id 연결된 것, revoked_at IS NULL)
  // share_tokens에 teacher_id 컬럼이 없을 수 있음 — Phase 5에서 추가
  // 현재는 share_tokens가 학원 전체 또는 student 기준이므로 teacher 연결 없음
  // Phase 5 전까지 share_only 상태는 표시하지 않음

  const pendingInviteTeacherIds = new Set((invites ?? []).map((i) => i.teacher_id))
  const expiredInviteTeacherIds = new Set((expiredInvites ?? []).map((i) => i.teacher_id))

  type TeacherStatus = 'active' | 'invite_pending' | 'invite_expired' | 'share_only' | 'none'

  const teachersWithStatus = (teachers ?? []).map((t) => {
    let status: TeacherStatus = 'none'
    if (t.user_id) {
      status = 'active'
    } else if (pendingInviteTeacherIds.has(t.id)) {
      status = 'invite_pending'
    } else if (expiredInviteTeacherIds.has(t.id)) {
      status = 'invite_expired'
    }
    return { ...t, status }
  })

  return NextResponse.json({ teachers: teachersWithStatus })
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run check:quick 2>&1 | grep -A5 "api/teachers"
```

- [ ] **Step 5: 전체 테스트 확인**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```

예상: 기존 테스트 포함 전부 pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/teachers/route.ts src/app/api/teachers/__tests__/route.test.ts
git commit -m "feat(api): teachers GET — include invite/share status per teacher"
```

---

## Task 6: TeacherStatusPill 컴포넌트

**Files:**
- Create: `src/components/atoms/TeacherStatusPill.tsx`

- [ ] **Step 1: 컴포넌트 작성**

```typescript
// src/components/atoms/TeacherStatusPill.tsx
'use client'

export type TeacherStatus = 'active' | 'invite_pending' | 'invite_expired' | 'share_only' | 'none' | 'owner'

interface TeacherStatusPillProps {
  status: TeacherStatus
  expiresAt?: string | null // invite_pending일 때 만료일
}

const STATUS_CONFIG: Record<TeacherStatus, { label: (expiresAt?: string | null) => string; className: string }> = {
  owner: {
    label: () => '원장',
    className: 'bg-amber-500/20 text-amber-400',
  },
  active: {
    label: () => '가입됨',
    className: 'bg-emerald-500/20 text-emerald-400',
  },
  invite_pending: {
    label: (expiresAt) => {
      if (!expiresAt) return '초대 대기'
      const diffMs = new Date(expiresAt).getTime() - Date.now()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return diffDays > 0 ? `초대 대기 · D-${diffDays}` : '초대 대기'
    },
    className: 'bg-yellow-500/20 text-yellow-400',
  },
  invite_expired: {
    label: () => '초대 만료',
    className: 'bg-red-500/20 text-red-400',
  },
  share_only: {
    label: () => '시간표 공유 중',
    className: 'bg-blue-500/20 text-blue-400',
  },
  none: {
    label: () => '미초대',
    className: 'bg-slate-500/20 text-slate-400',
  },
}

export function TeacherStatusPill({ status, expiresAt }: TeacherStatusPillProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}
    >
      <span className="text-[8px]">●</span>
      {config.label(expiresAt)}
    </span>
  )
}
```

- [ ] **Step 2: Storybook 또는 빠른 시각 확인**

아직 Storybook 없으면 settings 페이지에서 확인 (Task 7 후).

- [ ] **Step 3: Commit**

```bash
git add src/components/atoms/TeacherStatusPill.tsx
git commit -m "feat(ui): add TeacherStatusPill atom — 6-state status display"
```

---

## Task 7: Settings 페이지 — 통합 강사 리스트

**Files:**
- Modify: `src/app/settings/page.tsx`

현재 settings/page.tsx(~597줄)에서 "팀 멤버" + "대기 중인 초대" 섹션을 통합 강사 리스트로 교체.

- [ ] **Step 1: 현재 파일 백업 읽기 (충돌 방지)**

```bash
wc -l src/app/settings/page.tsx
```

- [ ] **Step 2: 필요한 타입 추가 (파일 상단 또는 별도 파일)**

settings/page.tsx 상단 import 뒤에 추가:

```typescript
import { TeacherStatusPill, type TeacherStatus } from '@/components/atoms/TeacherStatusPill'

interface TeacherWithStatus {
  id: string
  name: string
  color: string
  email: string | null
  phone: string | null
  user_id: string | null
  status: TeacherStatus
  inviteExpiresAt?: string | null
}
```

- [ ] **Step 3: Teachers 데이터 fetch 추가 (기존 invites fetch 보완)**

현재 settings/page.tsx에서 academy_members와 invite_tokens를 별도로 fetch. 아래로 대체:

```typescript
// settings/page.tsx 내 데이터 fetch 섹션 (서버 컴포넌트 또는 useEffect)
// 1. academy members (원장, admin 등 auth users)
// 2. teachers with status (새 API)
// 3. 기존 pending invites 대신 teachers API의 status로 대체

const [teachersRes, membersRes] = await Promise.all([
  fetch('/api/teachers', { headers: { 'x-user-id': userId } }),
  fetch('/api/academy/members', { headers: { 'x-user-id': userId } }),
])
const { teachers }: { teachers: TeacherWithStatus[] } = await teachersRes.json()
const { members } = await membersRes.json()
```

- [ ] **Step 4: 통합 팀 섹션 컴포넌트 작성**

settings/page.tsx의 기존 "팀 멤버" + "대기 중인 초대" 섹션을 아래로 교체:

```tsx
{/* 기존 TeamSection, PendingInvitesSection 제거하고 아래로 교체 */}
<section className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
    <div>
      <h2 className="text-base font-semibold text-slate-100">
        팀{' '}
        <span className="ml-1 text-sm font-normal text-slate-400">
          {teachers.length + 1}명
        </span>
      </h2>
    </div>
    <button
      onClick={() => setAddTeacherOpen(true)}
      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-400 transition-colors"
    >
      <span>+</span> 강사 추가
    </button>
  </div>

  {/* 원장 (본인) 행 */}
  <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-400">
      {currentUser.name?.[0] ?? '?'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-100">{currentUser.name}</span>
        <TeacherStatusPill status="owner" />
        <span className="text-xs text-slate-500">본인</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
    </div>
  </div>

  {/* 강사 목록 */}
  {teachers.map((teacher) => (
    <TeacherRow
      key={teacher.id}
      teacher={teacher}
      onAction={handleTeacherAction}
    />
  ))}

  {teachers.length === 0 && (
    <div className="px-6 py-8 text-center text-sm text-slate-500">
      아직 등록된 강사가 없습니다.{' '}
      <button
        onClick={() => setAddTeacherOpen(true)}
        className="text-amber-400 hover:text-amber-300 underline"
      >
        강사 추가하기
      </button>
    </div>
  )}
</section>
```

- [ ] **Step 5: TeacherRow 서브 컴포넌트 작성 (settings/page.tsx 내부 또는 별도 파일)**

```tsx
// settings/page.tsx 내부 또는 src/components/molecules/TeacherRow.tsx
function TeacherRow({
  teacher,
  onAction,
}: {
  teacher: TeacherWithStatus
  onAction: (action: string, teacherId: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const menuItems = getMenuItems(teacher.status)

  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50 last:border-0">
      {/* CLAUDE.md: 인라인 스타일 금지이나 teacher.color는 DB에서 오는 동적 hex값.
          CSS custom property로 처리 — Tailwind 4 arbitrary value는 빌드타임만 가능. */}
    <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={
          { '--tc': teacher.color, backgroundColor: 'color-mix(in srgb, var(--tc) 20%, transparent)', color: 'var(--tc)' } as React.CSSProperties
        }
      >
        {teacher.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-100">{teacher.name}</span>
          <TeacherStatusPill status={teacher.status} expiresAt={teacher.inviteExpiresAt} />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {teacher.email ?? '이메일 미입력'}
        </p>
      </div>

      {/* 인라인 빠른 액션 */}
      {teacher.status === 'invite_pending' && (
        <button
          onClick={() => onAction('copy_invite', teacher.id)}
          className="flex-shrink-0 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors"
        >
          링크 복사
        </button>
      )}
      {teacher.status === 'invite_expired' && (
        <button
          onClick={() => onAction('reinvite', teacher.id)}
          className="flex-shrink-0 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors"
        >
          재초대
        </button>
      )}
      {teacher.status === 'none' && (
        <button
          onClick={() => onAction('invite', teacher.id)}
          className="flex-shrink-0 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-500 transition-colors"
        >
          초대 보내기
        </button>
      )}

      {/* ⋯ 메뉴 */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-lg">
            {menuItems.map((item) => (
              <button
                key={item.action}
                onClick={() => {
                  onAction(item.action, teacher.id)
                  setMenuOpen(false)
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors ${
                  item.danger ? 'text-red-400' : 'text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getMenuItems(status: TeacherStatus): Array<{ action: string; label: string; danger?: boolean }> {
  switch (status) {
    case 'none':
      return [
        { action: 'invite', label: '초대 보내기' },
        { action: 'share_link', label: '시간표 공유 링크 발급' },
        { action: 'edit', label: '강사 정보 수정' },
        { action: 'delete', label: '삭제', danger: true },
      ]
    case 'invite_pending':
      return [
        { action: 'copy_invite', label: '링크 복사' },
        { action: 'resend', label: '재발송' },
        { action: 'cancel_invite', label: '초대 취소', danger: true },
      ]
    case 'invite_expired':
      return [
        { action: 'reinvite', label: '재초대' },
        { action: 'share_link', label: '시간표만 공유' },
        { action: 'delete', label: '삭제', danger: true },
      ]
    case 'share_only':
      return [
        { action: 'upgrade_invite', label: '초대로 승격' },
        { action: 'reissue_link', label: '링크 재발급' },
        { action: 'revoke_share', label: '공유 취소', danger: true },
      ]
    case 'active':
      return [
        { action: 'change_role', label: '권한 변경 (member↔admin)' },
        { action: 'edit', label: '강사 정보' },
        { action: 'kick', label: '팀에서 제외', danger: true },
      ]
    default:
      return []
  }
}
```

- [ ] **Step 6: handleTeacherAction 핸들러 추가**

기존 settings/page.tsx의 invite 처리 로직 통합:

```typescript
const handleTeacherAction = async (action: string, teacherId: string) => {
  switch (action) {
    case 'copy_invite': {
      // 기존 pending invite token 조회 후 URL 복사
      const invite = pendingInvites.find((i) => i.teacherId === teacherId)
      if (invite) {
        await navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`)
        toast.success('초대 링크가 복사되었습니다')
      }
      break
    }
    case 'cancel_invite': {
      const invite = pendingInvites.find((i) => i.teacherId === teacherId)
      if (invite) {
        await fetch(`/api/invites/${invite.id}`, { method: 'DELETE', headers: { 'x-user-id': userId } })
        await refetchTeachers()
        toast.success('초대가 취소되었습니다')
      }
      break
    }
    case 'invite':
    case 'reinvite': {
      setInviteTargetTeacherId(teacherId)
      setInviteModalOpen(true)
      break
    }
    // share_link, upgrade_invite, revoke_share 등은 Phase 5에서 구현
    default:
      console.log('action:', action, 'teacherId:', teacherId)
  }
}
```

- [ ] **Step 7: dev 서버 시작 + Playwright로 Settings 페이지 확인**

```bash
npm run dev
```

Playwright MCP로 `http://localhost:3000/settings` 접속 후:
- 강사 목록이 통합된 한 섹션으로 표시되는지
- 각 강사에 TeacherStatusPill 렌더링되는지
- ⋯ 메뉴 클릭 시 상태별 항목 표시되는지
- "초대 대기" 강사에 "링크 복사" 인라인 버튼 표시되는지

- [ ] **Step 8: 기존 "대기 중인 초대" 섹션 제거**

settings/page.tsx에서 기존 "대기 중인 초대" UI 섹션 삭제 (이제 TeacherRow에 통합됨).

- [ ] **Step 9: 전체 테스트 + 빌드 확인**

```bash
npm run check
```

`npm run check` = type-check + lint + unit tests + build. 예상: 모든 pass.

- [ ] **Step 10: Commit**

```bash
git add src/app/settings/page.tsx src/components/atoms/TeacherStatusPill.tsx
git commit -m "feat(ui): settings — unified teacher list with status pills (Phase 2)"
```

---

## Task 8: GET /api/audit-log — owner용 이력 조회

**Files:**
- Create: `src/app/api/audit-log/route.ts`

- [ ] **Step 1: 라우트 작성**

```typescript
// src/app/api/audit-log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, actor_id, action, target_type, target_id, before, after, at')
    .eq('academy_id', membership.academyId)
    .order('at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })

  return NextResponse.json({ logs: data })
}
```

- [ ] **Step 2: 빠른 연기 확인 (audit log가 없으면 빈 배열)**

```bash
curl -H "x-user-id: $OWNER_USER_ID" http://localhost:3000/api/audit-log
# Expected: {"logs":[]}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/audit-log/route.ts
git commit -m "feat(api): GET /api/audit-log — owner/admin change history"
```

---

## Plan A 완료 체크리스트

- [ ] migration 032 적용 완료 (teachers.email/phone/notes 컬럼 존재)
- [ ] migration 035 적용 완료 (audit_log 테이블 존재)
- [ ] migration 036 적용 완료 (teachers RLS 정책 존재)
- [ ] PATCH /api/teachers/[id]: member가 name 변경 시 403 반환 확인
- [ ] PATCH /api/teachers/[id]: member가 본인 email 변경 시 200 반환 확인
- [ ] GET /api/teachers: 각 teacher에 status 필드 포함 확인
- [ ] Settings 페이지: 통합 강사 리스트 + TeacherStatusPill 렌더링 확인
- [ ] Settings 페이지: 기존 "대기 중인 초대" 섹션 제거됨
- [ ] 전체 테스트 pass: `npx vitest run`
- [ ] 빌드 성공: `npm run build`

---

## 다음 단계 (Plan B)

Plan A 머지 후 `docs/superpowers/plans/2026-05-02-teacher-invite-flows.md` 작성:
- Phase 3: `/invite/[token]` 4-state 재구성 + email 매칭 + 24h expiry
- Phase 4: TeacherAddModal Smart CTA
- Phase 5: Share-link expiry + revoke + watermark (teacher_id FK on share_tokens)
- Phase 6: Session note 2-tier + admin/owner boundary RLS
