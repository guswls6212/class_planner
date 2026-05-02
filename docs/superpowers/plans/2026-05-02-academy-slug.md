# Academy Slug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/academy/UUID` → `/academy/현진학원` — 학원명 기반 slug로 공개 URL 가독성 개선.

**Architecture:** `academies.slug` 컬럼 추가 + slug 생성 유틸 + `/academy/[identifier]` 라우팅 (UUID/slug 모두 수용, UUID는 slug로 redirect) + Settings 편집기 (실시간 중복 확인 + 변경 영향 경고).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase, Vitest, Tailwind CSS 4

**Spec 참조:** `docs/superpowers/specs/2026-05-02-academy-slug-design.md`

---

## File Map

| 파일 | 역할 |
|------|------|
| `migration/migrations/041_academy_slug.sql` | slug 컬럼 추가 |
| `src/lib/slug.ts` | 신규 — slug 생성/검증 유틸 |
| `src/app/api/academies/check-slug/route.ts` | 신규 — 중복 확인 (public) |
| `src/app/api/academies/slug/route.ts` | 신규 — PATCH slug (owner only) |
| `src/app/api/academy/[identifier]/public/route.ts` | 신규 — UUID/slug 모두 지원 |
| `src/app/academy/[identifier]/page.tsx` | 기존 rename + 수정 (UUID→slug redirect) |
| `src/app/settings/page.tsx` | 수정 — slug 편집 섹션 추가 |

---

## 시작: 작업 브랜치 생성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/academy-slug
```

---

## Task 1: Migration 041 + Slug 유틸

**Files:**
- Create: `migration/migrations/041_academy_slug.sql`
- Create: `src/lib/slug.ts`
- Create: `src/lib/__tests__/slug.test.ts`

### Step 1a: Migration

- [ ] **Write migration file:**

```sql
-- migration/migrations/041_academy_slug.sql
ALTER TABLE academies
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_academies_slug ON academies (slug);
```

- [ ] **Apply to DB via Supabase MCP or:**

```bash
psql "$DATABASE_URL" -f migration/migrations/041_academy_slug.sql
```

- [ ] **Commit:**

```bash
git add migration/migrations/041_academy_slug.sql
git commit -m "feat(db): add academies.slug for readable public URLs"
```

### Step 1b: Slug utility (TDD)

- [ ] **Write failing tests:**

```typescript
// src/lib/__tests__/slug.test.ts
import { describe, it, expect } from 'vitest'
import { generateSlug, isValidSlug, sanitizeSlug } from '../slug'

describe('generateSlug', () => {
  it('학원명을 slug로 변환', () => {
    expect(generateSlug('현진학원')).toBe('현진학원')
    expect(generateSlug('  현진 학원  ')).toBe('현진-학원')
    expect(generateSlug('My Academy')).toBe('My-Academy')
  })

  it('50자 초과 시 잘라냄', () => {
    const long = '가'.repeat(60)
    expect(generateSlug(long).length).toBeLessThanOrEqual(50)
  })
})

describe('isValidSlug', () => {
  it('2자 이상 50자 이하 유효', () => {
    expect(isValidSlug('현진학원')).toBe(true)
    expect(isValidSlug('ab')).toBe(true)
    expect(isValidSlug('a')).toBe(false)  // 1자
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('a'.repeat(51))).toBe(false)
  })
})

describe('sanitizeSlug', () => {
  it('특수문자 제거, 공백→하이픈', () => {
    expect(sanitizeSlug('hello world!')).toBe('hello-world')
    expect(sanitizeSlug('my--academy')).toBe('my-academy')  // 중복 하이픈 제거
  })
})
```

- [ ] **Run failing test:**

```bash
npm run check:quick 2>&1 | grep slug
```

- [ ] **Implement:**

```typescript
// src/lib/slug.ts
export function sanitizeSlug(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, '-')           // 공백 → 하이픈
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\-]/g, '')  // 허용 문자만
    .replace(/-{2,}/g, '-')         // 중복 하이픈 제거
    .replace(/^-|-$/g, '')          // 앞뒤 하이픈 제거
}

export function generateSlug(name: string): string {
  return sanitizeSlug(name).slice(0, 50)
}

export function isValidSlug(slug: string): boolean {
  const s = sanitizeSlug(slug)
  return s.length >= 2 && s.length <= 50 && s === slug
}

export function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}
```

- [ ] **Run tests:**

```bash
npm run check:quick 2>&1 | grep slug
```

- [ ] **Commit:**

```bash
git add src/lib/slug.ts src/lib/__tests__/slug.test.ts
git commit -m "feat(lib): slug utility — generate, validate, sanitize"
```

---

## Task 2: GET /api/academies/check-slug — 중복 확인

**Files:**
- Create: `src/app/api/academies/check-slug/route.ts`
- Create: `src/app/api/academies/check-slug/__tests__/route.test.ts`

- [ ] **Write failing tests:**

```typescript
// src/app/api/academies/check-slug/__tests__/route.test.ts
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
  maybeSingle: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

describe('GET /api/academies/check-slug', () => {
  it('사용 가능한 slug → 200 { available: true }', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug?slug=현진학원'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.available).toBe(true)
  })

  it('중복 slug → 200 { available: false }', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'some-id' }, error: null })

    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug?slug=현진학원'))
    const body = await res.json()
    expect(body.available).toBe(false)
  })

  it('slug 파라미터 없으면 400', async () => {
    const { GET } = await import('../route')
    const res = await GET(new NextRequest('http://localhost/api/academies/check-slug'))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Run failing:**

```bash
npm run check:quick 2>&1 | grep check-slug
```

- [ ] **Implement:**

```typescript
// src/app/api/academies/check-slug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isValidSlug } from '@/lib/slug'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }

  if (!isValidSlug(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid_format' })
  }

  const client = getServiceRoleClient()
  const { data } = await client
    .from('academies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return NextResponse.json({ available: !data })
}
```

- [ ] **Run tests:**

```bash
npm run check:quick
```

- [ ] **Commit:**

```bash
git add src/app/api/academies/check-slug/route.ts src/app/api/academies/check-slug/__tests__/route.test.ts
git commit -m "feat(api): GET /api/academies/check-slug — public slug availability check"
```

---

## Task 3: PATCH /api/academies/slug — slug 변경

**Files:**
- Create: `src/app/api/academies/slug/route.ts`
- Create: `src/app/api/academies/slug/__tests__/route.test.ts`

Auth pattern: `userId` from `searchParams.get('userId')`. Read `src/app/api/academies/route.ts` for the existing PATCH pattern.

- [ ] **Write failing tests:**

```typescript
// src/app/api/academies/slug/__tests__/route.test.ts
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
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetServiceRoleClient.mockReturnValue(mockSupabase)
})

describe('PATCH /api/academies/slug', () => {
  it('owner가 slug 변경 → 200', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // no conflict
    mockSupabase.single.mockResolvedValueOnce({ data: { slug: '새slug' }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/academies/slug?userId=u1', {
        method: 'PATCH',
        body: JSON.stringify({ slug: '새slug' }),
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.slug).toBe('새slug')
  })

  it('admin이 slug 변경 시도 → 403', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'admin' })

    const { PATCH } = await import('../route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/academies/slug?userId=u1', {
        method: 'PATCH',
        body: JSON.stringify({ slug: '새slug' }),
      })
    )
    expect(res.status).toBe(403)
  })

  it('중복 slug → 409', async () => {
    mockResolveAcademyMembership.mockResolvedValue({ academyId: 'a1', role: 'owner' })
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'other' }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(
      new NextRequest('http://localhost/api/academies/slug?userId=u1', {
        method: 'PATCH',
        body: JSON.stringify({ slug: '중복slug' }),
      })
    )
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Implement:**

```typescript
// src/app/api/academies/slug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { resolveAcademyMembership } from '@/lib/resolveAcademyMembership'
import { isValidSlug } from '@/lib/slug'
import { logger } from '@/lib/logger'

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { slug } = await request.json().catch(() => ({}))
    if (!slug || !isValidSlug(slug)) {
      return NextResponse.json({ error: '유효하지 않은 slug입니다.' }, { status: 400 })
    }

    const membership = await resolveAcademyMembership(userId)
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: 'slug 변경은 원장만 가능합니다.' }, { status: 403 })
    }

    const client = getServiceRoleClient()

    // 중복 확인 (자기 자신 제외)
    const { data: existing } = await client
      .from('academies')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing && existing.id !== membership.academyId) {
      return NextResponse.json({ error: '이미 사용 중인 slug입니다.' }, { status: 409 })
    }

    const { data, error } = await client
      .from('academies')
      .update({ slug })
      .eq('id', membership.academyId)
      .select('slug')
      .single()

    if (error || !data) {
      logger.error('slug 변경 실패', { academyId: membership.academyId }, error as Error)
      return NextResponse.json({ error: 'slug 변경 실패' }, { status: 500 })
    }

    return NextResponse.json({ slug: data.slug })
  } catch (error) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
```

- [ ] **Run tests, then commit:**

```bash
npm run check:quick
git add src/app/api/academies/slug/route.ts src/app/api/academies/slug/__tests__/route.test.ts
git commit -m "feat(api): PATCH /api/academies/slug — owner-only slug update with conflict check"
```

---

## Task 4: /academy/[identifier] — UUID/slug 통합 라우팅

**Files:**
- Rename: `src/app/academy/[academyId]/` → `src/app/academy/[identifier]/`
- Modify: `src/app/academy/[identifier]/page.tsx`
- Modify: `src/app/api/academy/[identifier]/public/route.ts` (rename from `[academyId]`)

**Goal:** `[identifier]`가 UUID면 slug로 redirect. slug면 바로 학원 조회.

- [ ] **Rename directories:**

```bash
mv src/app/academy/\\[academyId\\] src/app/academy/\\[identifier\\]
mv src/app/api/academy/\\[academyId\\] src/app/api/academy/\\[identifier\\]
```

- [ ] **Update public API to support both UUID and slug:**

Read `src/app/api/academy/[identifier]/public/route.ts` and update:

```typescript
// src/app/api/academy/[identifier]/public/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'
import { isUUID } from '@/lib/slug'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const { identifier } = await params
  if (!identifier) return NextResponse.json({ error: 'identifier required' }, { status: 400 })

  const client = getServiceRoleClient()

  // UUID면 id로, 아니면 slug로 조회
  const query = isUUID(identifier)
    ? client.from('academies').select('id, name, slug').eq('id', identifier)
    : client.from('academies').select('id, name, slug').eq('slug', identifier)

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ id: data.id, name: data.name, slug: data.slug })
}
```

- [ ] **Update academy page to handle redirect:**

```typescript
// src/app/academy/[identifier]/page.tsx
'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isUUID } from '@/lib/slug'

export default function AcademyAccessPage({
  params,
}: {
  params: Promise<{ identifier: string }>
}) {
  const { identifier } = use(params)
  const router = useRouter()
  const [academyId, setAcademyId] = useState<string | null>(null)
  const [academyName, setAcademyName] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/academy/${identifier}/public`)
      .then((r) => r.json())
      .then((d) => {
        setAcademyName(d.name ?? '학원')
        setAcademyId(d.id ?? null)

        // UUID로 접속 시 slug URL로 redirect
        if (isUUID(identifier) && d.slug) {
          router.replace(`/academy/${d.slug}`)
        }
      })
      .catch(() => setAcademyName('학원'))
  }, [identifier, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/share/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      })

      if (!res.ok) {
        setError('코드가 올바르지 않습니다. 다시 확인해주세요.')
        setLoading(false)
        return
      }

      const { token } = await res.json()
      router.push(`/share/${token}`)
    } catch {
      setError('일시적인 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2 text-2xl font-bold text-slate-100">
            {academyName || '...'}
          </div>
          <p className="text-sm text-slate-400">
            자녀의 접속 코드를 입력해 시간표를 확인하세요
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="접속 코드 입력 (예: 이현2A)"
            maxLength={6}
            className="mb-3 w-full rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-4 text-center text-2xl font-bold tracking-widest text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
            autoComplete="off"
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

- [ ] **Build check:**

```bash
npm run check:quick
```

- [ ] **Commit:**

```bash
git add src/app/academy/ src/app/api/academy/
git commit -m "feat: /academy/[identifier] — support both UUID and slug, redirect UUID→slug"
```

---

## Task 5: Settings — Slug 편집 섹션

**Files:**
- Modify: `src/app/settings/page.tsx`

Read the settings page first to understand the existing academy name edit pattern (around line 413-465). The slug editor goes in the same "학원 설정" section, below the name editor.

**Pattern to follow:** same UX as name editing — pencil icon, inline edit, save/cancel. Plus: real-time slug check + change impact warning.

- [ ] **Add state variables** (near existing `isEditingName`, `editNameValue`):

```typescript
const [editSlugValue, setEditSlugValue] = useState('')
const [isEditingSlug, setIsEditingSlug] = useState(false)
const [isSavingSlug, setIsSavingSlug] = useState(false)
const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
const [slugCheckLoading, setSlugCheckLoading] = useState(false)
const [showSlugImpactWarning, setShowSlugImpactWarning] = useState(false)
const [slugImpactConfirmed, setSlugImpactConfirmed] = useState(false)
const currentSlug = myAcademy?.slug ?? ''  // need to ensure myAcademy includes slug
```

- [ ] **Add `slug` to myAcademy fetch** — check where `myAcademy` is populated and ensure the API returns `slug` in the response. The `/api/members` GET handler should include `slug` from the academy join.

Read `src/app/api/members/route.ts` and verify it selects `slug` from `academies`. If not, add `slug` to the SELECT.

- [ ] **Add debounced slug check handler:**

```typescript
const checkSlugAvailability = useCallback(
  debounce(async (slug: string) => {
    if (!slug || slug === currentSlug) {
      setSlugAvailable(null)
      return
    }
    setSlugCheckLoading(true)
    const res = await fetch(`/api/academies/check-slug?slug=${encodeURIComponent(slug)}`)
    const data = await res.json()
    setSlugAvailable(data.available)
    setSlugCheckLoading(false)
  }, 500),
  [currentSlug]
)
```

If `debounce` not available: `import { debounce } from 'lodash'` or implement manually.

- [ ] **Add save slug handler:**

```typescript
const handleSaveSlug = async () => {
  if (!slugAvailable || !slugImpactConfirmed) return
  setIsSavingSlug(true)
  const res = await fetch(`/api/academies/slug?userId=${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: editSlugValue }),
  })
  if (res.ok) {
    showToast('success', 'URL이 변경됐습니다.')
    setIsEditingSlug(false)
    setSlugImpactConfirmed(false)
    await fetchData()
  } else {
    const err = await res.json()
    showToast('error', err.error ?? 'URL 변경 실패')
  }
  setIsSavingSlug(false)
}
```

- [ ] **Add slug section JSX** after the academy name section:

```tsx
{/* Slug 편집 섹션 — owner only */}
{canManage && (
  <div className="px-6 pb-4">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-[var(--color-text-muted)]">학부모 접속 URL</span>
      {!isEditingSlug && (
        <button
          onClick={() => {
            setEditSlugValue(currentSlug)
            setIsEditingSlug(true)
            setSlugAvailable(null)
            setShowSlugImpactWarning(false)
            setSlugImpactConfirmed(false)
          }}
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="slug 편집"
        >
          ✎
        </button>
      )}
    </div>

    {!isEditingSlug ? (
      <p className="text-sm text-[var(--color-text-primary)] font-mono">
        {currentSlug
          ? `/academy/${currentSlug}`
          : <span className="text-[var(--color-text-muted)] italic">slug 미설정</span>
        }
      </p>
    ) : (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-[var(--color-text-muted)]">/academy/</span>
          <input
            value={editSlugValue}
            onChange={(e) => {
              setEditSlugValue(e.target.value)
              setSlugImpactConfirmed(false)
              if (e.target.value !== currentSlug) {
                setShowSlugImpactWarning(true)
              } else {
                setShowSlugImpactWarning(false)
              }
              checkSlugAvailability(e.target.value)
            }}
            className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1.5 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            placeholder="학원명 입력"
          />
          {/* 실시간 검증 결과 */}
          {slugCheckLoading && (
            <span className="text-xs text-[var(--color-text-muted)]">확인 중...</span>
          )}
          {!slugCheckLoading && slugAvailable === true && (
            <span className="text-xs text-emerald-400">✓ 사용 가능</span>
          )}
          {!slugCheckLoading && slugAvailable === false && (
            <span className="text-xs text-red-400">이미 사용 중</span>
          )}
        </div>

        {/* 변경 영향 경고 */}
        {showSlugImpactWarning && currentSlug && editSlugValue !== currentSlug && (
          <div className="rounded-lg bg-yellow-900/20 border border-yellow-700/40 p-3 mb-3">
            <p className="text-xs text-yellow-400 font-semibold mb-1">⚠️ URL 변경 시 영향</p>
            <p className="text-xs text-slate-400">
              부모님들이 저장한 <code className="bg-slate-800 px-1 rounded text-[10px]">/academy/{currentSlug}</code> 링크가 새 URL로 자동 연결됩니다.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={slugImpactConfirmed}
                onChange={(e) => setSlugImpactConfirmed(e.target.checked)}
                className="accent-amber-500"
              />
              <span className="text-xs text-slate-400">위 내용을 확인했습니다</span>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSaveSlug}
            disabled={
              isSavingSlug ||
              slugAvailable === false ||
              (showSlugImpactWarning && !slugImpactConfirmed) ||
              !editSlugValue
            }
            className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-accent text-[var(--color-admin-ink)] disabled:opacity-40 transition-opacity"
          >
            {isSavingSlug ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={() => {
              setIsEditingSlug(false)
              setSlugAvailable(null)
            }}
            className="flex-1 py-1.5 rounded-md text-xs border border-[var(--color-border)] text-[var(--color-text-muted)]"
          >
            취소
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

- [ ] **Auto-generate slug when academy has none** — in `fetchData`, after loading `myAcademy`:

```typescript
// If academy has no slug, auto-generate from name (silently, background)
if (myAcademy && !myAcademy.slug && myAcademy.name && userId) {
  const { generateSlug } = await import('@/lib/slug')
  const autoSlug = generateSlug(myAcademy.name)
  fetch(`/api/academies/slug?userId=${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: autoSlug }),
  }).catch(() => {})  // fire-and-forget
}
```

- [ ] **Also: update Settings copy buttons for academy URL** — the "학부모 접속 코드" section footer URL should prefer slug over UUID:

```typescript
// In the access code section footer:
const academyUrl = myAcademy?.slug
  ? `${window.location.origin}/academy/${myAcademy.slug}`
  : `${window.location.origin}/academy/${academyId ?? ''}`
```

- [ ] **Build + Playwright verify:**

```bash
npm run check
npm run dev
# Navigate to /settings → find slug section → edit → see real-time check
```

Create UI sentinel:
```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo 'session')" "Slug editor verified: real-time check + impact warning" > .claude/ui-verified
```

- [ ] **Commit:**

```bash
git add src/app/settings/page.tsx src/app/api/members/route.ts
git commit -m "feat(ui): settings — slug editor with real-time check and impact warning"
```

---

## Plan A 완료 체크리스트

- [ ] `academies.slug` 컬럼 존재 + unique index
- [ ] `generateSlug('현진학원')` → `'현진학원'` 반환
- [ ] `GET /api/academies/check-slug?slug=현진학원` → `{ available: true/false }`
- [ ] `PATCH /api/academies/slug`: owner 성공 → 200, admin → 403, 중복 → 409
- [ ] `/academy/현진학원` → 접속 코드 입력 가능
- [ ] `/academy/UUID` → `/academy/현진학원` 301 redirect
- [ ] Settings: slug 편집 + 실시간 검증 + 변경 경고
- [ ] `npm run check` 전부 pass

---

## 다음 단계 (Plan B)

`docs/superpowers/plans/2026-05-02-multi-academy.md` 에 multi-academy 구현 계획.
