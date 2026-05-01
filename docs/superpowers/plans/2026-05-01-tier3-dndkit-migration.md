# Tier 3: @dnd-kit Migration — Mobile Drag + Pointer Events

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace HTML5 native drag with @dnd-kit (Pointer Events API) so session blocks are draggable on both desktop and mobile touch screens.

**Architecture:**
- `DndContext` in `TimeTableGrid` owns all drag state via sensors (PointerSensor + TouchSensor). It feeds `useDragController` via onDragStart/Over/End callbacks — the existing `computeTentativeLayout`/`DragGhost` preview pipeline is **unchanged**. Session block grips become `useDraggable`, per-slot cells become `useDroppable`. A `DragOverlay` renders a floating card following the cursor/finger. Student-chip (enrollment) drag stays as HTML5 and coexists without conflict because dnd-kit uses Pointer Events, not the drag-and-drop API.

**Tech Stack:** React 19, Next.js 15, TypeScript 5, @dnd-kit/core, @dnd-kit/utilities, Vitest + RTL

---

## Scope Check

Tasks 1→5 are sequential (each depends on the previous). This is one coherent feature — do not split.

**Deferred (not in this plan):**
- Student chip (enrollment) drag → dnd-kit (keep HTML5 for now)
- Sortable lane reordering (not currently a feature)

---

## File Map

| File | Change |
|---|---|
| `package.json` | Task 1: add @dnd-kit/core, @dnd-kit/utilities |
| `src/components/molecules/DragOverlayCard.tsx` | Task 2: NEW — floating card shown in DragOverlay |
| `src/components/organisms/TimeTableGrid.tsx` | Task 2: DndContext + sensors + onDragEnd drop handler + DragOverlay |
| `src/components/molecules/SessionBlock.tsx` | Task 3: grip → useDraggable, remove HTML5 handlers |
| `src/components/molecules/TimeTableCell.tsx` | Task 4: add useDroppable, remove session dragover/drop |
| `src/components/molecules/HiddenSessionsPopover.tsx` | Task 4: cards → useDraggable |
| `src/components/molecules/TimeTableRow.tsx` | Task 5: remove container handlers, remove HTML5 props |
| `src/hooks/useDragController.ts` | Task 5: remove document dragend listener |
| `src/components/molecules/__tests__/SessionBlock.test.tsx` | Task 5: update drag tests |
| `src/components/molecules/__tests__/TimeTableCell.test.tsx` | Task 5: update drag tests |

---

## Task 1: Install @dnd-kit packages

**Files:** `package.json`

- [ ] **Step 1: Install packages**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm install @dnd-kit/core @dnd-kit/utilities
```

Expected output: packages added, no peer dependency errors.

- [ ] **Step 2: Verify types resolve**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: no output (clean) or pre-existing errors only.

- [ ] **Step 3: Run full test suite to confirm no breakage**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: all 1890 tests pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): install @dnd-kit/core and @dnd-kit/utilities

Pointer Events 기반 드래그 라이브러리 도입 — 모바일 드래그 지원 예정.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: DndContext shell + DragOverlayCard

Wrap `TimeTableGrid` with `DndContext`. Wire `onDragStart/Over/End` to `useDragController`. Add `DragOverlay` with a simple floating card. **No behavior change yet** because SessionBlock still uses HTML5 and cells have no `useDroppable`.

**Files:**
- Create: `src/components/molecules/DragOverlayCard.tsx`
- Modify: `src/components/organisms/TimeTableGrid.tsx`

### Step 2-A: Create DragOverlayCard

- [ ] **Step 1: Write test for DragOverlayCard**

Create `src/components/molecules/__tests__/DragOverlayCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import DragOverlayCard from "../DragOverlayCard";
import type { Session, Subject } from "@/lib/planner";

describe("DragOverlayCard", () => {
  const session: Session = {
    id: "s1",
    subjectId: "sub-1",
    weekday: 0,
    startsAt: "09:00",
    endsAt: "10:00",
    weekStartDate: "",
    yPosition: 1,
  };
  const subjects: Subject[] = [
    { id: "sub-1", name: "수학", color: "#3B82F6" },
  ];

  it("과목명을 렌더한다", () => {
    render(<DragOverlayCard session={session} subjects={subjects} />);
    expect(screen.getByText("수학")).toBeInTheDocument();
  });

  it("시간을 렌더한다", () => {
    render(<DragOverlayCard session={session} subjects={subjects} />);
    expect(screen.getByText("09:00-10:00")).toBeInTheDocument();
  });

  it("과목 색상을 배경으로 사용한다", () => {
    const { container } = render(<DragOverlayCard session={session} subjects={subjects} />);
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toContain("3B82F6");
  });
});
```

- [ ] **Step 2: Run to verify RED**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npx vitest run src/components/molecules/__tests__/DragOverlayCard.test.tsx 2>&1 | tail -5
```

Expected: fail — file does not exist.

- [ ] **Step 3: Create DragOverlayCard.tsx**

```tsx
// src/components/molecules/DragOverlayCard.tsx
import type { Session, Subject } from "@/lib/planner";

interface DragOverlayCardProps {
  session: Session;
  subjects: Subject[];
}

export default function DragOverlayCard({ session, subjects }: DragOverlayCardProps) {
  const subject = subjects.find((s) => s.id === session.subjectId);
  const color = subject?.color ?? "#888";

  return (
    <div
      className="rounded text-white text-[12px] font-semibold shadow-xl opacity-90 flex flex-col justify-center px-2 py-1 pointer-events-none"
      style={{ background: color, width: 120, minHeight: 56 }}
    >
      <div className="truncate">{subject?.name ?? ""}</div>
      <div className="text-[10px] opacity-80">
        {session.startsAt}-{session.endsAt}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify GREEN**

```bash
npx vitest run src/components/molecules/__tests__/DragOverlayCard.test.tsx 2>&1 | tail -4
```

Expected: `Tests 3 passed (3)`.

### Step 2-B: DndContext in TimeTableGrid

- [ ] **Step 5: Write failing test for DndContext onDragEnd → onSessionDrop**

In `src/components/organisms/__tests__/TimeTableGrid.test.tsx`, add after existing tests:

```tsx
import { describe, it, expect, vi } from "vitest";
// Add this import at the top of the file if not present:
// import { render, screen } from "@testing-library/react";

describe("DndContext — onSessionDrop via dnd-kit onDragEnd", () => {
  it("DndContext wrapper가 렌더된 그리드에 존재한다", () => {
    render(
      <TimeTableGrid
        sessions={new Map()}
        subjects={[]}
        enrollments={[]}
        students={[]}
        onSessionClick={vi.fn()}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );
    // DndContext doesn't add a DOM element, but the grid should still render
    expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run to verify it passes (baseline)**

```bash
npx vitest run src/components/organisms/__tests__/TimeTableGrid.test.tsx 2>&1 | tail -4
```

Expected: passes (this is just a baseline — DndContext wrapping doesn't change DOM).

- [ ] **Step 7: Add DndContext to TimeTableGrid.tsx**

In `src/components/organisms/TimeTableGrid.tsx`:

**Add imports** at the top (after existing imports):

```tsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import DragOverlayCard from "../molecules/DragOverlayCard";
```

**Inside the component**, add sensors (after `const dragController = useDragController();`):

```tsx
// dnd-kit sensors: PointerSensor (desktop + mobile), TouchSensor (long-press fallback)
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
);

// session lookup by id — used in onDragStart
const sessionById = useMemo(() => {
  const map = new Map<string, Session>();
  sessions?.forEach((daySessions) => daySessions.forEach((s) => map.set(s.id, s)));
  return map;
}, [sessions]);

const handleDndDragStart = useCallback(
  ({ active }: DragStartEvent) => {
    const session = sessionById.get(active.id as string);
    if (session) dragController.startSessionDrag(session);
  },
  [sessionById, dragController],
);

const handleDndDragOver = useCallback(
  ({ over }: DragOverEvent) => {
    if (!over) { dragController.leaveTarget(); return; }
    // over.id format: "weekday:time:yPosition"
    const parts = (over.id as string).split(":");
    if (parts.length < 3) return;
    const [wd, time, yPos] = parts;
    dragController.hoverTarget(Number(wd), time, Number(yPos));
  },
  [dragController],
);

const handleDndDragEnd = useCallback(
  ({ active, over }: DragEndEvent) => {
    if (over && onSessionDrop) {
      const sessionId = active.id as string;
      const parts = (over.id as string).split(":");
      if (parts.length >= 3) {
        const [wd, time, yPos] = parts;
        onSessionDrop(sessionId, Number(wd), time, Number(yPos));
      }
      dragController.completeDrop();
    } else {
      dragController.cancelDrag();
    }
    // 드래그 후 스크롤 위치 복원
    requestAnimationFrame(() => {
      const element = gridRef.current;
      if (element) {
        const savedPosition = getSavedScrollPosition();
        if (savedPosition) {
          element.scrollLeft = savedPosition.scrollLeft;
          element.scrollTop = savedPosition.scrollTop;
        }
      }
    });
  },
  [dragController, onSessionDrop, getSavedScrollPosition],
);
```

**Wrap the return** JSX: replace the outer `<div className="time-table-container" ...>` wrapper with DndContext:

```tsx
return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDndDragStart}
    onDragOver={handleDndDragOver}
    onDragEnd={handleDndDragEnd}
  >
    <div
      className="time-table-container"
      data-testid="time-table-grid"
    >
      {/* existing grid <div ref=...>, DragOverlay at the end */}
      {/* ... all existing content ... */}
      <DragOverlay>
        {dragController.draggedSession ? (
          <DragOverlayCard
            session={dragController.draggedSession}
            subjects={subjects}
          />
        ) : null}
      </DragOverlay>
    </div>
  </DndContext>
);
```

The `DragOverlay` should be placed as the LAST child inside the outer `<div className="time-table-container">` div, just before the closing `</div>`. Put it after the virtual scrollbar block.

- [ ] **Step 8: Run full suite**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: all 1890+ tests pass (behavior unchanged so far — cells have no useDroppable, grips still use HTML5).

- [ ] **Step 9: Commit**

```bash
git add src/components/molecules/DragOverlayCard.tsx \
        src/components/molecules/__tests__/DragOverlayCard.test.tsx \
        src/components/organisms/TimeTableGrid.tsx
git commit -m "feat(schedule): DndContext shell + DragOverlayCard (Tier 3 infra)

DndContext wraps TimeTableGrid with PointerSensor+TouchSensor.
onDragStart/Over/End feed useDragController (existing preview pipeline unchanged).
DragOverlay renders floating DragOverlayCard during drag.
No behavior change yet — cells/grips still HTML5.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: SessionBlock grip → useDraggable

Replace the HTML5 `draggable={true}` on the grip div with dnd-kit's `useDraggable`. Mobile drag now works (PointerSensor handles touch).

**Files:**
- Modify: `src/components/molecules/SessionBlock.tsx`
- Modify: `src/components/molecules/__tests__/SessionBlock.test.tsx`

- [ ] **Step 1: Write failing tests**

In `src/components/molecules/__tests__/SessionBlock.test.tsx`, update and add in the `describe("2C 드래그 핸들")` block.

Find the test `"drag-handle 요소는 draggable=true이다"` and REPLACE it with:

```tsx
it("drag-handle 요소는 dnd-kit useDraggable attribute를 갖는다", () => {
  render(<SessionBlock {...baseProps} />);
  const handle = screen.getByTestId("session-drag-handle");
  // dnd-kit useDraggable adds role="button" and tabindex to the handle
  expect(handle).toBeInTheDocument();
  // draggable=true는 HTML5 속성 — dnd-kit 전환 후 없어야 함
  expect(handle).not.toHaveAttribute("draggable", "true");
});
```

Also update the drag handler tests (find `"onDragStart가 드래그 핸들에서 시작 시 호출되어야 한다"` and the equivalent End test). With dnd-kit, the HTML5 `fireEvent.dragStart` on the handle no longer triggers our callback. Replace with a note and a smoke test:

```tsx
it("drag handle이 렌더되고 pointer 이벤트를 받을 수 있다", () => {
  const onDragStart = vi.fn();
  render(<SessionBlock {...baseProps} onDragStart={onDragStart} />);
  const handle = screen.getByTestId("session-drag-handle");
  // dnd-kit uses pointer events — HTML5 fireEvent.dragStart no longer applies
  // verify handle is present and interactable
  expect(handle).toBeInTheDocument();
  expect(handle).not.toHaveAttribute("draggable", "true");
});
```

(Remove the old `fireEvent.dragStart` / `fireEvent.dragEnd` tests from the 2C block entirely.)

- [ ] **Step 2: Run to verify RED**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npx vitest run src/components/molecules/__tests__/SessionBlock.test.tsx --reporter=verbose 2>&1 | grep -E "FAIL|failed" | tail -5
```

Expected: 2-3 tests fail — "draggable=true expected, got false" or similar.

- [ ] **Step 3: Convert grip to useDraggable in SessionBlock.tsx**

In `src/components/molecules/SessionBlock.tsx`:

**Add import** at the top:
```tsx
import { useDraggable } from "@dnd-kit/core";
```

**Add hook** inside the component body (after existing hooks):
```tsx
const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({
  id: session.id,
  disabled: isReadOnly,
  data: { session },
});
```

**Replace the grip div** (find `data-testid="session-drag-handle"`):

```tsx
{/* BEFORE: */}
{!isMobile && !isReadOnly && (
  <div
    draggable={true}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onClick={(e) => e.stopPropagation()}
    data-testid="session-drag-handle"
    className="absolute top-1 left-0.5 z-[2] flex flex-col gap-[2px] p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
    aria-label="드래그하여 이동"
  >
    ...dots...
  </div>
)}

{/* AFTER: */}
{!isReadOnly && (
  <div
    ref={setDragRef}
    {...attributes}
    {...listeners}
    onClick={(e) => e.stopPropagation()}
    data-testid="session-drag-handle"
    className="absolute top-1 left-0.5 z-[2] flex flex-col gap-[2px] p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
    aria-label="드래그하여 이동"
  >
    {[0, 1, 2].map((row) => (
      <div key={row} className="flex gap-[2px]">
        {[0, 1].map((col) => (
          <div key={col} className="w-[3px] h-[3px] rounded-full bg-current opacity-80" />
        ))}
      </div>
    ))}
  </div>
)}
```

**Note:** `isMobile` check is removed — dnd-kit's sensors handle mobile/desktop uniformly.

**Remove** `handleDragStart` and `handleDragEnd` functions (the HTML5 ones) from the component. Also remove the `cardRef` since `setDragImage` is no longer needed — dnd-kit uses `DragOverlay`.

**Remove** from `<button>`:
- `ref={cardRef}` (no longer needed)

**Keep** `handleClick`, `onTouchStart`, `onTouchMove`, `onTouchEnd` on the button (for long-press context menu on mobile other than drag).

- [ ] **Step 4: Run to verify GREEN**

```bash
npx vitest run src/components/molecules/__tests__/SessionBlock.test.tsx 2>&1 | tail -4
```

Expected: all tests pass.

- [ ] **Step 5: Full suite**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/molecules/SessionBlock.tsx \
        src/components/molecules/__tests__/SessionBlock.test.tsx
git commit -m "feat(schedule): SessionBlock grip → useDraggable (Tier 3)

HTML5 draggable 제거, dnd-kit useDraggable 적용.
isMobile 게이트 제거 — TouchSensor가 모바일 드래그 처리.
DragOverlay가 floating card 제공하므로 setDragImage/cardRef 불필요.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: TimeTableCell → useDroppable + HiddenSessionsPopover

Replace cell HTML5 drag handlers (session path) with `useDroppable`. Keep `onDrop` for enrollment (HTML5 student chip drag). Also convert `HiddenSessionsPopover` mini-cards to `useDraggable`.

**Files:**
- Modify: `src/components/molecules/TimeTableCell.tsx`
- Modify: `src/components/molecules/__tests__/TimeTableCell.test.tsx`
- Modify: `src/components/molecules/HiddenSessionsPopover.tsx`

### Step 4-A: TimeTableCell → useDroppable

- [ ] **Step 1: Write failing test**

In `src/components/molecules/__tests__/TimeTableCell.test.tsx`, add at the end:

```tsx
describe("useDroppable — dnd-kit 드롭 영역", () => {
  it("셀 div에 data-drop-zone 속성이 있다 (droppable 등록 확인)", () => {
    render(
      <TimeTableCell
        weekday={0}
        time="09:00"
        yPosition={1}
        onDrop={vi.fn()}
        onEmptySpaceClick={vi.fn()}
      />
    );
    const cell = screen.getByTestId("time-table-cell-0-09:00");
    expect(cell).toHaveAttribute("data-drop-zone", "true");
  });

  it("셀이 onDragOver 없이도 렌더된다 (HTML5 dragover 제거 확인)", () => {
    // onDragOver prop이 없어도 오류 없이 렌더 가능해야 함
    expect(() =>
      render(
        <TimeTableCell
          weekday={0}
          time="10:00"
          yPosition={2}
          onDrop={vi.fn()}
          onEmptySpaceClick={vi.fn()}
        />
      )
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify both pass (they already should since cell renders fine)**

```bash
npx vitest run src/components/molecules/__tests__/TimeTableCell.test.tsx 2>&1 | tail -4
```

Expected: pass (baseline).

- [ ] **Step 3: Convert TimeTableCell to useDroppable**

In `src/components/molecules/TimeTableCell.tsx`:

**Add import:**
```tsx
import { useDroppable } from "@dnd-kit/core";
```

**Replace prop interface** — remove `onDragOver`, `isAnyDragging`, `isDragging`, `dragPreview` (they were passed but not visually used):

```tsx
interface TimeTableCellProps {
  weekday: number;
  time: string;
  yPosition?: number;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (sessionId: string, weekday: number, time: string, yPosition: number) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  style?: React.CSSProperties;
  isReadOnly?: boolean;
}
```

**Replace component body:**

```tsx
export default function TimeTableCell({
  weekday,
  time,
  yPosition = 1,
  onDrop,
  onEmptySpaceClick,
  style,
  isReadOnly = false,
}: TimeTableCellProps) {
  // dnd-kit drop zone — id format: "weekday:time:yPosition"
  const dropId = `${weekday}:${time}:${yPosition}`;
  const { setNodeRef } = useDroppable({ id: dropId });

  // HTML5 drop kept for enrollment (student chip) drag
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnly) return;
    const data = e.dataTransfer?.getData("text/plain");
    if (!data || data.startsWith("session:")) return; // session drops handled by DndContext
    if (e.dataTransfer && typeof e.dataTransfer.clearData === "function") {
      e.dataTransfer.clearData();
    }
    onDrop(weekday, time, data);
  };

  // onDragOver required so browser accepts HTML5 enrollment drops
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = () => {
    if (isReadOnly) return;
    onEmptySpaceClick(weekday, time);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, cursor: "pointer", pointerEvents: "auto" as const }}
      data-testid={`time-table-cell-${weekday}-${time}`}
      data-drop-zone="true"
      data-weekday={weekday}
      data-time={time}
      data-y-position={yPosition}
      draggable={false}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    />
  );
}
```

- [ ] **Step 4: Update TimeTableCell tests**

In `src/components/molecules/__tests__/TimeTableCell.test.tsx`:

Find the test `"dragOver 이벤트가 onSessionDrop을 호출하지 않아야 한다"` (or similar session dragover tests) and **remove** tests that do `fireEvent.drop(cell, createDragEvent("drop", "session:abc"))` and expect `onSessionDrop` to be called — session drops now happen in DndContext, not cell-level.

**Keep:**
- Click tests (unchanged)
- Enrollment drop test (HTML5 `onDrop` still handles it)
- Any non-session tests

**Replace** session drop test with:
```tsx
it("session: 프리픽스 drop은 무시된다 (DndContext가 처리)", () => {
  const onSessionDrop = vi.fn();
  render(
    <TimeTableCell
      weekday={0}
      time="09:00"
      yPosition={1}
      onDrop={vi.fn()}
      onEmptySpaceClick={vi.fn()}
    />
  );
  const cell = screen.getByTestId("time-table-cell-0-09:00");
  const dropEvent = createDragEvent("drop", "session:test-id");
  fireEvent.drop(cell, dropEvent);
  expect(onSessionDrop).not.toHaveBeenCalled();
});
```

- [ ] **Step 5: Update TimeTableRow.tsx — remove onSessionDrop from cell props and onDragOver**

In `src/components/molecules/TimeTableRow.tsx`, find the `<TimeTableCell>` render block and remove:
- `onSessionDrop={onSessionDrop}` (no longer handled at cell level)
- `onDragOver={onDragOver}` (no longer handled at cell level; dnd-kit handles via DndContext)
- `isAnyDragging={isAnyDragging}` (prop removed)
- `isDragging={isDragging}` (prop removed)
- `dragPreview={dragPreview}` (prop removed from cell)

Keep only:
```tsx
<TimeTableCell
  key={`${timeString}-${yPosition}`}
  weekday={weekday}
  time={timeString}
  yPosition={yPosition}
  onDrop={onDrop}
  onEmptySpaceClick={onEmptySpaceClick}
  isReadOnly={isReadOnly}
  style={{ ... }}
/>
```

- [ ] **Step 6: Run full suite**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: all tests pass. Fix any TypeScript errors from removed props.

### Step 4-B: HiddenSessionsPopover → useDraggable

- [ ] **Step 7: Convert HiddenSessionsPopover cards**

In `src/components/molecules/HiddenSessionsPopover.tsx`:

**Add import:**
```tsx
import { useDraggable } from "@dnd-kit/core";
```

**Replace the mini-card div** with a component that uses `useDraggable`. Create an inner component:

```tsx
function DraggableSessionCard({
  session,
  subjects,
  enrollments,
  students,
  onDragEnd,
}: {
  session: Session;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  onDragEnd: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: session.id,
    data: { session },
  });

  const subject = subjects.find((s) => s.id === session.subjectId);
  const studentNames = (session.enrollmentIds ?? [])
    .map((eid) => {
      const enr = enrollments.find((e) => e.id === eid);
      return students.find((s) => s.id === enr?.studentId)?.name;
    })
    .filter(Boolean) as string[];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      data-testid={`overflow-popover-session-${session.id}`}
      className="flex items-start gap-1.5 px-3 py-1.5 cursor-grab hover:bg-[var(--color-bg-hover)] active:cursor-grabbing"
      style={{ userSelect: "none" }}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="mt-[3px] shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: subject?.color ?? "#888" }}
      />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold text-[var(--color-text-primary)] truncate leading-tight">
          {subject?.name ?? ""}
        </div>
        <div className="text-[9px] text-[var(--color-text-secondary)] leading-tight">
          {session.startsAt}–{session.endsAt}
        </div>
        {studentNames.length > 0 && (
          <div className="text-[9px] text-[var(--color-text-secondary)] truncate leading-tight">
            {studentNames.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
```

In `HiddenSessionsPopover`, replace the `hiddenSessions.map(...)` section to use `DraggableSessionCard` instead of the old `handleDragStart`-based div.

**Remove** `onDragStart`, `onDragEnd` props from `HiddenSessionsPopoverProps` (dnd-kit handles these). Keep `onClose` and `onExpandAll`.

**Update the existing test** in `TimeTableRow.test.tsx` for `"popover 내 숨겨진 세션 mini-card는 draggable이다"`:

```tsx
it("popover 내 숨겨진 세션 mini-card는 dnd-kit draggable이다 (draggable attr 없음)", () => {
  // dnd-kit useDraggable uses pointer events, not HTML5 draggable attribute
  // verify card renders and is interactable
  const sessions = new Map<number, Session[]>();
  sessions.set(0, [
    makeSession("s1", 1),
    makeSession("s2", 2),
    makeSession("s3", 3),
    makeSession("s4", 4),
  ]);
  render(<TimeTableRow {...defaultProps} sessions={sessions} />);
  fireEvent.click(screen.getByTestId("overflow-expand-btn-0"));
  const card = screen.getByTestId("overflow-popover-session-s4");
  expect(card).toBeInTheDocument();
  // dnd-kit grips do NOT use HTML5 draggable attribute
  expect(card).not.toHaveAttribute("draggable", "true");
});
```

- [ ] **Step 8: Run full suite**

```bash
npx vitest run 2>&1 | tail -4
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/molecules/TimeTableCell.tsx \
        src/components/molecules/HiddenSessionsPopover.tsx \
        src/components/molecules/TimeTableRow.tsx \
        src/components/molecules/__tests__/TimeTableCell.test.tsx \
        src/components/molecules/__tests__/TimeTableRow.test.tsx
git commit -m "feat(schedule): TimeTableCell → useDroppable + HiddenSessionsPopover → useDraggable

Session drop: DndContext.onDragEnd 처리로 이전 (cell 레벨 onDrop 제거).
Enrollment(학생 chip) HTML5 drop: onDrop 유지.
HiddenSessionsPopover: mini-card를 useDraggable로 전환.
isMobile 제약 제거 → 모바일에서도 popover 카드 드래그 가능.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Cleanup — remove HTML5 residuals + enable mobile

Remove remaining HTML5 drag code, the `isTouchDevice` gate, the container-level handlers, and the `document.addEventListener("dragend")` fallback that dnd-kit makes redundant.

**Files:**
- Modify: `src/hooks/useDragController.ts`
- Modify: `src/components/molecules/TimeTableRow.tsx`
- Modify: `src/components/organisms/TimeTableGrid.tsx`

- [ ] **Step 1: Remove dragend listener from useDragController**

In `src/hooks/useDragController.ts`, remove the `useEffect` that listens for `document.addEventListener("dragend", reset)`:

```tsx
// REMOVE this entire useEffect:
useEffect(() => {
  const reset = () => dispatch({ type: "CANCEL" });
  document.addEventListener("dragend", reset);
  return () => document.removeEventListener("dragend", reset);
}, []);
```

dnd-kit's sensors handle this — if the pointer leaves the window during drag, TouchSensor/PointerSensor fires cancel.

- [ ] **Step 2: Update useDragController test**

In `src/hooks/__tests__/useDragController.test.ts`, find and **remove** any test that does:
```ts
act(() => { document.dispatchEvent(new Event("dragend")); });
expect(result.current.isAnyDragging()).toBe(false);
```

- [ ] **Step 3: Remove container-level handlers from TimeTableRow**

In `src/components/molecules/TimeTableRow.tsx`:

**Remove** `handleContainerDragOver` and `handleContainerDrop` useCallback functions (they were HTML5 fallbacks for the precision issue, now replaced by dnd-kit collision detection).

**Remove** from the container div:
- `onDragOver={handleContainerDragOver}`
- `onDrop={handleContainerDrop}`

Keep `ref={containerRef}` if anything else uses it, otherwise remove it too. Check — `coordsToDropTarget` is still exported but only the container handlers used `containerRef`. Remove `containerRef` too.

- [ ] **Step 4: Remove isTouchDevice gate in TimeTableGrid**

In `src/components/organisms/TimeTableGrid.tsx`:

**Remove** `isTouchDevice` detection line:
```tsx
// REMOVE:
const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;
```

**Remove** the `handleDragStart`, `handleDragOver`, `handleDragEnd` HTML5 callbacks (the old ones that called `dragController.startSessionDrag` etc. — they're now done by `handleDndDragStart/Over/End`).

**Update TimeTableRow props** in the render — remove:
- `onDragStart={isTouchDevice ? undefined : handleDragStart}`
- `onDragOver={isTouchDevice ? undefined : handleDragOver}`
- `onDragEnd={isTouchDevice ? undefined : handleDragEnd}`
- `dragPreview={isTouchDevice ? undefined : {...}}` → always pass dragPreview

Change to:
```tsx
<TimeTableRow
  ...
  isAnyDragging={dragController.isAnyDragging() || isStudentDragging}
  dragPreview={{
    draggedSession: dragController.draggedSession,
    targetWeekday: dragController.targetWeekday,
    targetTime: dragController.targetTime,
    targetYPosition: dragController.targetYPosition,
  }}
  ...
/>
```

- [ ] **Step 5a: Close popover on drag start (TimeTableRow)**

In `src/components/molecules/TimeTableRow.tsx`, add a `useEffect` that closes the overflow popover when any drag begins (prevents orphaned popover during drag):

```tsx
// popover 열려있는 상태에서 드래그 시작 시 자동 닫기
React.useEffect(() => {
  if (dragPreview?.draggedSession) {
    setIsPopoverOpen(false);
  }
}, [dragPreview?.draggedSession]);
```

Place it after the `internalExpanded`/`isPopoverOpen` state declarations.

- [ ] **Step 5: Remove `onDragStart`, `onDragEnd`, `onDragOver` props from TimeTableRow interface**

In `src/components/molecules/TimeTableRow.tsx`, the `TimeTableRowProps` interface still has:
```tsx
onDragStart?: (session: Session) => void;
onDragOver?: (weekday: number, time: string, yPosition: number) => void;
onDragEnd?: () => void;
```

These are now unused. Remove them from the interface and from the component destructuring.

Also remove any references to `onDragStart`, `onDragOver`, `onDragEnd` inside the component body (e.g., in HiddenSessionsPopover's `onDragStart` prop and in SessionBlock's `onDragStart` / `onDragEnd` props).

- [ ] **Step 6: Run full suite + tsc + build**

```bash
npm run check 2>&1 | grep -E "Tests|passed|failed|Compiled|error TS" | tail -5
```

Expected: all tests pass, tsc clean, build success.

- [ ] **Step 7: Playwright UI verification**

```bash
npm run dev &
sleep 6
```

Navigate to `http://localhost:3000/schedule`. Verify:
1. Existing sessions display correctly
2. Session card hover shows grip handle
3. Page scrolls normally (no accidental drag activation on scroll)

Take a screenshot. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useDragController.ts \
        src/components/molecules/TimeTableRow.tsx \
        src/components/organisms/TimeTableGrid.tsx \
        src/hooks/__tests__/useDragController.test.ts
git commit -m "feat(schedule): cleanup HTML5 drag residuals + enable mobile drag

- isTouchDevice 게이트 제거 — 모바일 세션 드래그 활성화
- document dragend listener 제거 (dnd-kit sensors가 cancel 처리)
- container-level handleContainerDragOver/Drop 제거 (dnd-kit useDroppable이 대체)
- TimeTableRow HTML5 drag props 제거

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: PR + CI + merge

- [ ] **Step 1: Push and create PR**

```bash
git push -u origin feat/tier3-dndkit-migration

gh pr create --base dev \
  --title "feat(schedule): Tier 3 — @dnd-kit migration (mobile drag + Pointer Events)" \
  --body "$(cat <<'EOF'
## Summary

HTML5 native drag → @dnd-kit (Pointer Events API). 모바일에서 세션 블록을 손가락으로 드래그하여 이동 가능.

**변경 내용:**
- `DndContext` in TimeTableGrid: PointerSensor(distance:5) + TouchSensor(delay:250ms)
- SessionBlock grip: `useDraggable` — HTML5 draggable 제거, isMobile 게이트 제거
- TimeTableCell: `useDroppable` — session drop을 DndContext.onDragEnd로 위임
- HiddenSessionsPopover: mini-card를 `useDraggable`로 전환
- `DragOverlay`: 커서/손가락을 따라다니는 floating card
- 기존 `computeTentativeLayout` + `DragGhost` preview 파이프라인 **무변경**

## Test plan
- [x] `npm run check` — 1890+ unit + tsc + build 통과
- [x] Playwright MCP — `/schedule` 기존 세션 표시 이상 없음

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: CI 통과 후 dev 머지**

```bash
bash ../scripts/pr-merge-cycle.sh <PR_NUMBER>
```

---

## Verification Checklist

| Check | How |
|---|---|
| install OK | `npm ls @dnd-kit/core` |
| 1890+ unit tests pass | `npm run check` |
| tsc clean | `npm run check` |
| build OK | `npm run check` |
| Desktop drag: session cards draggable | Playwright MCP screenshot |
| Mobile drag: touch activates after 250ms | computer-use touch simulation |
| Enrollment (student chip) drop: unchanged | manual test |
| Scroll on mobile: unaffected by 250ms delay | computer-use |

---

## ADR Note

This migration warrants a short ADR: `class-planner/docs/adr/ADR-XXX-dndkit-migration.md`. Key points:
- **Reason:** HTML5 drag API doesn't support touch/mobile
- **Decision:** @dnd-kit/core with PointerSensor + TouchSensor
- **Alternatives rejected:** Custom touch polyfill (double codebase), react-beautiful-dnd (list-only), react-dnd (heavier, less mobile-friendly)
- **Trade-off:** +12KB gzip, requires DndContext wrapper, collision detection is per-cell not per-column
