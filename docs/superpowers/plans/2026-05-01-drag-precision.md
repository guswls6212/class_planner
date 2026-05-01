# Drag Precision: Coordinate-Based Drop + Lane Highlight + Source Z-Elevation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix overlapping-lane drag precision via coordinate-based hit-test bypass, add visual lane highlight strip, and elevate the dragged block's z-index so it is always visually in front.

**Architecture:**
- **A (precision):** `TimeTableRow` container div gets `onDragOver` / `onDrop` handlers. A pure helper `coordsToDropTarget` converts `clientX/Y` to `{time, yPosition}` using the container's bounding rect. This fires from any child element (including the semi-transparent dragged session which has `pointer-events:auto`), completely bypassing the cell-level z-index/pointer-events hit-test limitation.
- **B (visual):** Two new absolutely-positioned overlays inside `TimeTableRow`: (1) 1px dashed lane-boundary lines while dragging, (2) a translucent accent-colored strip on the currently-targeted lane. Both are `pointer-events:none`.
- **C (z-elevation):** `getSessionBlockStyles` in `SessionBlock.utils.ts` returns `zIndex: 500` when `isDraggedSession && isAnyDragging`, keeping the source block visually above other blocks.

**Tech Stack:** React 19, Next.js 15, TypeScript 5, Vitest + RTL, HTML5 native drag

---

## File Map

| File | Change |
|---|---|
| `src/components/molecules/SessionBlock.utils.ts` | Task 1: z-index 500 for dragged session |
| `src/components/molecules/__tests__/SessionBlock.utils.test.ts` | Task 1: new test for z=500 |
| `src/components/molecules/TimeTableRow.tsx` | Task 2: export `coordsToDropTarget`, container dragover/drop; Task 3: lane overlays |
| `src/components/molecules/__tests__/TimeTableRow.test.tsx` | Task 2: coordsToDropTarget unit tests + container dragover integration; Task 3: lane highlight tests |

---

## Task 1: Elevate dragged session z-index to 500 (C)

**Files:**
- Modify: `src/components/molecules/SessionBlock.utils.ts:111`
- Test: `src/components/molecules/__tests__/SessionBlock.utils.test.ts`

- [ ] **Step 1: Write failing test**

Open `src/components/molecules/__tests__/SessionBlock.utils.test.ts`.
Inside the existing `describe("getSessionBlockStyles", ...)` block, add after the last test:

```ts
it("드래그 중인 세션(isDraggedSession=true, isAnyDragging=true)의 zIndex는 500이다", () => {
  const styles = getSessionBlockStyles(
    0, 120, 0, 2, "#3B82F6",
    /*isDragging*/ true, /*isDraggedSession*/ true, /*isAnyDragging*/ true
  );
  expect(styles.zIndex).toBe(500);
});

it("비드래그 세션의 zIndex는 100 + yPosition이다", () => {
  const styles = getSessionBlockStyles(
    0, 120, 0, 3, "#3B82F6",
    false, false, false
  );
  expect(styles.zIndex).toBe(103);
});

it("isAnyDragging=true이지만 isDraggedSession=false이면 zIndex는 100 + yPosition이다", () => {
  const styles = getSessionBlockStyles(
    0, 120, 0, 2, "#3B82F6",
    true, false, true
  );
  expect(styles.zIndex).toBe(102);
});
```

- [ ] **Step 2: Run test to verify it fails (RED)**

```bash
npx vitest run src/components/molecules/__tests__/SessionBlock.utils.test.ts --reporter=verbose 2>&1 | tail -15
```

Expected: 1-2 tests fail because `zIndex` is `102` not `500`.

- [ ] **Step 3: Implement — change z-index in getSessionBlockStyles**

In `src/components/molecules/SessionBlock.utils.ts`, line 111, change:

```ts
// BEFORE
zIndex: 100 + yPosition,

// AFTER — dragged session는 z=500으로 항상 최상위에 표시
// dragstart 이후 React 리렌더 시점 적용 → Chrome native drag 취소 없음 (pointer-events 불변 법칙 준수)
zIndex: (isDraggedSession && isAnyDragging) ? 500 : 100 + yPosition,
```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

```bash
npx vitest run src/components/molecules/__tests__/SessionBlock.utils.test.ts --reporter=verbose 2>&1 | tail -5
```

Expected: `Tests X passed (X)` — all pass.

- [ ] **Step 5: Full suite check**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/SessionBlock.utils.ts \
        src/components/molecules/__tests__/SessionBlock.utils.test.ts
git commit -m "feat(schedule): elevate dragged session z-index to 500 during drag

dragstart 이후 React 리렌더 시점에 적용 → Chrome native drag 취소 없음.
다른 블록(z=100+N) 위로 드래그 중인 블록이 항상 시각적으로 맨 앞.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Coordinate-based container dragover + drop (A)

**Files:**
- Modify: `src/components/molecules/TimeTableRow.tsx`
- Test: `src/components/molecules/__tests__/TimeTableRow.test.tsx`

### 2-A: Extract `coordsToDropTarget` helper (pure function)

- [ ] **Step 1: Write failing unit tests for coordsToDropTarget**

Add this new `describe` block at the bottom of `src/components/molecules/__tests__/TimeTableRow.test.tsx`:

```tsx
import { coordsToDropTarget } from "../TimeTableRow";

describe("coordsToDropTarget — 좌표→(time, yPosition) 변환", () => {
  const timeSlots = ["09:00", "09:30", "10:00", "10:30"];
  const SLOT_H = 32;
  const LANE_W = 40;
  const LANES = 3;
  const PAD = 10;

  it("x=0, y=0 → lane 1, 09:00", () => {
    const r = coordsToDropTarget(0, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 1 });
  });

  it("x=40, y=0 → lane 2, 09:00", () => {
    const r = coordsToDropTarget(40, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x=79, y=0 → still lane 2 (floor division)", () => {
    const r = coordsToDropTarget(79, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x=80, y=0 → lane 3", () => {
    const r = coordsToDropTarget(80, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 3 });
  });

  it("y=32 → 09:30 slot", () => {
    const r = coordsToDropTarget(0, 32, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:30", yPosition: 1 });
  });

  it("isDraggingToThis=true: x=10 → lane 1 (subtract PAD)", () => {
    const r = coordsToDropTarget(10, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, true);
    expect(r).toEqual({ time: "09:00", yPosition: 1 });
  });

  it("isDraggingToThis=true: x=50 → lane 2 (subtract PAD → 40)", () => {
    const r = coordsToDropTarget(50, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, true);
    expect(r).toEqual({ time: "09:00", yPosition: 2 });
  });

  it("x 범위 초과 → 마지막 lane으로 클램프", () => {
    const r = coordsToDropTarget(9999, 0, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "09:00", yPosition: 3 });
  });

  it("y 범위 초과 → 마지막 slot으로 클램프", () => {
    const r = coordsToDropTarget(0, 9999, LANE_W, LANES, SLOT_H, timeSlots, PAD, false);
    expect(r).toEqual({ time: "10:30", yPosition: 1 });
  });

  it("timeSlots가 비어있으면 null 반환", () => {
    const r = coordsToDropTarget(0, 0, LANE_W, LANES, SLOT_H, [], PAD, false);
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify RED**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableRow.test.tsx --reporter=verbose 2>&1 | grep -E "(FAIL|error|Cannot find)" | head -10
```

Expected: `SyntaxError` or `Cannot find name 'coordsToDropTarget'` — function doesn't exist yet.

- [ ] **Step 3: Add coordsToDropTarget to TimeTableRow.tsx**

At the TOP of `src/components/molecules/TimeTableRow.tsx`, after the import block but BEFORE the component, add:

```ts
/**
 * 커서 상대좌표(relX, relY)를 drop 대상 (time, yPosition)으로 변환한다.
 * 브라우저 hit-test(z-index/pointer-events)를 우회하여 픽셀 단위 정밀도 확보.
 * @param relX      - 컨테이너 left 기준 커서 X 오프셋 (px)
 * @param relY      - 컨테이너 top 기준 커서 Y 오프셋 (px)
 * @param laneWidth - 각 lane의 너비 (px)
 * @param effectiveLanes - 현재 렌더된 lane 수
 * @param slotHeightPx   - 1 slot(30분)의 높이 (px)
 * @param timeSlots      - timeSlots30Min 배열 (["09:00", "09:30", ...])
 * @param dragHoverPad   - isDraggingToThis일 때 좌측 패딩 (px)
 * @param isDraggingToThis - 이 컬럼이 드래그 타겟 컬럼인지
 */
export function coordsToDropTarget(
  relX: number,
  relY: number,
  laneWidth: number,
  effectiveLanes: number,
  slotHeightPx: number,
  timeSlots: string[],
  dragHoverPad: number,
  isDraggingToThis: boolean,
): { time: string; yPosition: number } | null {
  if (timeSlots.length === 0) return null;
  const adjustedX = Math.max(0, relX - (isDraggingToThis ? dragHoverPad : 0));
  const laneIdx = Math.min(Math.max(0, Math.floor(adjustedX / laneWidth)), effectiveLanes - 1);
  const timeIdx = Math.min(Math.max(0, Math.floor(relY / slotHeightPx)), timeSlots.length - 1);
  return { time: timeSlots[timeIdx], yPosition: laneIdx + 1 };
}
```

- [ ] **Step 4: Run coordsToDropTarget tests to verify GREEN**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableRow.test.tsx --reporter=verbose 2>&1 | grep -E "coordsToDropTarget|passed|failed" | tail -10
```

Expected: all `coordsToDropTarget` tests pass.

### 2-B: Wire container-level onDragOver + onDrop

- [ ] **Step 5: Add containerRef and handlers to the TimeTableRow component**

In `src/components/molecules/TimeTableRow.tsx`, inside the `TimeTableRow` component body, add `containerRef` right after the `isPopoverOpen` state line:

```tsx
const containerRef = React.useRef<HTMLDivElement>(null);
```

Then add two handler functions after `handleToggleExpand`:

```tsx
// 컨테이너 레벨 dragover — 커서 좌표로 (time, yPosition) 직접 계산.
// 드래그 중인 세션(pointer-events:auto)이 셀을 가로막아도 이 이벤트는 항상 버블링으로 도달.
const handleContainerDragOver = React.useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAnyDragging) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !onDragOver) return;
    const target = coordsToDropTarget(
      e.clientX - rect.left,
      e.clientY - rect.top,
      laneWidth,
      effectiveLanes,
      SLOT_HEIGHT_PX,
      timeSlots30Min,
      DRAG_HOVER_PAD,
      isDraggingToThis,
    );
    if (target) onDragOver(weekday, target.time, target.yPosition);
  },
  [isAnyDragging, laneWidth, effectiveLanes, timeSlots30Min, isDraggingToThis, weekday, onDragOver],
);

// 컨테이너 레벨 onDrop — 셀이 drop을 받지 못한 경우의 fallback.
// (셀은 stopPropagation하므로 셀이 받으면 이 핸들러는 발화 안 함)
const handleContainerDrop = React.useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAnyDragging) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = coordsToDropTarget(
      e.clientX - rect.left,
      e.clientY - rect.top,
      laneWidth,
      effectiveLanes,
      SLOT_HEIGHT_PX,
      timeSlots30Min,
      DRAG_HOVER_PAD,
      isDraggingToThis,
    );
    if (!target) return;
    const data = e.dataTransfer?.getData("text/plain");
    if (data?.startsWith("session:")) {
      const sessionId = data.replace("session:", "");
      if (onSessionDrop) onSessionDrop(sessionId, weekday, target.time, target.yPosition);
    } else if (data) {
      if (onDrop) onDrop(weekday, target.time, data);
    }
  },
  [isAnyDragging, laneWidth, effectiveLanes, timeSlots30Min, isDraggingToThis,
   weekday, onDrop, onSessionDrop],
);
```

Then, attach ref and handlers to the column container div. Find the return statement's outer div:

```tsx
// BEFORE
<div
  className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
  data-testid={`time-table-column-${weekday}`}
  data-weekday={weekday}
  style={{ ... }}
>

// AFTER — add ref, onDragOver, onDrop
<div
  ref={containerRef}
  className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
  data-testid={`time-table-column-${weekday}`}
  data-weekday={weekday}
  onDragOver={handleContainerDragOver}
  onDrop={handleContainerDrop}
  style={{ ... }}
>
```

- [ ] **Step 6: Run full TimeTableRow tests to verify no regressions**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableRow.test.tsx --reporter=verbose 2>&1 | tail -5
```

Expected: `Tests 40 passed (40)` — no failures.

- [ ] **Step 7: Commit**

```bash
git add src/components/molecules/TimeTableRow.tsx \
        src/components/molecules/__tests__/TimeTableRow.test.tsx
git commit -m "feat(schedule): coordinate-based dragover on column container

드래그 중인 세션(pointer-events:auto, z=500)이 셀을 가로막아도
컨테이너 레벨 dragover가 버블링으로 도달.
clientX/Y → (time, yPosition) 좌표 계산으로 픽셀 단위 정밀도 확보.
컨테이너 onDrop: 셀이 받지 못한 drop의 fallback 처리.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Lane boundary lines + target lane highlight strip (B)

**Files:**
- Modify: `src/components/molecules/TimeTableRow.tsx`
- Test: `src/components/molecules/__tests__/TimeTableRow.test.tsx`

- [ ] **Step 1: Write failing tests**

Add this `describe` block at the bottom of `src/components/molecules/__tests__/TimeTableRow.test.tsx`:

```tsx
describe("드래그 중 레인 시각화 — 경계선 + 하이라이트", () => {
  const makeSession = (id: string, yPos: number) =>
    ({
      id, subjectId: "550e8400-e29b-41d4-a716-446655440101",
      startsAt: "09:00", endsAt: "10:00", weekStartDate: "",
      enrollmentIds: ["550e8400-e29b-41d4-a716-446655440301"],
      weekday: 0, yPosition: yPos,
    }) as Session;

  const twoSessionMap = () => {
    const m = new Map<number, Session[]>();
    m.set(0, [makeSession("s1", 1), makeSession("s2", 2)]);
    return m;
  };

  const dragPreviewAt = (targetWeekday: number | null, yPos: number | null) => ({
    draggedSession: makeSession("s1", 1),
    targetWeekday,
    targetTime: "09:00",
    targetYPosition: yPos,
  });

  it("드래그 중 effectiveLanes>=2이면 lane-boundary-0 렌더된다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        sessions={twoSessionMap()}
        dragPreview={dragPreviewAt(1, 1)}
      />
    );
    expect(screen.getByTestId("lane-boundary-0")).toBeInTheDocument();
  });

  it("드래그 안 하면 lane-boundary 없다", () => {
    render(<TimeTableRow {...defaultProps} sessions={twoSessionMap()} />);
    expect(screen.queryByTestId("lane-boundary-0")).not.toBeInTheDocument();
  });

  it("targetWeekday===weekday && targetYPosition!=null → lane-highlight 렌더된다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        dragPreview={dragPreviewAt(0, 2)}
      />
    );
    expect(screen.getByTestId("lane-highlight")).toBeInTheDocument();
  });

  it("targetWeekday!==weekday → lane-highlight 없다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        dragPreview={dragPreviewAt(1, 2)}
      />
    );
    expect(screen.queryByTestId("lane-highlight")).not.toBeInTheDocument();
  });

  it("targetYPosition=null → lane-highlight 없다", () => {
    render(
      <TimeTableRow
        {...defaultProps}
        weekday={0}
        sessions={twoSessionMap()}
        dragPreview={dragPreviewAt(0, null)}
      />
    );
    expect(screen.queryByTestId("lane-highlight")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify RED**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableRow.test.tsx --reporter=verbose 2>&1 | grep -E "lane-boundary|lane-highlight|FAIL|failed" | tail -10
```

Expected: 4-5 tests fail — elements not found.

- [ ] **Step 3: Add lane overlay elements to TimeTableRow.tsx**

Inside the TimeTableRow return JSX, add the following TWO blocks immediately **before the drop cells section** (find `{/* Drop cells — timeSlots × effectiveLanes */}`):

```tsx
{/* 드래그 중 레인 경계선 — 어느 lane으로 떨어질지 시각적 힌트 */}
{isDragging && effectiveLanes >= 2 && (
  Array.from({ length: effectiveLanes - 1 }, (_, i) => (
    <div
      key={`lane-bound-${i}`}
      data-testid={`lane-boundary-${i}`}
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: (i + 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
        width: 1,
        background: "rgba(255,255,255,0.10)",
        zIndex: 94,
      }}
    />
  ))
)}

{/* 드래그 중 타겟 레인 하이라이트 — 현재 커서가 가리키는 lane 강조 */}
{isDragging && dragPreview?.targetWeekday === weekday && dragPreview?.targetYPosition != null && (
  <div
    data-testid="lane-highlight"
    className="absolute top-0 bottom-0 pointer-events-none"
    style={{
      left: (dragPreview.targetYPosition - 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
      width: laneWidth,
      background: "rgba(99,179,237,0.10)",
      borderLeft: "1.5px solid rgba(99,179,237,0.35)",
      borderRight: "1.5px solid rgba(99,179,237,0.35)",
      zIndex: 95,
    }}
  />
)}
```

- [ ] **Step 4: Run tests to verify GREEN**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableRow.test.tsx --reporter=verbose 2>&1 | tail -5
```

Expected: all tests pass (`Tests 45+ passed`).

- [ ] **Step 5: Full suite + tsc + build**

```bash
npm run check 2>&1 | grep -E "Tests|passed|failed|Compiled|error TS" | tail -5
```

Expected: all tests pass, tsc clean, build success.

- [ ] **Step 6: Playwright UI verification**

Start dev server (`npm run dev`), navigate to `http://localhost:3000/schedule`, verify:
1. Existing sessions display correctly (no visual regressions)
2. (Optional) If there are overlapping sessions: drag a session and confirm the column shows boundary lines + highlight strip

Take a screenshot. Shut down dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/molecules/TimeTableRow.tsx \
        src/components/molecules/__tests__/TimeTableRow.test.tsx
git commit -m "feat(schedule): lane boundary lines + target lane highlight during drag

드래그 중:
- effectiveLanes>=2면 lane 사이에 1px 반투명 경계선 표시
- 현재 커서 laneIdx에 accent 색 스트립 오버레이 (pointer-events:none)
  → 어느 lane으로 떨어질지 즉시 파악 가능

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin feat/drag-ux-precision
gh pr create --base dev \
  --title "feat(schedule): drag precision — coordinate drop + lane highlight + z-elevation" \
  --body "..."
```

- [ ] **Step 2: CI 통과 확인 후 dev 머지**

```bash
bash ../scripts/pr-merge-cycle.sh <PR_NUMBER>
```

---

## Verification Checklist

| Check | How |
|---|---|
| `coordsToDropTarget` unit tests pass | `npx vitest run` — confirm GREEN |
| No existing test regressions | `npm run check` — 1872+ tests pass |
| tsc clean | `npm run check` — no TS errors |
| Build success | `npm run check` — production build ✓ |
| Visual: boundary lines appear during drag | Playwright MCP screenshot |
| Visual: highlight strip follows cursor lane | computer-use drag exploration |
