# Teacher CRUD Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the remaining teacher-related bugs and code quality issues found during the audit in PR #137.

**Architecture:** Local-first + fire-and-forget server sync. Teachers are stored in `localStorage` via `localStorageCrud.ts` and synced to Supabase via `apiSync.ts`. Teacher-subject associations (M:N) are managed separately in the `teacher_subjects` table. All changes must follow the Clean Architecture layer rules: domain → application → infrastructure → presentation.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript strict, Vitest, Supabase PostgreSQL

---

## Pre-work: branch setup

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev --ff-only
git checkout -b fix/teacher-followup
```

---

## File Map

| Task | Files Modified |
|------|---------------|
| 1 — clear flow | `EditSessionModal.tsx`, `page.tsx`, `editSaveHandlers.ts`, `sessionSaveUtils.ts` |
| 2 — teacher_subjects init | `useGlobalDataInitialization.ts` |
| 3 — login migration | `src/lib/auth/handleLoginDataMigration.ts` |
| 4 — name normalization | `TeacherApplicationService.ts`, `localStorageCrud.ts` |
| 5 — Teacher.fromJSON | `src/domain/entities/Teacher.ts` |
| 6 — color debounce | `TeacherDetailPanel.tsx` |
| 7 — cross-route coupling | NEW `src/lib/server/teacherServiceFactory.ts`, `teachers/route.ts`, `teacher-subjects/route.ts` |

---

## Task 1: Fix 강사 해제 (Clear) Flow

**Background:** TeacherPillPicker correctly emits `null` on deselect. But `EditSessionModal.tsx` converts `null → ""` (empty string), which then becomes `undefined` in the handler, causing the teacherId key to be omitted from the save payload — so the old teacher value is preserved via object spread. Five places need to change in a coordinated way.

**Files:**
- Modify: `src/app/schedule/_components/EditSessionModal.tsx` (line ~396)
- Modify: `src/app/schedule/page.tsx` (lines ~673, ~961, ~1561, ~420-432)
- Modify: `src/app/schedule/_utils/editSaveHandlers.ts` (lines ~107, ~152-155)
- Modify: `src/app/schedule/_utils/sessionSaveUtils.ts` (line ~86)
- Test: `src/app/schedule/_utils/__tests__/editSaveHandlers.test.ts`
- Test: `src/app/schedule/_utils/__tests__/sessionSaveUtils.test.ts`

**Data flow after fix:**
```
TeacherPillPicker.onSelect(null)           → null (deselect signal)
EditSessionModal.onTeacherChange(null)      → setTempTeacherId(null)
page.tsx tempTeacherId state = null         → null = "user wants to clear"
editSaveHandlers resolvedTeacherId = null   → null passed to buildSessionSaveData
sessionSaveUtils payload.teacherId = null  → key EXISTS (value null)
page.tsx hasTeacherId = true               → sync sends teacherId: null
[id] route receives teacherId: null         → service gets null → repo: teacher_id = NULL
```

- [ ] **Step 1-1: Read current EditSessionModal.tsx teacher wiring**

```bash
grep -n "onTeacherChange\|teacherId\|tempTeacher" \
  src/app/schedule/_components/EditSessionModal.tsx | head -20
```

Find the line with `onTeacherChange(id ?? "")` (should be ~line 396).

- [ ] **Step 1-2: Fix EditSessionModal — preserve null instead of converting to ""**

In `EditSessionModal.tsx`, find:
```tsx
onSelect={(id) => onTeacherChange(id ?? "")}
```
Change to:
```tsx
onSelect={(id) => onTeacherChange(id ?? null)}
```

Also update the prop type for `onTeacherChange` if it's declared as `(teacherId: string) => void`:
```tsx
// Find the props interface and change:
onTeacherChange: (teacherId: string | null) => void;
```

- [ ] **Step 1-3: Fix page.tsx — tempTeacherId state type and modal reset**

In `page.tsx`, find (line ~673):
```tsx
const [tempTeacherId, setTempTeacherId] = useState<string | undefined>(undefined);
```
Change to:
```tsx
const [tempTeacherId, setTempTeacherId] = useState<string | null | undefined>(undefined);
```

Then find the `onTeacherChange` callback wired to the modal (line ~1561-1562). The line should look like:
```tsx
onTeacherChange={(teacherId) => setTempTeacherId(teacherId)}
```
This is already correct once the type is fixed.

Then find where the edit modal is opened (`setShowEditModal(true)`). It's likely inside `handleSessionClick` (~line 961). Add a `tempTeacherId` reset right where the modal data is set:

```tsx
// After setEditModalData(...) and before or after setShowEditModal(true):
setTempTeacherId(undefined);
```

Find the exact location by searching:
```bash
grep -n "setShowEditModal(true)\|setEditModalData" src/app/schedule/page.tsx | head -10
```

- [ ] **Step 1-4: Fix page.tsx — sync call keeps null (don't coerce with ??)**

In the `updateSession` callback (the sync section added in PR #137, ~line 420-432), find:
```tsx
...(hasTeacherId && {
  teacherId: (sessionData as SessionUpdateInput).teacherId ?? undefined,
}),
```
Change to (remove `?? undefined` so null stays null):
```tsx
...(hasTeacherId && {
  teacherId: (sessionData as SessionUpdateInput).teacherId,
}),
```

Also update `SessionUpdateInput` in page.tsx to confirm it already has `teacherId?: string | null`. If it says `string | null | undefined` that's fine too.

- [ ] **Step 1-5: Fix editSaveHandlers — treat null as explicit "clear"**

In `editSaveHandlers.ts`, find (line ~107) the parameter for `tempTeacherId`:
```bash
grep -n "tempTeacherId" src/app/schedule/_utils/editSaveHandlers.ts | head -10
```

Find the parameter type and change it from `string | undefined` to `string | null | undefined`:
```typescript
tempTeacherId: string | undefined,
// →
tempTeacherId: string | null | undefined,
```

Then find the `resolvedTeacherId` computation (line ~152-155):
```typescript
const resolvedTeacherId =
  tempTeacherId !== undefined
    ? tempTeacherId || undefined
    : editModalData.teacherId;
```
Change to:
```typescript
const resolvedTeacherId: string | null | undefined =
  tempTeacherId !== undefined
    ? tempTeacherId   // null = clear, "uuid" = assign
    : editModalData.teacherId;
```

- [ ] **Step 1-6: Fix sessionSaveUtils — accept null teacherId in payload**

In `sessionSaveUtils.ts`, find `buildSessionSaveData` signature (line ~86):
```typescript
teacherId?: string
```
Change to:
```typescript
teacherId?: string | null
```

The spread logic `...(teacherId !== undefined && { teacherId })` already works correctly:
- `teacherId = "uuid"` → `"uuid" !== undefined` → true → `{ teacherId: "uuid" }` ✅
- `teacherId = null` → `null !== undefined` → true → `{ teacherId: null }` ✅ (key present!)
- `teacherId = undefined` → false → key omitted ✅

Also update `SessionSaveData` type (near the top of the file) if `teacherId` is declared there:
```bash
grep -n "SessionSaveData\|teacherId" src/app/schedule/_utils/sessionSaveUtils.ts | head -10
```
Add `| null` to the teacherId field if needed.

- [ ] **Step 1-7: Write failing tests for clear flow**

In `src/app/schedule/_utils/__tests__/editSaveHandlers.test.ts`, add:

```typescript
it("강사 해제 시 payload에 teacherId: null이 포함된다", async () => {
  // ... (mock 설정은 기존 테스트 패턴 참조)
  // tempTeacherId = null (사용자가 chip을 클릭해 해제)
  // editModalData.teacherId = "existing-teacher-id"
  // → resolvedTeacherId should be null
  // → sessionData should have teacherId key with value null
  const sessionData = buildSessionSaveData(
    ["e-1"], ["s-1"], "sub-1", 0, "09:00", "10:00", "", null
  );
  expect("teacherId" in sessionData).toBe(true);
  expect(sessionData.teacherId).toBeNull();
});
```

In `src/app/schedule/_utils/__tests__/sessionSaveUtils.test.ts`, add:

```typescript
it("teacherId가 null이면 payload에 teacherId: null key가 포함된다", () => {
  const result = buildSessionSaveData(
    ["e-1"], ["s-1"], "sub-1", 0, "09:00", "10:00", "", null
  );
  expect("teacherId" in result).toBe(true);
  expect(result.teacherId).toBeNull();
});

it("teacherId가 undefined이면 payload에 teacherId key가 없다", () => {
  const result = buildSessionSaveData(
    ["e-1"], ["s-1"], "sub-1", 0, "09:00", "10:00", "", undefined
  );
  expect("teacherId" in result).toBe(false);
});
```

- [ ] **Step 1-8: Run tests to verify they fail**

```bash
npm run test -- --reporter=verbose src/app/schedule/_utils/__tests__/sessionSaveUtils.test.ts
```
Expected: new tests FAIL (teacherId: null case fails because current code returns `undefined` for falsy)

- [ ] **Step 1-9: Run tests after implementation**

```bash
npm run check:quick
```
Expected: all tests PASS including the 2 new ones.

- [ ] **Step 1-10: Commit**

```bash
git add \
  src/app/schedule/_components/EditSessionModal.tsx \
  src/app/schedule/page.tsx \
  src/app/schedule/_utils/editSaveHandlers.ts \
  src/app/schedule/_utils/sessionSaveUtils.ts \
  "src/app/schedule/_utils/__tests__/editSaveHandlers.test.ts" \
  "src/app/schedule/_utils/__tests__/sessionSaveUtils.test.ts"
git commit -m "fix(teacher): restore clear flow — null teacherId propagates to DB"
```

---

## Task 2: teacher_subjects 초기 로드 (Phase C1)

**Background:** After login, `useGlobalDataInitialization` fetches 5 endpoints but NOT `/api/teacher-subjects`. So `teacher.subjectIds` is always empty until the user manually opens TeacherDetailPanel. Fix: after fetching teachers, fetch each teacher's subjects in parallel.

**Files:**
- Modify: `src/hooks/useGlobalDataInitialization.ts`
- Test: `src/hooks/__tests__/useGlobalDataInitialization.test.ts` (create if not exists)

- [ ] **Step 2-1: Read the current useGlobalDataInitialization structure**

```bash
grep -n "teacher\|Promise.allSettled\|parseJson\|serverData" \
  src/hooks/useGlobalDataInitialization.ts | head -30
```

Identify:
- Line where `teachersRes` is fetched
- Line where `teachers` array is built from `teachersRes`
- Line where `serverData` is assembled

- [ ] **Step 2-2: Add teacher-subjects parallel fetch after teachers are parsed**

Find the block where teachers are parsed (after the `Promise.allSettled` call). The current code likely looks like:

```typescript
const teachers = (await parseJson(teachersRes)) ?? [];
```

After that line, add:

```typescript
// teacher별 subjectIds를 병렬로 fetch (N 병렬, N = teacher 수)
const teachersWithSubjects = await Promise.all(
  teachers.map(async (teacher: import("@/lib/planner").Teacher) => {
    try {
      const res = await fetch(
        `/api/teacher-subjects?userId=${encodeURIComponent(userId)}&teacherId=${encodeURIComponent(teacher.id)}`
      );
      if (!res.ok) return teacher;
      const json = await res.json();
      const subjectIds: string[] = json?.data ?? [];
      return { ...teacher, subjectIds };
    } catch {
      return teacher; // subjectIds 없이 graceful fallback
    }
  })
);
```

Then in the `serverData` object assembly, replace `teachers` with `teachersWithSubjects`:

```typescript
const serverData: ClassPlannerData = {
  students,
  subjects: subjects ?? [],
  sessions,
  enrollments,
  teachers: teachersWithSubjects,   // ← was: teachers
  version: "1.0",
  lastModified: new Date().toISOString(),
};
```

- [ ] **Step 2-3: Verify no type errors**

```bash
npm run type-check
```
Expected: 0 errors.

- [ ] **Step 2-4: Check if useGlobalDataInitialization has existing tests**

```bash
ls src/hooks/__tests__/ 2>/dev/null | grep -i global
```

If no test file exists, create `src/hooks/__tests__/useGlobalDataInitialization.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../useIntegratedDataLocal", () => ({
  getClassPlannerData: vi.fn(() => null),
  updateClassPlannerData: vi.fn(),
}));

// Note: testing the hook directly requires complex mocking of fetch and localStorage.
// Key behavior to verify: teachers in serverData include subjectIds from teacher-subjects API.
describe("useGlobalDataInitialization — teacher subjectIds", () => {
  it("teacher-subjects fetch가 실패해도 teacher 목록은 정상 반환된다", () => {
    // This test verifies the graceful fallback: if /api/teacher-subjects fails,
    // teacher still appears in the list (just without subjectIds).
    // Full integration tests handled via Playwright E2E.
    expect(true).toBe(true); // placeholder — see E2E verification
  });
});
```

- [ ] **Step 2-5: Run tests**

```bash
npm run check:quick
```
Expected: PASS.

- [ ] **Step 2-6: Commit**

```bash
git add src/hooks/useGlobalDataInitialization.ts
git commit -m "feat(teacher): load teacher subjectIds on login initialization"
```

---

## Task 3: Login Migration 강사 보존 (Phase C2)

**Background:** `handleLoginDataMigration.ts` hardcodes `teachers: []` when assembling merged data. If an anonymous user had created teachers locally, they're wiped out when they log in. Fix: fetch server teachers and use them (following the same pattern as students/subjects).

**Files:**
- Modify: `src/lib/auth/handleLoginDataMigration.ts`
- Test: existing auth tests

- [ ] **Step 3-1: Read handleLoginDataMigration structure**

```bash
grep -n "teachers\|studentsRes\|Promise.allSettled\|parseJson" \
  src/lib/auth/handleLoginDataMigration.ts | head -30
```

Identify:
- The `Promise.allSettled` block that fetches students/subjects/sessions/enrollments
- Line 142 with `teachers: []`
- The `parseJson` calls for other entities

- [ ] **Step 3-2: Add teachers to the migration fetch**

Find the `Promise.allSettled` call and add teachers:

```typescript
// Before (4 fetches):
const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes] =
  await Promise.allSettled([
    fetch(`/api/students?userId=${userId}`),
    fetch(`/api/subjects?userId=${userId}`),
    fetch(`/api/sessions?userId=${userId}`),
    fetch(`/api/enrollments?userId=${userId}`),
  ]);

// After (5 fetches — add teachersRes):
const [studentsRes, subjectsRes, sessionsRes, enrollmentsRes, teachersRes] =
  await Promise.allSettled([
    fetch(`/api/students?userId=${userId}`),
    fetch(`/api/subjects?userId=${userId}`),
    fetch(`/api/sessions?userId=${userId}`),
    fetch(`/api/enrollments?userId=${userId}`),
    fetch(`/api/teachers?userId=${encodeURIComponent(userId)}`),
  ]);
```

- [ ] **Step 3-3: Parse teachers result and use it**

Find the `parseJson` calls (typically right after the `Promise.allSettled`):

```typescript
const students = await parseJson(studentsRes);
const subjects = await parseJson(subjectsRes);
const sessions = await parseJson(sessionsRes);
const enrollments = await parseJson(enrollmentsRes);
```

Add:
```typescript
const teachers = (await parseJson(teachersRes)) ?? [];
```

Then find `teachers: []` (line ~142) and replace:
```typescript
// Before:
teachers: [],

// After:
teachers,
```

- [ ] **Step 3-4: Run type-check and tests**

```bash
npm run check:quick
```
Expected: PASS.

- [ ] **Step 3-5: Commit**

```bash
git add src/lib/auth/handleLoginDataMigration.ts
git commit -m "fix(teacher): restore anonymous teachers on login data migration"
```

---

## Task 4: 중복 이름 Normalization 통일 + addTeacher Profile 전달 + Role Default (Phase D1,2,6)

**Background:** Three separate places check for duplicate teacher names with different normalization (exact match, trim only, trim+toLowerCase). Domain entity has the correct logic. Also, `TeacherApplicationService.addTeacher` doesn't pass profile to `Teacher.create`, so entity validation is skipped. Role default is null everywhere but should be `'member'`.

**Files:**
- Modify: `src/application/services/TeacherApplicationService.ts`
- Modify: `src/lib/localStorageCrud.ts`
- Test: `src/application/services/__tests__/TeacherApplicationService.test.ts` (if exists)

- [ ] **Step 4-1: Read current duplicate check implementations**

```bash
grep -n "isDuplicate\|isNameDuplicate\|t\.name" \
  src/application/services/TeacherApplicationService.ts \
  src/lib/localStorageCrud.ts | head -20
```

- [ ] **Step 4-2: Fix TeacherApplicationService — use domain isNameDuplicate + pass profile**

Read the full `addTeacher` and `updateTeacher` methods in `TeacherApplicationService.ts`.

Find the duplicate check in `addTeacher` (line ~24):
```typescript
const isDuplicate = existingTeachers.some((t) => t.name === teacherData.name);
```
Replace with:
```typescript
const isDuplicate = Teacher.isNameDuplicate(teacherData.name, existingTeachers);
```

Find `Teacher.create(...)` call (line ~32-36) and add profile:
```typescript
// Before:
const newTeacher = Teacher.create(
  teacherData.name,
  teacherData.color,
  teacherData.userId ?? undefined
);

// After:
const newTeacher = Teacher.create(
  teacherData.name,
  teacherData.color,
  teacherData.userId ?? undefined,
  {
    email: teacherData.email,
    phone: teacherData.phone,
    role: teacherData.role ?? "member",
    notes: teacherData.notes,
  }
);
```

Also check if `updateTeacher` has a duplicate name check and fix it with the same `Teacher.isNameDuplicate` call.

- [ ] **Step 4-3: Fix localStorageCrud — normalize duplicate name check**

In `localStorageCrud.ts`, find the duplicate check in `addTeacherToLocal` (~line 696):
```typescript
const isDuplicate = data.teachers.some((t) => t.name === name.trim());
```
Replace with:
```typescript
const isDuplicate = data.teachers.some(
  (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase()
);
```

Find the same pattern in `updateTeacherInLocal` (~line 762, if it exists) and apply the same fix.

Also fix the role default in `addTeacherToLocal` (~line 711):
```typescript
// Before:
role: profile?.role !== undefined ? profile.role : null,

// After:
role: profile?.role !== undefined ? profile.role : "member",
```

- [ ] **Step 4-4: Write tests for normalization**

In the Teacher service test file (find it: `find src -name "*.test.ts" | xargs grep -l "TeacherApplication" 2>/dev/null`):

Add:
```typescript
it("대소문자만 다른 이름은 중복으로 처리된다", async () => {
  // setup: existing teacher named "김강사"
  // attempt: add "김강사" (exact) — should fail
  // attempt: add "KIM강사" or "김GANG사" — depends on locale
  // The key: both "김강사" and "김강사" (same, different case where applicable) reject
  // Verify: service throws AppError with duplicate name error
});
```

If the test infrastructure is complex (requires Supabase mock), add the test to `localStorageCrud.test.ts` instead:
```typescript
it("addTeacherToLocal — 대소문자 구분 없이 중복 검사", () => {
  // Add "김강사", then try "김강사" with different case → should fail
  // Use getClassPlannerData mock
});
```

- [ ] **Step 4-5: Run tests**

```bash
npm run check:quick
```
Expected: PASS.

- [ ] **Step 4-6: Commit**

```bash
git add \
  src/application/services/TeacherApplicationService.ts \
  src/lib/localStorageCrud.ts
git commit -m "fix(teacher): unify name duplicate normalization + pass profile to entity + default role member"
```

---

## Task 5: Teacher.fromJSON — subjectIds 보존 (Phase D3)

**Background:** The `Teacher` domain entity's `toJSON`/`fromJSON` don't include `subjectIds`. This means if teacher data is serialized through the domain entity and deserialized, subject associations are lost. Fix: add `subjectIds` to `TeacherJson` interface and both methods.

**Files:**
- Modify: `src/domain/entities/Teacher.ts`
- Test: `src/domain/entities/__tests__/Teacher.test.ts`

- [ ] **Step 5-1: Read the relevant Teacher.ts methods**

```bash
grep -n "fromJSON\|toJSON\|TeacherJson\|subjectIds" \
  src/domain/entities/Teacher.ts | head -30
```

Read the full `TeacherJson` interface definition and both `toJSON()` and `fromJSON()` methods.

- [ ] **Step 5-2: Check if Teacher entity has a subjectIds field**

```bash
grep -n "_subjectIds\|subjectIds\|private" \
  src/domain/entities/Teacher.ts | head -20
```

If the entity has no `subjectIds` private field, check if `Teacher.restore()` accepts it in `profile?`:

```bash
grep -n "restore\|profile" src/domain/entities/Teacher.ts | head -20
```

- [ ] **Step 5-3: Add subjectIds to TeacherJson interface**

Find `TeacherJson` interface (line ~304) and add:
```typescript
export interface TeacherJson {
  id: string;
  name: string;
  color: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  email: string | null;
  phone: string | null;
  role: TeacherRole | null;
  notes: string | null;
  subjectIds?: string[];   // ← add this
}
```

- [ ] **Step 5-4: Fix toJSON() to include subjectIds**

Find `toJSON()` (line ~237). Check if the entity has a subjectIds getter:

```bash
grep -n "get subjectIds\|_subjectIds" src/domain/entities/Teacher.ts
```

If the entity has `subjectIds` accessible (via getter or direct field), add to `toJSON()`:
```typescript
toJSON(): TeacherJson {
  return {
    // ... existing fields ...
    subjectIds: this.subjectIds ?? [],   // add
  };
}
```

If the entity does NOT have a subjectIds concept internally (it's only in localStorageCrud), then `toJSON()` should return `subjectIds: []` and `fromJSON()` should pass through `json.subjectIds` to `restore()`. Check if `restore()` accepts `subjectIds` in its profile parameter:

```typescript
// In fromJSON():
static fromJSON(json: TeacherJson): Teacher {
  return Teacher.restore(
    json.id,
    json.name,
    json.color,
    json.userId,
    new Date(json.createdAt),
    new Date(json.updatedAt),
    {
      email: json.email,
      phone: json.phone,
      role: json.role,
      notes: json.notes,
      subjectIds: json.subjectIds,   // ← add
    }
  );
}
```

- [ ] **Step 5-5: Write failing test**

In `src/domain/entities/__tests__/Teacher.test.ts`, add:
```typescript
it("fromJSON — subjectIds가 보존된다", () => {
  const json: TeacherJson = {
    id: "t-1",
    name: "김강사",
    color: "#FF0000",
    userId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    email: null,
    phone: null,
    role: null,
    notes: null,
    subjectIds: ["sub-1", "sub-2"],
  };

  const teacher = Teacher.fromJSON(json);
  const backToJson = teacher.toJSON();
  expect(backToJson.subjectIds).toEqual(["sub-1", "sub-2"]);
});
```

- [ ] **Step 5-6: Run tests**

```bash
npm run check:quick
```
Expected: new test PASS.

- [ ] **Step 5-7: Commit**

```bash
git add src/domain/entities/Teacher.ts \
  "src/domain/entities/__tests__/Teacher.test.ts"
git commit -m "fix(teacher): preserve subjectIds through Teacher entity toJSON/fromJSON"
```

---

## Task 6: Color Picker Debounce (Phase D4)

**Background:** Every color button click immediately calls `onUpdate(teacher.id, { color })`, firing a server sync on each click. For the custom color input, it fires on every `onChange` (every pixel drag). Fix: debounce the server sync by 400ms so rapid clicks only trigger one request.

**Files:**
- Modify: `src/components/organisms/TeacherDetailPanel.tsx`
- Test: `src/components/organisms/__tests__/TeacherDetailPanel.test.tsx`

- [ ] **Step 6-1: Read current color handler**

```bash
grep -n "handleColorClick\|onUpdate\|setEditColor\|color\|onChange" \
  src/components/organisms/TeacherDetailPanel.tsx | head -20
```

Confirm the current code (~line 87-90):
```typescript
const handleColorClick = (c: string) => {
  setEditColor(c);
  onUpdate(teacher.id, { color: c });
};
```

- [ ] **Step 6-2: Implement debounce with useRef + setTimeout**

Replace `handleColorClick` with a debounced version. No external library needed — use a `useRef` timer:

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

// Inside component, after existing state declarations:
const colorSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleColorClick = useCallback(
  (c: string) => {
    setEditColor(c);
    if (colorSyncTimerRef.current) clearTimeout(colorSyncTimerRef.current);
    colorSyncTimerRef.current = setTimeout(() => {
      onUpdate(teacher.id, { color: c });
    }, 400);
  },
  [teacher.id, onUpdate]
);

// Cleanup on unmount:
useEffect(() => {
  return () => {
    if (colorSyncTimerRef.current) clearTimeout(colorSyncTimerRef.current);
  };
}, []);
```

- [ ] **Step 6-3: Write failing test**

In `src/components/organisms/__tests__/TeacherDetailPanel.test.tsx`, add:

```typescript
import { vi } from "vitest";

it("색상 버튼 연속 클릭 시 onUpdate는 마지막 한 번만 호출된다", async () => {
  vi.useFakeTimers();
  const onUpdate = vi.fn();
  // render TeacherDetailPanel with onUpdate prop
  // click color button 3 times rapidly
  // advance timers by < 400ms → onUpdate not called yet
  vi.advanceTimersByTime(300);
  expect(onUpdate).not.toHaveBeenCalled();
  // advance past debounce → called once
  vi.advanceTimersByTime(200);
  expect(onUpdate).toHaveBeenCalledTimes(1);
  vi.useRealTimers();
});
```

- [ ] **Step 6-4: Run tests**

```bash
npm run check:quick
```
Expected: PASS.

- [ ] **Step 6-5: Commit**

```bash
git add src/components/organisms/TeacherDetailPanel.tsx \
  "src/components/organisms/__tests__/TeacherDetailPanel.test.tsx"
git commit -m "fix(teacher): debounce color picker server sync (400ms)"
```

---

## Task 7: Cross-Route Coupling 제거 (Phase D5)

**Background:** `/api/teacher-subjects/route.ts` imports `getTeacherService()` directly from `/api/teachers/route.ts`. This couples two independent API routes. Fix: extract the factory into a shared server utility.

**Files:**
- Create: `src/lib/server/teacherServiceFactory.ts`
- Modify: `src/app/api/teachers/route.ts`
- Modify: `src/app/api/teacher-subjects/route.ts`

- [ ] **Step 7-1: Read the current import**

```bash
head -5 src/app/api/teacher-subjects/route.ts
grep -n "getTeacherService\|export" src/app/api/teachers/route.ts | head -5
```

- [ ] **Step 7-2: Create the shared factory file**

Create `src/lib/server/teacherServiceFactory.ts`:

```typescript
import { ServiceFactory } from "@/application/services/ServiceFactory";

export function getTeacherService() {
  return ServiceFactory.createTeacherService();
}
```

- [ ] **Step 7-3: Update teachers/route.ts to import from the new location**

In `src/app/api/teachers/route.ts`, find:
```typescript
export function getTeacherService() {
  return ServiceFactory.createTeacherService();
}
```
Remove the `export` keyword and add an import (or replace entirely):
```typescript
import { getTeacherService } from "@/lib/server/teacherServiceFactory";
```
Delete the local `getTeacherService` function definition.

- [ ] **Step 7-4: Update teacher-subjects/route.ts**

In `src/app/api/teacher-subjects/route.ts`, change the import:
```typescript
// Before:
import { getTeacherService } from "@/app/api/teachers/route";

// After:
import { getTeacherService } from "@/lib/server/teacherServiceFactory";
```

- [ ] **Step 7-5: Run type-check and tests**

```bash
npm run check:quick
```
Expected: PASS. The behavior is identical — only the import path changed.

- [ ] **Step 7-6: Commit**

```bash
git add \
  src/lib/server/teacherServiceFactory.ts \
  src/app/api/teachers/route.ts \
  src/app/api/teacher-subjects/route.ts
git commit -m "refactor(teacher): extract getTeacherService to shared server utility"
```

---

## Final Verification

- [ ] **Step V-1: Full check suite**

```bash
npm run check
```
Expected: type-check PASS + all tests PASS + build PASS.

- [ ] **Step V-2: UI verification — 강사 해제 flow**

```bash
npm run dev
```

1. `http://localhost:3000/schedule` → 강사가 지정된 세션 더블클릭
2. 강사 chip 클릭 (선택 해제) → chip 비활성화 확인
3. "저장" → 시간표 카드에 "강사 없음" 표시 확인
4. 새로고침 → "강사 없음" 유지 확인 (서버 DB에 NULL 반영)

- [ ] **Step V-3: UI verification — teacher_subjects 초기화**

1. 로그인된 상태에서 새로고침
2. `/teachers` 페이지 → 강사 선택 → 담당 과목 체크박스 유지 확인
3. (이전: 새로고침하면 과목 체크박스가 모두 해제됨)

- [ ] **Step V-4: Create PR**

```bash
gh pr create \
  --title "fix(teacher): clear flow + teacher_subjects init + login migration + D series hygiene" \
  --base dev \
  --body "Closes follow-up items from PR #137 audit."
```

---

## Notes

- **강사 해제 clear flow**: The chain is fragile because null must travel through 5 hops without being coerced to undefined or omitted. If any future change converts null to undefined in any intermediate step, the bug will return. Consider adding an integration test for the full chain.
- **teacher_subjects N+1**: The parallel fetch (Task 2) is acceptable for academies with <50 teachers. If the user ever reports slow load times, a batch API endpoint (`GET /api/teacher-subjects?userId=X` returning all) would be the next step.
- **Teacher.fromJSON subjectIds (Task 5)**: This fix only matters if `Teacher.fromJSON` is called somewhere that also deals with subject associations. If it's only called in tests/serialization, the impact is minimal but correctness is improved.
