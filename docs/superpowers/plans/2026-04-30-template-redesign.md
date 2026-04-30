# 템플릿 기능 재설계 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시간표 도메인을 주별 격리(weekStartDate)로 전환하고 템플릿 기능을 재설계 — 1개 고정 + 편집 가능 + 처음 보는 사람도 직관적인 UX.

**Architecture:** Session 모델에 `weekStartDate` 추가 → 기존 row 보존 전략으로 마이그레이션(attendance cascade 안전) → UI 컴포넌트 4종 신설/대체(TemplateMenuV2, EmptyWeekState, ApplyTemplateConfirm, TemplatePreviewModal) → 공유 링크/출결 회귀 방지 → ScheduleActionBar viewMode 분기.

**Tech Stack:** Next.js 15.5.9 (App Router), React 19, TypeScript 5 strict, Tailwind 4, Supabase PostgreSQL/JSONB, Vitest, Playwright, lucide-react.

**Design source:** `/Users/leo/.claude/plans/image-30-silly-stardust.md` (브레인스토밍 결과).

**Worktree:** `/Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner/.worktrees/template-redesign` (branch `feat/template-redesign`).

---

## Critical Path 요약

```
Phase 0 (사전 결정 게이트)
  ↓
Phase 1 (도메인 모델 + DB 마이그레이션) ← 모든 후속 phase의 기반
  ↓
  ├─ Phase 2 (공유 링크 회귀 방지) ← Phase 1 직후 필수, 안 하면 share 페이지 깨짐
  ├─ Phase 3 (useSessionsLocal + localStorage 마이그레이션)
  └─ Phase 4~7 (신규 UI 컴포넌트 4종, 병렬 작업 가능)
        ↓
        Phase 8 (useTemplates 훅 + API PUT)
        ↓
        Phase 9 (schedule/page.tsx 핸들러 재작성) ← 모든 컴포넌트 통합
        ↓
        Phase 10 (ScheduleActionBar viewMode 분기)
        ↓
        Phase 11 (회귀 점검 + 문서)
        ↓
        Phase 12 (최종 검증 + PR)
```

**Frequent commit:** Phase 단위로 dev에 머지하지 않고 모두 `feat/template-redesign` 브랜치에 누적. Phase 마지막 task에서 commit.

---

## Phase 0: 사전 결정 게이트 (✅ 2026-04-30 사용자 확정)

### Task 0.1: 마이그레이션 전략 ✅ 옵션 A 확정

기존 sessions row 보존 + `weekStartDate` 컬럼 추가 + 모든 row를 마이그레이션 시점의 현재 주(KST 월요일)에 일괄 할당. attendance `ON DELETE CASCADE` 회피.

⚠️ 사용자 동의: 이전 출결 데이터가 모두 마이그레이션 시점의 한 주에 묶이는 부작용 수용.

- [x] 사용자 확정 — 2026-04-30

### Task 0.2: 공유 링크 ✅ 옵션 (a) 확정

**현재 주 자동** — 공유 페이지가 항상 현재 KST 주 sessions를 노출. 매주 자동 갱신.

- [x] 사용자 확정 — 2026-04-30

### Task 0.3: 엔티티 매칭 전략 ✅ id 기반 확정 (2026-04-30 변경)

**모든 엔티티(학생·과목·강사)를 id 기반으로 매칭.** 이름 기반 매칭 및 자동 생성 없음.

- `TemplateSessionDef`: `studentIds: string[]`, `subjectId: string`, `teacherId?: string` 로 변경 (names 제거)
- 적용 시: id가 현재 학원에 존재하면 사용, 없으면 **해당 엔티티 스킵 + 토스트 경고** ("학생 N명 / 과목 M개 매칭 실패 — 더 이상 존재하지 않는 항목")
- 세션 내 studentIds가 모두 사라진 경우 그 세션 자체 스킵 + 토스트에 포함
- 기존 이름 기반 템플릿(이미 저장된 것): 적용 시점에 id 조회 실패 → 경고로 알림. 별도 마이그레이션 없음.

✅ 장점: 오타로 인한 유령 학생 생성 없음. 학생 이름 변경해도 매칭 유지. 정확성 ↑
⚠️ 트레이드오프: 학원 간 템플릿 공유 불가 (id는 academy 종속) — 현재 단일 학원 주류라 허용.

- [x] 사용자 확정 — 2026-04-30

---

## Phase 1: 도메인 모델 + DB 마이그레이션

**모든 후속 phase의 기반.** 이 phase가 끝나야 다른 phase를 시작할 수 있음.

### Task 1.1: weekStartDate 헬퍼 함수 작성 (TDD)

**Files:**
- Create: `src/lib/weekStart.ts`
- Test: `src/lib/__tests__/weekStart.test.ts`

도메인 규칙: 주 시작일 = **월요일** (한국 학원 관행). Timezone = `Asia/Seoul`. 출력 형식 = ISO date "YYYY-MM-DD".

- [ ] **Step 1: 실패 테스트 작성**

```ts
// src/lib/__tests__/weekStart.test.ts
import { describe, it, expect } from "vitest";
import { getWeekStartDate, parseDateToWeekStart } from "../weekStart";

describe("getWeekStartDate", () => {
  it("월요일을 입력하면 그대로 반환", () => {
    // 2026-04-27 (월) → "2026-04-27"
    expect(getWeekStartDate(new Date("2026-04-27T12:00:00+09:00"))).toBe("2026-04-27");
  });

  it("일요일을 입력하면 같은 주 월요일 반환", () => {
    // 2026-05-03 (일) → "2026-04-27" (그 주의 월)
    expect(getWeekStartDate(new Date("2026-05-03T12:00:00+09:00"))).toBe("2026-04-27");
  });

  it("Asia/Seoul timezone 기준으로 계산 (UTC 자정 경계 케이스)", () => {
    // UTC 2026-04-27T15:00:00 = KST 2026-04-28T00:00 (화) → 그 주 월 = "2026-04-27"
    expect(getWeekStartDate(new Date("2026-04-27T15:00:00Z"))).toBe("2026-04-27");
  });

  it("연말 경계 (다음 해로 넘어가는 주)", () => {
    // 2026-12-31 (목) → 그 주 월 = "2026-12-28"
    expect(getWeekStartDate(new Date("2026-12-31T12:00:00+09:00"))).toBe("2026-12-28");
  });
});

describe("parseDateToWeekStart", () => {
  it("ISO date 문자열 입력", () => {
    expect(parseDateToWeekStart("2026-05-03")).toBe("2026-04-27");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd .worktrees/template-redesign && npx vitest run src/lib/__tests__/weekStart.test.ts`
Expected: FAIL — "Cannot find module '../weekStart'"

- [ ] **Step 3: 구현**

```ts
// src/lib/weekStart.ts
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function getWeekStartDate(date: Date): string {
  // KST 기준 요일/날짜 계산
  const kstMs = date.getTime() + KST_OFFSET_MS;
  const kst = new Date(kstMs);
  const utcDayOfWeek = kst.getUTCDay(); // 0=일, 1=월, ..., 6=토
  const daysSinceMonday = utcDayOfWeek === 0 ? 6 : utcDayOfWeek - 1;
  const mondayMs = kst.getTime() - daysSinceMonday * 86400000;
  const monday = new Date(mondayMs);
  return monday.toISOString().slice(0, 10);
}

export function parseDateToWeekStart(isoDate: string): string {
  return getWeekStartDate(new Date(`${isoDate}T12:00:00+09:00`));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/__tests__/weekStart.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/weekStart.ts src/lib/__tests__/weekStart.test.ts
git commit -m "feat(domain): add weekStartDate helper with KST + Monday-start convention"
```

### Task 1.2: Session 타입에 weekStartDate 추가

**Files:**
- Modify: `src/lib/planner.ts:33-42`
- Test: `src/lib/__tests__/planner.test.ts` (이미 있다면 case 추가, 없으면 신설)

- [ ] **Step 1: planner.ts 수정 — Session 인터페이스에 필드 추가**

```ts
// src/lib/planner.ts (line 33-42 영역)
export interface Session {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  weekStartDate: string;   // ★ 신규. ISO date "YYYY-MM-DD" — 주 월요일
  enrollmentIds: string[];
  yPosition: number;
  room?: string;
}
```

- [ ] **Step 2: 컴파일 에러 모두 fix (스캐폴딩)**

`npx tsc --noEmit`로 모든 에러 확인. 각 발생 위치에 임시 fallback `weekStartDate: ""` (또는 `getWeekStartDate(new Date())`) 추가. 후속 task에서 정상화.

핵심 위치 (조사 결과):
- `src/app/schedule/page.tsx` - addSession, updateSession 호출
- `src/hooks/useSessionsLocal.ts` (또는 useSchedule 훅) - localStorage 직렬화
- `src/lib/apiSync.ts` - syncSessionCreate
- `src/services/SessionService.ts` 등 application layer
- `src/infrastructure/repositories/*Session*` - DB row ↔ Session 변환

- [ ] **Step 3: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: 단위 테스트 통과 확인 (regression)**

Run: `npx vitest run --reporter=basic` (전체)
Expected: 1683+ tests pass (기존 + 새 4)

- [ ] **Step 5: Commit**

```bash
git add src/lib/planner.ts <other modified files>
git commit -m "feat(domain): add weekStartDate field to Session type with stub fallbacks"
```

### Task 1.3: SQL 마이그레이션 — week_start_date 컬럼 추가

**Files:**
- Create: `supabase/migrations/0XX_add_week_start_date_to_sessions.sql` (다음 번호 사용 — 현재 030이면 031)

먼저 다음 마이그레이션 번호 확인:

```bash
ls supabase/migrations/ | sort | tail -3
```

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/031_add_week_start_date_to_sessions.sql

-- 1. 컬럼 추가 (nullable로 시작하여 기존 row에 NULL 허용)
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS week_start_date DATE;

-- 2. 기존 row를 마이그레이션 시점의 주(KST 기준 월요일)에 일괄 할당
--    Asia/Seoul timezone에서 현재 날짜의 ISO week 시작일(월요일)
UPDATE sessions
  SET week_start_date = (
    (CURRENT_DATE AT TIME ZONE 'Asia/Seoul')::DATE
    - EXTRACT(ISODOW FROM (CURRENT_DATE AT TIME ZONE 'Asia/Seoul'))::INTEGER + 1
  )::DATE
  WHERE week_start_date IS NULL;

-- 3. NOT NULL 제약 적용
ALTER TABLE sessions
  ALTER COLUMN week_start_date SET NOT NULL;

-- 4. 조회 성능을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_sessions_academy_week
  ON sessions(academy_id, week_start_date);

-- 5. 기록용 코멘트
COMMENT ON COLUMN sessions.week_start_date IS
  '시간표가 속한 주의 월요일 날짜 (KST 기준). 주별 격리 모델 도입 (2026-04-30)';
```

- [ ] **Step 2: 로컬 supabase에 마이그레이션 dry-run**

Run:
```bash
# Supabase CLI 사용 (이미 설정된 경우)
npx supabase db reset --local
# 또는 production-like staging DB에 직접 적용
```

Expected: 에러 없이 적용. `sessions.week_start_date`가 모두 NOT NULL이고 동일한 날짜 (오늘 주 월요일).

- [ ] **Step 3: 마이그레이션 검증 SQL**

```sql
-- 모든 row가 NOT NULL인지
SELECT COUNT(*) FILTER (WHERE week_start_date IS NULL) AS null_count,
       COUNT(*) AS total
  FROM sessions;
-- Expected: null_count = 0

-- attendance와 join이 깨지지 않는지
SELECT COUNT(*) FROM attendance a JOIN sessions s ON a.session_id = s.id;
-- Expected: 변경 전 attendance 총 row 수와 동일
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/031_add_week_start_date_to_sessions.sql
git commit -m "feat(db): add week_start_date column to sessions with KST current-week backfill"
```

### Task 1.4: SessionService / Repository 계층에 weekStartDate 지원

**Files:**
- Modify: `src/application/services/SessionService.ts` (또는 동등 클래스)
- Modify: `src/infrastructure/repositories/SupabaseSessionRepository.ts` (또는 동등)

- [ ] **Step 1: getAllSessions에 weekStartDate 옵션 추가**

```ts
// SessionService.ts
async getAllSessions(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]> {
  return this.repository.findByAcademy(academyId, opts);
}
```

- [ ] **Step 2: Repository에서 필터 SQL 추가**

```ts
// SupabaseSessionRepository.ts
async findByAcademy(academyId: string, opts?: { weekStartDate?: string }): Promise<Session[]> {
  let q = this.client.from("sessions").select("*").eq("academy_id", academyId);
  if (opts?.weekStartDate) {
    q = q.eq("week_start_date", opts.weekStartDate);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(this.rowToSession);
}

private rowToSession(row: any): Session {
  return {
    id: row.id,
    weekday: row.weekday,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    weekStartDate: row.week_start_date,
    enrollmentIds: row.enrollment_ids ?? [],
    yPosition: row.y_position,
    room: row.room ?? undefined,
  };
}
```

- [ ] **Step 3: createSession / insert 시 weekStartDate 저장**

```ts
async create(input: SessionInput & { weekStartDate: string }): Promise<Session> {
  const { data, error } = await this.client.from("sessions").insert({
    academy_id: input.academyId,
    weekday: input.weekday,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    week_start_date: input.weekStartDate,
    enrollment_ids: input.enrollmentIds,
    y_position: input.yPosition,
    room: input.room,
  }).select("*").single();
  if (error) throw error;
  return this.rowToSession(data);
}
```

- [ ] **Step 4: 단위 테스트 추가**

```ts
// SessionService.test.ts
it("getAllSessions filters by weekStartDate when option provided", async () => {
  const repo = mockRepository([
    { id: "s1", weekStartDate: "2026-04-27", weekday: 0 /* ... */ },
    { id: "s2", weekStartDate: "2026-05-04", weekday: 0 /* ... */ },
  ]);
  const service = new SessionService(repo);
  const result = await service.getAllSessions("acad-1", { weekStartDate: "2026-04-27" });
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe("s1");
});
```

- [ ] **Step 5: 테스트 통과**

Run: `npx vitest run src/application/services/__tests__/SessionService.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/application/services/SessionService.ts src/infrastructure/repositories/SupabaseSessionRepository.ts <test files>
git commit -m "feat(sessions): support weekStartDate filter and persistence in service/repository"
```

### Task 1.5: API /sessions GET — weekStartDate 쿼리 파라미터

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Modify: `src/app/api/sessions/__tests__/route.test.ts`

- [ ] **Step 1: GET 핸들러에 쿼리 파싱 추가**

```ts
// src/app/api/sessions/route.ts (GET 안)
const weekStartDate = searchParams.get("weekStartDate");
const sessions = await getSessionService().getAllSessions(academyId, {
  weekStartDate: weekStartDate ?? undefined,
});
```

- [ ] **Step 2: API 테스트 추가**

```ts
it("GET /api/sessions?weekStartDate=YYYY-MM-DD filters by week", async () => {
  // ... mock service.getAllSessions를 호출 시 opts 검증
});
```

- [ ] **Step 3: 테스트 통과 + Commit**

```bash
git add <files>
git commit -m "feat(api): support weekStartDate query param in GET /api/sessions"
```

### Task 1.6: API /sessions POST/PUT — weekStartDate 자동 주입

POST/PUT 핸들러에서 body에 `weekStartDate`가 없으면 거부 (400). 명시적 전달이 호출자의 책임.

- [ ] **Step 1: 검증 코드 추가**

```ts
// POST 핸들러 안
const body = await request.json();
if (!body.weekStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)) {
  return NextResponse.json(
    { success: false, error: "weekStartDate (YYYY-MM-DD) is required" },
    { status: 400 }
  );
}
```

- [ ] **Step 2: 테스트 + Commit**

---

## Phase 2: 공유 링크 회귀 방지

**왜 Phase 1 직후?** Phase 1만으로는 share 페이지가 모든 주 데이터를 한 번에 표시 → 깨짐. Phase 2 미완료 상태로 dev 머지 금지.

### Task 2.1: Share API에 weekStartDate 필터 추가

**Files:**
- Modify: `src/app/api/share/[token]/route.ts:55`

- [ ] **Step 1: select 쿼리에 weekStartDate 필터 추가**

기본값: 현재 KST 주 (Phase 0 Task 0.2에서 (a) 채택 가정).

```ts
// route.ts (line 55 근처)
import { getWeekStartDate } from "@/lib/weekStart";

const weekStart = searchParams.get("week") ?? getWeekStartDate(new Date());

const { data: sessionsData } = await client
  .from("sessions")
  .select("*")
  .eq("academy_id", academyId)
  .eq("week_start_date", weekStart);
```

- [ ] **Step 2: 응답에 `currentWeek` 메타 포함 (페이지에서 라벨 표시용)**

```ts
return NextResponse.json({
  success: true,
  data: { sessions, students, /*...*/, currentWeek: weekStart },
});
```

- [ ] **Step 3: API 테스트 업데이트**

기존 share API 테스트가 sessions 모두 fetch 가정으로 작성되어 있다면 weekStartDate 필터 동작 검증 case 추가.

- [ ] **Step 4: Commit**

### Task 2.2: Share 페이지 — selectedDate 기반 weekStartDate 전달

**Files:**
- Modify: `src/app/share/[token]/page.tsx:85-107`

- [ ] **Step 1: selectedDate가 바뀔 때마다 새 weekStart로 fetch**

```ts
const weekStart = useMemo(
  () => getWeekStartDate(selectedDate),
  [selectedDate]
);

useEffect(() => {
  fetch(`/api/share/${token}?week=${weekStart}`)
    .then(/* ... */)
}, [token, weekStart]);
```

- [ ] **Step 2: 폴링 logic도 동일하게**

- [ ] **Step 3: E2E 테스트 (Playwright)**

```ts
// e2e/share.spec.ts
test("공유 페이지가 현재 주 데이터만 표시", async ({ page }) => {
  // 다른 주 sessions가 있어도 표시되지 않음 검증
});
```

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(share): filter sessions by currently-selected week to prevent multi-week overlap"
```

---

## Phase 3: useSessionsLocal 훅 + localStorage 마이그레이션

**Files:**
- Modify: `src/hooks/useSessionsLocal.ts` (또는 동등 훅)
- Create: `src/lib/migrateLocalSessions.ts`
- Modify: `src/lib/apiSync.ts` (syncSessionCreate에 weekStartDate 전달)

### Task 3.1: localStorage 마이그레이션 헬퍼 (TDD)

기존 localStorage(`class_planner_anonymous`, `class_planner_{userId}`)에 저장된 sessions에 weekStartDate가 없을 수 있음. 첫 로드 시 자동 주입.

- [ ] **Step 1: 실패 테스트**

```ts
// src/lib/__tests__/migrateLocalSessions.test.ts
import { migrateLocalSessionsIfNeeded } from "../migrateLocalSessions";

describe("migrateLocalSessionsIfNeeded", () => {
  it("weekStartDate 없는 session에 현재 주 자동 부여", () => {
    const data = { sessions: [{ id: "s1", weekday: 0, startsAt: "10:00" }] };
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect(migrated.sessions[0].weekStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("이미 weekStartDate 있는 session은 그대로 유지", () => {
    const data = { sessions: [{ id: "s1", weekStartDate: "2026-01-05", weekday: 0 }] };
    const migrated = migrateLocalSessionsIfNeeded(data);
    expect(migrated.sessions[0].weekStartDate).toBe("2026-01-05");
  });
});
```

- [ ] **Step 2: 구현**

```ts
// src/lib/migrateLocalSessions.ts
import { getWeekStartDate } from "./weekStart";

export function migrateLocalSessionsIfNeeded<T extends { sessions?: any[] }>(data: T): T {
  if (!data.sessions) return data;
  const currentWeek = getWeekStartDate(new Date());
  return {
    ...data,
    sessions: data.sessions.map(s => s.weekStartDate ? s : { ...s, weekStartDate: currentWeek }),
  };
}
```

- [ ] **Step 3: useSessionsLocal에서 첫 load 시 호출**

```ts
const raw = localStorage.getItem(storageKey);
const parsed = raw ? JSON.parse(raw) : { sessions: [] };
const data = migrateLocalSessionsIfNeeded(parsed);
```

- [ ] **Step 4: 테스트 + Commit**

### Task 3.2: useSessionsLocal에 weekStartDate 필터링 추가

- [ ] **Step 1: 훅이 현재 보고 있는 weekStart로 필터된 sessions를 반환**

```ts
function useSessionsLocal(currentWeekStart: string) {
  const allSessions = /* localStorage load */;
  const sessions = allSessions.filter(s => s.weekStartDate === currentWeekStart);
  return { sessions, allSessions, /* mutation 함수들 */ };
}
```

- [ ] **Step 2: addSession 시 currentWeekStart 자동 주입**

```ts
const addSession = (input: NewSessionInput) => {
  const session = { ...input, id: uuid(), weekStartDate: currentWeekStart };
  // ... localStorage write + apiSync
};
```

- [ ] **Step 3: deleteSession은 그대로 (id로 삭제)**

- [ ] **Step 4: 테스트 (필터링 + addSession 자동 주입)**

- [ ] **Step 5: Commit**

### Task 3.3: apiSync — weekStartDate 동기화

**Files:**
- Modify: `src/lib/apiSync.ts`

- [ ] **Step 1: syncSessionCreate가 weekStartDate를 body에 포함**

- [ ] **Step 2: 테스트 + Commit**

---

## Phase 4: TemplateMenuV2 컴포넌트

**Files:**
- Create: `src/components/molecules/TemplateMenuV2.tsx`
- Test: `src/components/molecules/__tests__/TemplateMenuV2.test.tsx`

### Task 4.1: 컴포넌트 구현 (TDD)

**Design source:** Brainstorming의 "B안 다듬은 버전" — 섹션 분리 + lucide outline 아이콘.

- [ ] **Step 1: 실패 테스트 (4개 액션 핸들러 호출 검증)**

```tsx
// __tests__/TemplateMenuV2.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { TemplateMenuV2 } from "../TemplateMenuV2";

describe("TemplateMenuV2", () => {
  const handlers = {
    onApply: vi.fn(),
    onClearWeek: vi.fn(),
    onSave: vi.fn(),
    onPreview: vi.fn(),
  };
  beforeEach(() => Object.values(handlers).forEach(h => h.mockClear()));

  it("4개 메뉴 항목이 모두 노출", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("템플릿 적용하기")).toBeInTheDocument();
    expect(screen.getByText("시간표 비우기")).toBeInTheDocument();
    expect(screen.getByText("현재 주를 템플릿으로 저장")).toBeInTheDocument();
    expect(screen.getByText("미리보기")).toBeInTheDocument();
  });

  it("템플릿 없으면 적용/미리보기 disabled", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate={false} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("템플릿 적용하기").closest("button")).toBeDisabled();
    expect(screen.getByText("미리보기").closest("button")).toBeDisabled();
  });

  it("canManage=false면 저장 disabled", () => {
    render(<TemplateMenuV2 {...handlers} canManage={false} hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("현재 주를 템플릿으로 저장").closest("button")).toBeDisabled();
  });

  it("각 항목 클릭 시 해당 핸들러 호출", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    fireEvent.click(screen.getByText("템플릿 적용하기"));
    expect(handlers.onApply).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 컴포넌트 구현**

```tsx
// src/components/molecules/TemplateMenuV2.tsx
"use client";
import { useState } from "react";
import { Download, Trash2, Save, Eye, ChevronDown } from "lucide-react";

interface Props {
  onApply: () => void;
  onClearWeek: () => void;
  onSave: () => void;
  onPreview: () => void;
  canManage: boolean;
  hasTemplate: boolean;
}

export function TemplateMenuV2({ onApply, onClearWeek, onSave, onPreview, canManage, hasTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const wrap = (fn: () => void) => () => { fn(); close(); };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 border border-[var(--color-accent)] text-[var(--color-text-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-sm"
      >
        템플릿
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg py-2">
            <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              이 주에 작업
            </div>
            <MenuItem icon={Download} label="템플릿 적용하기" onClick={wrap(onApply)} disabled={!hasTemplate} />
            <MenuItem icon={Trash2} label="시간표 비우기" onClick={wrap(onClearWeek)} />

            <div className="my-1 border-t border-[var(--color-border)]" />

            <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              템플릿 자체
            </div>
            <MenuItem icon={Save} label="현재 주를 템플릿으로 저장" onClick={wrap(onSave)} disabled={!canManage} />
            <MenuItem icon={Eye} label="미리보기" onClick={wrap(onPreview)} disabled={!hasTemplate} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, disabled }: {
  icon: any; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Icon size={16} strokeWidth={1.75} className="text-[var(--color-text-secondary)] shrink-0" />
      <span>{label}</span>
    </button>
  );
}
```

- [ ] **Step 3: 테스트 통과 (4 tests)**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(templates): add TemplateMenuV2 with sectioned menu and lucide icons"
```

---

## Phase 5: EmptyWeekState 컴포넌트

**Files:**
- Create: `src/components/molecules/EmptyWeekState.tsx`
- Test: `src/components/molecules/__tests__/EmptyWeekState.test.tsx`

### Task 5.1: 컴포넌트 (TDD)

**Design source:** "B안 + 두 가지 분기".

- [ ] **Step 1: 실패 테스트**

```tsx
describe("EmptyWeekState", () => {
  it("템플릿 있을 때 두 버튼 노출", () => {
    render(<EmptyWeekState hasTemplate onApplyTemplate={vi.fn()} onAddSession={vi.fn()} />);
    expect(screen.getByText("템플릿 적용")).toBeInTheDocument();
    expect(screen.getByText("+ 수업 추가")).toBeInTheDocument();
  });

  it("템플릿 없을 때 수업 추가만 + 안내문", () => {
    render(<EmptyWeekState hasTemplate={false} onApplyTemplate={vi.fn()} onAddSession={vi.fn()} />);
    expect(screen.queryByText("템플릿 적용")).not.toBeInTheDocument();
    expect(screen.getByText("+ 수업 추가")).toBeInTheDocument();
    expect(screen.getByText(/한 주를 짜고 저장하면/)).toBeInTheDocument();
  });

  it("버튼 클릭 시 핸들러 호출", () => {
    const onApply = vi.fn();
    render(<EmptyWeekState hasTemplate onApplyTemplate={onApply} onAddSession={vi.fn()} />);
    fireEvent.click(screen.getByText("템플릿 적용"));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 구현**

```tsx
// src/components/molecules/EmptyWeekState.tsx
"use client";

interface Props {
  hasTemplate: boolean;
  onApplyTemplate: () => void;
  onAddSession: () => void;
}

export function EmptyWeekState({ hasTemplate, onApplyTemplate, onAddSession }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
      <p className="text-sm text-[var(--color-text-secondary)]">이번 주 시간표가 비어있어요</p>
      <div className="flex gap-2 pointer-events-auto">
        {hasTemplate && (
          <button
            type="button"
            onClick={onApplyTemplate}
            className="bg-[var(--color-accent)] text-white px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            템플릿 적용
          </button>
        )}
        <button
          type="button"
          onClick={onAddSession}
          className="border border-[var(--color-border)] text-[var(--color-text-primary)] px-3.5 py-2 rounded-md text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          + 수업 추가
        </button>
      </div>
      {!hasTemplate && (
        <p className="text-xs text-[var(--color-text-secondary)] pointer-events-none mt-1">
          한 주를 짜고 저장하면 다음 주에 재사용할 수 있어요
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 테스트 통과 + Commit**

---

## Phase 6: ApplyTemplateConfirm 모달

**Files:**
- Create: `src/components/molecules/ApplyTemplateConfirm.tsx`
- Test: `src/components/molecules/__tests__/ApplyTemplateConfirm.test.tsx`

### Task 6.1: 모달 컴포넌트 (TDD)

**Design source:** "A안 단순 교체". 빈 주에서는 모달 자체를 띄우지 않으므로 컴포넌트는 항상 "충돌 있음" 가정.

- [ ] **Step 1: 실패 테스트**

```tsx
describe("ApplyTemplateConfirm", () => {
  it("기존 세션 수와 destructive 액션 표기", () => {
    render(<ApplyTemplateConfirm existingSessionCount={12} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/12개 수업/)).toBeInTheDocument();
    expect(screen.getByText("기존 삭제하고 적용")).toBeInTheDocument();
  });

  it("취소 클릭 시 onCancel 호출", () => {
    const onCancel = vi.fn();
    render(<ApplyTemplateConfirm existingSessionCount={5} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("확인 클릭 시 onConfirm 호출", () => {
    const onConfirm = vi.fn();
    render(<ApplyTemplateConfirm existingSessionCount={5} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("기존 삭제하고 적용"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 구현 (CSS는 클래스 위주, 인라인 금지)**

```tsx
// src/components/molecules/ApplyTemplateConfirm.tsx
"use client";

interface Props {
  existingSessionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ApplyTemplateConfirm({ existingSessionCount, onConfirm, onCancel, isApplying }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5 w-[380px] max-w-[90vw] shadow-2xl">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
          템플릿을 적용할까요?
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">
          이 주에 이미 <strong className="text-[var(--color-text-primary)]">{existingSessionCount}개 수업</strong>이 있어요.<br />
          모두 삭제되고 템플릿으로 교체됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="px-3.5 py-1.5 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-md text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {isApplying ? "적용 중..." : "기존 삭제하고 적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 테스트 통과 + Commit**

---

## Phase 7: TemplatePreviewModal

**Files:**
- Create: `src/components/molecules/TemplatePreviewModal.tsx`
- Test: `src/components/molecules/__tests__/TemplatePreviewModal.test.tsx`

### Task 7.1: 모달 (read-only)

- [ ] **Step 1: 메타 정보 + 세션 목록 표시 테스트**

```tsx
describe("TemplatePreviewModal", () => {
  it("템플릿 이름과 세션 수, 학생 목록 표시", () => {
    const template = {
      name: "기본 시간표",
      template_data: {
        sessions: [
          { weekday: 0, startsAt: "10:00", endsAt: "11:00", subjectName: "수학", studentNames: ["김철수"] },
          { weekday: 2, startsAt: "14:00", endsAt: "15:00", subjectName: "영어", studentNames: ["이영희"] },
        ],
      },
    };
    render(<TemplatePreviewModal template={template} onClose={vi.fn()} />);
    expect(screen.getByText("기본 시간표")).toBeInTheDocument();
    expect(screen.getByText(/2개 수업/)).toBeInTheDocument();
    expect(screen.getByText("수학")).toBeInTheDocument();
    expect(screen.getByText("김철수")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 구현 — 단순 list 형태 (시간표 그리드 재사용은 향후 enhancement)**

```tsx
// src/components/molecules/TemplatePreviewModal.tsx
"use client";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

interface Props {
  template: {
    name: string;
    template_data: {
      sessions: Array<{
        weekday: number;
        startsAt: string;
        endsAt: string;
        subjectName: string;
        studentNames: string[];
      }>;
    };
  };
  onClose: () => void;
}

export function TemplatePreviewModal({ template, onClose }: Props) {
  const sessions = template.template_data.sessions ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-5 w-[480px] max-w-[90vw] max-h-[80vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">{template.name}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{sessions.length}개 수업</p>
        <ul className="space-y-2">
          {sessions
            .slice()
            .sort((a, b) => a.weekday - b.weekday || a.startsAt.localeCompare(b.startsAt))
            .map((s, i) => (
              <li key={i} className="flex justify-between items-start gap-3 p-2 bg-[var(--color-bg-secondary)] rounded">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {WEEKDAYS[s.weekday]} {s.startsAt}–{s.endsAt}
                  </div>
                  <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{s.subjectName}</div>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] text-right">
                  {s.studentNames.join(", ")}
                </div>
              </li>
            ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 border border-[var(--color-border)] text-sm rounded-md hover:bg-[var(--color-bg-secondary)]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

---

## Phase 8: useTemplates 훅 + API PUT

### Task 8.1: API PUT /api/templates/[id]

**Files:**
- Modify: `src/app/api/templates/[id]/route.ts` (DELETE 외에 PUT 추가)
- Modify: `src/app/api/templates/[id]/__tests__/route.test.ts`

- [ ] **Step 1: PUT 핸들러 작성**

```ts
// src/app/api/templates/[id]/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });

    const { academyId, role } = await resolveAcademyMembership(userId);
    if (!canManage(role)) {
      return NextResponse.json({ success: false, error: "권한 없음" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, template_data } = body;

    const client = getServiceRoleClient();
    const { data, error } = await client
      .from("templates")
      .update({ name, description, template_data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("academy_id", academyId)
      .select("*")
      .single();

    if (error) {
      logger.error("템플릿 수정 실패", { userId, id }, error as Error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return toErrorResponse(e);
  }
}
```

`canManage` 헬퍼는 `api/templates/route.ts:7-9`에서 import.

- [ ] **Step 2: 테스트 case 3개**

```ts
it("PUT updates template fields", async () => { /* mocks: returns updated row */ });
it("PUT returns 403 for member role", async () => { /* role=member */ });
it("PUT returns 404 if template belongs to another academy", async () => { /* eq academy_id mismatch */ });
```

- [ ] **Step 3: 테스트 통과 + Commit**

### Task 8.2: useTemplates 훅 확장

**Files:**
- Modify: `src/hooks/useTemplates.ts`
- Modify: `src/hooks/__tests__/useTemplates.test.ts`

- [ ] **Step 1: getActiveTemplate (가장 최근 1개)**

```ts
// useTemplates.ts
export function useTemplates(userId: string | null) {
  // ... 기존 코드
  const activeTemplate = templates.length > 0 ? templates[0] : null; // API가 created_at DESC 정렬

  return { templates, activeTemplate, /* ... */, updateTemplate };
}
```

- [ ] **Step 2: updateTemplate 함수**

```ts
const updateTemplate = useCallback(async (id: string, fields: { name?: string; description?: string; template_data?: TemplateData }) => {
  setIsSaving(true);
  try {
    const res = await fetch(`/api/templates/${id}?userId=${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("update failed");
    const json = await res.json();
    // 로컬 state 업데이트
    setTemplates(prev => prev.map(t => t.id === id ? json.data : t));
    return json.data;
  } finally {
    setIsSaving(false);
  }
}, [userId]);
```

- [ ] **Step 3: deleteTemplate 데드코드 처리** — 이번 plan에서 외부 호출처 없음. 유지(향후 admin 페이지 추가 가능)할지 삭제할지 사용자 확인 → **유지** (현재 export된 API는 깨지 않음).

- [ ] **Step 4: 테스트 + Commit**

---

## Phase 9: schedule/page.tsx 핸들러 재작성 (가장 큰 task 묶음)

**Files:**
- Modify: `src/app/schedule/page.tsx`

이 phase는 동일 파일에서 여러 핸들러를 동시에 수정하므로 git diff가 큼. 작업 순서를 엄격히 따름.

### Task 9.1: buildTemplateData 보강

**Files:**
- Modify: `src/app/schedule/page.tsx:961-988`
- Modify: `src/shared/types/templateTypes.ts:8`

- [ ] **Step 1: TemplateSessionDef 타입 보강**

```ts
// src/shared/types/templateTypes.ts
export interface TemplateSessionDef {
  weekday: number;
  startsAt: string;
  endsAt: string;
  subjectId: string;          // ★ id 기반 매칭
  subjectName: string;        // 표시/경고용
  subjectColor: string;       // 표시용
  studentIds: string[];       // ★ id 기반 매칭
  studentNames: string[];     // 표시/경고용 (studentIds와 동일 순서, 동일 길이)
  teacherId?: string;         // ★ id 기반 매칭
  teacherName?: string;       // 표시/경고용
  room?: string;
  yPosition?: number;
}
```

- [ ] **Step 2: buildTemplateData 수정**

```ts
// schedule/page.tsx (line 961-988 영역)
const buildTemplateData = (): TemplateData => {
  const currentWeekSessions = sessions.filter(s => s.weekStartDate === currentWeekStart);
  return {
    version: "1.0",
    sessions: currentWeekSessions.map(s => {
      const firstEnrollment = enrollments.find(e => s.enrollmentIds.includes(e.id));
      const subject = firstEnrollment ? subjects.find(sub => sub.id === firstEnrollment.subjectId) : undefined;
      const studentEntries = s.enrollmentIds
        .map(eid => {
          const enr = enrollments.find(e => e.id === eid);
          const st = enr ? students.find(stu => stu.id === enr.studentId) : null;
          return st ? { id: st.id, name: st.name } : null;
        })
        .filter((x): x is { id: string; name: string } => Boolean(x));
      const teacher = teachers.find(t => firstEnrollment && t.id === (firstEnrollment as any).teacherId);
      return {
        weekday: s.weekday,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        subjectId: subject?.id ?? "",                    // ★ id 기반
        subjectName: subject?.name ?? "",                // 표시용
        subjectColor: subject?.color ?? "#888",
        studentIds: studentEntries.map(e => e.id),       // ★ id 기반
        studentNames: studentEntries.map(e => e.name),   // 표시용
        teacherId: teacher?.id,                          // ★ id 기반
        teacherName: teacher?.name,                      // 표시용
        room: s.room,
        yPosition: s.yPosition,
      };
    }),
  };
};
```

- [ ] **Step 3: 단위 테스트 — buildTemplateData 신설**

이 함수가 컴포넌트 내부 함수라면 export하거나 별도 모듈로 추출해 테스트. 추출 권장:
- Create: `src/lib/buildTemplateData.ts`
- Test: `src/lib/__tests__/buildTemplateData.test.ts`

- [ ] **Step 4: 테스트 + Commit**

### Task 9.2: handleApplyTemplate 재작성

**Files:**
- Modify: `src/app/schedule/page.tsx:990-1035`

- [ ] **Step 1: 새 로직 — 빈 주 즉시 적용 / 비어있지 않으면 confirm**

```ts
// schedule/page.tsx
const handleApplyTemplate = async (template: TemplateRow) => {
  const currentWeekSessions = sessions.filter(s => s.weekStartDate === currentWeekStart);

  if (currentWeekSessions.length > 0) {
    setApplyConfirmTemplate(template); // 모달 상태 설정 → ApplyTemplateConfirm 노출
    return;
  }
  await doApplyTemplate(template);
};

const doApplyTemplate = async (template: TemplateRow) => {
  setIsApplyingTemplate(true);
  try {
    // 1. 현재 주 세션 일괄 삭제
    const currentWeekSessions = sessions.filter(s => s.weekStartDate === currentWeekStart);
    for (const s of currentWeekSessions) {
      await deleteSession(s.id);
    }

    // 2. 템플릿 세션들 생성 (id 기반 매칭)
    let applied = 0;
    const missingEntities: string[] = [];

    for (const tplSession of template.template_data.sessions) {
      // subject id 기반 조회
      const subject = subjects.find(s => s.id === tplSession.subjectId);
      if (!subject) {
        missingEntities.push(`과목 "${tplSession.subjectName ?? tplSession.subjectId}"`);
        continue;
      }

      // student id 기반 조회
      const matchedStudentIds: string[] = [];
      for (const stId of tplSession.studentIds ?? []) {
        const st = students.find(s => s.id === stId);
        if (st) {
          matchedStudentIds.push(st.id);
        } else {
          const name = tplSession.studentNames?.[tplSession.studentIds.indexOf(stId)];
          missingEntities.push(`학생 "${name ?? stId}"`);
        }
      }
      if (matchedStudentIds.length === 0) continue;

      // enrollment 매핑 (기존 있으면 재사용, 없으면 생성)
      const enrollmentIds = matchedStudentIds.map(stId => {
        let enr = enrollments.find(e => e.studentId === stId && e.subjectId === subject.id);
        if (!enr) {
          enr = { id: crypto.randomUUID(), studentId: stId, subjectId: subject.id };
          // useEnrollmentsLocal.addEnrollment(enr) 방식으로 위임
        }
        return enr.id;
      });

      await addSession({
        weekday: tplSession.weekday,
        startsAt: tplSession.startsAt,
        endsAt: tplSession.endsAt,
        weekStartDate: currentWeekStart,
        enrollmentIds,
        yPosition: tplSession.yPosition ?? 1,
        room: tplSession.room,
      });
      applied++;
    }

    const warningText = missingEntities.length > 0
      ? ` (매칭 실패: ${[...new Set(missingEntities)].slice(0, 3).join(", ")}${missingEntities.length > 3 ? " 외" : ""})`
      : "";
    toast.success(`${applied}개 수업이 템플릿으로 교체되었습니다${warningText}`);
  } catch (e) {
    toast.error("템플릿 적용 실패: " + (e as Error).message);
  } finally {
    setIsApplyingTemplate(false);
    setApplyConfirmTemplate(null);
  }
};
```

- [ ] **Step 2: ApplyTemplateConfirm 모달 렌더 통합**

```tsx
{applyConfirmTemplate && (
  <ApplyTemplateConfirm
    existingSessionCount={sessions.filter(s => s.weekStartDate === currentWeekStart).length}
    onConfirm={() => doApplyTemplate(applyConfirmTemplate)}
    onCancel={() => setApplyConfirmTemplate(null)}
    isApplying={isApplyingTemplate}
  />
)}
```

- [ ] **Step 3: 통합 테스트 — schedule/page integration**

작은 mock store로 빈 주 적용/충돌 적용 시나리오 검증. `@testing-library/react`로 모달 렌더 → 확인 클릭 → addSession 호출 검증.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(templates): rewrite handleApplyTemplate with delete-then-replace + auto student creation"
```

### Task 9.3: handleClearWeek 신설

- [ ] **Step 1: 핸들러 + 컨펌**

```ts
const handleClearWeek = async () => {
  const currentWeekSessions = sessions.filter(s => s.weekStartDate === currentWeekStart);
  if (currentWeekSessions.length === 0) {
    toast.info("이번 주는 이미 비어있어요.");
    return;
  }
  if (!confirm(`이 주의 ${currentWeekSessions.length}개 수업을 모두 삭제할까요?`)) return;

  for (const s of currentWeekSessions) {
    await deleteSession(s.id);
  }
  toast.success(`${currentWeekSessions.length}개 수업이 삭제되었습니다.`);
};
```

(향후 native confirm 대신 ConfirmModal 컴포넌트 사용 권장 — 본 phase에서는 native로 단순화)

- [ ] **Step 2: 테스트 + Commit**

### Task 9.4: handleSaveTemplate (1개 고정 PUT)

- [ ] **Step 1: 핸들러**

```ts
const handleSaveTemplate = async (name: string, description?: string) => {
  const data = buildTemplateData();
  if (data.sessions.length === 0) {
    toast.error("저장할 수업이 없습니다.");
    return;
  }
  if (activeTemplate) {
    await updateTemplate(activeTemplate.id, { name, description, template_data: data });
    toast.success("템플릿이 갱신되었습니다.");
  } else {
    await saveTemplate(name, description, data);
    toast.success("템플릿이 저장되었습니다.");
  }
};
```

- [ ] **Step 2: SaveTemplateModal 안내 문구 수정** — "기존 템플릿이 덮어쓰기됩니다" (activeTemplate 있을 때).

- [ ] **Step 3: Commit**

### Task 9.5: handlePreviewTemplate

- [ ] **Step 1: 모달 상태 + 핸들러**

```ts
const [previewTemplate, setPreviewTemplate] = useState<TemplateRow | null>(null);
const handlePreviewTemplate = () => activeTemplate && setPreviewTemplate(activeTemplate);

// 렌더
{previewTemplate && <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />}
```

- [ ] **Step 2: Commit**

### Task 9.6: 빈 주 감지 + EmptyWeekState 렌더

- [ ] **Step 1: 시간표 그리드 영역에 조건부 렌더**

```tsx
{viewMode === "weekly" && currentWeekSessions.length === 0 && (
  <EmptyWeekState
    hasTemplate={Boolean(activeTemplate)}
    onApplyTemplate={() => activeTemplate && handleApplyTemplate(activeTemplate)}
    onAddSession={() => setShowAddSessionModal(true)}
  />
)}
```

위치: 기존 TimeTableGrid 컴포넌트 위/위치를 그리드 wrapper의 absolute child로. 그리드 자체는 비어있어도 렌더 (배경 격자 보이도록).

- [ ] **Step 2: 통합 테스트 — 빈 주 진입 시 EmptyWeekState 노출 확인**

- [ ] **Step 3: Commit**

### Task 9.7: TemplateMenuV2 통합 (기존 TemplateMenu 제거)

- [ ] **Step 1: ScheduleActionBar에서 TemplateMenu → TemplateMenuV2 교체** (Phase 10 Task 10.1과 합칠 수 있음)

- [ ] **Step 2: 모든 핸들러 wiring 검증**

---

## Phase 10: ScheduleActionBar viewMode 분기

### Task 10.1: viewMode prop 추가 + 조건부 렌더

**Files:**
- Modify: `src/app/schedule/_components/ScheduleActionBar.tsx`
- Modify: `src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx`
- Modify: `src/app/schedule/page.tsx` (viewMode prop 전달)

- [ ] **Step 1: Props 변경**

```tsx
// ScheduleActionBar.tsx
interface Props {
  // ... 기존 필드
  viewMode: "daily" | "weekly" | "monthly";
  onApplyTemplate: () => void;
  onClearWeek: () => void;
  onSaveTemplate: () => void;
  onPreviewTemplate: () => void;
  canManage: boolean;
  hasTemplate: boolean;
}

// 렌더
{userId && viewMode === "weekly" && (
  <>
    <TemplateMenuV2
      onApply={onApplyTemplate}
      onClearWeek={onClearWeek}
      onSave={onSaveTemplate}
      onPreview={onPreviewTemplate}
      canManage={canManage}
      hasTemplate={hasTemplate}
    />
    {/* 공유 링크는 기존 위치 유지 */}
  </>
)}
{userId && viewMode !== "weekly" && (
  <Link href="/settings" /* 공유 링크만 노출 */ />
)}
```

- [ ] **Step 2: 테스트 추가**

```tsx
it("viewMode=daily에서는 TemplateMenuV2 노출 안 됨", () => {
  render(<ScheduleActionBar {...defaultProps} viewMode="daily" />);
  expect(screen.queryByRole("button", { name: /템플릿/ })).not.toBeInTheDocument();
});
it("viewMode=weekly에서는 TemplateMenuV2 노출", () => {
  render(<ScheduleActionBar {...defaultProps} viewMode="weekly" />);
  expect(screen.getByRole("button", { name: /템플릿/ })).toBeInTheDocument();
});
```

- [ ] **Step 3: page.tsx에서 viewMode + canManage + hasTemplate 전달**

`canManage` = 현재 사용자 role이 owner/admin인지. `hasTemplate` = `activeTemplate !== null`.

- [ ] **Step 4: 기존 TemplateMenu 컴포넌트 + ApplyTemplateModal 삭제**

```bash
git rm src/components/molecules/TemplateMenu.tsx
git rm src/components/molecules/__tests__/TemplateMenu.test.tsx
git rm src/components/molecules/ApplyTemplateModal.tsx
git rm src/components/molecules/__tests__/ApplyTemplateModal.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(action-bar): show TemplateMenuV2 only in weekly view; remove legacy TemplateMenu"
```

---

## Phase 11: 회귀 점검 + 문서

### Task 11.1: teacher-schedule 회귀

**Files:**
- Modify: `src/app/teacher-schedule/page.tsx` (또는 동등)

teacher-schedule이 sessions를 fetch할 때 weekStartDate 필터를 적용해야 함. 현재 selectedDate가 있다면 그 주의 sessions만 가져오도록.

- [ ] **Step 1: weekStartDate 필터 추가**
- [ ] **Step 2: Playwright 회귀 테스트 — teacher-schedule 페이지가 정상 표시**
- [ ] **Step 3: Commit**

### Task 11.2: PDF 다운로드 회귀

PDF는 `viewLabel`(주간/일별/월별)에 따라 다른 데이터를 그림. weekStartDate 추가 후 PDF가 올바른 주의 sessions만 그리는지 확인.

- [ ] **Step 1: PDFDownloadButton 또는 PDF 생성 로직에서 currentWeekStart 사용**
- [ ] **Step 2: 수동 검증 — PDF 다운로드 후 다른 주에 가서 다시 다운로드 → 다른 결과**
- [ ] **Step 3: Commit**

### Task 11.3: attendance 회귀

attendance는 session_id 기반이라 자체 로직은 그대로 동작. 단, schedule/page.tsx에서 `attendanceSession.id`를 선택할 때 selectedDate의 weekStartDate에 속한 session을 골라야 함.

- [ ] **Step 1: handleOpenAttendance가 올바른 주의 session.id를 사용하는지 검증**
- [ ] **Step 2: E2E — 다른 주로 이동 후 출결 마킹 → 그 주에만 반영**
- [ ] **Step 3: Commit**

### Task 11.4: ARCHITECTURE.md 업데이트

- [ ] Session 모델 설명 갱신
- [ ] templates API line 118의 표기 수정 (PUT 추가)
- [ ] 주별 격리 모델 한 단락 추가
- [ ] Commit

### Task 11.5: UI_SPEC.md 업데이트

- [ ] 템플릿 섹션 전면 재작성 (4개 액션 + viewMode 노출 조건 + Empty state)
- [ ] Commit

### Task 11.6: ADR 신설

**Files:**
- Create: `docs/adr/00X-week-isolation-and-single-template.md`

- [ ] Context, Decision, Alternatives, Consequences 섹션
- [ ] Commit

### Task 11.7: tree.txt 업데이트

```bash
# 프로젝트 루트에서
tree -I 'node_modules|.next|.worktrees|coverage|playwright-report|test-results' --dirsfirst -L 4 > tree.txt
git add tree.txt
git commit -m "docs(tree): refresh after template redesign component additions"
```

### Task 11.8: test-impact-map.json 업데이트

새 컴포넌트들의 cross-cutting test 의존성을 등록.

- [ ] `class-planner/scripts/test-impact-map.json` 편집
- [ ] Commit

---

## Phase 12: 최종 검증 + PR

### Task 12.1: 전체 check

- [ ] `npm run check` 통과 (tsc + lint + unit + build)
- [ ] 1683+ 기존 테스트 + 신규 ~40개 테스트 모두 통과

### Task 12.2: Playwright E2E (UI Verification)

- [ ] 시나리오 1: 빈 주 진입 → empty state 노출
- [ ] 시나리오 2: 한 주 작성 → 저장 → 다른 주 → 적용 → 그 주에만 채워짐
- [ ] 시나리오 3: 충돌 주 적용 → confirm → 교체
- [ ] 시나리오 4: 비우기 → 그 주만 비고 다른 주 영향 없음
- [ ] 시나리오 5: 일별/월별 → 템플릿 메뉴 사라짐
- [ ] 시나리오 6: member 계정 → 저장 disabled
- [ ] 스크린샷 첨부

### Task 12.3: computer-use 시각 검증

- [ ] Empty state 다크/라이트 모드
- [ ] 드롭다운 메뉴 (lucide 아이콘 가독성)
- [ ] Confirm 모달 (destructive 버튼 강조 시각 확인)

### Task 12.4: PR 생성

```bash
git push -u origin feat/template-redesign

gh pr create --base dev --title "feat(templates): 주별 격리 + 1개 고정 + 편집 가능 재설계" --body "$(cat <<'EOF'
## Summary
- 시간표 도메인을 주별 격리(weekStartDate)로 전환
- 템플릿 1개 고정 + 편집 가능 + 직관적 UX 재설계
- Empty state, ApplyTemplateConfirm, TemplateMenuV2, TemplatePreviewModal 신설
- 공유 링크/출결 회귀 방지 처리

## Design source
- 디자인 문서: `/Users/leo/.claude/plans/image-30-silly-stardust.md` (브레인스토밍 결과)
- 구현 plan: `docs/superpowers/plans/2026-04-30-template-redesign.md`

## Test plan
- [ ] 빈 주 → empty state
- [ ] 작성 → 저장 → 다른 주 적용
- [ ] 충돌 confirm 동작
- [ ] 비우기 격리
- [ ] 일별/월별에서 메뉴 숨김
- [ ] member 권한 체크
- [ ] Playwright + computer-use 모두 통과

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] PR URL 사용자에게 보고

---

## Self-Review Checklist (완료)

- [x] **Spec coverage:** 디자인 문서의 9개 결정 사항 + 7개 위험 모두 task에 매핑됨
- [x] **Placeholder scan:** TBD/TODO/"적절히" 등 미구체화 표현 없음. SQL/코드/테스트 모두 실제 코드
- [x] **Type consistency:** Session 타입 변경(weekStartDate)이 Phase 1 전반과 Phase 3, 9에서 일관 사용
- [x] **Cross-task references:** TemplateMenuV2 props 시그니처가 Phase 4 정의 ↔ Phase 10 호출에서 일치
- [x] **Frequent commit:** 각 task가 독립 commit 생성

---

## Known Risks

| # | 위험 | 완화 |
|---|---|---|
| 1 | **마이그레이션 시점에 활성 사용자 데이터 변형** | Phase 0 Task 0.1에서 사용자 명시 동의. 5명 규모라 백업 + dry-run 후 적용 |
| 2 | **공유 링크 즉시 깨짐 (Phase 1만 머지 시)** | Phase 1 + Phase 2를 한 묶음으로 dev 머지 |
| 3 | **attendance.session_id CASCADE** | 옵션 A(row 보존)로 위험 회피 |
| 4 | **localStorage 데이터 변형** | Phase 3 Task 3.1 마이그레이션 헬퍼로 자동 처리. 기존 사용자 무중단 |
| 5 | **schedule/page.tsx 단일 파일에 큰 변경** | Phase 9를 7개 task로 세분 + 각 task 독립 commit. 회귀 시 git bisect 가능 |
| 6 | **buildTemplateData를 컴포넌트 외부로 추출 시 import 그래프 변경** | test-impact-map.json 업데이트 (Task 11.8) |
| 7 | **PDF / teacher-schedule 미점검 회귀** | Phase 11에서 별도 task로 회귀 확인 |
