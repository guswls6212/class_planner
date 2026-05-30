# 학부모 접속 코드 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학부모가 학원 공개 URL에 짧은 접속 코드를 입력해 자녀 시간표만 바로 볼 수 있는 시스템 구축.

**Architecture:** `share_tokens` 테이블에 `access_code` 컬럼 추가. 공개 URL `/academy/[academyId]`에서 코드 입력 → API가 토큰으로 변환 → 기존 `/share/[token]` 페이지로 redirect (스케줄 뷰 재사용). Settings에 원장용 코드 관리 섹션 추가.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Vitest, Tailwind CSS 4

**Spec 참조:** `docs/superpowers/specs/2026-05-02-parent-access-code-design.md`

---

## File Map

| 파일 | 역할 |
|------|------|
| `migration/migrations/040_access_code.sql` | 신규 — access_code 컬럼 |
| `src/lib/accessCode.ts` | 신규 — 코드 생성 유틸 |
| `src/app/api/share/code/route.ts` | 신규 — 코드 검증 → token 반환 |
| `src/app/api/academy/[academyId]/public/route.ts` | 신규 — 학원 공개 정보(이름만) |
| `src/app/academy/[academyId]/page.tsx` | 신규 — 공개 코드 입력 페이지 |
| `src/app/api/share-tokens/access-codes/route.ts` | 신규 — 일괄 생성 / 갱신 |
| `src/app/settings/page.tsx` | 수정 — 학부모 코드 섹션 추가 + 이메일 privacy |
| `src/components/organisms/ScheduleActionBar.tsx` | 수정 — share 버튼 member 숨김 |

---

## 시작: 작업 브랜치 생성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/parent-access-code
```

---

## Task 1: Migration 040 + 코드 생성 유틸

**Files:**
- Create: `migration/migrations/040_access_code.sql`
- Create: `src/lib/accessCode.ts`
- Create: `src/lib/__tests__/accessCode.test.ts`

### Step 1a: Migration 작성 + 적용

- [ ] **Step 1: 파일 작성**

```sql
-- migration/migrations/040_access_code.sql
-- access_code: 학부모용 단기 코드 (예: 이현2A)
-- 학원 내 유니크 (동일 academy에서 코드 중복 불가)
ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_share_tokens_access_code
  ON share_tokens (academy_id, access_code)
  WHERE access_code IS NOT NULL;
```

- [ ] **Step 2: DB 적용**

```bash
psql "$DATABASE_URL" -f migration/migrations/040_access_code.sql
```

또는 Supabase MCP `apply_migration` 사용.

- [ ] **Step 3: 컬럼 확인**

```bash
npx supabase db execute --sql "SELECT column_name FROM information_schema.columns WHERE table_name = 'share_tokens' AND column_name = 'access_code';"
```

### Step 1b: 코드 생성 유틸 (TDD)

- [ ] **Step 4: 실패 테스트 작성**

```typescript
// src/lib/__tests__/accessCode.test.ts
import { describe, it, expect } from 'vitest'
import { generateAccessCode } from '../accessCode'

describe('generateAccessCode', () => {
  it('2자 이름 앞 + 숫자 + 알파벳 6자 반환', () => {
    const code = generateAccessCode('이현진')
    expect(code).toHaveLength(4)  // "이현" + digit + letter
    expect(code.startsWith('이현')).toBe(true)
  })

  it('1자 이름은 _ 패딩 처리', () => {
    const code = generateAccessCode('이')
    expect(code.startsWith('이_')).toBe(true)
    expect(code).toHaveLength(4)
  })

  it('혼동 문자(0, 1, O, I, l) 포함 안 함', () => {
    // 1000번 생성해도 혼동 문자 없어야 함
    for (let i = 0; i < 1000; i++) {
      const code = generateAccessCode('테스트')
      const digit = code[2]
      const letter = code[3]
      expect(['0', '1']).not.toContain(digit)
      expect(['O', 'I', 'l']).not.toContain(letter)
    }
  })

  it('빈 문자열은 __ 접두사', () => {
    const code = generateAccessCode('')
    expect(code.startsWith('__')).toBe(true)
    expect(code).toHaveLength(4)
  })
})
```

- [ ] **Step 5: 테스트 실행 — 실패 확인**

```bash
npm run check:quick 2>&1 | grep accessCode
```

- [ ] **Step 6: 유틸 구현**

```typescript
// src/lib/accessCode.ts
const SAFE_DIGITS = '23456789'        // 0, 1 제외
const SAFE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // I, O 제외

export function generateAccessCode(studentName: string): string {
  const prefix = studentName.slice(0, 2).padEnd(2, '_')
  const digit = SAFE_DIGITS[Math.floor(Math.random() * SAFE_DIGITS.length)]
  const letter = SAFE_LETTERS[Math.floor(Math.random() * SAFE_LETTERS.length)]
  return `${prefix}${digit}${letter}`
}
```

- [ ] **Step 7: 테스트 통과 확인**

```bash
npm run check:quick 2>&1 | grep accessCode
```

- [ ] **Step 8: Commit**

```bash
git add migration/migrations/040_access_code.sql src/lib/accessCode.ts src/lib/__tests__/accessCode.test.ts
git commit -m "feat(db+lib): add share_tokens.access_code + generateAccessCode utility"
```

---

## Task 2: POST /api/share/code — 코드 검증 → token 반환

**Files:**
- Create: `src/app/api/share/code/route.ts`
- Create: `src/app/api/share/code/__tests__/route.test.ts`

### TDD

- [ ] **Step 1: 테스트 작성**

```typescript
// src/app/api/share/code/__tests__/route.test.ts
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
  single: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/share/code', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/share/code', () => {
  it('유효한 코드 → token 반환', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { token: 'abc123', expires_at: new Date(Date.now() + 86400000).toISOString() },
      error: null,
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '이현2A', academyId: 'academy-1' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('abc123')
  })

  it('존재하지 않는 코드 → 404 (코드/만료 구분 없음)', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '없는코드', academyId: 'academy-1' }))

    expect(res.status).toBe(404)
  })

  it('code 또는 academyId 없으면 400', async () => {
    const { POST } = await import('../route')
    const res = await POST(makeRequest({ code: '' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm run check:quick 2>&1 | grep "share/code"
```

- [ ] **Step 3: 구현**

```typescript
// src/app/api/share/code/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function POST(request: NextRequest) {
  try {
    const { code, academyId } = await request.json().catch(() => ({}))

    if (!code || !academyId) {
      return NextResponse.json({ error: 'code와 academyId가 필요합니다.' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    const now = new Date().toISOString()

    const { data, error } = await client
      .from('share_tokens')
      .select('token, expires_at')
      .eq('academy_id', academyId)
      .eq('access_code', code)
      .is('revoked_at', null)
      .gt('expires_at', now)
      .single()

    if (error || !data) {
      // 코드 오류와 만료를 구분하지 않음 (보안)
      return NextResponse.json({ error: '유효하지 않은 코드입니다.' }, { status: 404 })
    }

    return NextResponse.json({ token: data.token })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run check:quick 2>&1 | grep "share/code"
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/share/code/route.ts src/app/api/share/code/__tests__/route.test.ts
git commit -m "feat(api): POST /api/share/code — validate access code → return share token"
```

---

## Task 3: GET /api/academy/[academyId]/public + 공개 코드 입력 페이지

**Files:**
- Create: `src/app/api/academy/[academyId]/public/route.ts`
- Create: `src/app/academy/[academyId]/page.tsx`

### 3a: Public academy info API

- [ ] **Step 1: 구현 (단순, TDD 생략)**

```typescript
// src/app/api/academy/[academyId]/public/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function GET(
  _req: NextRequest,
  { params }: { params: { academyId: string } }
) {
  const { academyId } = params
  if (!academyId) return NextResponse.json({ error: 'academyId required' }, { status: 400 })

  const client = getServiceRoleClient()
  const { data, error } = await client
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ name: data.name })
}
```

### 3b: 공개 코드 입력 페이지

- [ ] **Step 2: 페이지 작성**

```tsx
// src/app/academy/[academyId]/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AcademyAccessPage({
  params,
}: {
  params: Promise<{ academyId: string }>
}) {
  const { academyId } = use(params)
  const router = useRouter()
  const [academyName, setAcademyName] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/academy/${academyId}/public`)
      .then((r) => r.json())
      .then((d) => setAcademyName(d.name ?? '학원'))
      .catch(() => setAcademyName('학원'))
  }, [academyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    const res = await fetch('/api/share/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed, academyId }),
    })

    if (!res.ok) {
      setError('코드가 올바르지 않습니다. 다시 확인해주세요.')
      setLoading(false)
      return
    }

    const { token } = await res.json()
    // 기존 /share/[token] 페이지로 이동 — 스케줄 뷰 재사용
    router.push(`/share/${token}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold text-slate-100">
            {academyName ?? '...'}
          </div>
          <p className="text-sm text-slate-400">
            자녀의 접속 코드를 입력해 시간표를 확인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="접속 코드 입력 (예: 이현2A)"
            maxLength={6}
            className="mb-3 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 text-center text-2xl font-bold tracking-widest text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            autoComplete="off"
            autoCapitalize="none"
          />

          {error && (
            <p className="mb-3 text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length < 4}
            className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-gray-900 hover:bg-amber-400 disabled:opacity-40 transition-colors"
          >
            {loading ? '확인 중...' : '시간표 보기 →'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          접속 코드는 학원에서 받은 서류 또는 원장에게 문의하세요
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run check:quick
```

- [ ] **Step 4: Dev 서버로 확인**

```bash
npm run dev
# http://localhost:3000/academy/test-academy-id 접속 확인
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/academy/\\[academyId\\]/public/route.ts src/app/academy/\\[academyId\\]/page.tsx
git commit -m "feat: /academy/[id] public code entry page + public academy info API"
```

---

## Task 4: POST /api/share-tokens/access-codes — 일괄 생성 + 갱신

**Files:**
- Create: `src/app/api/share-tokens/access-codes/route.ts`
- Create: `src/app/api/share-tokens/access-codes/__tests__/route.test.ts`

이 endpoint는 두 가지 모드:
- `POST { mode: 'create' }` — 코드 없는 학생들만 새 코드 생성 (멱등)
- `POST { mode: 'renew' }` — 전체 코드 갱신 (기존 revoke + 신규 생성)

- [ ] **Step 1: 테스트 작성**

```typescript
// src/app/api/share-tokens/access-codes/__tests__/route.test.ts
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

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

function makeRequest(body: object, userId = 'owner-1') {
  return new NextRequest(`http://localhost/api/share-tokens/access-codes?userId=${userId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/share-tokens/access-codes', () => {
  it('owner가 mode=create 호출 → 200 반환', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    // students: 2명, 기존 코드 없음
    mockSupabase.select.mockReturnThis()
    mockSupabase.eq.mockReturnThis()
    mockSupabase.is.mockReturnThis()
    ;(mockSupabase as any).data = [
      { id: 's1', name: '이현진' },
      { id: 's2', name: '강지원' },
    ]
    ;(mockSupabase as any).error = null
    mockSupabase.from.mockImplementation(() => ({ ...mockSupabase, data: [{ id: 's1', name: '이현진' }, { id: 's2', name: '강지원' }], error: null }))

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ mode: 'create' }))
    expect(res.status).toBe(200)
  })

  it('admin이 아닌 member 호출 → 403', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'member' })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ mode: 'create' }))
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: 실패 확인**

```bash
npm run check:quick 2>&1 | grep "access-codes"
```

- [ ] **Step 3: 구현**

```typescript
// src/app/api/share-tokens/access-codes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { generateAccessCode } from '@/lib/accessCode'
import { logger } from '@/lib/logger'

const EXPIRES_DAYS = 180  // 6개월

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { mode } = await request.json().catch(() => ({ mode: 'create' }))

  let membership: { academyId: string; role: string }
  try {
    membership = await resolveAcademyMembership(userId)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: '원장과 관리자만 접속 코드를 관리할 수 있습니다.' }, { status: 403 })
  }

  const client = getServiceRoleClient()
  const { academyId } = membership

  // 1. 학원의 모든 학생 조회
  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id, name')
    .eq('academy_id', academyId)

  if (studentsError || !students) {
    logger.error('학생 목록 조회 실패', { academyId }, studentsError as Error)
    return NextResponse.json({ error: '학생 목록 조회 실패' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString()

  if (mode === 'renew') {
    // 기존 코드 전체 revoke
    await client
      .from('share_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('academy_id', academyId)
      .not('access_code', 'is', null)
  }

  // 2. 코드 없는 학생에게 생성 (create) 또는 전체 생성 (renew)
  let studentsToCreate = students

  if (mode === 'create') {
    // 이미 유효한 코드가 있는 학생은 제외
    const { data: existingCodes } = await client
      .from('share_tokens')
      .select('filter_student_id')
      .eq('academy_id', academyId)
      .not('access_code', 'is', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())

    const existingStudentIds = new Set((existingCodes ?? []).map((c) => c.filter_student_id))
    studentsToCreate = students.filter((s) => !existingStudentIds.has(s.id))
  }

  if (studentsToCreate.length === 0) {
    return NextResponse.json({ success: true, created: 0, message: '모든 학생에게 코드가 있습니다.' })
  }

  // 3. 각 학생 코드 생성 (충돌 시 재시도)
  const inserts = []
  const usedCodes = new Set<string>()

  for (const student of studentsToCreate) {
    let code = generateAccessCode(student.name)
    let attempts = 0
    while (usedCodes.has(code) && attempts < 10) {
      code = generateAccessCode(student.name)
      attempts++
    }
    usedCodes.add(code)
    inserts.push({
      academy_id: academyId,
      label: `${student.name} 학부모 접속 코드`,
      filter_student_id: student.id,
      access_code: code,
      expires_at: expiresAt,
      created_by: userId,
    })
  }

  const { error: insertError } = await client.from('share_tokens').insert(inserts)

  if (insertError) {
    logger.error('접속 코드 생성 실패', { academyId }, insertError as Error)
    return NextResponse.json({ error: '코드 생성 실패' }, { status: 500 })
  }

  return NextResponse.json({ success: true, created: inserts.length })
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run check:quick
```

- [ ] **Step 5: 학생 삭제 시 코드 자동 revoke**

`src/hooks/useStudentManagementLocal.ts`의 `deleteStudent` 함수에 추가:

```typescript
// deleteStudent 함수 내 서버 sync 이후:
const userId = localStorage.getItem("supabase_user_id")
if (userId) {
  // 해당 학생의 접속 코드 revoke (fire-and-forget)
  fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId }),
  }).catch(() => {})
}
```

**`src/app/api/share-tokens/access-codes/route.ts`에 DELETE 핸들러 추가:**

```typescript
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { studentId } = await request.json().catch(() => ({}))
  if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

  const membership = await resolveAcademyMembership(userId).catch(() => null)
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = getServiceRoleClient()
  await client
    .from('share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('academy_id', membership.academyId)
    .eq('filter_student_id', studentId)
    .not('access_code', 'is', null)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/share-tokens/access-codes/route.ts src/app/api/share-tokens/access-codes/__tests__/route.test.ts src/hooks/useStudentManagementLocal.ts
git commit -m "feat(api): POST /api/share-tokens/access-codes — bulk create + renew parent access codes; DELETE on student remove"
```

---

## Task 5: Settings — "학부모 접속 코드" 섹션

**Files:**
- Modify: `src/app/settings/page.tsx`

읽어야 할 파일:
```bash
cat src/app/settings/page.tsx | grep -n "시간표 공유\|shareToken\|ShareToken\|canManage" | head -20
```

### 섹션 추가 위치: 기존 "시간표 공유" 섹션 바로 위 또는 아래

**사전 확인:**
1. `academyId` — settings/page.tsx에서 `myAcademy?.id` 또는 `resolveAcademyMembership` 결과로 이미 있을 가능성 높음. 파일 읽어서 확인.
2. 학생 이름 표시 — `GET /api/share-tokens` 응답에서 `access_code`가 있는 코드의 `label`에 이미 `"이현진 학부모 접속 코드"` 형태로 학생명 포함. `label.replace(' 학부모 접속 코드', '')`로 추출 가능. `students` 별도 배열 불필요.

- [ ] **Step 1: settings/page.tsx 전체 읽기**

```bash
wc -l src/app/settings/page.tsx
```

- [ ] **Step 2: 필요한 상태 변수 + fetch 추가**

기존 `fetchData` 함수 내 또는 별도 `fetchAccessCodes` 함수:

```typescript
// 기존 share_tokens fetch 옆에 추가 (예: line ~81)

// 학부모 접속 코드 조회 (access_code 있는 share_tokens만)
const accessCodesRes = await fetch(`/api/share-tokens?userId=${userId}`)
const accessCodesData = await accessCodesRes.json()
// filter: access_code가 있는 것만
const codes = (accessCodesData.data ?? []).filter((t: ShareToken) => t.access_code)
setAccessCodes(codes)
```

현재 GET `/api/share-tokens` 응답에는 `access_code`가 없음 → API 수정 필요:

**`src/app/api/share-tokens/route.ts` 수정:**
```typescript
// SELECT에 access_code, filter_student_id 추가 (이미 있을 수 있음)
.select("id, token, label, filter_student_id, expires_at, created_at, revoked_at, access_code")
```

- [ ] **Step 3: 상태 타입 추가**

```typescript
interface AccessCode {
  id: string
  label: string
  filter_student_id: string | null
  access_code: string
  expires_at: string
}
// useState<AccessCode[]>([]) 추가
```

- [ ] **Step 4: "학부모 접속 코드" 섹션 JSX 추가**

아래 섹션을 settings/page.tsx의 "시간표 공유" 섹션 **위에** 추가:

```tsx
{/* 학부모 접속 코드 섹션 (원장/admin만) */}
{canManage && (
  <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden">
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">학부모 접속 코드</h3>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          학부모가 자녀 시간표를 볼 수 있는 코드입니다
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleRenewAccessCodes}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors"
        >
          ↻ 전체 갱신
        </button>
        <button
          onClick={handleCreateAccessCodes}
          className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-admin-ink)]"
        >
          코드 생성
        </button>
      </div>
    </div>

    {accessCodes.length === 0 ? (
      <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
        코드가 없습니다.{' '}
        <button onClick={handleCreateAccessCodes} className="text-[var(--color-accent)] underline">
          코드 생성하기
        </button>
      </div>
    ) : (
      <div>
        {accessCodes.map((code) => {
          // label에서 학생 이름 추출: "이현진 학부모 접속 코드" → "이현진"
          const studentName = code.label?.replace(' 학부모 접속 코드', '') ?? '알 수 없음'
          const daysLeft = Math.ceil(
            (new Date(code.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          return (
            <div
              key={code.id}
              className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] last:border-0"
            >
              <span className="text-sm font-semibold text-[var(--color-text-primary)] w-24 flex-shrink-0">
                {studentName}
              </span>
              <span className="font-mono text-base font-bold tracking-wider text-[var(--color-accent)]">
                {code.access_code}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">D-{daysLeft}</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/academy/${academyId}`
                    navigator.clipboard.writeText(`${url}\n코드: ${code.access_code}`)
                    showToast('success', `${studentName} 코드 복사됨`)
                  }}
                  className="text-xs border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
                >
                  URL+코드 복사
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )}

    <div className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
      <p className="text-xs text-[var(--color-text-muted)]">
        학원 접속 URL:{' '}
        <span className="font-mono text-[var(--color-accent)]">
          {typeof window !== 'undefined' ? window.location.origin : ''}/academy/{academyId}
        </span>
      </p>
    </div>
  </section>
)}
```

- [ ] **Step 5: 핸들러 추가**

```typescript
const handleCreateAccessCodes = async () => {
  const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'create' }),
  })
  if (res.ok) {
    const data = await res.json()
    showToast('success', `${data.created}명의 접속 코드가 생성됐습니다.`)
    await fetchData()
  } else {
    showToast('error', '코드 생성에 실패했습니다.')
  }
}

const handleRenewAccessCodes = async () => {
  if (!window.confirm('모든 접속 코드를 새로 발급할까요? 기존 코드는 즉시 만료됩니다.')) return
  const res = await fetch(`/api/share-tokens/access-codes?userId=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'renew' }),
  })
  if (res.ok) {
    showToast('success', '모든 접속 코드가 갱신됐습니다.')
    await fetchData()
  } else {
    showToast('error', '코드 갱신에 실패했습니다.')
  }
}
```

- [ ] **Step 6: 빌드 + Playwright 검증**

```bash
npm run check
npm run dev
# http://localhost:3000/settings 접속 → "학부모 접속 코드" 섹션 확인
# "코드 생성" 클릭 → 목록 표시 확인
```

Playwright MCP로 스크린샷 캡처. UI sentinel 생성:
```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo 'session')" "Settings access code section verified" > .claude/ui-verified
```

- [ ] **Step 7: Commit**

```bash
git add src/app/settings/page.tsx src/app/api/share-tokens/route.ts
git commit -m "feat(ui): settings — parent access code section (create, renew, copy)"
```

---

## Task 6: Share 버튼 member 숨김 + Settings 이메일 privacy

**Files:**
- Modify: `src/components/organisms/ScheduleActionBar.tsx`
- Modify: `src/app/settings/page.tsx`

### 6a: Share 버튼 숨김

- [ ] **Step 1: ScheduleActionBar.tsx 읽기**

```bash
grep -n "share\|Share\|canManage" src/components/organisms/ScheduleActionBar.tsx | head -10
```

- [ ] **Step 2: Share 버튼에 canManage 조건 추가**

```tsx
// 현재: <Link href="/settings"> <Share2 ...> </Link>
// 변경: canManage일 때만 렌더
{canManage && (
  <Link href="/settings" ...>
    <Share2 .../>
  </Link>
)}
```

`canManage`를 `ScheduleActionBar`의 props로 받거나, props에 이미 있으면 사용. 없으면 prop 추가:
```typescript
interface ScheduleActionBarProps {
  // 기존 props...
  canManage?: boolean
}
```

### 6b: Settings 팀 멤버 이메일 숨김 (member에게)

- [ ] **Step 3: settings/page.tsx에서 TeacherRow 이메일 부분 찾기**

```bash
grep -n "teacher.email\|이메일 미입력" src/app/settings/page.tsx | head -10
```

- [ ] **Step 4: member에게 다른 강사 이메일 숨김**

TeacherRow 또는 해당 섹션에서:
```tsx
// teacher.email 표시 부분
const showEmail = canManage || teacher.user_id === currentUserId
// → canManage(owner/admin)이거나 본인이면 이메일 표시
// → member가 다른 강사 보면 "이메일 비공개" 표시
{showEmail
  ? teacher.email ?? '이메일 미입력'
  : '이메일 비공개'
}
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add src/components/organisms/ScheduleActionBar.tsx src/app/settings/page.tsx
git commit -m "fix: share button hidden for member; settings email privacy for non-owner"
```

---

## Plan A 완료 체크리스트

- [ ] `share_tokens.access_code` 컬럼 존재 (migration 040 적용)
- [ ] `generateAccessCode('이현진')` → 4자 코드 반환 (혼동 문자 없음)
- [ ] `POST /api/share/code { code: '이현2A', academyId }` → `{ token }` 반환
- [ ] `/academy/[academyId]` 공개 접속 → 코드 입력 → `/share/[token]` redirect
- [ ] Settings "학부모 접속 코드" 섹션 → 코드 생성/목록/복사
- [ ] 코드 갱신 → 기존 코드 만료 + 신규 생성
- [ ] member 시간표 → share(📤) 버튼 없음
- [ ] member Settings → 다른 강사 이메일 "이메일 비공개"
- [ ] `npm run check` 전체 pass

---

## 다음 단계 (별도 작업)

- **`feat/pdf-teacher-selector` 머지** — 완성 상태의 브랜치. PR 생성 후 머지.
- **드래그 핸들 숨김** — member에게 `::` 핸들 숨기는 작은 fix (1줄 변경).
- **코드 시트 PDF 인쇄** — optional, 학원 운영 편의 기능. 추후 추가.
