# class-planner Phase 5-C — /schedule UX Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/schedule` 페이지의 UX를 개선한다 — 학생 패널을 필터 칩 바로 교체, ColorBy/View 토글의 시각 통일, 그룹 수업 멀티셀렉트 필터, 템플릿 버튼 affordance 개선.

**Architecture:**
- `SegmentedButton` 원자를 신설하여 Day/Week/Month 토글과 ColorBy 토글을 동일 스타일로 통일.
- `StudentFilterChipBar` 컴포넌트가 `colorBy === "student"`일 때만 노출 — 기존 floating `StudentPanel`/`StudentPanelSection`을 삭제.
- `filterSessionsByStudents` 순수 함수를 `src/features/schedule/filters.ts`에 신설, 멀티셀렉트 로직을 도메인 계층으로 격리.
- `SessionBlock.selectedStudentId: string` → `selectedStudentIds: string[]`로 전환 (단일→멀티 셀렉트). 공개 data-testid 계약은 불변.
- C-4(템플릿 affordance): `ScheduleActionBar`에 `HelpTooltip` 주입, `ApplyTemplateModal`에 덮어쓰기 경고 추가.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS v4, Vitest + RTL, Playwright MCP.

---

## Context

### 현재 파일 경로 (읽기 전 필수)

| 파일 | 라인 수 | 역할 |
|------|--------|------|
| `src/components/molecules/ColorByToggle.tsx` | 40 | 과목/학생/강사 토글 (active = bg-[--color-primary]) |
| `src/app/schedule/_components/ScheduleHeader.tsx` | 110 | View mode 토글 (active = bg-accent) — 두 토글이 다른 스타일 |
| `src/components/organisms/StudentPanel.tsx` | 97 | Floating 학생 리스트 패널 |
| `src/app/schedule/_components/StudentPanelSection.tsx` | 119 | StudentPanel 래퍼 (데스크탑 float / 모바일 BottomSheet) |
| `src/app/schedule/page.tsx` | 1382 | 메인 컨테이너. 핵심 변경 대상 |
| `src/app/schedule/_components/ScheduleActionBar.tsx` | 64 | PDF·템플릿·공유 버튼 |
| `src/components/molecules/ApplyTemplateModal.tsx` | 111 | 템플릿 적용 모달 |
| `src/components/molecules/HelpTooltip.tsx` | 37 | `{ content, label }` — 이미 구현됨 |
| `src/components/molecules/SessionBlock.tsx` | 414 | `selectedStudentId?: string` 현재 사용 |
| `src/app/schedule/_components/ScheduleGridSection.tsx` | ~80 | `selectedStudentId: string` prop 중계 |
| `src/components/organisms/TimeTableGrid.tsx` | — | `selectedStudentId?: string` → SessionBlock 전달 |
| `src/hooks/useStudentPanel.ts` | 135 | 기존 학생 패널 상태 훅 (삭제 예정) |
| `src/app/schedule/_utils/dndHelpers.ts` | — | `onDragStartStudent(e, student, enrollments, setIsStudentDragging, resetPanelDragState)` |

### 불변 계약 (변경 금지)
- `SessionBlock`의 `data-testid="session-block-{id}"`, `data-session-id`, `data-starts-at`, `data-ends-at`, `data-status` 속성.
- `TimeTableGrid`의 `data-testid="time-table-grid"`.
- `schedule_scroll_position` localStorage 키 (E2E 의존).

---

## File Structure

### 신규 파일
- `src/components/atoms/SegmentedButton.tsx` — 공통 세그먼트 버튼 원자
- `src/components/atoms/__tests__/SegmentedButton.test.tsx`
- `src/features/schedule/filters.ts` — `filterSessionsByStudents` 순수 함수
- `src/features/schedule/__tests__/filters.test.ts`
- `src/app/schedule/_hooks/useStudentFilter.ts` — 멀티셀렉트 상태 훅
- `src/app/schedule/_components/StudentFilterChipBar.tsx` — 학생 필터 칩 바
- `src/app/schedule/_components/__tests__/StudentFilterChipBar.test.tsx`

### 수정 파일
- `src/components/molecules/ColorByToggle.tsx` — SegmentedButton 기반 재작성
- `src/app/schedule/_components/ScheduleHeader.tsx` — View mode 토글 → SegmentedButton, 학생 패널 subtitle 제거
- `src/app/schedule/_components/__tests__/ScheduleHeader.test.tsx` — 스타일 단언 업데이트
- `src/components/molecules/SessionBlock.tsx` — `selectedStudentIds: string[]`, +N 뱃지
- `src/components/molecules/__tests__/SessionBlock.test.tsx` — prop 업데이트
- `src/app/schedule/_components/ScheduleGridSection.tsx` — prop 업데이트
- `src/app/schedule/_components/__tests__/ScheduleGridSection.test.tsx`
- `src/components/organisms/TimeTableGrid.tsx` — prop 업데이트
- `src/app/schedule/page.tsx` — chip bar 연결, StudentPanel 제거, selectedStudentIds 전환
- `src/app/schedule/_components/ScheduleActionBar.tsx` — HelpTooltip 추가
- `src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx`
- `src/components/molecules/ApplyTemplateModal.tsx` — 덮어쓰기 경고 + 세션 프리뷰
- `src/components/molecules/__tests__/ApplyTemplateModal.test.tsx`
- `ARCHITECTURE.md`, `TASKS.md`, `tree.txt`

### 삭제 파일
- `src/components/organisms/StudentPanel.tsx`
- `src/app/schedule/_components/StudentPanelSection.tsx`
- `src/app/schedule/_components/__tests__/StudentPanelSection.test.tsx`

---

## Task 1: C-1+C-2+C-3 — Filter chip bar + Segmented toggles

**PR:** `feat/phase5-c-filter-chip` ← `dev`

---

### Step 1: 브랜치 생성

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/phase5-c-filter-chip
```

---

### Step 2: SegmentedButton 실패 테스트 작성

Create `src/components/atoms/__tests__/SegmentedButton.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SegmentedButton from "../SegmentedButton";

const OPTIONS = [
  { label: "일별", value: "daily" },
  { label: "주간", value: "weekly" },
  { label: "월별", value: "monthly" },
] as const;

describe("SegmentedButton", () => {
  it("모든 옵션을 렌더한다", () => {
    render(<SegmentedButton options={OPTIONS} value="daily" onChange={vi.fn()} />);
    expect(screen.getByText("일별")).toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
    expect(screen.getByText("월별")).toBeInTheDocument();
  });

  it("활성 옵션에 bg-accent 클래스가 있다", () => {
    render(<SegmentedButton options={OPTIONS} value="weekly" onChange={vi.fn()} />);
    const weeklyBtn = screen.getByText("주간").closest("button")!;
    expect(weeklyBtn.className).toContain("bg-accent");
  });

  it("비활성 옵션에 bg-accent 클래스가 없다", () => {
    render(<SegmentedButton options={OPTIONS} value="weekly" onChange={vi.fn()} />);
    const dailyBtn = screen.getByText("일별").closest("button")!;
    expect(dailyBtn.className).not.toContain("bg-accent");
  });

  it("클릭 시 onChange(value) 호출", () => {
    const onChange = vi.fn();
    render(<SegmentedButton options={OPTIONS} value="daily" onChange={onChange} />);
    fireEvent.click(screen.getByText("주간"));
    expect(onChange).toHaveBeenCalledWith("weekly");
  });

  it("aria-label이 group role에 붙는다", () => {
    render(
      <SegmentedButton
        options={OPTIONS}
        value="daily"
        onChange={vi.fn()}
        aria-label="뷰 모드"
      />
    );
    expect(screen.getByRole("group", { name: "뷰 모드" })).toBeInTheDocument();
  });
});
```

```bash
npm run test -- SegmentedButton
```
Expected: FAIL (컴포넌트 미존재).

---

### Step 3: SegmentedButton 구현

Create `src/components/atoms/SegmentedButton.tsx`:

```tsx
interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedButtonProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
  className?: string;
}

export default function SegmentedButton<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className = "",
}: SegmentedButtonProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex rounded-md overflow-hidden border border-[var(--color-border)] ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-sm transition-colors ${
            value === opt.value
              ? "bg-accent text-white font-medium"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
```

```bash
npm run test -- SegmentedButton
```
Expected: PASS (5/5).

---

### Step 4: ColorByToggle → SegmentedButton 재작성

Read `src/components/molecules/ColorByToggle.tsx` (현재 40줄). 교체:

```tsx
"use client";
import SegmentedButton from "@/components/atoms/SegmentedButton";
import type { ColorByMode } from "@/hooks/useColorBy";

interface ColorByToggleProps {
  colorBy: ColorByMode;
  onChange: (mode: ColorByMode) => void;
}

const MODES = [
  { label: "과목", value: "subject" as ColorByMode },
  { label: "학생", value: "student" as ColorByMode },
  { label: "강사", value: "teacher" as ColorByMode },
] as const;

export default function ColorByToggle({ colorBy, onChange }: ColorByToggleProps) {
  return (
    <SegmentedButton
      options={MODES}
      value={colorBy}
      onChange={onChange}
      aria-label="색상 기준"
    />
  );
}
```

---

### Step 5: ScheduleHeader view mode 토글 → SegmentedButton

Read `src/app/schedule/_components/ScheduleHeader.tsx` (110줄). 인라인 버튼 3개(라인 45-76)를 SegmentedButton으로 교체:

```tsx
import SegmentedButton from "@/components/atoms/SegmentedButton";
import ColorByToggle from "@/components/molecules/ColorByToggle";
import { HelpTooltip } from "@/components/molecules/HelpTooltip";
import type { ColorByMode } from "@/hooks/useColorBy";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";

const VIEW_MODES = [
  { label: "일별", value: "daily" as ScheduleViewMode },
  { label: "주간", value: "weekly" as ScheduleViewMode },
  { label: "월별", value: "monthly" as ScheduleViewMode },
] as const;

type Props = {
  dataLoading: boolean;
  error?: string;
  colorBy?: ColorByMode;
  onColorByChange?: (mode: ColorByMode) => void;
  viewMode: ScheduleViewMode;
  onViewModeChange: (mode: ScheduleViewMode) => void;
};

export default function ScheduleHeader({
  dataLoading,
  error,
  colorBy = "subject",
  onColorByChange,
  viewMode,
  onViewModeChange,
}: Props) {
  const title =
    viewMode === "daily"
      ? "일별 시간표"
      : viewMode === "monthly"
        ? "월별 시간표"
        : "주간 시간표";

  return (
    <div className="mb-4 border-b border-[var(--color-border)] pb-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
        <div className="flex items-center gap-3">
          {dataLoading && (
            <div className="text-sm text-blue-500">
              {error ? "데이터 로드 중 오류가 발생했습니다." : "세션 데이터를 로드 중..."}
            </div>
          )}
          <SegmentedButton
            options={VIEW_MODES}
            value={viewMode}
            onChange={onViewModeChange}
            aria-label="뷰 모드"
          />
          {onColorByChange && (
            <div className="flex items-center gap-1">
              <ColorByToggle colorBy={colorBy} onChange={onColorByChange} />
              <HelpTooltip
                label="색상 기준 도움말"
                content="과목별로 색을 구분하거나, 학생·강사 기준으로 전환할 수 있습니다."
              />
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-500">
          ⚠️ {error}
          <br />
          <small className="text-gray-600">로컬 데이터로 계속 작업할 수 있습니다.</small>
        </div>
      )}
    </div>
  );
}
```

**주의:** `selectedStudentName` prop은 제거 (StudentPanel 제거로 불필요). 관련 subtitle 텍스트 블록도 제거.

---

### Step 6: ScheduleHeader 테스트 업데이트

`src/app/schedule/_components/__tests__/ScheduleHeader.test.tsx` 수정:

1. `selectedStudentName` 관련 테스트 2개 삭제:
   - `"selectedStudentName이 있으면 해당 학생 메시지를 표시한다"` → 삭제
   - `"selectedStudentName이 없으면 전체 시간표 메시지를 표시한다"` → 삭제

2. `"viewMode='monthly'일 때 월별 버튼이 활성 스타일을 가진다"` 단언 업데이트:
   ```ts
   // 기존: expect(monthlyBtn).toHaveClass("bg-accent");
   // SegmentedButton은 동일 클래스 — 단언 그대로 유지
   ```

3. **신규 테스트 추가** — SegmentedButton이 role="group"으로 렌더:
   ```ts
   it("뷰 모드 group 역할을 가진다", () => {
     render(<ScheduleHeader dataLoading={false} viewMode="weekly" onViewModeChange={vi.fn()} />);
     expect(screen.getByRole("group", { name: "뷰 모드" })).toBeInTheDocument();
   });
   ```

```bash
npm run test -- ScheduleHeader SegmentedButton ColorByToggle
```
Expected: PASS.

---

### Step 7: filterSessionsByStudents 실패 테스트 작성

Create `src/features/schedule/__tests__/filters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterSessionsByStudents } from "../filters";
import type { Session } from "@/lib/planner";

const makeEnrollment = (id: string, studentId: string, subjectId = "s1") => ({
  id,
  studentId,
  subjectId,
});

const makeSession = (id: string, enrollmentIds: string[]): Session =>
  ({
    id,
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    enrollmentIds,
    subjectId: "s1",
    teacherId: null,
    yPosition: 0,
    room: null,
    createdAt: "",
    updatedAt: "",
  } as Session);

const enrollments = [
  makeEnrollment("e1", "stu1"),
  makeEnrollment("e2", "stu2"),
  makeEnrollment("e3", "stu3"),
];

const sessions = [
  makeSession("sess1", ["e1"]),        // stu1 only
  makeSession("sess2", ["e2"]),        // stu2 only
  makeSession("sess3", ["e1", "e2"]), // stu1 + stu2 (group)
  makeSession("sess4", ["e3"]),        // stu3 only
];

describe("filterSessionsByStudents", () => {
  it("빈 selectedStudentIds면 전체 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, [], enrollments);
    expect(result).toHaveLength(4);
  });

  it("stu1 선택 시 stu1 포함 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, ["stu1"], enrollments);
    expect(result.map((s) => s.id).sort()).toEqual(["sess1", "sess3"]);
  });

  it("stu1+stu2 선택 시 교집합(OR) 세션 반환", () => {
    const result = filterSessionsByStudents(sessions, ["stu1", "stu2"], enrollments);
    expect(result.map((s) => s.id).sort()).toEqual(["sess1", "sess2", "sess3"]);
  });

  it("일치 없는 studentId면 빈 배열 반환", () => {
    const result = filterSessionsByStudents(sessions, ["unknown"], enrollments);
    expect(result).toHaveLength(0);
  });

  it("그룹 세션에서 1명만 선택해도 세션 전체 표시", () => {
    const result = filterSessionsByStudents(sessions, ["stu2"], enrollments);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("sess3");  // stu1+stu2 group session
  });
});
```

```bash
npm run test -- filters
```
Expected: FAIL.

---

### Step 8: filterSessionsByStudents 구현

Create `src/features/schedule/filters.ts`:

```ts
import type { Enrollment, Session } from "@/lib/planner";

export function filterSessionsByStudents(
  sessions: Session[],
  selectedStudentIds: string[],
  enrollments: Enrollment[]
): Session[] {
  if (selectedStudentIds.length === 0) return sessions;

  const selectedSet = new Set(selectedStudentIds);

  return sessions.filter((session) =>
    (session.enrollmentIds ?? []).some((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      return enrollment != null && selectedSet.has(enrollment.studentId);
    })
  );
}
```

```bash
npm run test -- filters
```
Expected: PASS (5/5).

---

### Step 9: SessionBlock → selectedStudentIds 멀티셀렉트 + +N 뱃지

Read `src/components/molecules/SessionBlock.tsx`.

**Props 변경 (라인 15-36):**
```tsx
// 기존
selectedStudentId?: string;

// 변경
selectedStudentIds?: string[];
```

**isFiltered 계산 (라인 230-235) 변경:**
```tsx
// 기존
const isFiltered =
  selectedStudentId != null &&
  !(session.enrollmentIds ?? []).some((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    return enrollment?.studentId === selectedStudentId;
  });

// 변경
const isFiltered =
  selectedStudentIds != null &&
  selectedStudentIds.length > 0 &&
  !(session.enrollmentIds ?? []).some((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    return enrollment != null && selectedStudentIds.includes(enrollment.studentId);
  });
```

**+N 뱃지 계산 (라인 308 근처 statusBadge 이후 추가):**
```tsx
// 그룹 세션에서 선택되지 않은 학생 수 계산
const extraStudentCount = (() => {
  if (colorBy !== "student" || !selectedStudentIds || selectedStudentIds.length === 0) return 0;
  const allStudentIds = (session.enrollmentIds ?? []).flatMap((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    return enrollment ? [enrollment.studentId] : [];
  });
  const selectedInSession = allStudentIds.filter((id) =>
    selectedStudentIds.includes(id)
  );
  return allStudentIds.length - selectedInSession.length;
})();
```

**wrapper div에 +N 뱃지 삽입 (contextMenu 바로 위):**
```tsx
{extraStudentCount > 0 && (
  <span
    className="absolute top-0.5 right-0.5 text-[9px] font-bold text-white/80 bg-black/25 rounded-full px-1 leading-4 pointer-events-none"
    aria-label={`외 ${extraStudentCount}명`}
  >
    +{extraStudentCount}
  </span>
)}
```

**getGroupStudentNames 호출 업데이트 (라인 90-95):**
```tsx
// 기존
const studentNames = getGroupStudentNames(
  session,
  enrollments || [],
  students || [],
  selectedStudentId
);

// 변경: 첫 번째 선택 학생만 하이라이트
const studentNames = getGroupStudentNames(
  session,
  enrollments || [],
  students || [],
  selectedStudentIds?.[0]
);
```

---

### Step 10: SessionBlock 테스트 업데이트

Read `src/components/molecules/__tests__/SessionBlock.test.tsx`. `selectedStudentId` → `selectedStudentIds`로 변경:

```ts
// 기존 패턴
selectedStudentId="stu-1"

// 변경 패턴
selectedStudentIds={["stu-1"]}
```

빈 셀렉트 (=전체 표시):
```ts
// 기존
selectedStudentId={undefined}

// 변경
selectedStudentIds={[]}
// 또는 selectedStudentIds={undefined}
```

```bash
npm run test -- SessionBlock
```
Expected: PASS.

---

### Step 11: TimeTableGrid + ScheduleGridSection prop 업데이트

**`src/components/organisms/TimeTableGrid.tsx` (라인 41):**
```ts
// 기존
selectedStudentId?: string;

// 변경
selectedStudentIds?: string[];
```

라인 475: `selectedStudentId={selectedStudentId}` → `selectedStudentIds={selectedStudentIds}`.

**`src/app/schedule/_components/ScheduleGridSection.tsx` (라인 38):**
```ts
// 기존
selectedStudentId: string;

// 변경
selectedStudentIds?: string[];
```

라인 74: `selectedStudentId={selectedStudentId}` → `selectedStudentIds={selectedStudentIds}`.

`__tests__/ScheduleGridSection.test.tsx` 픽스처 업데이트:
```ts
// 기존 mock prop: selectedStudentId: "stu-1"
// 변경: selectedStudentIds={["stu-1"]}
```

```bash
npm run test -- TimeTableGrid ScheduleGridSection SessionBlock
```
Expected: PASS.

---

### Step 12: useStudentFilter 훅 작성

Create `src/app/schedule/_hooks/useStudentFilter.ts`:

```ts
import { useState } from "react";
import { useLocal } from "@/hooks/useLocal";

export function useStudentFilter(students: { id: string; name: string }[]) {
  const [selectedStudentIds, setSelectedStudentIds] = useLocal<string[]>(
    "ui:selectedStudentIds",
    []
  );
  const [searchQuery, setSearchQuery] = useState("");

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearFilter = () => setSelectedStudentIds([]);

  const filteredStudents = students.filter((s) =>
    searchQuery.trim()
      ? s.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return {
    selectedStudentIds,
    toggleStudent,
    clearFilter,
    searchQuery,
    setSearchQuery,
    filteredStudents,
  };
}
```

---

### Step 13: StudentFilterChipBar 실패 테스트 작성

Create `src/app/schedule/_components/__tests__/StudentFilterChipBar.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudentFilterChipBar from "../StudentFilterChipBar";

const STUDENTS = [
  { id: "stu1", name: "김민준" },
  { id: "stu2", name: "이서연" },
  { id: "stu3", name: "박지호" },
];

const defaultProps = {
  students: STUDENTS,
  selectedStudentIds: [] as string[],
  onToggleStudent: vi.fn(),
  onClearFilter: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
};

describe("StudentFilterChipBar", () => {
  it("학생 칩을 모두 렌더한다", () => {
    render(<StudentFilterChipBar {...defaultProps} />);
    expect(screen.getByText("김민준")).toBeInTheDocument();
    expect(screen.getByText("이서연")).toBeInTheDocument();
    expect(screen.getByText("박지호")).toBeInTheDocument();
  });

  it("칩 클릭 시 onToggleStudent(id) 호출", () => {
    const onToggle = vi.fn();
    render(<StudentFilterChipBar {...defaultProps} onToggleStudent={onToggle} />);
    fireEvent.click(screen.getByText("김민준"));
    expect(onToggle).toHaveBeenCalledWith("stu1");
  });

  it("선택된 학생 칩에 활성 스타일", () => {
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} />);
    const chip = screen.getByText("김민준").closest("button")!;
    expect(chip.className).toContain("bg-accent");
  });

  it("필터 활성화 시 '전체 해제' 버튼 표시", () => {
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} />);
    expect(screen.getByText("전체 해제")).toBeInTheDocument();
  });

  it("'전체 해제' 클릭 시 onClearFilter 호출", () => {
    const onClear = vi.fn();
    render(<StudentFilterChipBar {...defaultProps} selectedStudentIds={["stu1"]} onClearFilter={onClear} />);
    fireEvent.click(screen.getByText("전체 해제"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("검색 버튼 클릭 시 검색 입력 노출", () => {
    render(<StudentFilterChipBar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("학생 검색"));
    expect(screen.getByPlaceholderText("학생 이름 검색...")).toBeInTheDocument();
  });
});
```

```bash
npm run test -- StudentFilterChipBar
```
Expected: FAIL.

---

### Step 14: StudentFilterChipBar 구현

Create `src/app/schedule/_components/StudentFilterChipBar.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import type { Student } from "@/lib/planner";

interface StudentFilterChipBarProps {
  students: { id: string; name: string }[];
  selectedStudentIds: string[];
  onToggleStudent: (id: string) => void;
  onClearFilter: () => void;
  onDragStart: (e: React.DragEvent, student: { id: string; name: string }) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export default function StudentFilterChipBar({
  students,
  selectedStudentIds,
  onToggleStudent,
  onClearFilter,
  onDragStart,
  onDragEnd,
}: StudentFilterChipBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleStudents = students.filter((s) =>
    searchQuery.trim()
      ? s.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const hasFilter = selectedStudentIds.length > 0;

  return (
    <div
      data-testid="student-filter-chip-bar"
      className="flex items-center gap-2 flex-wrap py-2 border-b border-[var(--color-border)] mb-3"
    >
      {/* 검색 토글 버튼 */}
      <button
        type="button"
        aria-label="학생 검색"
        onClick={() => setSearchOpen((v) => !v)}
        className="flex items-center justify-center w-7 h-7 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors text-sm"
      >
        🔍
      </button>

      {/* 검색 입력 */}
      {searchOpen && (
        <input
          type="text"
          placeholder="학생 이름 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] w-36"
        />
      )}

      {/* 학생 칩 */}
      {visibleStudents.map((student) => {
        const isSelected = selectedStudentIds.includes(student.id);
        return (
          <button
            key={student.id}
            type="button"
            draggable
            onDragStart={(e) => onDragStart(e, student)}
            onDragEnd={onDragEnd}
            onClick={() => onToggleStudent(student.id)}
            aria-pressed={isSelected}
            className={`px-2.5 py-1 rounded-full text-sm transition-colors cursor-grab active:cursor-grabbing ${
              isSelected
                ? "bg-accent text-white font-medium shadow-sm"
                : "border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            }`}
          >
            {student.name}
          </button>
        );
      })}

      {/* 전체 해제 */}
      {hasFilter && (
        <button
          type="button"
          onClick={onClearFilter}
          className="ml-auto px-2.5 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          전체 해제
        </button>
      )}
    </div>
  );
}
```

```bash
npm run test -- StudentFilterChipBar
```
Expected: PASS (6/6).

---

### Step 15: page.tsx 전면 업데이트

Read `src/app/schedule/page.tsx`. 다음 4가지 변경:

**A. Import 업데이트:**
```ts
// 추가
import StudentFilterChipBar from "./_components/StudentFilterChipBar";
import { useStudentFilter } from "./_hooks/useStudentFilter";
import { filterSessionsByStudents } from "@/features/schedule/filters";

// 삭제
import StudentPanelSection from "./_components/StudentPanelSection";
import { useStudentPanel } from "../../hooks/useStudentPanel";
```

**B. 상태 훅 교체 (라인 193-196 근처):**
```ts
// 기존 삭제
const [selectedStudentId, setSelectedStudentId] = useLocal<string>("ui:selectedStudent", "");
// ...
const { panelState: studentPanelState } = useStudentPanel(students);

// 신규 추가
const {
  selectedStudentIds,
  toggleStudent: toggleStudentFilter,
  clearFilter: clearStudentFilter,
  filteredStudents: filterChipStudents,
  searchQuery: filterSearchQuery,
  setSearchQuery: setFilterSearchQuery,
} = useStudentFilter(students);
```

**C. handleDragStart/handleDragEnd 업데이트 (라인 1046-1057):**
```ts
// 기존 (studentPanelState.resetDragState 의존)
const handleDragStart = (e: React.DragEvent, student: Student) =>
  onDragStartStudent(e, student, enrollments, setIsStudentDragging, studentPanelState.resetDragState);

const handleDragEnd = (e: React.DragEvent) =>
  onDragEndStudent(e, setIsStudentDragging, studentPanelState.resetDragState);

// 변경 (floating panel 없으므로 no-op)
const handleDragStart = (e: React.DragEvent, student: Student) =>
  onDragStartStudent(e, student, enrollments, setIsStudentDragging, () => {});

const handleDragEnd = (e: React.DragEvent) =>
  onDragEndStudent(e, setIsStudentDragging, () => {});
```

**D. 렌더 업데이트 (ScheduleHeader 이후, 그리드 섹션 이전):**

1. ScheduleHeader에서 `selectedStudentName` prop 제거:
```tsx
<ScheduleHeader
  dataLoading={dataLoading}
  error={error ?? undefined}
  colorBy={colorBy}
  onColorByChange={setColorBy}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
/>
```

2. StudentFilterChipBar 조건부 렌더 추가 (ScheduleHeader 바로 뒤):
```tsx
{colorBy === "student" && (
  <StudentFilterChipBar
    students={students}
    selectedStudentIds={selectedStudentIds}
    onToggleStudent={toggleStudentFilter}
    onClearFilter={clearStudentFilter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  />
)}
```

3. ScheduleGridSection에 selectedStudentIds 전달 (selectedStudentId 제거):
```tsx
<ScheduleGridSection
  ...
  selectedStudentIds={selectedStudentIds}
  ...
/>
```

4. PDF filterStudentId 업데이트 (라인 1108):
```ts
filterStudentId: selectedStudentIds[0] ?? undefined,
```

5. `<StudentPanelSection .../>` 블록 삭제.

6. `selectedStudentId` 관련 useEffect 2개 (라인 475-518) 삭제.

---

### Step 16: StudentPanel + StudentPanelSection 삭제

```bash
rm src/components/organisms/StudentPanel.tsx
rm src/app/schedule/_components/StudentPanelSection.tsx
rm src/app/schedule/_components/__tests__/StudentPanelSection.test.tsx
```

`useStudentPanel`이 page.tsx에서만 사용됐는지 확인:
```bash
grep -r "useStudentPanel" src/ --include="*.ts" --include="*.tsx"
```
결과가 0건이어야 함. 확인 후:
```bash
# useStudentPanel이 다른 곳에서 쓰이지 않으면 삭제
rm src/hooks/useStudentPanel.ts
```

---

### Step 17: 전체 테스트 실행

```bash
npm run check:quick
```
Expected: 전체 PASS. 실패하면 오류 메시지에 따라 수정.

---

### Step 18: Playwright MCP 검증

```bash
npm run dev
```

Playwright MCP로:
1. `http://localhost:3000/schedule` 방문 → StudentPanel 없어야 함
2. ColorBy 토글 클릭 → "학생" 선택 → StudentFilterChipBar 노출 확인
3. 학생 칩 클릭 → 해당 학생 세션만 하이라이트 (나머지 opacity-30)
4. 그룹 세션에서 1명만 선택 시 `+N` 뱃지 노출 확인
5. 전체 해제 버튼 → 필터 해제
6. "과목" 또는 "주간" 선택 시 Day/Week/Month 토글과 ColorBy 토글이 **동일한 bg-accent 스타일**

스크린샷 3장: 필터 없는 상태, 1명 선택, 그룹 세션 +N 뱃지.

---

### Step 19: 문서 동기화 + 커밋 + PR

- `tree.txt`: 신규/삭제 파일 반영
- `ARCHITECTURE.md`: Atoms에 SegmentedButton, Molecules에 StudentFilterChipBar, `src/features/schedule/` 추가. Organisms에서 StudentPanel 제거.
- `TASKS.md`: Phase 5-C C-1, C-2, C-3 체크

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(phase5-c): SegmentedButton + StudentFilterChipBar + multi-select filter

C-2: SegmentedButton atom unifies view-mode + colorBy toggles (both Amber active)
C-1: Replace floating StudentPanel/StudentPanelSection with StudentFilterChipBar
     - Only visible when colorBy === 'student'
     - Draggable chips preserve student-to-grid DnD workflow
C-3: Multi-select filter (selectedStudentIds[]) via filterSessionsByStudents
     - Group session OR logic: session visible if any selected student enrolled
     - +N badge on SessionBlock for unselected co-enrolled students
     - useStudentFilter hook (localStorage: ui:selectedStudentIds)

Removes: StudentPanel.tsx, StudentPanelSection.tsx, useStudentPanel.ts

Issue #7 #8 #9 — Part of Phase 5-C.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push -u origin feat/phase5-c-filter-chip
gh pr create --base dev \
  --title "feat(phase5-c): SegmentedButton + StudentFilterChipBar + multi-select filter" \
  --body "$(cat <<'EOF'
## Summary
- **C-2:** Extract `SegmentedButton` atom — Day/Week/Month and ColorBy toggles now share identical Amber-fill active style
- **C-1:** Remove `StudentPanel`/`StudentPanelSection` → replace with `StudentFilterChipBar` (only shown when colorBy='student', chips are draggable to preserve DnD)
- **C-3:** Multi-select student filter via `selectedStudentIds: string[]`. OR logic for group sessions. `+N` badge on blocks with co-enrolled unselected students. Pure function `filterSessionsByStudents` in `src/features/schedule/filters.ts`

## Test Plan
- [ ] All unit tests pass (`npm run check:quick`)
- [ ] `/schedule` — StudentPanel gone, only ScheduleActionBar + ScheduleHeader visible
- [ ] ColorBy → student → FilterChipBar appears
- [ ] Click chip → sessions filtered, others dim
- [ ] Group session with partial filter → `+N` badge visible
- [ ] Drag chip to grid → session creation modal opens
EOF
)"
```

---

## Task 2: C-4 — Template Affordance

**PR:** `feat/phase5-c-template-ux` ← `dev`

---

### Step 1: 브랜치 생성

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-c-template-ux
```

---

### Step 2: ScheduleActionBar HelpTooltip 실패 테스트 추가

`src/app/schedule/_components/__tests__/ScheduleActionBar.test.tsx`에 추가:

```ts
it("userId가 있을 때 템플릿 저장 옆에 도움말 버튼이 있다", () => {
  render(<ScheduleActionBar {...baseProps} userId="user-1" />);
  // HelpTooltip은 aria-label="도움말" button을 렌더
  const helpBtns = screen.getAllByRole("button", { name: /도움말/ });
  // 저장 도움말 + 적용 도움말 = 2개
  expect(helpBtns.length).toBeGreaterThanOrEqual(1);
});
```

HelpTooltip mock 필요 (테스트 파일 상단):
```ts
vi.mock("../../../../components/molecules/HelpTooltip", () => ({
  HelpTooltip: ({ label }: { label: string; content: string }) => (
    <button aria-label={label}>도움말</button>
  ),
}));
```

```bash
npm run test -- ScheduleActionBar
```
Expected: FAIL (HelpTooltip 미추가).

---

### Step 3: ScheduleActionBar에 HelpTooltip 추가

Read `src/app/schedule/_components/ScheduleActionBar.tsx` (64줄). 템플릿 저장/적용 버튼 옆에 HelpTooltip 주입:

```tsx
"use client";

import React from "react";
import Link from "next/link";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import { HelpTooltip } from "../../../components/molecules/HelpTooltip";

interface Props {
  viewLabel: string;
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  userId: string | null;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  isSaving: boolean;
}

export default function ScheduleActionBar({
  viewLabel,
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  onSaveTemplate,
  onApplyTemplate,
  isSaving,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={isDownloading}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
        viewLabel={viewLabel}
      />
      {userId && (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={onSaveTemplate}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
            >
              현재 주를 템플릿으로 저장
            </button>
            <HelpTooltip
              label="템플릿 저장 도움말"
              content="이번 주의 수업 배치를 템플릿으로 저장합니다. 나중에 같은 배치를 다른 주에 빠르게 적용할 수 있습니다."
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onApplyTemplate}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              저장된 템플릿 적용하기
            </button>
            <HelpTooltip
              label="템플릿 적용 도움말"
              content="반복되는 시간표를 저장해두고 다른 주에 동일한 배치를 한 번에 적용합니다. 예: 매주 같은 요일에 같은 학생이 같은 수업을 듣는 경우."
            />
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            공유 링크
          </Link>
        </>
      )}
    </div>
  );
}
```

```bash
npm run test -- ScheduleActionBar
```
Expected: PASS.

---

### Step 4: ApplyTemplateModal 덮어쓰기 경고 + 세션 프리뷰 실패 테스트 추가

`src/components/molecules/__tests__/ApplyTemplateModal.test.tsx`에 추가:

```ts
it("템플릿 선택 시 세션 수와 덮어쓰기 경고가 표시된다", () => {
  render(<ApplyTemplateModal {...defaultProps} />);
  fireEvent.click(screen.getByText("기본 시간표"));
  expect(screen.getByText(/1개 세션/)).toBeInTheDocument();
  expect(screen.getByText(/현재 주의 기존 세션이 모두 삭제/)).toBeInTheDocument();
});
```

```bash
npm run test -- ApplyTemplateModal
```
Expected: FAIL.

---

### Step 5: ApplyTemplateModal 덮어쓰기 경고 + 세션 프리뷰 구현

Read `src/components/molecules/ApplyTemplateModal.tsx` (111줄). 템플릿 선택 후 하단에 프리뷰 블록 추가:

```tsx
// 기존 템플릿 목록 아래 (flex-1 overflow-y-auto 블록 안 또는 직후)

{/* 선택된 템플릿 프리뷰 */}
{selected && (
  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
    <p className="font-medium text-amber-800 mb-1">
      {selected.templateData.sessions.length}개 세션을 적용합니다
    </p>
    <p className="text-amber-700">
      현재 주의 기존 세션이 모두 삭제되고 이 템플릿으로 교체됩니다.
    </p>
  </div>
)}
```

`isApplying` 버튼 텍스트 옆에 카운트 표시 (선택사항 - 스펙 내):

Apply 버튼 직전에 위 블록을 `{selected && ...}` 조건으로 삽입. 기존 `<div className="flex gap-3">` 바로 위:

```tsx
{selected && (
  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
    <p className="font-medium text-amber-800 mb-1">
      {selected.templateData.sessions.length}개 세션을 적용합니다
    </p>
    <p className="text-amber-700">
      현재 주의 기존 세션이 모두 삭제되고 이 템플릿으로 교체됩니다.
    </p>
  </div>
)}
<div className="flex gap-3">
  ...기존 취소/적용 버튼...
</div>
```

```bash
npm run test -- ApplyTemplateModal
```
Expected: PASS (전체 테스트 포함).

---

### Step 6: 전체 테스트 실행

```bash
npm run check:quick
```
Expected: PASS.

---

### Step 7: Playwright MCP 검증

```bash
npm run dev
```

Playwright MCP로:
1. `/schedule` → ScheduleActionBar의 "현재 주를 템플릿으로 저장" 옆 `i` 버튼 클릭 → 툴팁 표시
2. "저장된 템플릿 적용하기" 클릭 → ApplyTemplateModal 열림 → 템플릿 선택 → 경고 박스 + 세션 수 표시 확인
3. 둘 다 스크린샷.

---

### Step 8: 문서 동기화 + 커밋 + PR

- `TASKS.md`: Phase 5-C C-4 체크

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(phase5-c): template affordance — HelpTooltip + overwrite warning

C-4: ScheduleActionBar에 HelpTooltip 2개 추가 (저장/적용 각 옆)
     ApplyTemplateModal에 선택 템플릿 세션 수 + 덮어쓰기 경고 박스 추가

Issue #11 — 템플릿 저장/적용 용도 불명확 개선.
Part of Phase 5-C.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push -u origin feat/phase5-c-template-ux
gh pr create --base dev \
  --title "feat(phase5-c): template affordance improvements" \
  --body "$(cat <<'EOF'
## Summary
- Add `HelpTooltip` next to "템플릿 저장" and "템플릿 적용" buttons in ScheduleActionBar
- Show session count + overwrite warning block in ApplyTemplateModal when template is selected

## Test Plan
- [ ] `npm run check:quick` passes
- [ ] ScheduleActionBar — tooltip buttons visible, click shows popover
- [ ] ApplyTemplateModal — selecting template shows amber warning box with session count
EOF
)"
```

---

## 페이즈 공통 규칙

### 브랜치 순서
- Task 1 (`feat/phase5-c-filter-chip`) → dev 머지 → CI 확인
- Task 2 (`feat/phase5-c-template-ux`) → dev 머지 → CI 확인
- `dev → main` 머지는 사용자 명시 요청 시에만

### UI 검증 (Non-negotiable)
- **1차 — Playwright MCP**: Task 1(학생 필터, 토글), Task 2(툴팁, 모달)
- **2차 — computer-use**: Task 1 완료 후 시각 탐험 — 드래그·hover·칩 애니메이션

### 테스트
- `npm run test` 기존 100% 통과 유지
- `npm run test:e2e` Task 1 완료 후 실행 (scroll-position, schedule golden path)

---

## ⚠️ Known Risks & Alternatives

**Weaknesses:**
1. **page.tsx 대규모 수정** — 1382줄 파일에서 4개 영역 동시 수정. 실패 시 git diff로 롤백 가능.
2. **DnD 보존** — StudentPanel 제거 후 학생→그리드 DnD가 StudentFilterChipBar 칩에서 동작해야 함. `onDragStartStudent`의 `resetPanelDragState` no-op 처리가 부작용 없는지 확인 필요.
3. **selectedStudentId 제거 사이드이펙트** — E2E 테스트가 `ui:selectedStudent` localStorage key에 직접 의존하면 깨질 수 있음. `npm run test:e2e` 실행으로 확인.
4. **기존 `ui:selectedStudent` localStorage 데이터** — 기존 사용자 브라우저에 남아있는 단일 선택 키는 무시됨 (새 키 `ui:selectedStudentIds` 사용). 자동 마이그레이션 불필요 (UX 영향 최소).

**Rejected alternatives:**
- StudentPanel을 유지하면서 필터만 덧씌우기 → 두 필터 체계 공존, 모바일 공간 고갈
- 필터를 ScheduleHeader 내부에 직접 내장 → ScheduleHeader가 비대해짐, 독립 테스트 불가
- C-1/C-2/C-3를 각각 다른 PR → 의존성이 얽혀 3번 브랜치 관리 vs 1번 PR 리뷰가 효율적

**Uncertainties:**
- 그룹 수업 `+N` 뱃지의 시각 계층이 SubjectChip 위에 올바르게 렌더되는지 — Task 1 Playwright MCP에서 확인.
- `filterSessionsByStudents`가 `displaySessions` (Map 형태)에 적용되어야 하는지, `sessions` (Array 형태)에 적용되어야 하는지 — page.tsx의 렌더 분기를 읽어 확인 필요. `displaySessions`는 `Map<number, Session[]>`이므로 Array.from으로 풀거나, 내부 각 배열에 `filter`를 적용해야 함.

---

## Verification (Phase 5-C 전체 완료 후)

1. `/schedule` → StudentPanel 없음, ScheduleActionBar + ScheduleHeader만 상단 표시.
2. ColorBy 토글(과목/학생/강사)이 Day/Week/Month 토글과 동일한 Amber fill 스타일.
3. ColorBy → "학생" → StudentFilterChipBar 노출. 칩 클릭 → 필터 동작.
4. 그룹 수업 세션에 일부 학생 선택 → `+N` 뱃지.
5. StudentFilterChipBar 칩 드래그 → 빈 셀 드롭 → 수업 추가 모달.
6. "현재 주를 템플릿으로 저장" 옆 `i` → 툴팁.
7. "저장된 템플릿 적용하기" → 모달 → 템플릿 선택 → 경고 박스 + 세션 수.
8. `npm run test` 1484+α 모두 통과.
9. `npm run test:e2e` 통과 (scroll-position 포함).
10. `npm run build` 성공.
