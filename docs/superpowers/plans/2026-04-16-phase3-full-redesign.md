# Phase 3 Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 3 풀 리디자인 — App Shell, Student 프로필 확장, Master-Detail, 하이브리드 시간표, SessionBlock 상태, PDF 엔진 교체, 모바일 퍼스트 반응형

**Architecture:** Clean Architecture (Domain → Application → Infrastructure → Presentation) + Atomic Design. Local-first (localStorage SSOT → fire-and-forget server sync). Tailwind CSS v4 `@theme` 토큰 기반. Immutable DDD entities.

**Tech Stack:** Next.js 15.5 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Vitest, lucide-react (신규), jsPDF (기존)

**Spec:** `docs/superpowers/specs/2026-04-16-phase3-full-redesign-design.md`

**Branch strategy:** 각 Task를 1개 feature 브랜치로 구현 → dev PR → CI → merge. Task 단위가 크면 1~2개 커밋씩 쪼개되, 브랜치는 Task 단위.

---

## File Structure Overview

### New Files
```
src/components/organisms/AppShell.tsx          -- Layout container (TopBar/BottomTabBar/Sidebar)
src/components/molecules/BottomTabBar.tsx      -- Mobile tab bar
src/components/molecules/Sidebar.tsx           -- Desktop sidebar
src/components/molecules/TopBar.tsx            -- Mobile top bar
src/components/molecules/BottomSheet.tsx       -- Reusable bottom sheet
src/components/molecules/DayChipBar.tsx        -- Weekday chip selector
src/components/organisms/StudentDetailPanel.tsx -- Student detail (Master-Detail right)
src/components/organisms/SubjectDetailPanel.tsx -- Subject detail
src/components/organisms/ScheduleDailyView.tsx -- Daily schedule view
src/hooks/useScheduleView.ts                  -- View mode (daily/weekly) management
src/hooks/useSessionStatus.ts                 -- Session in-progress/completed status
src/hooks/useBottomSheet.ts                   -- Bottom sheet gesture logic
src/lib/pdf/PdfRenderer.ts                    -- jsPDF direct renderer (entry)
src/lib/pdf/PdfGridLayout.ts                  -- Grid coordinate calculator
src/lib/pdf/PdfSessionBlock.ts                -- Session block drawing
src/lib/pdf/PdfHeader.ts                      -- Header/footer drawing
src/lib/pdf/fonts/pretendard-subset.ts         -- Base64 font subset
supabase/migrations/025_add_student_profile_fields.sql
```

### Modified Files
```
src/domain/entities/Student.ts                -- +grade, school, phone, changeProfile()
src/shared/types/DomainTypes.ts               -- +birthDate, grade, school, phone on Student
src/lib/planner.ts                            -- +grade, school, phone on Student type
src/lib/localStorageCrud.ts                   -- Student CRUD: full profile fields
src/lib/apiSync.ts                            -- +grade, school, phone on sync functions
src/infrastructure/interfaces.ts              -- StudentRepository: +profile fields
src/infrastructure/repositories/SupabaseStudentRepository.ts -- +profile field mapping
src/hooks/useStudentManagementLocal.ts         -- +profile field support
src/shared/types/ApplicationTypes.ts          -- +profile fields on DTOs
src/app/layout.tsx                            -- Replace Navigation with AppShell
src/components/organisms/StudentsPageLayout.tsx -- Master-Detail redesign
src/components/organisms/SubjectsPageLayout.tsx -- Master-Detail redesign
src/app/students/page.tsx                     -- Integrate detail panel
src/app/subjects/page.tsx                     -- Integrate detail panel
src/components/molecules/SessionBlock.tsx      -- State layers (hover/active/done/conflict)
src/components/organisms/TimeTableGrid.tsx     -- View toggle, daily view routing
src/app/schedule/_components/ScheduleHeader.tsx -- Redesign (view toggle + date nav)
src/app/schedule/page.tsx                     -- Wire up daily view + hybrid toggle
src/app/globals.css                           -- Bottom sheet styles, responsive breakpoints
```

### Deleted Files
```
src/lib/pdf-utils.ts                          -- Replaced by src/lib/pdf/ module
```

---

## Task 1: Student Data Model Extension

**Branch:** `feature/phase3-student-profile`

**Files:**
- Modify: `src/domain/entities/Student.ts`
- Modify: `src/domain/entities/__tests__/Student.test.ts`
- Modify: `src/shared/types/DomainTypes.ts`
- Modify: `src/shared/types/ApplicationTypes.ts`
- Modify: `src/lib/planner.ts`
- Modify: `src/lib/localStorageCrud.ts`
- Modify: `src/lib/apiSync.ts`
- Modify: `src/infrastructure/interfaces.ts`
- Modify: `src/infrastructure/repositories/SupabaseStudentRepository.ts`
- Modify: `src/hooks/useStudentManagementLocal.ts`
- Create: `supabase/migrations/025_add_student_profile_fields.sql`

### Step 1: Write failing tests for Student entity profile fields

```typescript
// src/domain/entities/__tests__/Student.test.ts — append to existing file

describe("프로필 필드", () => {
  it("create에 프로필 옵션을 전달하면 필드가 설정되어야 한다", () => {
    const student = Student.create("김철수", {
      gender: "male",
      birthDate: "2013-03-15",
      grade: "중3",
      school: "○○중학교",
      phone: "010-1234-5678",
    });

    expect(student.name).toBe("김철수");
    expect(student.gender).toBe("male");
    expect(student.birthDate).toBe("2013-03-15");
    expect(student.grade).toBe("중3");
    expect(student.school).toBe("○○중학교");
    expect(student.phone).toBe("010-1234-5678");
  });

  it("프로필 옵션 없이 create하면 undefined여야 한다", () => {
    const student = Student.create("김철수");

    expect(student.grade).toBeUndefined();
    expect(student.school).toBeUndefined();
    expect(student.phone).toBeUndefined();
  });

  it("changeProfile로 프로필 필드를 일괄 변경해야 한다", () => {
    const student = Student.create("김철수");
    const updated = student.changeProfile({
      grade: "중3",
      school: "○○중학교",
      phone: "010-1234-5678",
    });

    expect(updated.grade).toBe("중3");
    expect(updated.school).toBe("○○중학교");
    expect(updated.phone).toBe("010-1234-5678");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      student.updatedAt.getTime()
    );
  });

  it("changeProfile은 불변성을 보장해야 한다", () => {
    const original = Student.create("김철수");
    const updated = original.changeProfile({ grade: "중3" });

    expect(original.grade).toBeUndefined();
    expect(updated.grade).toBe("중3");
    expect(original).not.toBe(updated);
  });

  it("유효하지 않은 전화번호 형식이면 에러를 반환해야 한다", () => {
    const result = Student.validatePhone("abc");
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe("PHONE_INVALID_FORMAT");
  });

  it("유효한 전화번호 형식이면 통과해야 한다", () => {
    expect(Student.validatePhone("010-1234-5678").isValid).toBe(true);
    expect(Student.validatePhone("01012345678").isValid).toBe(true);
  });

  it("restore에 프로필 필드가 포함되어야 한다", () => {
    const student = Student.restore(
      "test-uuid", "김철수", {
        gender: "male",
        birthDate: "2013-03-15",
        grade: "중3",
        school: "○○중학교",
        phone: "010-1234-5678",
      }
    );

    expect(student.grade).toBe("중3");
    expect(student.school).toBe("○○중학교");
    expect(student.phone).toBe("010-1234-5678");
  });

  it("toJSON/fromJSON이 프로필 필드를 보존해야 한다", () => {
    const student = Student.create("김철수", {
      grade: "중3",
      school: "○○중학교",
      phone: "010-1234-5678",
    });
    const json = student.toJSON();
    const restored = Student.fromJSON(json);

    expect(restored.grade).toBe("중3");
    expect(restored.school).toBe("○○중학교");
    expect(restored.phone).toBe("010-1234-5678");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run src/domain/entities/__tests__/Student.test.ts`
Expected: FAIL — `Student.create` does not accept options object, no `changeProfile`, no `validatePhone`, no `grade`/`school`/`phone` getters.

- [ ] **Step 3: Implement Student entity changes**

Modify `src/domain/entities/Student.ts`:

1. Add private fields `_grade`, `_school`, `_phone` (all `string | undefined`)
2. Add to constructor parameters
3. Change `create` signature: `static create(name: string, options?: StudentProfileOptions): Student`
   - `StudentProfileOptions = { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }`
   - Backward compat: existing `Student.create("name")` still works, `Student.create("name", "male", "2013-01-01")` — this breaks, but no callers use positional args (localStorage uses name-only, Supabase repo uses `Student.restore`)
4. Change `restore` signature: `static restore(id: string, name: string, options?: StudentRestoreOptions)` where options includes all profile fields + timestamps
   - **Critical:** Check all `Student.restore(...)` call sites. Currently `SupabaseStudentRepository` passes positional args: `Student.restore(data.id, data.name, data.gender, data.birth_date, ...)`. This must be updated in the same step.
5. Add `changeProfile(updates: Partial<StudentProfileOptions>): Student` — returns new instance with updated fields + new `updatedAt`
6. Add `static validatePhone(phone: string): ValidationResult` — accepts `010-XXXX-XXXX` or `01XXXXXXXXX`
7. Add getters: `grade`, `school`, `phone`
8. Update `toDto()`, `toJSON()`, `fromJSON()` to include new fields
9. Update `StudentDto` and `StudentJson` interfaces to include new fields

```typescript
// New types to add:
export interface StudentProfileOptions {
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
}

// Phone validation:
static validatePhone(phone: string): ValidationResult {
  const trimmed = phone.trim();
  if (!trimmed) return { isValid: true, errors: [] }; // optional field
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  if (!phoneRegex.test(trimmed)) {
    return {
      isValid: false,
      errors: [{ field: "phone", message: "유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678)", code: "PHONE_INVALID_FORMAT" }],
    };
  }
  return { isValid: true, errors: [] };
}
```

- [ ] **Step 4: Run Student tests to verify they pass**

Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run src/domain/entities/__tests__/Student.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Update all type definitions across layers**

**`src/lib/planner.ts`** — Add fields to Student type:
```typescript
export type Student = {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
};
```

**`src/shared/types/DomainTypes.ts`** — Add to Student interface:
```typescript
export interface Student {
  readonly id: string;
  readonly name: string;
  readonly gender?: string;
  readonly birthDate?: string;  // ADD (was missing)
  readonly grade?: string;      // ADD
  readonly school?: string;     // ADD
  readonly phone?: string;      // ADD
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

**`src/shared/types/ApplicationTypes.ts`** — Update DTOs and request types:
- `StudentDto`: add `birthDate?`, `grade?`, `school?`, `phone?`
- `AddStudentRequest`: add `birthDate?`, `grade?`, `school?`, `phone?`
- `UpdateStudentRequest`: add `birthDate?`, `grade?`, `school?`, `phone?`

- [ ] **Step 6: Update localStorage CRUD**

**`src/lib/localStorageCrud.ts`:**

`addStudentToLocal` — change signature:
```typescript
export const addStudentToLocal = (
  name: string,
  options?: { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): CrudResult<Student> => {
  // ...
  const newStudent: Student = {
    id: crypto.randomUUID(),
    name: name.trim(),
    ...(options?.gender && { gender: options.gender }),
    ...(options?.birthDate && { birthDate: options.birthDate }),
    ...(options?.grade && { grade: options.grade }),
    ...(options?.school && { school: options.school }),
    ...(options?.phone && { phone: options.phone }),
  };
  // rest unchanged
};
```

`updateStudentInLocal` — expand updates type:
```typescript
export const updateStudentInLocal = (
  id: string,
  updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): CrudResult<Student> => {
  // ...
  const updatedStudent: Student = {
    ...data.students[studentIndex],
    ...(updates.name && { name: updates.name.trim() }),
    ...(updates.gender !== undefined && { gender: updates.gender }),
    ...(updates.birthDate !== undefined && { birthDate: updates.birthDate }),
    ...(updates.grade !== undefined && { grade: updates.grade }),
    ...(updates.school !== undefined && { school: updates.school }),
    ...(updates.phone !== undefined && { phone: updates.phone }),
  };
  // rest unchanged
};
```

- [ ] **Step 7: Update apiSync + infrastructure**

**`src/lib/apiSync.ts`:**
```typescript
export function syncStudentCreate(
  userId: string | null,
  data: { name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void { /* same pattern, add fields to JSON.stringify body */ }

export function syncStudentUpdate(
  userId: string | null,
  id: string,
  data: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
): void { /* same pattern */ }
```

**`src/infrastructure/interfaces.ts`:**
```typescript
export interface StudentRepository {
  create(student: { name: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }, academyId: string): Promise<Student>;
  update(id: string, student: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }, academyId: string): Promise<Student>;
  // getAll, getById, delete unchanged
}
```

**`src/infrastructure/repositories/SupabaseStudentRepository.ts`:**
- Add `grade`, `school`, `phone` to insert/update objects
- Add to `Student.restore(...)` calls — update to new options-based signature:
```typescript
return Student.restore(data.id, data.name, {
  gender: data.gender ?? undefined,
  birthDate: data.birth_date ?? undefined,
  grade: data.grade ?? undefined,
  school: data.school ?? undefined,
  phone: data.phone ?? undefined,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});
```

- [ ] **Step 8: Update useStudentManagementLocal hook**

**`src/hooks/useStudentManagementLocal.ts`:**
- Update local `Student` interface to include `birthDate?`, `grade?`, `school?`, `phone?`
- Update `updateStudent` to accept all profile fields:
```typescript
updateStudent: (
  id: string,
  updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
) => Promise<boolean>;
```
- Pass new fields through to `updateStudentInLocal` and `syncStudentUpdate`

- [ ] **Step 9: Create DB migration**

```sql
-- supabase/migrations/025_add_student_profile_fields.sql
ALTER TABLE students ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;
```

- [ ] **Step 10: Run full test suite**

Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run`
Expected: ALL PASS. Pay attention to any callers of `Student.create` or `Student.restore` that use the old positional API.

- [ ] **Step 11: Commit**

```bash
git add src/domain/entities/Student.ts src/domain/entities/__tests__/Student.test.ts \
  src/shared/types/DomainTypes.ts src/shared/types/ApplicationTypes.ts \
  src/lib/planner.ts src/lib/localStorageCrud.ts src/lib/apiSync.ts \
  src/infrastructure/interfaces.ts src/infrastructure/repositories/SupabaseStudentRepository.ts \
  src/hooks/useStudentManagementLocal.ts supabase/migrations/025_add_student_profile_fields.sql
git commit -m "feat(student): add grade, school, phone profile fields across all layers"
```

---

## Task 2: App Shell + Navigation (Lucide Icons)

**Branch:** `feature/phase3-app-shell`

**Files:**
- Create: `src/components/molecules/BottomTabBar.tsx`
- Create: `src/components/molecules/Sidebar.tsx`
- Create: `src/components/molecules/TopBar.tsx`
- Create: `src/components/organisms/AppShell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

### Step 1: Install lucide-react

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npm install lucide-react`

### Step 2: Create TopBar component

- [ ] Create `src/components/molecules/TopBar.tsx`:

```tsx
"use client";

import { Bell } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-primary)] border-b border-[var(--color-border)]">
      <span className="text-label font-semibold text-[var(--color-text-primary)]">
        CLASS PLANNER
      </span>
      <button
        className="p-2 rounded-admin-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
        aria-label="알림"
      >
        <Bell size={20} strokeWidth={1.5} />
      </button>
    </header>
  );
}
```

### Step 3: Create BottomTabBar component

- [ ] Create `src/components/molecules/BottomTabBar.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TabItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const tabs: TabItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생" },
  { href: "/subjects", icon: BookOpen, label: "과목" },
  { href: "/teachers", icon: GraduationCap, label: "강사" },
  { href: "/settings", icon: Settings, label: "설정" },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] h-14 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
              isActive
                ? "text-accent"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            <Icon size={20} strokeWidth={1.5} />
            {isActive && (
              <span className="text-[10px] font-medium">{label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

### Step 4: Create Sidebar component

- [ ] Create `src/components/molecules/Sidebar.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  BookOpen,
  GraduationCap,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

const topItems: SidebarItem[] = [
  { href: "/schedule", icon: CalendarDays, label: "시간표" },
  { href: "/students", icon: Users, label: "학생" },
  { href: "/subjects", icon: BookOpen, label: "과목" },
  { href: "/teachers", icon: GraduationCap, label: "강사" },
];

const bottomItems: SidebarItem[] = [
  { href: "/settings", icon: Settings, label: "설정" },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderItem = ({ href, icon: Icon, label }: SidebarItem) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        title={label}
        className={`group relative flex items-center justify-center w-10 h-10 rounded-admin-md transition-colors ${
          isActive
            ? "bg-accent text-admin-ink"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
        }`}
      >
        <Icon size={24} strokeWidth={1.5} />
        <span className="absolute left-full ml-2 px-2 py-1 rounded-admin-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-caption whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col items-center w-14 py-4 gap-2 bg-[var(--color-bg-primary)] border-r border-[var(--color-border)]">
      <div className="mb-4 text-accent font-bold text-label">CP</div>
      <div className="flex flex-col gap-1 flex-1">
        {topItems.map(renderItem)}
      </div>
      <div className="flex flex-col gap-1 mt-auto">
        {bottomItems.map(renderItem)}
      </div>
    </aside>
  );
}
```

### Step 5: Create AppShell component

- [ ] Create `src/components/organisms/AppShell.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { TopBar } from "../molecules/TopBar";
import { BottomTabBar } from "../molecules/BottomTabBar";
import { Sidebar } from "../molecules/Sidebar";

const SHELL_EXCLUDED_ROUTES = ["/", "/login", "/about"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isExcluded = SHELL_EXCLUDED_ROUTES.includes(pathname);

  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)]">
      {/* Mobile: TopBar */}
      <div className="md:hidden">
        <TopBar />
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className={`
          pb-14 md:pb-0
          md:ml-14
          pt-0
          min-h-[calc(100dvh-48px)] md:min-h-dvh
        `}
      >
        {children}
      </main>

      {/* Mobile: BottomTabBar */}
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  );
}
```

### Step 6: Integrate AppShell into layout.tsx

- [ ] Modify `src/app/layout.tsx`:
  - Remove the inline `Navigation` function (lines ~34-126)
  - Remove the `<footer>` element
  - Import and wrap `children` with `<AppShell>`
  - Keep `ErrorBoundary`, `GlobalErrorHandlers`, `DataConflictModal`, `Toaster`, `ThemeProvider`

The `AppContent` function should become:
```tsx
function AppContent({ children }: { children: React.ReactNode }) {
  const { isLoading } = useGlobalDataInitialization();

  return (
    <AppShell>
      <ErrorBoundary>
        <GlobalErrorHandlers />
        {isLoading && (
          <div className="fixed inset-0 bg-[var(--color-overlay)] z-[9999] flex items-center justify-center">
            <p className="text-[var(--color-text-primary)]">데이터 로딩 중...</p>
          </div>
        )}
        {children}
        <DataConflictModal />
      </ErrorBoundary>
    </AppShell>
  );
}
```

### Step 7: Add safe-area and shell spacing to globals.css

- [ ] Append to `src/app/globals.css`:

```css
/* ===== App Shell — Safe Area + Tab Bar spacing ===== */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### Step 8: Run check and verify

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`
Expected: ALL PASS, no type errors

### Step 9: Commit

```bash
git add src/components/molecules/BottomTabBar.tsx src/components/molecules/Sidebar.tsx \
  src/components/molecules/TopBar.tsx src/components/organisms/AppShell.tsx \
  src/app/layout.tsx src/app/globals.css package.json package-lock.json
git commit -m "feat(shell): add AppShell with BottomTabBar, Sidebar, TopBar (Lucide icons)"
```

---

## Task 3: Student/Subject Master-Detail Pages

**Branch:** `feature/phase3-master-detail`
**Depends on:** Task 1 (Student profile fields), Task 2 (AppShell)

**Files:**
- Create: `src/components/organisms/StudentDetailPanel.tsx`
- Create: `src/components/organisms/SubjectDetailPanel.tsx`
- Modify: `src/components/organisms/StudentsPageLayout.tsx`
- Modify: `src/components/organisms/SubjectsPageLayout.tsx`
- Modify: `src/app/students/page.tsx`
- Modify: `src/app/subjects/page.tsx`

### Step 1: Create StudentDetailPanel

- [ ] Create `src/components/organisms/StudentDetailPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Pencil, Trash2, ArrowLeft, BookOpen, Calendar } from "lucide-react";
import type { Student } from "@/lib/planner";
import type { Enrollment, Session, Subject } from "@/lib/planner";

interface StudentDetailPanelProps {
  student: Student;
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  onUpdate: (id: string, updates: Partial<Student>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onBack?: () => void; // mobile: back to list
}

export function StudentDetailPanel({
  student, subjects, enrollments, sessions,
  onUpdate, onDelete, onBack,
}: StudentDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFields, setEditFields] = useState({
    name: student.name,
    grade: student.grade ?? "",
    school: student.school ?? "",
    phone: student.phone ?? "",
    gender: student.gender ?? "",
    birthDate: student.birthDate ?? "",
  });

  // Re-sync editFields when student changes
  // (useEffect omitted for brevity — implement with student.id dep)

  const studentEnrollments = enrollments.filter((e) => e.studentId === student.id);
  const studentSubjectIds = new Set(studentEnrollments.map((e) => e.subjectId));
  const studentSessions = sessions.filter((s) =>
    s.enrollmentIds?.some((eid) => studentEnrollments.some((e) => e.id === eid))
  );

  const handleSave = async () => {
    const result = await onUpdate(student.id, editFields);
    if (result) setIsEditing(false);
  };

  const initial = student.name.charAt(0);

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 lg:hidden text-[var(--color-text-muted)]">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
        )}
        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-admin-ink font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">{student.name}</h2>
          <p className="text-caption text-[var(--color-text-muted)]">
            {[student.grade, student.school].filter(Boolean).join(" · ") || "프로필 미입력"}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsEditing(!isEditing)} className="p-2 rounded-admin-md text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]">
            <Pencil size={16} strokeWidth={1.5} />
          </button>
          <button onClick={() => onDelete(student.id)} className="p-2 rounded-admin-md text-semantic-danger hover:bg-[var(--color-overlay-light)]">
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-bg-secondary)] rounded-admin-md p-3">
          <div className="flex items-center gap-1.5 text-caption text-[var(--color-text-muted)] mb-1">
            <BookOpen size={14} strokeWidth={1.5} />
            <span>등록 과목</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSubjectIds.size}</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-admin-md p-3">
          <div className="flex items-center gap-1.5 text-caption text-[var(--color-text-muted)] mb-1">
            <Calendar size={14} strokeWidth={1.5} />
            <span>주간 수업</span>
          </div>
          <p className="text-xl font-bold text-accent">{studentSessions.length}회</p>
        </div>
      </div>

      {/* Schedule List */}
      <section>
        <h3 className="text-label font-semibold text-[var(--color-text-secondary)] mb-2">수업 일정</h3>
        {studentSessions.length === 0 ? (
          <p className="text-caption text-[var(--color-text-muted)]">등록된 수업이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Render session list items */}
          </div>
        )}
      </section>

      {/* Profile Section — inline edit */}
      <section>
        <h3 className="text-label font-semibold text-[var(--color-text-secondary)] mb-2">프로필</h3>
        {isEditing ? (
          <div className="flex flex-col gap-2">
            {/* Name, Grade, School, Phone, Gender, BirthDate input fields */}
            {/* Each: label + input with Tailwind styling */}
            <div className="flex gap-2 mt-2">
              <button onClick={handleSave} className="flex-1 py-2 bg-accent text-admin-ink rounded-admin-md font-medium text-label">저장</button>
              <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-admin-md text-label">취소</button>
            </div>
          </div>
        ) : (
          <dl className="flex flex-col gap-1.5 text-sm">
            {/* Display-only profile fields */}
          </dl>
        )}
      </section>
    </div>
  );
}
```

Note: The actual implementation should fill in the complete input fields for editing and the display-only `<dl>` entries. Each profile field (name, grade, school, phone, gender, birthDate) needs its own `<input>` in edit mode and a `<dd>` in display mode.

### Step 2: Create SubjectDetailPanel

- [ ] Create `src/components/organisms/SubjectDetailPanel.tsx` — same Master-Detail pattern:
  - Header: subject name + color swatch + edit/delete buttons
  - Summary: enrolled student count, weekly session count
  - Student list: names of enrolled students
  - Schedule list: sessions for this subject
  - Color picker: select from palette (reuse `Color.fromPalette` colors)

### Step 3: Redesign StudentsPageLayout to Master-Detail

- [ ] Rewrite `src/components/organisms/StudentsPageLayout.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Student, Subject, Enrollment, Session } from "@/lib/planner";
import { StudentDetailPanel } from "./StudentDetailPanel";

interface StudentsPageLayoutProps {
  students: Student[];
  subjects: Subject[];
  enrollments: Enrollment[];
  sessions: Session[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onAddStudent: (name: string) => void;
  onDeleteStudent: (id: string) => void;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<boolean>;
  errorMessage?: string;
  onClearError: () => void;
}

export function StudentsPageLayout(props: StudentsPageLayoutProps) {
  const { students, selectedStudentId, onSelectStudent } = props;
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false); // mobile detail toggle

  const filtered = students.filter((s) =>
    s.name.includes(searchQuery)
  );
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="flex h-[calc(100dvh-48px)] md:h-dvh">
      {/* List Panel — hidden on mobile when detail is shown */}
      <div className={`w-full lg:w-[360px] lg:border-r lg:border-[var(--color-border)] flex flex-col ${showDetail ? "hidden lg:flex" : "flex"}`}>
        {/* Search + Add button */}
        {/* Student list items */}
        {/* Each item: avatar + name + subtitle, onClick selects + setShowDetail(true) */}
      </div>

      {/* Detail Panel — full screen on mobile, right side on desktop */}
      {selectedStudent && (
        <div className={`flex-1 overflow-y-auto ${!showDetail ? "hidden lg:block" : "block"}`}>
          <StudentDetailPanel
            student={selectedStudent}
            subjects={props.subjects}
            enrollments={props.enrollments}
            sessions={props.sessions}
            onUpdate={props.onUpdateStudent}
            onDelete={props.onDeleteStudent}
            onBack={() => setShowDetail(false)}
          />
        </div>
      )}

      {/* Empty state — desktop only, when no student selected */}
      {!selectedStudent && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-[var(--color-text-muted)]">
          학생을 선택하세요
        </div>
      )}
    </div>
  );
}
```

### Step 4: Update students/page.tsx for Master-Detail

- [ ] Modify `src/app/students/page.tsx`:
  - Import `useIntegratedDataLocal` to get subjects, enrollments, sessions
  - Pass all data to `StudentsPageLayout`
  - Update `handleUpdateStudent` to support all profile fields

### Step 5: Redesign SubjectsPageLayout + page.tsx

- [ ] Apply same Master-Detail pattern to subjects — mirror students approach.

### Step 6: Run type check + tests

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`
Expected: ALL PASS

### Step 7: Commit

```bash
git add src/components/organisms/StudentDetailPanel.tsx \
  src/components/organisms/SubjectDetailPanel.tsx \
  src/components/organisms/StudentsPageLayout.tsx \
  src/components/organisms/SubjectsPageLayout.tsx \
  src/app/students/page.tsx src/app/subjects/page.tsx
git commit -m "feat(pages): redesign Student/Subject pages to Master-Detail layout"
```

---

## Task 4: BottomSheet Component + Modal Mobile Adaptation

**Branch:** `feature/phase3-bottom-sheet`
**Depends on:** Task 2 (AppShell, breakpoints)

**Files:**
- Create: `src/components/molecules/BottomSheet.tsx`
- Create: `src/hooks/useBottomSheet.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/schedule/_components/EditSessionModal.tsx` (or wherever it lives)
- Modify: `src/app/schedule/_components/GroupSessionModal.tsx`

### Step 1: Create useBottomSheet hook

- [ ] Create `src/hooks/useBottomSheet.ts`:

```typescript
"use client";

import { useCallback, useRef, useState } from "react";

interface UseBottomSheetReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  translateY: number;
}

export function useBottomSheet(onClose?: () => void): UseBottomSheetReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  const open = useCallback(() => {
    setIsOpen(true);
    setTranslateY(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTranslateY(0);
    onClose?.();
  }, [onClose]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      currentY.current = diff;
      setTranslateY(diff);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (currentY.current > 100) {
      close();
    } else {
      setTranslateY(0);
    }
  }, [close]);

  return {
    isOpen,
    open,
    close,
    dragHandleProps: { onTouchStart, onTouchMove, onTouchEnd },
    translateY,
  };
}
```

### Step 2: Create BottomSheet component

- [ ] Create `src/components/molecules/BottomSheet.tsx`:

```tsx
"use client";

import { useEffect } from "react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dragHandleProps?: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  translateY?: number;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  dragHandleProps,
  translateY = 0,
}: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-overlay)] animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-slide-up"
        style={{ transform: `translateY(${translateY}px)` }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        >
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full" />
        </div>
        {title && (
          <h2 className="px-4 pb-2 text-lg font-semibold text-[var(--color-text-primary)]">
            {title}
          </h2>
        )}
        <div className="px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}
```

### Step 3: Add BottomSheet animations to globals.css

- [ ] Append to `src/app/globals.css`:

```css
/* ===== BottomSheet Animations ===== */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
```

### Step 4: Create ResponsiveModal wrapper

- [ ] Create a wrapper that renders BottomSheet on mobile, centered modal on desktop. This can be a thin component or a hook (`useMediaQuery`) + conditional render in each modal. Simplest approach: wrap existing modals.

```tsx
// Pattern to apply in each modal:
import { useMediaQuery } from "@/hooks/useMediaQuery"; // or inline: window.matchMedia("(min-width: 768px)")
import { BottomSheet } from "@/components/molecules/BottomSheet";

// Inside modal component:
const isDesktop = useMediaQuery("(min-width: 768px)");

if (!isDesktop) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {/* modal content */}
    </BottomSheet>
  );
}
// else: render existing centered modal
```

### Step 5: Adapt EditSessionModal and GroupSessionModal

- [ ] Wrap both modals with the responsive pattern above. Keep the existing desktop modal unchanged. On mobile, render content inside `<BottomSheet>`.

### Step 6: Run tests + type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`

### Step 7: Commit

```bash
git add src/components/molecules/BottomSheet.tsx src/hooks/useBottomSheet.ts \
  src/app/globals.css \
  src/app/schedule/_components/EditSessionModal.tsx \
  src/app/schedule/_components/GroupSessionModal.tsx
git commit -m "feat(mobile): add BottomSheet component + modal mobile adaptation"
```

---

## Task 5: Schedule Daily View + Hybrid Toggle

**Branch:** `feature/phase3-schedule-daily`
**Depends on:** Task 2 (AppShell), Task 4 (BottomSheet)

**Files:**
- Create: `src/components/organisms/ScheduleDailyView.tsx`
- Create: `src/components/molecules/DayChipBar.tsx`
- Create: `src/hooks/useScheduleView.ts`
- Modify: `src/app/schedule/_components/ScheduleHeader.tsx`
- Modify: `src/app/schedule/_components/ScheduleGridSection.tsx`
- Modify: `src/app/schedule/page.tsx`

### Step 1: Create useScheduleView hook

- [ ] Create `src/hooks/useScheduleView.ts`:

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocal } from "./useLocal";

export type ScheduleViewMode = "daily" | "weekly";

interface UseScheduleViewReturn {
  viewMode: ScheduleViewMode;
  setViewMode: (mode: ScheduleViewMode) => void;
  selectedDate: Date;
  selectedWeekday: number; // 0-6
  goToNextDay: () => void;
  goToPrevDay: () => void;
  goToToday: () => void;
  setSelectedDate: (date: Date) => void;
}

export function useScheduleView(): UseScheduleViewReturn {
  const [storedView, setStoredView] = useLocal<ScheduleViewMode>(
    "ui:scheduleView",
    typeof window !== "undefined" && window.innerWidth < 768 ? "daily" : "weekly"
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const selectedWeekday = (selectedDate.getDay() + 6) % 7; // 0=Mon

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
    viewMode: storedView,
    setViewMode: setStoredView,
    selectedDate,
    selectedWeekday,
    goToNextDay,
    goToPrevDay,
    goToToday,
    setSelectedDate,
  };
}
```

### Step 2: Create DayChipBar component

- [ ] Create `src/components/molecules/DayChipBar.tsx`:

```tsx
"use client";

import { weekdays } from "@/lib/planner";

interface DayChipBarProps {
  selectedWeekday: number;
  onSelectWeekday: (weekday: number) => void;
  baseDate: Date; // used to calculate dates for each chip
}

export function DayChipBar({ selectedWeekday, onSelectWeekday, baseDate }: DayChipBarProps) {
  // Calculate the Monday of the week containing baseDate
  const monday = new Date(baseDate);
  const dayOfWeek = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayOfWeek);

  return (
    <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
      {weekdays.map((label, idx) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + idx);
        const isActive = idx === selectedWeekday;
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <button
            key={idx}
            onClick={() => onSelectWeekday(idx)}
            className={`flex flex-col items-center min-w-[44px] py-1.5 px-2 rounded-admin-md transition-colors ${
              isActive
                ? "bg-accent text-admin-ink"
                : isToday
                ? "bg-[var(--color-overlay-light)] text-accent"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
            }`}
          >
            <span className="text-caption font-medium">{label}</span>
            <span className="text-[10px]">{date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
```

### Step 3: Create ScheduleDailyView component

- [ ] Create `src/components/organisms/ScheduleDailyView.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";
import type { ColorByMode } from "@/hooks/useColorBy";

interface ScheduleDailyViewProps {
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  students: Student[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  selectedWeekday: number;
  colorBy: ColorByMode;
  onSessionClick: (session: Session) => void;
  onAddSession: () => void;
}

export function ScheduleDailyView({
  sessions, subjects, students, enrollments, teachers,
  selectedWeekday, colorBy, onSessionClick, onAddSession,
}: ScheduleDailyViewProps) {
  const daySessions = useMemo(() => {
    const raw = sessions.get(selectedWeekday) ?? [];
    return [...raw].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, selectedWeekday]);

  const getSubject = (session: Session) =>
    subjects.find((s) => {
      const enrollment = enrollments.find((e) => session.enrollmentIds?.includes(e.id));
      return enrollment && s.id === enrollment.subjectId;
    });

  const getStudentNames = (session: Session) => {
    const eIds = session.enrollmentIds ?? [];
    return eIds
      .map((eid) => {
        const enrollment = enrollments.find((e) => e.id === eid);
        return enrollment ? students.find((s) => s.id === enrollment.studentId)?.name : undefined;
      })
      .filter(Boolean)
      .join(", ");
  };

  const getTeacherName = (session: Session) =>
    session.teacherId ? teachers.find((t) => t.id === session.teacherId)?.name : undefined;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-4 pb-20">
      {daySessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          수업이 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-2 py-2">
          {daySessions.map((session) => {
            const subject = getSubject(session);
            const accentColor = subject?.color ?? "var(--color-primary)";
            return (
              <button
                key={session.id}
                onClick={() => onSessionClick(session)}
                className="flex gap-3 p-3 rounded-admin-md bg-[var(--color-bg-secondary)] text-left transition-transform active:scale-[0.98]"
                style={{ borderLeft: `3px solid ${accentColor}` }}
              >
                <div className="text-caption text-[var(--color-text-muted)] w-12 flex-shrink-0 pt-0.5">
                  {session.startsAt}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: accentColor }}>
                      {subject?.name ?? "과목 없음"}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {session.startsAt} - {session.endsAt}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] truncate">
                    {getStudentNames(session) || "학생 없음"}
                  </p>
                  {getTeacherName(session) && (
                    <p className="text-caption text-[var(--color-text-muted)]">
                      {getTeacherName(session)} 선생님
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={onAddSession}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-accent text-admin-ink rounded-full shadow-admin-lg flex items-center justify-center z-40 hover:bg-accent-hover active:bg-accent-pressed transition-colors"
        aria-label="수업 추가"
      >
        <Plus size={24} strokeWidth={2} />
      </button>
    </div>
  );
}
```

### Step 4: Redesign ScheduleHeader with view toggle

- [ ] Modify `src/app/schedule/_components/ScheduleHeader.tsx`:
  - Add segmented control: `일별 | 주간`
  - Date navigation: prev/next + current date/week display
  - Keep existing right-side actions (ColorBy, PDF, StudentPanel toggle)
  - Mobile: stack in 2 rows

### Step 5: Wire up in schedule/page.tsx

- [ ] Modify `src/app/schedule/page.tsx`:
  - Import `useScheduleView`
  - Conditionally render `ScheduleDailyView` (daily) vs `ScheduleGridSection` (weekly)
  - Pass `DayChipBar` above `ScheduleDailyView` in daily mode
  - Pass view toggle state to `ScheduleHeader`

### Step 6: Add swipe gesture for daily view

- [ ] Add touch event handlers on the daily view container:
  - Left swipe → `goToNextDay()`
  - Right swipe → `goToPrevDay()`
  - Threshold: 50px horizontal, must be > vertical displacement

### Step 7: Run tests + type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`

### Step 8: Commit

```bash
git add src/components/organisms/ScheduleDailyView.tsx \
  src/components/molecules/DayChipBar.tsx \
  src/hooks/useScheduleView.ts \
  src/app/schedule/_components/ScheduleHeader.tsx \
  src/app/schedule/_components/ScheduleGridSection.tsx \
  src/app/schedule/page.tsx
git commit -m "feat(schedule): add daily view with hybrid toggle + swipe gestures"
```

---

## Task 6: SessionBlock State Layers

**Branch:** `feature/phase3-session-states`
**Depends on:** None (independent)

**Files:**
- Create: `src/hooks/useSessionStatus.ts`
- Modify: `src/components/molecules/SessionBlock.tsx`
- Modify: `src/app/globals.css`

### Step 1: Create useSessionStatus hook

- [ ] Create `src/hooks/useSessionStatus.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export type SessionStatus = "upcoming" | "in-progress" | "completed";

export function useSessionStatus(
  startsAt: string,
  endsAt: string,
  weekday: number
): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>("upcoming");

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const currentWeekday = (now.getDay() + 6) % 7;

      if (currentWeekday !== weekday) {
        setStatus("upcoming");
        return;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = startsAt.split(":").map(Number);
      const [endH, endM] = endsAt.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes >= endMinutes) {
        setStatus("completed");
      } else if (currentMinutes >= startMinutes) {
        setStatus("in-progress");
      } else {
        setStatus("upcoming");
      }
    };

    calculate();
    const interval = setInterval(calculate, 60_000); // 1-minute refresh
    return () => clearInterval(interval);
  }, [startsAt, endsAt, weekday]);

  return status;
}
```

### Step 2: Add state layer styles to SessionBlock

- [ ] Modify `src/components/molecules/SessionBlock.tsx`:
  - Import and use `useSessionStatus`
  - Add CSS classes for each state:

```tsx
// Inside SessionBlock render:
const status = useSessionStatus(session.startsAt, session.endsAt, session.weekday);

const stateClasses = {
  "upcoming": "",
  "in-progress": "ring-2 ring-accent/50 shadow-[0_0_8px_var(--color-accent)]",
  "completed": "opacity-55",
};

// Add to the block wrapper:
<div className={`... ${stateClasses[status]} ...`}>
  {status === "in-progress" && (
    <span className="absolute top-1 right-1 text-[8px] bg-accent text-admin-ink px-1 rounded-sm font-medium">
      진행중
    </span>
  )}
</div>
```

### Step 3: Add hover/drag/focus/conflict states

- [ ] Add to SessionBlock's className logic:
  - Hover: `hover:-translate-y-0.5 hover:shadow-admin-md` (desktop only)
  - Drag: when `isDragging` prop is true → `scale-95 shadow-admin-lg cursor-grabbing`
  - Focus: `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`
  - Conflict: when `hasConflict` prop is true → red left border + `⚠️` icon

### Step 4: Run tests + type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`

### Step 5: Commit

```bash
git add src/hooks/useSessionStatus.ts src/components/molecules/SessionBlock.tsx src/app/globals.css
git commit -m "feat(session): add SessionBlock state layers (in-progress/completed/hover/conflict)"
```

---

## Task 7: Schedule Grid Responsive + Touch

**Branch:** `feature/phase3-grid-responsive`
**Depends on:** Task 4 (BottomSheet), Task 5 (daily view), Task 6 (state layers)

**Files:**
- Modify: `src/components/organisms/TimeTableGrid.tsx`
- Modify: `src/app/schedule/page.tsx`
- Modify: `src/components/molecules/SessionBlock.tsx`

### Step 1: Add responsive adaptations to TimeTableGrid

- [ ] Modify `src/components/organisms/TimeTableGrid.tsx`:
  - On mobile weekly view (< 768px): reduce column widths, smaller text
  - Disable drag-and-drop on touch devices
  - Add long-press detection on SessionBlock (300ms threshold) → show context menu

### Step 2: Add long-press context menu

- [ ] Implement long-press handler on SessionBlock:
  - 300ms touch-hold → show options (편집 / 삭제 / 이동)
  - Prevent scroll during long-press detection
  - On desktop: right-click context menu equivalent

### Step 3: Adapt StudentPanel for mobile

- [ ] Modify `StudentPanel` to render as BottomSheet on mobile (< 768px) instead of fixed side panel.

### Step 4: Run tests + type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`

### Step 5: Commit

```bash
git add src/components/organisms/TimeTableGrid.tsx \
  src/app/schedule/page.tsx \
  src/components/molecules/SessionBlock.tsx
git commit -m "feat(grid): add responsive grid + touch gestures (long-press, swipe)"
```

---

## Task 8: PDF Engine Replacement (jsPDF Direct Rendering)

**Branch:** `feature/phase3-pdf-engine`
**Depends on:** None (independent)

**Files:**
- Create: `src/lib/pdf/PdfRenderer.ts`
- Create: `src/lib/pdf/PdfGridLayout.ts`
- Create: `src/lib/pdf/PdfSessionBlock.ts`
- Create: `src/lib/pdf/PdfHeader.ts`
- Create: `src/lib/pdf/fonts/pretendard-subset.ts`
- Delete: `src/lib/pdf-utils.ts`
- Modify: PDF-related button components that import from `pdf-utils`

### Step 1: Create PdfGridLayout calculator

- [ ] Create `src/lib/pdf/PdfGridLayout.ts`:

```typescript
/**
 * A4 Landscape (297mm × 210mm) grid coordinate calculator for jsPDF.
 */

export interface GridDimensions {
  pageWidth: number;   // mm
  pageHeight: number;  // mm
  margin: { top: number; right: number; bottom: number; left: number };
  headerHeight: number;
  footerHeight: number;
  timeColWidth: number;
  dayColWidth: number;
  gridTop: number;
  gridBottom: number;
  slotHeight: number;
}

export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateGridDimensions(
  weekdayCount: number = 5,
  startHour: number = 9,
  endHour: number = 23
): GridDimensions {
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = { top: 15, right: 10, bottom: 15, left: 10 };
  const headerHeight = 20;
  const footerHeight = 10;
  const timeColWidth = 15;

  const gridTop = margin.top + headerHeight;
  const gridBottom = pageHeight - margin.bottom - footerHeight;
  const availableWidth = pageWidth - margin.left - margin.right - timeColWidth;
  const dayColWidth = availableWidth / weekdayCount;
  const totalSlots = (endHour - startHour) * 2; // 30-min slots
  const slotHeight = (gridBottom - gridTop) / totalSlots;

  return {
    pageWidth, pageHeight, margin, headerHeight, footerHeight,
    timeColWidth, dayColWidth, gridTop, gridBottom, slotHeight,
  };
}

export function getCellPosition(
  dims: GridDimensions,
  weekday: number,
  startsAt: string,
  endsAt: string,
  startHour: number = 9
): CellPosition {
  const [sh, sm] = startsAt.split(":").map(Number);
  const [eh, em] = endsAt.split(":").map(Number);
  const startSlot = (sh - startHour) * 2 + sm / 30;
  const endSlot = (eh - startHour) * 2 + em / 30;

  return {
    x: dims.margin.left + dims.timeColWidth + weekday * dims.dayColWidth,
    y: dims.gridTop + startSlot * dims.slotHeight,
    width: dims.dayColWidth,
    height: (endSlot - startSlot) * dims.slotHeight,
  };
}
```

### Step 2: Create PdfHeader (header + footer drawing)

- [ ] Create `src/lib/pdf/PdfHeader.ts`:
  - `drawHeader(doc, dims, options)` — academy name, date range, print date
  - `drawFooter(doc, dims)` — "CLASS PLANNER" + domain

### Step 3: Create PdfSessionBlock

- [ ] Create `src/lib/pdf/PdfSessionBlock.ts`:
  - `drawSessionBlock(doc, cell, session, subjectName, studentNames, color)`:
    - Filled rectangle with pastel bg
    - Left border (3px) with subject accent
    - Text: subject name, student names, time

### Step 4: Create font subset placeholder

- [ ] Create `src/lib/pdf/fonts/pretendard-subset.ts`:
  - Export Base64-encoded Pretendard Regular font subset (Korean + alphanumeric)
  - This file will be large (~500KB base64). Generate using fonttools pyftsubset or similar.
  - Fallback: use jsPDF's built-in font if Pretendard fails to load

### Step 5: Create PdfRenderer entry point

- [ ] Create `src/lib/pdf/PdfRenderer.ts`:

```typescript
import jsPDF from "jspdf";
import { calculateGridDimensions, getCellPosition } from "./PdfGridLayout";
import { drawHeader, drawFooter } from "./PdfHeader";
import { drawSessionBlock } from "./PdfSessionBlock";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";

export interface PdfRenderOptions {
  academyName?: string;
  filterStudentId?: string;
  filterTeacherId?: string;
  filename?: string;
}

export function renderSchedulePdf(
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  teachers: Teacher[],
  options: PdfRenderOptions = {}
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Register Pretendard font (try/catch for fallback)
  // ...

  const dims = calculateGridDimensions();

  drawHeader(doc, dims, {
    academyName: options.academyName ?? "CLASS PLANNER",
    dateRange: getCurrentWeekRange(),
    printDate: new Date().toISOString().slice(0, 10),
  });

  // Draw grid lines (weekday headers + time slots)
  drawGridLines(doc, dims);

  // Filter sessions if needed
  let targetSessions = sessions;
  if (options.filterStudentId) {
    const studentEnrollmentIds = enrollments
      .filter((e) => e.studentId === options.filterStudentId)
      .map((e) => e.id);
    targetSessions = sessions.filter((s) =>
      s.enrollmentIds?.some((eid) => studentEnrollmentIds.includes(eid))
    );
  }

  // Draw each session block
  for (const session of targetSessions) {
    const cell = getCellPosition(dims, session.weekday, session.startsAt, session.endsAt);
    const enrollment = enrollments.find((e) => session.enrollmentIds?.includes(e.id));
    const subject = enrollment ? subjects.find((s) => s.id === enrollment.subjectId) : undefined;
    const studentNames = getStudentNames(session, enrollments, students);

    drawSessionBlock(doc, cell, {
      subjectName: subject?.name ?? "",
      studentNames,
      color: subject?.color ?? "#3b82f6",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });
  }

  drawFooter(doc, dims);

  // Generate filename
  const filename = options.filename ?? `${options.academyName ?? "시간표"}_전체시간표.pdf`;
  doc.save(filename);
}
```

### Step 6: Delete old pdf-utils.ts and update imports

- [ ] Delete `src/lib/pdf-utils.ts`
- [ ] Update `PDFDownloadButton.tsx` (or wherever PDF is triggered) to import from `src/lib/pdf/PdfRenderer`
- [ ] Remove `html2canvas` from `package.json`: `npm uninstall html2canvas`

### Step 7: Run tests + type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run && npx tsc --noEmit`

### Step 8: Commit

```bash
git add src/lib/pdf/ -A
git rm src/lib/pdf-utils.ts
git add package.json package-lock.json
# Add modified button components
git commit -m "feat(pdf): replace html2canvas with jsPDF direct rendering engine"
```

---

## Task 9: Token Application + Visual Polish

**Branch:** `feature/phase3-visual-polish`
**Depends on:** Task 2, 3, 5

**Files:**
- Modify: `src/app/globals.css`
- Modify: Multiple page/component files for token application
- Modify: `src/app/schedule/page.tsx`
- Modify: `src/app/students/page.tsx`
- Modify: `src/app/subjects/page.tsx`
- Modify: `src/app/settings/page.tsx` (if exists)

### Step 1: Audit all pages for legacy inline styles

- [ ] Grep for `style={{` across `src/app/` and `src/components/` — replace with Tailwind classes using `@theme` tokens.

### Step 2: Apply Admin mode tokens

- [ ] Ensure all pages use:
  - `bg-[var(--color-bg-primary)]` for page backgrounds
  - `text-[var(--color-text-primary)]` for main text
  - `text-[var(--color-text-muted)]` for secondary text
  - `border-[var(--color-border)]` for borders
  - `bg-accent` / `text-accent` for primary actions
  - `rounded-admin-sm/md/lg` for border radius
  - `shadow-admin-sm/md/lg` for shadows

### Step 3: Apply Surface mode to schedule grid

- [ ] Ensure `data-surface="surface"` is on the schedule grid container
  - Surface Q Pastel colors applied to session blocks within the grid

### Step 4: Typography pass

- [ ] Apply text scale tokens:
  - Page titles: `text-page` (32px)
  - Section headers: `text-section` (22px)
  - Labels: `text-label` (13px)
  - Captions: `text-caption` (11px)

### Step 5: Transitions and micro-interactions

- [ ] Add `transition-colors` to all interactive elements
  - Buttons: hover/active state transitions
  - Cards: subtle hover elevation
  - Tab switches: color transition

### Step 6: Run type check

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx tsc --noEmit`

### Step 7: Commit

```bash
git add -u
git commit -m "style(tokens): apply Phase 3 design tokens + visual polish across all pages"
```

---

## Task 10: Integration Testing + UI Verification

**Branch:** `feature/phase3-integration-test`
**Depends on:** All previous tasks

**Files:**
- Possible new test files
- No production code changes

### Step 1: Run full test suite

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npx vitest run`
Expected: ALL PASS

### Step 2: Run production build

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npm run build`
Expected: Build succeeds with no errors

### Step 3: Start dev server

- [ ] Run: `cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && npm run dev`

### Step 4: Playwright MCP — Desktop verification

- [ ] Navigate to `http://localhost:3000/schedule`
  - Verify Sidebar visible, TopBar hidden
  - Verify weekly grid renders with SessionBlock state layers
  - Toggle to daily view → verify daily cards render
  - Toggle back to weekly → grid restores
  - Click session → EditSessionModal opens (centered modal)
  - Screenshot

- [ ] Navigate to `/students`
  - Verify Master-Detail: list on left, detail on right
  - Select a student → detail panel populates
  - Click edit → inline edit mode, modify phone → save
  - Screenshot

- [ ] Navigate to `/subjects`
  - Verify Master-Detail layout
  - Screenshot

- [ ] PDF download test
  - Click PDF download → verify file downloads
  - Open PDF → verify vector text (not bitmap), Korean renders correctly

### Step 5: Playwright MCP — Mobile verification (375x667)

- [ ] Resize viewport to 375×667
- [ ] Navigate to `/schedule`
  - Verify BottomTabBar visible, Sidebar hidden, TopBar visible
  - Verify daily view default
  - Tap session → BottomSheet opens
  - Screenshot

- [ ] Navigate to `/students`
  - Verify full-screen list
  - Tap student → full-screen detail (with back button)
  - Screenshot

### Step 6: computer-use verification (visual)

- [ ] Open browser at `http://localhost:3000`
  - Check icon visual quality (Lucide icons crisp)
  - Resize browser to test responsive transitions
  - Verify BottomSheet slide-up animation
  - Verify SessionBlock hover elevation
  - Check color consistency across pages

### Step 7: Write UI Verification Report

- [ ] Include in final response:

```
## UI Verification Report

### 1차 — Playwright MCP
- Flows tested: ...
- Screenshots: (attached)
- Issues found: None / [list]

### 2차 — computer-use
- Scope: ...
- Observations: ...
- Issues found: None / [list]
```

### Step 8: Commit test additions (if any)

```bash
git add .
git commit -m "test: add Phase 3 integration tests"
```

---

## Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Unit tests | `npx vitest run` | All pass |
| Type check | `npx tsc --noEmit` | No errors |
| Lint | `npx next lint` | No errors |
| Production build | `npm run build` | Success |
| Quick check | `npm run check:quick` | All pass |
| Full check | `npm run check` | All pass |
| Desktop UI | Playwright MCP 1280×800 | All pages render correctly |
| Mobile UI | Playwright MCP 375×667 | BottomTabBar, daily view, BottomSheet |
| PDF output | Download + open | Vector text, Korean OK |

## PR Strategy

Each task = 1 feature branch → dev PR → CI → merge. After all 10 tasks complete:
- `dev` has all Phase 3 changes
- dev → main PR is **deferred** until user explicitly requests
