# Multi-Academy User Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한 계정이 여러 학원에 속할 수 있도록 — localStorage 데이터 분리 + UI에서 학원 전환 가능.

**Architecture:** (1) `classPlannerData:{userId}:{academyId}` — 학원별 localStorage 완전 분리. (2) `active_academy_{userId}` 쿠키로 현재 활성 학원 추적. (3) `resolveAcademyMembership` 우선순위 개선. (4) 사이드바 Academy Switcher. 학원 전환 = active_academy 업데이트 + 새 스코프 bootstrap + 페이지 리로드.

**Tech Stack:** Next.js 15, TypeScript, Supabase, Vitest, Tailwind CSS 4

**Spec 참조:** `docs/superpowers/specs/2026-05-02-multi-academy-design.md`

**선행 조건:** `feat/academy-slug` PR 머지 후 진행 (slug 기능 활용).

---

## File Map

| 파일 | 역할 |
|------|------|
| `src/lib/localStorageCrud.ts` | 수정 — localStorage 키에 academyId suffix 추가 + one-time migration |
| `src/lib/resolveAcademyMembership.ts` | 수정 — active_academy 쿠키 우선 + role 우선순위 정렬 |
| `src/app/api/academies/mine/route.ts` | 신규 — 현재 사용자의 모든 학원 목록 |
| `src/app/api/auth/set-active-academy/route.ts` | 신규 — active_academy 쿠키 설정 |
| `src/hooks/useMyRole.ts` | 수정 — active_academy 쿠키 설정 fire-and-forget |
| `src/components/molecules/Sidebar.tsx` | 수정 — Academy Switcher 추가 |

---

## 시작: 작업 브랜치 생성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/multi-academy
```

---

## Task 1: localStorage 키 분리 — 가장 중요한 데이터 안전성

**File:** `src/lib/localStorageCrud.ts`

**현재:**
```typescript
function getStorageKey(): string {
  const userId = localStorage.getItem("supabase_user_id")
  return userId ? `classPlannerData:${userId}` : "classPlannerData:anonymous"
}
```

**변경:** active_academy를 포함한 키 사용.

- [ ] **Read the current file:**

```bash
cat src/lib/localStorageCrud.ts | head -60
```

- [ ] **Add new key function (at top of file, near existing getStorageKey):**

```typescript
// Active academy 관리
const ACTIVE_ACADEMY_KEY_PREFIX = 'active_academy'

export function getActiveAcademyId(userId: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`${ACTIVE_ACADEMY_KEY_PREFIX}:${userId}`)
}

export function setActiveAcademyId(userId: string, academyId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${ACTIVE_ACADEMY_KEY_PREFIX}:${userId}`, academyId)
}

export function clearActiveAcademy(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${ACTIVE_ACADEMY_KEY_PREFIX}:${userId}`)
}
```

- [ ] **Update `getStorageKey` to include academyId:**

```typescript
function getStorageKey(academyId?: string): string {
  if (typeof window === 'undefined') return 'classPlannerData:anonymous'
  const userId = localStorage.getItem('supabase_user_id')
  if (!userId) return 'classPlannerData:anonymous'

  // academyId provided → use it; otherwise fall back to active_academy or legacy key
  const activeAcademyId = academyId ?? getActiveAcademyId(userId)
  if (activeAcademyId) {
    return `classPlannerData:${userId}:${activeAcademyId}`
  }
  // Legacy fallback (single-academy era)
  return `classPlannerData:${userId}`
}
```

- [ ] **Update all functions that call `getStorageKey()` to optionally accept `academyId`:**

```typescript
export function getClassPlannerData(academyId?: string): ClassPlannerData {
  const key = getStorageKey(academyId)
  // ... rest unchanged
}

export function setClassPlannerData(data: ClassPlannerData, academyId?: string): void {
  const key = getStorageKey(academyId)
  // ... rest unchanged
}
```

- [ ] **One-time migration: copy legacy data to new key on first access:**

In `getClassPlannerData`, add migration check:

```typescript
export function getClassPlannerData(academyId?: string): ClassPlannerData {
  const newKey = getStorageKey(academyId)
  const userId = typeof window !== 'undefined' ? localStorage.getItem('supabase_user_id') : null

  // One-time migration: if new key is empty but legacy key exists, copy data
  if (userId && academyId) {
    const legacyKey = `classPlannerData:${userId}`
    const newKeyData = localStorage.getItem(newKey)
    if (!newKeyData) {
      const legacyData = localStorage.getItem(legacyKey)
      if (legacyData) {
        localStorage.setItem(newKey, legacyData)
        // Don't delete legacy key — leave it for rollback safety
      }
    }
  }

  const raw = localStorage.getItem(newKey)
  // ... rest unchanged
}
```

- [ ] **Run tests:**

```bash
npm run check:quick
```

- [ ] **Commit:**

```bash
git add src/lib/localStorageCrud.ts
git commit -m "feat(lib): localStorage per-academy scope — classPlannerData:{userId}:{academyId}"
```

---

## Task 2: resolveAcademyMembership — active_academy + role 우선순위

**File:** `src/lib/resolveAcademyMembership.ts`

- [ ] **Read the current file:**

```bash
cat src/lib/resolveAcademyMembership.ts
```

- [ ] **Update to support active_academy_id in request cookies:**

```typescript
// src/lib/resolveAcademyMembership.ts
import { getServiceRoleClient } from './supabaseServiceRole'
import { cookies } from 'next/headers'

export interface AcademyMembership {
  academyId: string
  role: string
}

export async function resolveAcademyMembership(
  userId: string,
  preferredAcademyId?: string  // optional hint (from cookie or explicit)
): Promise<AcademyMembership> {
  const client = getServiceRoleClient()

  // If a preferred academy is specified, try it first
  if (preferredAcademyId) {
    const { data: preferred } = await client
      .from('academy_members')
      .select('academy_id, role')
      .eq('user_id', userId)
      .eq('academy_id', preferredAcademyId)
      .single()

    if (preferred) {
      return { academyId: preferred.academy_id, role: preferred.role }
    }
  }

  // Fallback: get all academies, prioritize owner > admin > member
  const { data, error } = await client
    .from('academy_members')
    .select('academy_id, role')
    .eq('user_id', userId)
    .order('role', { ascending: true })  // 'admin' < 'member' < 'owner' alphabetically — need explicit sort

  if (error || !data || data.length === 0) {
    throw new Error(`사용자(${userId})에 매핑된 학원을 찾을 수 없습니다.`)
  }

  // Sort by role priority: owner first, then admin, then member
  const ROLE_PRIORITY: Record<string, number> = { owner: 0, admin: 1, member: 2 }
  const sorted = [...data].sort(
    (a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99)
  )

  return { academyId: sorted[0].academy_id, role: sorted[0].role }
}
```

**Note:** Server-side routes that need active academy should read the `active_academy_id` cookie and pass it as `preferredAcademyId`:

```typescript
// Pattern for API routes that need active academy context:
import { cookies } from 'next/headers'

const cookieStore = await cookies()
const activeAcademyId = cookieStore.get('active_academy_id')?.value

const membership = await resolveAcademyMembership(userId, activeAcademyId)
```

- [ ] **Run tests:**

```bash
npm run check:quick
```

- [ ] **Commit:**

```bash
git add src/lib/resolveAcademyMembership.ts
git commit -m "feat(lib): resolveAcademyMembership — prefer active_academy cookie, owner-first priority"
```

---

## Task 3: GET /api/academies/mine + POST /api/auth/set-active-academy

**Files:**
- Create: `src/app/api/academies/mine/route.ts`
- Create: `src/app/api/auth/set-active-academy/route.ts`

### 3a: GET /api/academies/mine

```typescript
// src/app/api/academies/mine/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const client = getServiceRoleClient()
  const { data, error } = await client
    .from('academy_members')
    .select('role, academies(id, name, slug)')
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: 'fetch failed' }, { status: 500 })

  const ROLE_PRIORITY: Record<string, number> = { owner: 0, admin: 1, member: 2 }
  const academies = (data ?? [])
    .map((row) => {
      const academy = row.academies as unknown as { id: string; name: string; slug: string | null }
      return { id: academy.id, name: academy.name, slug: academy.slug, role: row.role }
    })
    .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 99) - (ROLE_PRIORITY[b.role] ?? 99))

  return NextResponse.json({ academies })
}
```

### 3b: POST /api/auth/set-active-academy

```typescript
// src/app/api/auth/set-active-academy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServiceRole'

export async function POST(request: NextRequest) {
  const { userId, academyId } = await request.json().catch(() => ({}))
  if (!userId || !academyId) {
    return NextResponse.json({ error: 'userId and academyId required' }, { status: 400 })
  }

  // Verify user actually belongs to this academy
  const client = getServiceRoleClient()
  const { data } = await client
    .from('academy_members')
    .select('role')
    .eq('user_id', userId)
    .eq('academy_id', academyId)
    .single()

  if (!data) {
    return NextResponse.json({ error: '해당 학원의 멤버가 아닙니다.' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('active_academy_id', academyId, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
  return res
}
```

- [ ] **Run tests after implementing:**

```bash
npm run check:quick
```

- [ ] **Commit:**

```bash
git add src/app/api/academies/mine/route.ts src/app/api/auth/set-active-academy/route.ts
git commit -m "feat(api): GET /api/academies/mine + POST /api/auth/set-active-academy"
```

---

## Task 4: useMyRole — load active academy + multi-academy awareness

**File:** `src/hooks/useMyRole.ts`

Read the current file. After fetching the user's role, also fetch their list of academies and set the active academy ID in localStorage.

- [ ] **Add academies list state and fetch:**

```typescript
// In useMyRole, add new state:
const [academies, setAcademies] = useState<Array<{ id: string; name: string; slug: string | null; role: string }>>([])

// In the effect where role is fetched:
// After setting role, also load academies list:
const academiesRes = await fetch(`/api/academies/mine?userId=${userId}`)
if (academiesRes.ok) {
  const { academies: list } = await academiesRes.json()
  setAcademies(list)

  // Set active academy in localStorage if not set yet
  const { getActiveAcademyId, setActiveAcademyId } = await import('@/lib/localStorageCrud')
  const currentActive = getActiveAcademyId(userId)
  if (!currentActive && list.length > 0) {
    setActiveAcademyId(userId, list[0].id)  // default to first (owner-priority sorted)
  }
}
```

- [ ] **Export `academies` from hook:**

```typescript
return {
  role,
  isLoading,
  canManage,
  academies,    // ← 추가
  linkedTeacherId,
  linkedTeacherName,
  linkedTeacherColor,
}
```

- [ ] **Commit:**

```bash
git add src/hooks/useMyRole.ts
git commit -m "feat(hook): useMyRole — fetch academies list, set active academy default"
```

---

## Task 5: Sidebar — Academy Switcher

**File:** `src/components/molecules/Sidebar.tsx`

Read the current Sidebar. The "CP" logo button at the top will become the Academy Switcher.

- [ ] **Read current file:**

```bash
cat src/components/molecules/Sidebar.tsx
```

- [ ] **Add switcher state and handler:**

```typescript
// In Sidebar component, add:
const { academies, role: currentRole } = useMyRole()
const [showSwitcher, setShowSwitcher] = useState(false)
const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null)

useEffect(() => {
  const userId = localStorage.getItem('supabase_user_id')
  if (!userId) return
  const { getActiveAcademyId } = require('@/lib/localStorageCrud')
  setActiveAcademyId(getActiveAcademyId(userId))
}, [])

const activeAcademy = academies.find(a => a.id === activeAcademyId) ?? academies[0]

async function handleSwitchAcademy(targetAcademyId: string) {
  const userId = localStorage.getItem('supabase_user_id')
  if (!userId || targetAcademyId === activeAcademyId) {
    setShowSwitcher(false)
    return
  }

  // 1. Update active academy cookie (server)
  await fetch('/api/auth/set-active-academy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, academyId: targetAcademyId }),
  })

  // 2. Update active academy in localStorage
  const { setActiveAcademyId } = await import('@/lib/localStorageCrud')
  setActiveAcademyId(userId, targetAcademyId)

  // 3. Reload page — cleanest way to reset all React state for new academy
  window.location.reload()
}
```

- [ ] **Replace "CP" logo button with Academy Switcher:**

Find the "CP" logo section and replace with:

```tsx
{/* Academy Switcher — only show when user has 2+ academies */}
<div className="relative">
  <button
    onClick={() => setShowSwitcher(v => !v)}
    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
    style={{
      '--tc': '#fbbf24',
      backgroundColor: 'color-mix(in srgb, var(--tc) 20%, transparent)',
      color: 'var(--tc)',
    } as React.CSSProperties}
    title={activeAcademy?.name ?? '학원'}
  >
    {activeAcademy?.name?.slice(0, 2) ?? 'CP'}
  </button>

  {/* Dropdown */}
  {showSwitcher && academies.length > 0 && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowSwitcher(false)}
      />
      <div className="absolute left-full top-0 ml-2 z-50 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl">
        <div className="px-3 py-1.5 text-xs text-slate-500 font-medium">내 학원</div>
        {academies.map((academy) => (
          <button
            key={academy.id}
            onClick={() => handleSwitchAcademy(academy.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700 transition-colors ${
              academy.id === activeAcademyId ? 'bg-amber-500/10' : ''
            }`}
          >
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
              style={{
                '--tc': academy.id === activeAcademyId ? '#fbbf24' : '#3b82f6',
                backgroundColor: 'color-mix(in srgb, var(--tc) 20%, transparent)',
                color: 'var(--tc)',
              } as React.CSSProperties}
            >
              {academy.name.slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">{academy.name}</div>
              <div className="text-[10px] text-slate-500">{academy.role === 'owner' ? '원장' : academy.role === 'admin' ? '관리자' : '강사'}</div>
            </div>
            {academy.id === activeAcademyId && (
              <span className="text-amber-400 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

**Note:** Only show the dropdown if `academies.length > 1`. If single academy, logo is still the logo but non-interactive (or shows tooltip).

- [ ] **Build + Playwright verify:**

```bash
npm run check
npm run dev
# Verify Academy Switcher in sidebar
```

```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo 'session')" "Academy Switcher in Sidebar verified" > .claude/ui-verified
```

- [ ] **Commit:**

```bash
git add src/components/molecules/Sidebar.tsx src/hooks/useMyRole.ts
git commit -m "feat(ui): Sidebar Academy Switcher — dropdown to switch between academies"
```

---

## Plan B 완료 체크리스트

- [ ] `classPlannerData:{userId}:{academyId}` 스코프 사용됨
- [ ] 기존 `classPlannerData:{userId}` 데이터가 첫 접근 시 새 키로 복사됨 (유실 없음)
- [ ] `resolveAcademyMembership` — owner 역할 우선 반환
- [ ] `active_academy_id` 쿠키가 학원 컨텍스트 결정
- [ ] `GET /api/academies/mine` — 사용자의 학원 목록 반환
- [ ] 사이드바 Academy Switcher — 학원 2개 이상일 때 드롭다운
- [ ] 학원 전환 후 페이지 리로드 → 새 학원 데이터 표시
- [ ] 학원 A에서 추가한 학생이 학원 B에서 보이지 않음 (데이터 분리)
- [ ] `npm run check` 전부 pass
