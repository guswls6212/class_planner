# class-planner Phase 5-B — Design System Consistency (Full Grid Rewrite)

> **For agentic workers:** `superpowers:subagent-driven-development`로 task-by-task 실행. 각 Task 완료 후 스펙 준수 리뷰 → 코드 품질 리뷰 → 다음 Task. Step은 체크박스(`- [ ]`).

**Goal:** Landing / Weekly / Daily / Monthly 4개 뷰의 디자인 시스템을 Dual-Mode(Admin Amber × Surface Q Pastel)로 통일하고, 레거시 TimeTableGrid/SessionBlock 내부를 새 primitive 기반으로 전면 교체한다.

**Architecture:**
- `SubjectChip` primitive를 Phase 5-B의 **디자인 SSOT**로 확립. Daily/Monthly/Weekly/Landing 4개 뷰가 모두 이 primitive를 소비.
- `SchedulePreview` 경량 primitive 신설 (랜딩 + 향후 HelpDrawer 공유용).
- **TimeTableGrid 공개 API는 불변 계약**(props 20개, `data-testid="time-table-grid"`, `data-testid^="session-block-"`) — 4개 외부 소비자(`ScheduleGridSection`, `share/[token]`, `teacher-schedule`, 기타) 보호. 내부 구현만 전면 교체.
- SessionBlock(446라인) + utils(249) + TimeTableRow(298) + DropZone(219)를 **얇은 SubjectChip wrapper + 새 TimeTableCell**로 재작성. useSessionStatus(진행중 배지)와 `hasConflict`(경고) 기능은 보존.
- `:root` 레거시 토큰 정리 (미사용 5개 삭제, 미정의 `-dark` 3개 복원).

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS v4 (`@theme` SSOT), Vitest + RTL, Playwright MCP/E2E.

---

## Context

P5-D(버그픽스), P5-A(계정·액션바·도움말) dev 머지 완료. 남은 피드백 4건(이슈 2, 3, 4, 6)은 "디자인 따로 노는 느낌" — Dual-Mode가 주간 그리드 래퍼 한 곳에만 부착되어 있고, 랜딩·Daily·Monthly는 Admin 다크 톤과 독자적 색상 경로를 섞어 쓰는 상태.

**사용자 지시(2026-04-17):** "TimeTableGrid는 옛날 레거시 디자인과 기능. 싹 다 갈아엎어도 됨. 레거시 그대로 유지할 필요 없음." → 우회/브리지 대신 원본 교체 전략 채택.

### 탐색으로 확인된 현재 상태

| 항목 | 현재 | 문제 |
|------|------|------|
| 랜딩 `ScheduleMockup` | `src/app/page.tsx:84-218` 하드코딩, `--color-subject-*` 팔레트 | 실제 그리드와 시각 괴리 (이슈 3) |
| `TimeTableGrid` | 래퍼(`ScheduleGridSection.tsx:62`)에만 `data-surface` 부착, 내부는 Admin 다크 | Weekly만 부분 적용 |
| `SessionBlock` | 446라인, `subject.color` hex 인라인 style, `resolveSessionColor` util 별도 | SubjectChip과 중복 |
| `ScheduleDailyView` | 라인 87 최상위 `<div>` — data-surface 없음 | 다크 톤 계승 (이슈 4) |
| `ScheduleMonthlyView` + `MonthDayCell` | 라인 64 — data-surface 없음, 독자 칩 구현 | 다크 톤 계승 (이슈 4) |
| `getSessionSubject` | 3개 뷰에 중복 구현 (`SessionBlock.utils.ts:66`, `ScheduleDailyView:68`, `MonthDayCell:30`) | DRY 위반 |
| `globals.css :root` | 50개 변수 중 5개 미사용, 3개 미정의 참조 | 레거시 노이즈 |

### 불변 계약 (재작성 시 반드시 보존)

**TimeTableGrid public API (20개 props):**
- 데이터: `sessions: Map<number,Session[]>`, `subjects`, `enrollments`, `students`, `teachers`
- 핸들러: `onSessionClick`, `onDrop(weekday,time,enrollmentId)`, `onSessionDrop(sessionId,weekday,time,yPosition)`, `onEmptySpaceClick(weekday,time)`, `onSessionDelete?`
- 상태: `selectedStudentId?`, `isAnyDragging?`, `isStudentDragging?`, `colorBy?: "subject"|"student"|"teacher"`, `isReadOnly?`
- ref/className/style 등 HTML props passthrough

**DOM 계약:**
- `data-testid="time-table-grid"` (최상위 컨테이너)
- `data-testid="session-block-{id}"` (각 세션 요소)
- `data-session-id`, `data-starts-at`, `data-ends-at`, `data-status` (E2E 셀렉터)
- `.virtual-scrollbar-container`, `.virtual-scrollbar-thumb` (가상 스크롤바 CSS 훅)

**기능 계약:**
- 드래그앤드롭 양방향 (학생→셀, 세션→다른 셀)
- 빈 공간 클릭 → 수업 추가
- 스크롤 위치 localStorage 복원 (`schedule_scroll_position`, 5분 TTL, E2E 20+ 케이스 의존)
- `isReadOnly` 모드에서 모든 mutation 차단
- 모바일 터치 디바이스 감지 → DnD 비활성
- `colorBy`별 색상 분기
- 롱프레스 300ms → 컨텍스트 메뉴(편집/삭제)
- 상태 배지: `useSessionStatus` (진행중 glow), `hasConflict` 빨간 테두리

### 해결 전략 (4개 Task, 5개 PR)

```
B-1 (PR-B1): Primitives foundation     — SchedulePreview + SubjectChip + 랜딩 적용
B-2 (PR-B2): Daily/Monthly 전환         — data-surface + SubjectChip 소비
B-3a (PR-B3a): SessionBlock 재작성      — SubjectChip 기반, 공개 data-testid 유지
B-3b (PR-B3b): Weekly grid 레이아웃 정돈 — TimeTableRow/DropZone/TimeTableGrid 내부 리팩터
B-4 (PR-B4): 토큰 정리                  — :root 레거시 감사
```

**실행 순서 근거:**
- B-1이 먼저 — SubjectChip이 디자인 SSOT. 이후 Task가 이를 소비.
- B-2는 B-1과 **병렬 가능** (독립 뷰). 단 머지 순서는 B-1 → B-2.
- B-3a는 B-1 머지 후. SessionBlock 내부만 건드리므로 TimeTableGrid 공개 API 불변.
- B-3b는 B-3a 머지 후. TimeTableRow/DropZone 통합 정돈.
- B-4는 최후 — 스크린샷 diff로 회귀 확인 후 토큰 정리.

---

## File Structure

### 신규 파일
- `src/components/common/SubjectChip.tsx` — 과목 칩 primitive (fill/border-left/soft variants)
- `src/components/common/SubjectChip.types.ts`
- `src/components/common/__tests__/SubjectChip.test.tsx`
- `src/components/common/SchedulePreview.tsx` — 경량 시간표 미리보기 primitive
- `src/components/common/SchedulePreview.types.ts`
- `src/components/common/__tests__/SchedulePreview.test.tsx`
- `src/lib/schedule/getSessionSubject.ts` — 공통 유틸 (3중복 통합)
- `src/lib/schedule/subjectColorPalette.ts` — `PreviewSubjectColor` → hex 브리지
- `src/lib/schedule/__tests__/getSessionSubject.test.ts`
- `src/components/molecules/TimeTableCell.tsx` — (Task 3b) DropZone + 셀 내 다중 세션 배치 통합

### 수정 파일
- `src/app/page.tsx` — 하드코딩 ScheduleMockup → `<SchedulePreview />`
- `src/components/organisms/ScheduleDailyView.tsx` — data-surface + SubjectChip
- `src/components/organisms/ScheduleMonthlyView.tsx` — data-surface
- `src/components/molecules/MonthDayCell.tsx` — SubjectChip 소비
- `src/components/molecules/SessionBlock.tsx` — 내부 교체 (SubjectChip 래핑). 공개 API + data-testid 유지
- `src/components/molecules/SessionBlock.utils.ts` — 시각 스타일 로직 축소, `getSessionSubject`는 `src/lib/schedule/`로 re-export
- `src/components/molecules/TimeTableRow.tsx` — (Task 3b) TimeTableCell 소비로 단순화
- `src/components/molecules/DropZone.tsx` — (Task 3b) TimeTableCell에 통합
- `src/components/organisms/TimeTableGrid.tsx` — (Task 3b) 내부 레이아웃 Q Pastel 정돈, 공개 API 불변
- `src/app/globals.css` — 미사용 `:root` 변수 제거, `-dark` 복원
- `ARCHITECTURE.md`, `TASKS.md`, `tree.txt` — 각 Task PR에서 동기화

---

## Task 1: B-1 — Primitives foundation (SubjectChip + SchedulePreview)

**PR:** `feat/phase5-b-primitives` ← `dev`

**Files:**
- Create: `src/lib/schedule/getSessionSubject.ts` + test
- Create: `src/lib/schedule/subjectColorPalette.ts`
- Create: `src/components/common/SubjectChip.{tsx,types.ts}` + test
- Create: `src/components/common/SchedulePreview.{tsx,types.ts}` + test
- Modify: `src/components/molecules/SessionBlock.utils.ts` — `getSessionSubject` re-export
- Modify: `src/app/page.tsx` — 하드코딩 ScheduleMockup → `<SchedulePreview />`
- Modify: `ARCHITECTURE.md`, `TASKS.md`, `tree.txt`

### 설계 결정
- **SubjectChip을 디자인 SSOT로**: hex color 입력, 3 variants (fill/border-left/soft), 2 sizes (sm/md). 모든 뷰가 소비.
- **SchedulePreview**: 랜딩 + HelpDrawer 공유용 경량 그리드. SubjectChip 내부 소비. 실제 TimeTableGrid는 후속 Task에서 별도 재작성.
- **`getSessionSubject` 이관**: `src/lib/schedule/`로 승격. SessionBlock.utils.ts는 re-export 한 줄만 유지.

### Steps

- [ ] **Step 1: 브랜치 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/phase5-b-primitives
```

- [ ] **Step 2: getSessionSubject 이관 + 테스트**

Read `src/components/molecules/SessionBlock.utils.ts`. `getSessionSubject` 함수를 `src/lib/schedule/getSessionSubject.ts`로 복사. SessionBlock.utils.ts에서 원 정의 삭제하고 re-export로 치환:

```ts
// src/components/molecules/SessionBlock.utils.ts (상단)
export { getSessionSubject } from "@/lib/schedule/getSessionSubject";
```

Create `src/lib/schedule/__tests__/getSessionSubject.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getSessionSubject } from "../getSessionSubject";

describe("getSessionSubject", () => {
  const subjects = [
    { id: "s1", name: "수학", color: "#3b82f6" },
    { id: "s2", name: "영어", color: "#ef4444" },
  ];
  const enrollments = [
    { id: "e1", subjectId: "s1", studentId: "st1" },
    { id: "e2", subjectId: "s2", studentId: "st2" },
  ];

  it("첫 enrollment의 subject를 반환", () => {
    expect(getSessionSubject({ enrollmentIds: ["e1"] } as any, enrollments as any, subjects as any)?.name).toBe("수학");
  });

  it("enrollmentIds 빈 배열이면 undefined", () => {
    expect(getSessionSubject({ enrollmentIds: [] } as any, enrollments as any, subjects as any)).toBeUndefined();
  });

  it("enrollment 못 찾으면 undefined", () => {
    expect(getSessionSubject({ enrollmentIds: ["x"] } as any, enrollments as any, subjects as any)).toBeUndefined();
  });
});
```

```bash
npm run test -- getSessionSubject
```
Expected: PASS (함수는 이미 존재).

- [ ] **Step 3: 팔레트 브리지 작성**

Create `src/lib/schedule/subjectColorPalette.ts`:

```ts
import type { PreviewSubjectColor } from "@/components/common/SchedulePreview.types";

export const SUBJECT_PALETTE_HEX: Record<PreviewSubjectColor, string> = {
  blue: "#3b82f6",
  red: "#ef4444",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  pink: "#ec4899",
  teal: "#14b8a6",
  orange: "#f97316",
};
```

- [ ] **Step 4: SubjectChip 타입 + 실패 테스트**

Create `src/components/common/SubjectChip.types.ts`:

```ts
export type SubjectChipVariant = "fill" | "border-left" | "soft";
export type SubjectChipSize = "sm" | "md" | "lg";

export interface SubjectChipProps {
  label: string;
  color: string;
  variant?: SubjectChipVariant;
  size?: SubjectChipSize;
  subLabel?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  "data-testid"?: string;
  "aria-label"?: string;
}
```

Create `src/components/common/__tests__/SubjectChip.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubjectChip from "../SubjectChip";

describe("SubjectChip", () => {
  it("label과 subLabel을 렌더한다", () => {
    render(<SubjectChip label="수학" subLabel="김민준" color="#3b82f6" />);
    expect(screen.getByText("수학")).toBeDefined();
    expect(screen.getByText("김민준")).toBeDefined();
  });

  it("variant='fill'일 때 배경에 color 적용", () => {
    const { container } = render(<SubjectChip label="수학" color="#3b82f6" variant="fill" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.style.backgroundColor).not.toBe("");
  });

  it("variant='border-left'일 때 borderLeft에 color 적용", () => {
    const { container } = render(<SubjectChip label="수학" color="#3b82f6" variant="border-left" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.style.borderLeft).toContain("3px");
  });

  it("onClick 주입 시 button 역할", () => {
    const onClick = vi.fn();
    render(<SubjectChip label="수학" color="#3b82f6" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("badge slot을 렌더한다", () => {
    render(<SubjectChip label="수학" color="#3b82f6" badge={<span>+2</span>} />);
    expect(screen.getByText("+2")).toBeDefined();
  });
});
```

```bash
npm run test -- SubjectChip
```
Expected: FAIL.

- [ ] **Step 5: SubjectChip 구현**

Create `src/components/common/SubjectChip.tsx`:

```tsx
import type { SubjectChipProps } from "./SubjectChip.types";

const SIZE_CLASSES = {
  sm: "px-1.5 py-0.5 text-[11px]",
  md: "px-2 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
} as const;

export default function SubjectChip({
  label,
  color,
  variant = "fill",
  size = "sm",
  subLabel,
  badge,
  onClick,
  className = "",
  style: styleOverride,
  ...rest
}: SubjectChipProps) {
  const Tag = onClick ? "button" : "div";
  const style: React.CSSProperties = { ...styleOverride };
  const classes = [
    SIZE_CLASSES[size],
    "rounded-[6px]",
    "leading-tight",
    "inline-flex",
    "items-center",
    "gap-1",
  ];

  if (variant === "fill") {
    style.backgroundColor = color;
    style.color = "#ffffff";
  } else if (variant === "border-left") {
    style.borderLeft = `3px solid ${color}`;
    classes.push("bg-[var(--color-bg-tertiary)]", "pl-2", "text-[var(--color-text-primary)]");
  } else {
    style.backgroundColor = `${color}1A`;
    style.color = color;
  }

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${classes.join(" ")} ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
      style={style}
      data-testid={rest["data-testid"]}
      aria-label={rest["aria-label"]}
    >
      <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>
      {subLabel && <span className="opacity-80 whitespace-nowrap overflow-hidden text-ellipsis">{subLabel}</span>}
      {badge}
    </Tag>
  );
}
```

```bash
npm run test -- SubjectChip
```
Expected: PASS (5/5).

- [ ] **Step 6: SchedulePreview 타입 + 실패 테스트**

Create `src/components/common/SchedulePreview.types.ts`:

```ts
export type PreviewSubjectColor =
  | "blue" | "red" | "violet" | "emerald"
  | "amber" | "pink" | "teal" | "orange";

export interface PreviewCell {
  day: 0 | 1 | 2 | 3 | 4;
  timeIndex: number;
  subjectLabel: string;
  studentLabel?: string;
  color: PreviewSubjectColor;
}

export interface SchedulePreviewProps {
  data: PreviewCell[];
  times: string[];
  days?: string[];
  size?: "sm" | "md";
}
```

Create `src/components/common/__tests__/SchedulePreview.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SchedulePreview from "../SchedulePreview";

const DEMO = [
  { day: 0 as const, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" as const },
  { day: 2 as const, timeIndex: 2, subjectLabel: "영어", studentLabel: "이서연", color: "red" as const },
];

describe("SchedulePreview", () => {
  it("최상위에 data-surface='surface' 속성", () => {
    const { container } = render(<SchedulePreview data={DEMO} times={["15:00","16:00","17:00","18:00"]} />);
    expect(container.querySelector('[data-surface="surface"]')).not.toBeNull();
  });

  it("요일 헤더 5개(월~금)", () => {
    render(<SchedulePreview data={DEMO} times={["15:00"]} />);
    ["월","화","수","목","금"].forEach((d) => expect(screen.getByText(d)).toBeDefined());
  });

  it("과목/학생 라벨 렌더", () => {
    render(<SchedulePreview data={DEMO} times={["15:00","16:00","17:00","18:00"]} />);
    expect(screen.getByText("수학")).toBeDefined();
    expect(screen.getByText("김민준")).toBeDefined();
  });

  it("시간 라벨을 사이드에 렌더", () => {
    render(<SchedulePreview data={[]} times={["15:00","16:00"]} />);
    expect(screen.getByText("15:00")).toBeDefined();
    expect(screen.getByText("16:00")).toBeDefined();
  });
});
```

```bash
npm run test -- SchedulePreview
```
Expected: FAIL.

- [ ] **Step 7: SchedulePreview 구현**

Create `src/components/common/SchedulePreview.tsx`:

```tsx
import SubjectChip from "./SubjectChip";
import { SUBJECT_PALETTE_HEX } from "@/lib/schedule/subjectColorPalette";
import type { SchedulePreviewProps } from "./SchedulePreview.types";

const DEFAULT_DAYS = ["월", "화", "수", "목", "금"];

export default function SchedulePreview({
  data,
  times,
  days = DEFAULT_DAYS,
  size = "sm",
}: SchedulePreviewProps) {
  const cellHeight = size === "sm" ? "h-10" : "h-14";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div
      data-surface="surface"
      data-testid="schedule-preview"
      className="rounded-admin-lg border border-[var(--color-border-light)] bg-[var(--color-bg-secondary)] p-3 shadow-admin-md"
    >
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((d) => (
          <div key={d} className={`${textSize} text-center font-medium text-[var(--color-text-secondary)] py-1`}>
            {d}
          </div>
        ))}

        {times.map((t, ti) => (
          <div key={t} className="contents">
            <div className={`${textSize} text-[var(--color-text-muted)] py-1 pr-2 text-right`}>{t}</div>
            {days.map((_, di) => {
              const cell = data.find((c) => c.day === di && c.timeIndex === ti);
              if (!cell) {
                return <div key={`${di}-${ti}`} className={`${cellHeight} rounded-[4px] bg-[var(--color-bg-tertiary)]`} />;
              }
              return (
                <div key={`${di}-${ti}`} className={`${cellHeight} flex items-stretch`}>
                  <SubjectChip
                    label={cell.subjectLabel}
                    subLabel={cell.studentLabel}
                    color={SUBJECT_PALETTE_HEX[cell.color]}
                    variant="fill"
                    size={size === "sm" ? "sm" : "md"}
                    className="!flex-col w-full h-full justify-center !items-start"
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

```bash
npm run test -- SchedulePreview
```
Expected: PASS (4/4).

- [ ] **Step 8: 랜딩 페이지 적용**

Read `src/app/page.tsx`. `ScheduleMockup` 함수(라인 84-218)를 삭제하고 호출 위치에 `<SchedulePreview />`를 배치. 더미 데이터를 상단 상수로:

```tsx
import SchedulePreview from "@/components/common/SchedulePreview";
import type { PreviewCell } from "@/components/common/SchedulePreview.types";

const LANDING_DEMO_DATA: PreviewCell[] = [
  { day: 0, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 2, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 4, timeIndex: 2, subjectLabel: "수학", studentLabel: "김민준", color: "blue" },
  { day: 4, timeIndex: 0, subjectLabel: "영어", studentLabel: "이서연", color: "red" },
  { day: 1, timeIndex: 1, subjectLabel: "영어", studentLabel: "이서연", color: "red" },
  { day: 0, timeIndex: 1, subjectLabel: "과학", studentLabel: "박지호", color: "violet" },
  { day: 3, timeIndex: 2, subjectLabel: "과학", studentLabel: "박지호", color: "violet" },
  { day: 3, timeIndex: 1, subjectLabel: "국어", studentLabel: "최유진", color: "emerald" },
  { day: 2, timeIndex: 2, subjectLabel: "국어", studentLabel: "최유진", color: "emerald" },
  { day: 1, timeIndex: 2, subjectLabel: "미술", studentLabel: "정하은", color: "amber" },
  { day: 0, timeIndex: 3, subjectLabel: "음악", studentLabel: "한소율", color: "pink" },
  { day: 2, timeIndex: 3, subjectLabel: "체육", studentLabel: "윤도현", color: "teal" },
  { day: 4, timeIndex: 3, subjectLabel: "사회", studentLabel: "강예린", color: "orange" },
];
```

기존 `<ScheduleMockup />` 호출을 `<SchedulePreview data={LANDING_DEMO_DATA} times={["15:00","16:00","17:00","18:00"]} size="sm" />`로 교체.

- [ ] **Step 9: 로컬 검증**

```bash
npm run check
npm run dev
```
Playwright MCP로 `/` 방문 → 랜딩 그리드 렌더 확인. 스크린샷 저장.

- [ ] **Step 10: 문서 동기화 + 커밋 + PR**

- `tree.txt`: `src/components/common/`, `src/lib/schedule/` 신규 파일 반영
- `ARCHITECTURE.md`: Common 계층 (SubjectChip, SchedulePreview), `src/lib/schedule/` 섹션 추가
- `TASKS.md`: Phase 5-B B-1 ✅

```bash
git add -A
git commit -m "feat(phase5-b): add SubjectChip + SchedulePreview primitives

- Establish SubjectChip as design SSOT for subject visualization
- Add SchedulePreview for landing page and future help drawer
- Promote getSessionSubject to src/lib/schedule (dedupe target)
- Replace hardcoded ScheduleMockup in landing with SchedulePreview

Issue #3 — 랜딩 그리드와 실제 시간표 디자인 통일 첫 단계.
Part of Phase 5-B."
git push -u origin feat/phase5-b-primitives
gh pr create --base dev --title "feat(phase5-b): SubjectChip + SchedulePreview primitives" \
  --body "Design SSOT primitives for Phase 5-B. Lands first; consumed by subsequent tasks."
```

---

## Task 2: B-2 — Daily/Monthly 전환 (data-surface + SubjectChip)

**PR:** `feat/phase5-b-surface-daily-monthly` ← `dev` (B-1 머지 후)

**Files:**
- Modify: `src/components/organisms/ScheduleDailyView.tsx`
- Modify: `src/components/organisms/ScheduleMonthlyView.tsx`
- Modify: `src/components/molecules/MonthDayCell.tsx`
- Modify: `src/components/organisms/__tests__/ScheduleDailyView.test.tsx`
- Modify: `src/components/organisms/__tests__/ScheduleMonthlyView.test.tsx`
- Modify: `src/components/molecules/__tests__/MonthDayCell.test.tsx`

### 설계 결정
- 최상위에 `data-surface="surface"` 1줄 추가 + 내부 과목 색상 렌더를 SubjectChip으로 교체.
- Daily: `variant="border-left"`, size="md" (행 레이아웃과 잘 맞음)
- Monthly `MonthDayCell`: `variant="fill"`, size="sm" (콤팩트 칩)
- 출석 상태 점(bg-green-500 등 Tailwind 리터럴)은 범위 밖 — 유지.

### Steps

- [ ] **Step 1: 브랜치**

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-b-surface-daily-monthly
```

- [ ] **Step 2: Daily 테스트 추가**

`src/components/organisms/__tests__/ScheduleDailyView.test.tsx`에 추가:

```tsx
it("최상위 컨테이너에 data-surface='surface'", () => {
  const { container } = render(<ScheduleDailyView {...propsFixture} />);
  expect(container.querySelector('[data-surface="surface"]')).not.toBeNull();
});

it("과목 색상을 SubjectChip으로 렌더", () => {
  render(<ScheduleDailyView {...fixtureWithSubject} />);
  const chip = screen.getByText("수학").closest("[style*='border-left']");
  expect(chip).not.toBeNull();
});
```

`propsFixture`/`fixtureWithSubject`: 기존 테스트 fixture 재사용 또는 최소 fixture(빈 sessions, 단일 subject+enrollment+session 1개) 신설.

- [ ] **Step 3: Monthly + MonthDayCell 테스트 추가**

`ScheduleMonthlyView.test.tsx`에 data-surface 테스트 1개. `MonthDayCell.test.tsx`에 SubjectChip 렌더 테스트 (label + backgroundColor 확인).

- [ ] **Step 4: 테스트 실패 확인**

```bash
npm run test -- ScheduleDailyView ScheduleMonthlyView MonthDayCell
```
Expected: FAIL.

- [ ] **Step 5: Daily 수정**

Read `src/components/organisms/ScheduleDailyView.tsx`. 라인 87 최상위 `<div>`에 `data-surface="surface"` 추가. 라인 100-156 근처 과목 블록 렌더에서 `borderLeft: "3px solid ${accentColor}"` 패턴을 SubjectChip으로 교체:

```tsx
import SubjectChip from "@/components/common/SubjectChip";
// ...
<SubjectChip
  label={subject?.name ?? "-"}
  subLabel={studentLabel}
  color={subject?.color ?? "#6b7280"}
  variant="border-left"
  size="md"
  onClick={() => onSessionClick(session)}
/>
```

출석 상태 점은 SubjectChip 옆에 sibling으로 유지.

- [ ] **Step 6: MonthDayCell 수정**

Read `src/components/molecules/MonthDayCell.tsx`. 라인 62-73 근처 `<li style={{ backgroundColor: subj?.color }}>` 블록을 SubjectChip으로:

```tsx
import SubjectChip from "@/components/common/SubjectChip";
// ...
<SubjectChip
  label={subj.name}
  color={subj.color ?? "#6b7280"}
  variant="fill"
  size="sm"
/>
```

- [ ] **Step 7: Monthly 수정**

Read `src/components/organisms/ScheduleMonthlyView.tsx`. 라인 64 최상위 `<div>`에 `data-surface="surface"` 추가.

- [ ] **Step 8: 테스트 통과**

```bash
npm run test -- ScheduleDailyView ScheduleMonthlyView MonthDayCell
```
기존 테스트가 구 렌더 패턴에 의존하면 선택자를 SubjectChip 패턴(getByText + closest)으로 업데이트.

- [ ] **Step 9: 로컬 Playwright 검증**

```bash
npm run check
npm run dev
```
`/schedule`에서 Day/Month 토글 → 배경 Q Pastel, 과목 칩 SubjectChip 스타일. 스크린샷 2장.

- [ ] **Step 10: 문서 + 커밋 + PR**

- `TASKS.md`: B-2 ✅

```bash
git add -A
git commit -m "feat(phase5-b): apply Surface mode + SubjectChip to Daily/Monthly

- Add data-surface='surface' to ScheduleDailyView/ScheduleMonthlyView root
- Replace ad-hoc subject color blocks with SubjectChip primitive
- MonthDayCell renders chips via SubjectChip variant='fill'
- ScheduleDailyView uses variant='border-left' for row layout

Issue #4 — 일/월 뷰 Q Pastel 팔레트 + SubjectChip 통일.
Part of Phase 5-B."
git push -u origin feat/phase5-b-surface-daily-monthly
gh pr create --base dev --title "feat(phase5-b): Daily/Monthly surface + SubjectChip adoption" \
  --body "Apply data-surface and SubjectChip primitive to Daily/Monthly views."
```

---

## Task 3a: B-3a — SessionBlock 내부 재작성 (SubjectChip 기반)

**PR:** `feat/phase5-b-session-block-rewrite` ← `dev` (B-1 머지 후; B-2와 병렬 가능)

**Files:**
- Rewrite: `src/components/molecules/SessionBlock.tsx` — 내부만 교체, 공개 API/data-testid 유지
- Reduce: `src/components/molecules/SessionBlock.utils.ts` — 시각 로직 축소 (색상/드래그 계산만), `resolveSessionColor` 유지
- Update: `src/components/molecules/__tests__/SessionBlock.test.tsx` — 41 케이스 재검토, 시각 표현 관련 단언 업데이트
- Keep: `src/components/molecules/__tests__/SessionBlock.utils.test.ts` — 15 케이스 중 시각 로직 삭제분 제거

### 설계 결정
- **공개 계약(props + DOM attributes)은 불변**:
  - Props: session, subject, enrollment, student, teacher, onClick, onDragStart/End, onDelete, selectedStudentId, isAnyDragging, isReadOnly, colorBy, hasConflict
  - DOM: 최상위에 `data-testid="session-block-{id}"`, `data-session-id`, `data-starts-at`, `data-ends-at`, `data-status`, aria-label 유지
- **내부 교체**:
  - JSX body를 SubjectChip(`variant="fill"`, size 동적)으로 치환. 기존 인라인 style(`backgroundColor: subject.color`) 로직 제거.
  - useSessionStatus 훅 유지 → "진행중" 배지를 SubjectChip의 `badge` prop으로 주입.
  - 롱프레스/드래그/컨텍스트 메뉴는 SubjectChip을 감싸는 wrapper `<div>`에서 처리. SubjectChip은 순수 시각.
  - hasConflict = 빨간 outline을 wrapper에 적용 (`ring-2 ring-red-500` 같은 Tailwind 유틸).
- **E2E 호환**: data-testid 모두 유지. 클릭/드래그 시뮬레이션이 새 DOM 트리에서도 동작하는지 수동 확인.

### Steps

- [ ] **Step 1: 브랜치**

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-b-session-block-rewrite
```

- [ ] **Step 2: 현재 SessionBlock 전체 읽기 + 계약 체크리스트 생성**

Read `src/components/molecules/SessionBlock.tsx` 전체 (446줄). 파일 상단에 주석으로 계약 체크리스트 임시 주입 (Step 10에서 삭제):

```
# 불변 계약 (삭제/변경 금지)
- props: session, subject, enrollments, students, teacher, onClick, onDragStart, onDragEnd, onDelete, selectedStudentId, isAnyDragging, isReadOnly, colorBy, hasConflict
- DOM attrs: data-testid="session-block-{id}", data-session-id, data-starts-at, data-ends-at, data-status
- aria-label 풀 문장
- useSessionStatus 배지
- 롱프레스 300ms → 컨텍스트 메뉴 (편집/삭제)
- draggable={!isMobile && !isReadOnly}
- onDragStart/End 핸들러
```

- [ ] **Step 3: 테스트 스냅샷**

```bash
npm run test -- SessionBlock > /tmp/session-block-before.txt
```
41 케이스 중 통과/실패 목록 파악.

- [ ] **Step 4: SessionBlock 재작성**

기존 파일을 다음 구조로 재작성:

```tsx
"use client";
import { useRef, useState } from "react";
import SubjectChip from "@/components/common/SubjectChip";
import { useSessionStatus } from "@/hooks/useSessionStatus";
import { resolveSessionColor, getSessionLabel } from "./SessionBlock.utils";
import type { SessionBlockProps } from "./SessionBlock.types"; // 기존 타입 재사용

export default function SessionBlock(props: SessionBlockProps) {
  const {
    session, subjects, enrollments, students, teachers,
    onClick, onDragStart, onDragEnd, onDelete,
    selectedStudentId, isAnyDragging, isReadOnly, colorBy, hasConflict,
  } = props;

  const color = resolveSessionColor(session, colorBy, { subjects, enrollments, students, teachers });
  const { label, subLabel, ariaLabel } = getSessionLabel(session, { subjects, enrollments, students, teachers });
  const status = useSessionStatus(session);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const isMobile = typeof window !== "undefined" && window.matchMedia?.("(max-width:767px)").matches;
  const draggable = !isMobile && !isReadOnly;

  const handlePointerDown = () => {
    if (isReadOnly) return;
    longPressTimer.current = setTimeout(() => setShowContextMenu(true), 300);
  };
  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const badge = status.isInProgress ? <span className="w-1.5 h-1.5 rounded-full bg-white shadow-md animate-pulse" /> : undefined;

  return (
    <div
      ref={wrapperRef}
      data-testid={`session-block-${session.id}`}
      data-session-id={session.id}
      data-starts-at={session.startsAt}
      data-ends-at={session.endsAt}
      data-status={status.value}
      className={`
        relative w-full h-full
        ${hasConflict ? "ring-2 ring-red-500 ring-offset-1" : ""}
        ${status.isCompleted ? "opacity-55" : ""}
        ${selectedStudentId && !session.enrollmentIds.includes(selectedStudentId) ? "opacity-30" : ""}
        ${isAnyDragging ? "pointer-events-none" : ""}
      `}
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, session) : undefined}
      onDragEnd={draggable ? (e) => onDragEnd?.(e, session) : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      aria-label={ariaLabel}
    >
      <SubjectChip
        label={label}
        subLabel={subLabel}
        color={color}
        variant="fill"
        size="md"
        badge={badge}
        onClick={isReadOnly ? undefined : () => onClick?.(session)}
        className="!flex-col w-full h-full justify-center !items-start !rounded-[6px]"
      />
      {showContextMenu && !isReadOnly && (
        <ContextMenu
          onEdit={() => onClick?.(session)}
          onDelete={() => onDelete?.(session.id)}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </div>
  );
}

function ContextMenu({ onEdit, onDelete, onClose }: { onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  return (
    <div className="absolute z-50 top-full left-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-admin-md shadow-admin-lg py-1 min-w-[120px]">
      <button onClick={() => { onEdit(); onClose(); }} className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--color-bg-tertiary)]">편집</button>
      <button onClick={() => { onDelete(); onClose(); }} className="block w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-[var(--color-bg-tertiary)]">삭제</button>
    </div>
  );
}
```

`SessionBlock.types.ts`(또는 기존 inline props)를 파일 상단에서 export하는 구조면 그대로 유지.

- [ ] **Step 5: SessionBlock.utils.ts 축소**

시각 스타일 계산(`getSessionBlockStyles`, 폰트 크기 계산 등)은 SubjectChip이 담당하므로 삭제. 유지할 함수:
- `getSessionSubject` (re-export 유지)
- `resolveSessionColor(session, colorBy, {subjects,enrollments,students,teachers})` → hex 문자열 반환 (Weekly: subject color, colorBy='student': first-student color, colorBy='teacher': teacher color)
- `getSessionLabel(session, deps)` → `{label, subLabel, ariaLabel}` 튜플. 기존 로직 통합.

- [ ] **Step 6: 테스트 업데이트**

`SessionBlock.test.tsx`의 41 케이스 재검토:
- 유지: data-testid, data-session-id, aria-label, draggable 속성, onClick 호출, onDragStart/End, 롱프레스 컨텍스트 메뉴, hasConflict 스타일, opacity 상태, isReadOnly 가드
- 업데이트: 기존 "inline style backgroundColor" 단언 → SubjectChip이 렌더한 style 선택자로 변경
- 삭제 후보: 폰트 크기 동적 계산 테스트 (SubjectChip이 단순화)

`SessionBlock.utils.test.ts` 15 케이스: 삭제된 함수 테스트 제거.

```bash
npm run test -- SessionBlock
```
Expected: 모든 테스트 PASS.

- [ ] **Step 7: E2E 수동 체크 (Playwright MCP)**

```bash
npm run dev
```
Playwright MCP로:
1. `/schedule` 로그인 후 진입 → 기존 세션 렌더 확인, `data-testid="session-block-*"` 선택자 동작
2. 세션 클릭 → 편집 모달
3. 세션 드래그 → 다른 셀 드롭 → 이동 확인
4. 학생 리스트에서 드래그 → 빈 셀 드롭 → 신규 세션 생성
5. 롱프레스 300ms → 컨텍스트 메뉴 → 삭제
6. share 링크로 read-only 모드 → 클릭/드래그 비활성
7. 진행중 세션에 배지 glow 표시
8. 충돌 세션에 빨간 ring

- [ ] **Step 8: E2E suite 실행**

```bash
npm run test:e2e -- schedule.spec.ts
```
Expected: PASS. 실패 시 selector 호환성 확인.

- [ ] **Step 9: 문서 + 커밋 + PR**

- `TASKS.md`: B-3a ✅

```bash
git add -A
git commit -m "feat(phase5-b): rewrite SessionBlock internals with SubjectChip

- Replace 446-line inline-style rendering with SubjectChip primitive wrapper
- Preserve public API (all props unchanged) and DOM contracts (data-testid/data-*)
- Reduce SessionBlock.utils.ts to color/label resolvers only
- Status badge flows through SubjectChip's badge slot
- Context menu + drag/longpress live on wrapper, SubjectChip is pure visual

Part of Phase 5-B. External consumers (ScheduleGridSection/share/teacher-schedule)
unaffected — API is stable."
git push -u origin feat/phase5-b-session-block-rewrite
gh pr create --base dev --title "feat(phase5-b): SessionBlock internal rewrite with SubjectChip" \
  --body "Preserve public API; rebuild internals on SubjectChip primitive."
```

---

## Task 3b: B-3b — Weekly grid 레이아웃 정돈 (TimeTableRow + DropZone + TimeTableGrid)

**PR:** `feat/phase5-b-grid-rewrite` ← `dev` (B-3a 머지 후)

**Files:**
- Create: `src/components/molecules/TimeTableCell.tsx` — 단일 셀: DropZone 병합 + 세션 리스트 배치
- Create: `src/components/molecules/__tests__/TimeTableCell.test.tsx`
- Rewrite: `src/components/molecules/TimeTableRow.tsx` — TimeTableCell 소비로 단순화
- Delete: `src/components/molecules/DropZone.tsx` (TimeTableCell로 통합 — 소비처가 TimeTableRow만이면 안전)
- Delete: `src/components/molecules/__tests__/DropZone.test.tsx`
- Update: `src/components/organisms/TimeTableGrid.tsx` — 공개 API 불변, 내부 레이아웃/컨테이너 Q Pastel 정돈 (배경, 그리드 라인, 스크롤바)
- Update: `src/components/organisms/__tests__/TimeTableGrid.test.tsx` (10 케이스)
- Update: `src/components/organisms/__tests__/TimeTableGrid.scrollPosition.test.tsx` (13 케이스)
- Update: `src/components/molecules/__tests__/TimeTableRow.test.tsx` (있다면)

### 설계 결정
- **공개 API 불변**: TimeTableGrid props 20개, `data-testid="time-table-grid"`, `.virtual-scrollbar-*` 클래스.
- **내부 재구성**:
  - `TimeTableCell`: (weekday, time) 단위 컴포넌트. DropZone의 drop 핸들링 + 해당 셀의 세션 배열 렌더 (SessionBlock 호출) + 빈 공간 클릭 처리.
  - `TimeTableRow`: 시간 레이블 + `TimeTableCell × 요일` 간략화.
  - `TimeTableGrid`: 헤더 + Row × times, 가상 스크롤바, 스크롤 위치 복원은 그대로. 배경/그리드 라인을 Q Pastel 토큰(`--color-border-grid-light` 등)으로 재배치.
- **DropZone 제거**: 단일 소비자(TimeTableRow)였으므로 안전. 로직은 TimeTableCell 내부 훅으로.
- **스크롤 위치 복원**: `schedule_scroll_position` localStorage 계약 유지. E2E 20+ 케이스가 이걸 검증.

### Steps

- [ ] **Step 1: 브랜치**

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-b-grid-rewrite
```

- [ ] **Step 2: DropZone 소비처 전수 확인**

```
Grep: "<DropZone" 및 "import DropZone" / "from '../DropZone'"
```
TimeTableRow 외 소비자 있으면 이 Task 스코프 조정 필요. 없으면 진행.

- [ ] **Step 3: TimeTableCell 테스트 작성**

Create `src/components/molecules/__tests__/TimeTableCell.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeTableCell from "../TimeTableCell";

const sharedProps = {
  weekday: 0,
  time: "15:00",
  sessionsInCell: [],
  subjects: [], enrollments: [], students: [], teachers: [],
  onSessionClick: vi.fn(),
  onSessionDelete: vi.fn(),
  onDrop: vi.fn(),
  onSessionDrop: vi.fn(),
  onEmptySpaceClick: vi.fn(),
  selectedStudentId: null,
  isAnyDragging: false,
  isStudentDragging: false,
  colorBy: "subject" as const,
  isReadOnly: false,
};

describe("TimeTableCell", () => {
  it("빈 셀 클릭 시 onEmptySpaceClick(weekday, time) 호출", () => {
    const onEmptySpaceClick = vi.fn();
    render(<TimeTableCell {...sharedProps} onEmptySpaceClick={onEmptySpaceClick} />);
    fireEvent.click(screen.getByTestId("time-table-cell-0-15:00"));
    expect(onEmptySpaceClick).toHaveBeenCalledWith(0, "15:00");
  });

  it("isReadOnly면 클릭해도 onEmptySpaceClick 호출 안 됨", () => {
    const onEmptySpaceClick = vi.fn();
    render(<TimeTableCell {...sharedProps} isReadOnly={true} onEmptySpaceClick={onEmptySpaceClick} />);
    fireEvent.click(screen.getByTestId("time-table-cell-0-15:00"));
    expect(onEmptySpaceClick).not.toHaveBeenCalled();
  });

  it("드롭 시 onDrop 호출 (학생 리스트에서 드롭)", () => {
    const onDrop = vi.fn();
    render(<TimeTableCell {...sharedProps} onDrop={onDrop} isStudentDragging={true} />);
    const cell = screen.getByTestId("time-table-cell-0-15:00");
    fireEvent.drop(cell, {
      dataTransfer: { getData: () => "enrollment-123" },
    });
    expect(onDrop).toHaveBeenCalledWith(0, "15:00", "enrollment-123");
  });
});
```

- [ ] **Step 4: TimeTableCell 구현**

Create `src/components/molecules/TimeTableCell.tsx` — DropZone의 drop/dragover 로직 + 세션 배열 렌더(SessionBlock 소비) + 빈 공간 클릭:

```tsx
"use client";
import SessionBlock from "./SessionBlock";
// props 타입 생략, 기존 DropZone + 세션 배치 로직 통합
export default function TimeTableCell(props: TimeTableCellProps) {
  const {
    weekday, time, sessionsInCell, subjects, enrollments, students, teachers,
    onSessionClick, onSessionDelete, onDrop, onSessionDrop, onEmptySpaceClick,
    selectedStudentId, isAnyDragging, isStudentDragging, colorBy, isReadOnly,
  } = props;

  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    // enrollment-<id> | session-<id>-<y>
    if (data.startsWith("enrollment-")) {
      onDrop(weekday, time, data.replace("enrollment-", ""));
    } else if (data.startsWith("session-")) {
      const [, sessionId, y] = data.split("-");
      onSessionDrop?.(sessionId, weekday, time, Number(y));
    }
  };
  const handleClick = () => {
    if (isReadOnly) return;
    if (sessionsInCell.length === 0) onEmptySpaceClick(weekday, time);
  };

  return (
    <div
      data-testid={`time-table-cell-${weekday}-${time}`}
      className="relative border border-[var(--color-border-grid-light)] min-h-[44px] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] transition"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {sessionsInCell.map((session, idx) => (
        <SessionBlock
          key={session.id}
          session={session}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          teachers={teachers}
          onClick={onSessionClick}
          onDelete={onSessionDelete}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", `session-${session.id}-${e.clientY}`)}
          selectedStudentId={selectedStudentId}
          isAnyDragging={isAnyDragging}
          isReadOnly={isReadOnly}
          colorBy={colorBy}
          hasConflict={/* conflict 계산 로직 이관 */ false}
        />
      ))}
    </div>
  );
}
```

```bash
npm run test -- TimeTableCell
```
Expected: PASS.

- [ ] **Step 5: TimeTableRow 재작성**

Read `src/components/molecules/TimeTableRow.tsx`. 기존 DropZone 소비를 TimeTableCell로 교체하고 파일 단순화 (298줄 → ~100줄 목표):

```tsx
"use client";
import TimeTableCell from "./TimeTableCell";

export default function TimeTableRow(props: TimeTableRowProps) {
  const { time, sessionsByWeekday, ...rest } = props;
  return (
    <div className="contents">
      <div className="text-[11px] text-[var(--color-text-muted)] py-1 pr-2 text-right">{time}</div>
      {[0,1,2,3,4,5,6].map((weekday) => (
        <TimeTableCell
          key={weekday}
          weekday={weekday}
          time={time}
          sessionsInCell={sessionsByWeekday.get(weekday) ?? []}
          {...rest}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: DropZone 삭제**

```bash
# 파일 삭제
rm src/components/molecules/DropZone.tsx
rm src/components/molecules/__tests__/DropZone.test.tsx
```

Grep으로 `DropZone` 잔재 참조 0건 확인.

- [ ] **Step 7: TimeTableGrid 레이아웃 정돈**

Read `src/components/organisms/TimeTableGrid.tsx`. 공개 API는 불변. 내부만:
- 최상위 div: `data-surface="surface"` 직접 부착 (래퍼 의존 제거). `bg-[var(--color-bg-primary)]` + `border border-[var(--color-border-light)]` + `rounded-admin-lg`.
- 그리드 라인: `border-[var(--color-border-grid-lighter)]`로 톤 다운.
- 헤더(요일): `text-[var(--color-text-secondary)]` 폰트 medium.
- 가상 스크롤바 CSS 훅(`.virtual-scrollbar-*`) 그대로.
- `data-testid="time-table-grid"` 최상위 유지.
- 스크롤 위치 복원 로직 그대로.

- [ ] **Step 8: 테스트 업데이트 + 통과**

```bash
npm run test -- TimeTableGrid TimeTableRow TimeTableCell
```
- 10 + 13 + 3개 테스트 통과.
- scrollPosition.test.tsx는 localStorage 계약에만 의존 → 거의 수정 불필요.
- TimeTableGrid.test.tsx는 DOM 셀렉터(`data-testid="time-table-grid"`) 기반이면 수정 불필요, SessionBlock 렌더 세부에 의존했다면 업데이트.

- [ ] **Step 9: E2E suite**

```bash
npm run test:e2e
```
주요 스펙:
- `schedule.spec.ts`
- `scroll-position-preservation.spec.ts`
- `schedule-student-names.spec.ts`
- `browser-compatibility.spec.ts`

실패 시 선택자 호환성 점검.

- [ ] **Step 10: Playwright MCP 전체 검증**

`/schedule` 진입 후 다음 golden paths:
1. 학생 리스트 드래그 → 빈 셀 드롭 → 신규 세션
2. 세션 드래그 → 다른 셀 이동
3. 세션 클릭 → 편집 모달
4. 롱프레스 → 삭제
5. 스크롤 후 새로고침 → 위치 복원
6. Day/Week/Month 토글 → Week에서 Q Pastel 렌더 확인
7. `share/[token]` 페이지 → read-only, 클릭/드래그 비활성
8. `teacher-schedule` → read-only, colorBy='student'

- [ ] **Step 11: 문서 + 커밋 + PR**

- `tree.txt`: TimeTableCell 추가, DropZone 삭제
- `ARCHITECTURE.md`: Molecules 인벤토리에 TimeTableCell 추가, DropZone 제거 반영
- `TASKS.md`: B-3b ✅

```bash
git add -A
git commit -m "feat(phase5-b): rewrite Weekly grid internals with TimeTableCell

- Extract TimeTableCell (DropZone + session stack + empty-click in one)
- Simplify TimeTableRow to thin wrapper around TimeTableCell
- Remove standalone DropZone.tsx (sole consumer was TimeTableRow)
- Apply data-surface='surface' directly on TimeTableGrid root
- Refresh grid line tokens to Q Pastel (border-grid-lighter)
- Preserve public API: props, data-testid='time-table-grid',
  virtual scrollbar hooks, schedule_scroll_position contract

Issue #2 #6 — 주간 그리드 디자인을 SchedulePreview와 동일 언어로 정돈.
Part of Phase 5-B."
git push -u origin feat/phase5-b-grid-rewrite
gh pr create --base dev --title "feat(phase5-b): Weekly grid internal rewrite" \
  --body "Replace TimeTableRow/DropZone with TimeTableCell. Public API unchanged."
```

---

## Task 4: B-4 — 레거시 `:root` 토큰 정리

**PR:** `feat/phase5-b-token-cleanup` ← `dev` (B-3b 머지 후)

**Files:**
- Modify: `src/app/globals.css`

### 설계 결정
- **삭제 대상 (사용처 0, 5개)**: `--color-grid-canvas`, `--color-grid-line-major`, `--color-grid-line-minor`, `--color-grid-header-text`, `--color-grid-time-text`.
- **복원 대상 (3개, 미정의 참조)**: `--color-primary-dark`, `--color-secondary-dark`, `--color-danger-dark`. `:root`에 hex 값 추가.
- **조건부 삭제**: `--color-success`, `--color-warning`, `--color-secondary` — grep 0이면 제거.
- **유지**: bg/text/border/overlay/scrollbar/bg-deep/subject/border-grid/spacing/radius/transition/shadow — 다수 소비처.

### Steps

- [ ] **Step 1: 브랜치**

```bash
git checkout dev && git pull origin dev
git checkout -b feat/phase5-b-token-cleanup
```

- [ ] **Step 2: baseline 스크린샷**

```bash
npm run dev
```
Playwright MCP로 `/`, `/schedule` (Day/Week/Month), `/students`, `/subjects`, `/settings`, 로그인 모달, 에러 모달 스크린샷 저장.

- [ ] **Step 3: 사용처 0 변수 삭제**

Read `src/app/globals.css`. `:root` 블록에서 5개 변수 제거:
- `--color-grid-canvas`
- `--color-grid-line-major`
- `--color-grid-line-minor`
- `--color-grid-header-text`
- `--color-grid-time-text`

- [ ] **Step 4: Sanity grep**

각 변수명 grep → 0건 확인.

- [ ] **Step 5: `-dark` 복원**

`:root` 블록에 추가:

```css
--color-primary-dark: #2563eb;
--color-secondary-dark: #4b5563;
--color-danger-dark: #b91c1c;
```

`.button--*:hover` 규칙의 참조가 이제 정의된 값을 얻음.

- [ ] **Step 6: success/warning/secondary grep**

Grep `var(--color-success)`, `var(--color-warning)`, `var(--color-secondary)`. 0건이면 `:root`에서 삭제. 1건 이상이면 유지.

- [ ] **Step 7: 로컬 검증**

```bash
npm run check
npm run dev
```

- [ ] **Step 8: 스크린샷 diff**

Step 2 baseline과 동일 페이지 재촬영 → 시각 차이 없어야 함. 차이 있으면 해당 토큰 복원 + 재조사.

- [ ] **Step 9: 문서 + 커밋 + PR**

- `TASKS.md`: B-4 ✅, Phase 5-B 전체 완료

```bash
git add -A
git commit -m "chore(phase5-b): prune unused :root tokens + restore -dark vars

- Remove 5 unused grid-* tokens (grid-canvas, line-major/minor, header-text, time-text)
- Define missing -dark hover vars (primary-dark, secondary-dark, danger-dark)
- Optional: drop success/warning/secondary legacy if grep returns 0

globals.css = @theme (SSOT) + [data-surface='surface'] + concrete :root overrides.
Part of Phase 5-B (Design System Consistency) — final cleanup."
git push -u origin feat/phase5-b-token-cleanup
gh pr create --base dev --title "chore(phase5-b): legacy token cleanup" \
  --body "Prune unused :root tokens; restore undefined -dark references."
```

---

## 페이즈 공통 규칙

### 브랜치
- 각 Task = 독립 PR, `dev` 기준 분기. 이전 Task 머지 후 다음 브랜치 분기 (문서 충돌 방지).
- B-2는 B-3a와 병렬 가능 (독립 뷰).
- `dev → main` 머지는 P5-B 전체 완료 후 사용자 명시 요청 시에만.

### 문서 동기화 (각 PR)
- `tree.txt` — 신규/삭제 파일 반영
- `ARCHITECTURE.md` — Common(SubjectChip, SchedulePreview), `src/lib/schedule/`, TimeTableCell 인벤토리
- `TASKS.md` — 각 하위 Task 체크

### UI 검증 (Non-negotiable)
- **1차 — Playwright MCP**: 모든 Task. 랜딩 + /schedule Day/Week/Month + 모바일 375×667.
- **2차 — computer-use**: Task 3b(Weekly 재작성), Task 4(토큰 정리) 후 시각 탐험으로 4뷰 통일감 최종 판정.
- 각 PR의 최종 응답에 UI Verification Report 섹션 포함.

### 테스트
- `npm run test` 기존 100% 통과.
- `npm run test:e2e`는 Task 3a/3b에서 필수. 나머지 Task는 unit + Playwright MCP만.

---

## ⚠️ Known Risks & Alternatives

**Weaknesses:**
1. **Task 3a/3b가 크다** — 약 1,500+ 라인 재작성. 대량 회귀 위험. 완화책: 공개 API/DOM 계약 불변 원칙 + 41+13+10 기존 테스트 + E2E 20+ 케이스로 안전망 구성.
2. **롱프레스/드래그 인터랙션의 브라우저 차이** — Weekly 재작성이 모바일 Safari iOS/Android Chrome에서 다르게 동작할 수 있음. 완화책: Task 3a Step 7 수동 브라우저 검증 + E2E `browser-compatibility.spec.ts` 실행.
3. **스크롤 위치 복원 회귀 위험** — `schedule_scroll_position` localStorage 계약을 새 TimeTableGrid에서도 보존해야 함. 완화책: Task 3b Step 8에서 `scrollPosition.test.tsx` 13 케이스 100% 통과 확인.
4. **SubjectChip이 fill/border-left/soft 3 variants만** — 향후 다른 variant 필요 시 확장 설계 필요. 완화책: variant enum이므로 확장 가능, 현재 4개 뷰는 충분.

**Rejected alternatives:**
- **SchedulePreview를 TimeTableGrid isReadOnly로 대체** — 공개 API 유지 원칙과 충돌, 랜딩에 DnD 훅이 따라옴.
- **SessionBlock 공개 API도 변경** — 4개 소비자(TimeTableRow via Cell) 영향. 이번 Phase에서 불필요한 확장.
- **B-3a/3b 단일 PR 통합** — 리뷰 난이도 폭증. 2개 PR 분리가 안전.
- **:root 전체 제거 후 `@theme`로 이관** — surface 오버라이드의 SSOT 구조가 깨짐. 이번 Phase는 정리만, 재설계는 Phase 6 이후.

**Uncertainties:**
- `SUBJECT_PALETTE_HEX` 값이 `--color-subject-*-bg` 기존 CSS 변수와 시각적 매칭되는지 — Task 1 Step 9에서 수동 검증.
- `useSessionStatus` 배지가 SubjectChip `badge` 슬롯에서 기존과 동일하게 glow 표현되는지 — Task 3a Step 7에서 확인.
- E2E `scroll-position-preservation.spec.ts` 20+ 케이스가 새 DOM 트리에서도 셀렉터 매칭 — Task 3b Step 9에서 실행 필수.

---

## Verification (Phase 5-B 전체 완료 후)

1. 시크릿 브라우저 → `http://localhost:3000`
   - 랜딩 `SchedulePreview`와 `/schedule` Week 뷰의 과목 칩이 **동일 팔레트·동일 스타일**로 렌더.
   - "무료로 시작하기" → `/schedule` → 시각적 연속성 유지.
2. `/schedule` Day/Week/Month 3개 뷰 모두 Q Pastel 배경 + SubjectChip.
3. 다크 테마 토글 → Admin chrome만 영향, Surface 영역은 라이트 유지.
4. DnD: 학생→셀, 세션→셀 이동 모두 정상.
5. 빈 셀 클릭 → 수업 추가 모달.
6. 스크롤 후 새로고침 → 위치 복원.
7. share/teacher-schedule → read-only, 클릭/드래그 비활성.
8. 진행중 세션 glow 배지, 충돌 세션 빨간 ring.
9. Playwright MCP 4개 페이지 스크린샷 비교.
10. computer-use로 전체 시각 탐험 — "따로 노는 느낌" 제거 확인.
11. `npm run test`, `npm run test:e2e`, `npm run build`, `npm run check` 모두 통과.

---

## Post-approval 작업

1. 플랜을 `class-planner/docs/superpowers/plans/2026-04-17-phase5-b-design-consistency.md`로 이관.
2. 마스터 스펙 `docs/superpowers/specs/2026-04-17-phase5-stabilize-and-unify-design.md`의 P5-B 섹션에 링크 추가 + "전면 재작성" 방침 반영.
3. `superpowers:subagent-driven-development`로 Task 1부터 순차 진행:
   - Task 1 → 스펙 리뷰 → 코드 품질 리뷰 → Task 2 (B-3a와 병렬 가능) → Task 3a → Task 3b → Task 4.
   - 각 Task 완료 시 dev 머지 + CI SUCCESS 확인 후 다음.
