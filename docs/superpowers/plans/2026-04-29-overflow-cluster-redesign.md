# Overflow Cluster Indicator Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invisible zinc-800 `+N` pill with a color-dot-stack trigger (Hybrid B+A) that pre-shows hidden sessions' accent colors, and enrich the popover with time range, teacher name, and student count.

**Architecture:** `OverflowSessionItem` type gains 4 new fields (`accent`, `startTime`, `endTime`, `studentCount`, optional `teacherName`). `TimeTableRow.toOverflowItems` computes these from the session/enrollment/teacher graph already in scope. `SessionOverflowPopover` is rewritten with new 2-row layout per item, autofocus, arrow-key navigation, and viewport-aware flip. The old pill `<button>` inside `TimeTableRow` is swapped for a dot-track container that renders one colored `<span>` per hidden session.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind CSS 4, Vitest + React Testing Library, Playwright

---

## File Structure

| File | Change |
|---|---|
| `src/app/globals.css` | Add 2 tokens to `:root` |
| `src/components/molecules/SessionOverflowPopover.tsx` | Extend `OverflowSessionItem` type + full component rewrite |
| `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx` | Update mock fixtures + add 5 new test cases |
| `src/components/molecules/TimeTableRow.tsx` | Extend `toOverflowItems` + swap pill markup for dot-track |

---

## Task 0: Create feature branch

- [ ] **Switch to `dev` and create branch**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b feat/overflow-cluster-redesign
```

Expected: `Switched to a new branch 'feat/overflow-cluster-redesign'`

---

## Task 1: Add CSS design tokens

**Files:** Modify `src/app/globals.css`

- [ ] **Open `globals.css`. Find the `:root` block (starts ~line 74). Add the two lines below immediately before the closing `}` of the `:root` block:**

```css
  --color-cluster-overflow-bg: rgba(255, 255, 255, 0.06);
  --color-cluster-overflow-ring: var(--color-accent);
```

- [ ] **Verify typecheck passes**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
pnpm typecheck
```

Expected: `Found 0 errors.`

- [ ] **Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design-tokens): add cluster overflow bg and ring tokens"
```

---

## Task 2: Extend OverflowSessionItem type + update test fixtures

**Files:**
- Modify: `src/components/molecules/SessionOverflowPopover.tsx` lines 7–11
- Modify: `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx` lines 9–20

- [ ] **Replace the interface in `SessionOverflowPopover.tsx` (lines 7–11) with:**

```tsx
export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
  accent: string;       // pre-computed tone.accent value (CSS var or hex)
  startTime: string;    // "11:30"
  endTime: string;      // "12:30"
  teacherName?: string;
  studentCount: number;
}
```

- [ ] **Replace the `items` fixture in the test file (lines 9–20) with:**

```tsx
const items: OverflowSessionItem[] = [
  {
    id: "s1",
    subject: { id: "sub1", name: "피아노", color: "blue" } as any,
    studentNames: ["김지우"],
    accent: "var(--color-subject-blue-accent)",
    startTime: "11:30",
    endTime: "12:30",
    teacherName: "김선생",
    studentCount: 1,
  },
  {
    id: "s2",
    subject: { id: "sub2", name: "기타", color: "amber" } as any,
    studentNames: ["이서연"],
    accent: "var(--color-subject-amber-accent)",
    startTime: "13:00",
    endTime: "14:00",
    studentCount: 1,
  },
];
```

- [ ] **Run existing tests — they must still pass (component rendering unchanged so far)**

```bash
pnpm test -- --testPathPattern=SessionOverflowPopover
```

Expected: `4 passed`

- [ ] **Commit**

```bash
git add src/components/molecules/SessionOverflowPopover.tsx \
        src/components/molecules/__tests__/SessionOverflowPopover.test.tsx
git commit -m "feat(overflow): extend OverflowSessionItem type with accent/time/teacher/count"
```

---

## Task 3: Rewrite SessionOverflowPopover — layout + a11y

**Files:**
- Modify: `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx` (add 5 tests)
- Modify: `src/components/molecules/SessionOverflowPopover.tsx` (full rewrite)

- [ ] **Append 5 new tests to the `describe` block in the test file — BEFORE closing `}`:**

```tsx
  it("각 항목에 시간 범위를 표시한다", () => {
    render(
      <SessionOverflowPopover
        title="11:30 · 숨은 세션 2개"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("11:30–12:30")).toBeDefined();
    expect(screen.getByText("13:00–14:00")).toBeDefined();
  });

  it("teacherName이 있을 때 선생 이름을 표시한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("김선생")).toBeDefined();
  });

  it("학생 수 칩을 렌더한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText(/학생 \d+명/).length).toBeGreaterThan(0);
  });

  it("마운트 시 첫 번째 항목 버튼에 포커스가 이동한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const itemBtns = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-overflow-item"));
    expect(document.activeElement).toBe(itemBtns[0]);
  });

  it("ArrowDown 키로 다음 항목으로 포커스가 이동한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const itemBtns = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-overflow-item"));
    itemBtns[0].focus();
    fireEvent.keyDown(itemBtns[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(itemBtns[1]);
  });
```

- [ ] **Run to confirm the 5 new tests FAIL**

```bash
pnpm test -- --testPathPattern=SessionOverflowPopover
```

Expected: 4 passed, 5 failed.

- [ ] **Replace the full content of `SessionOverflowPopover.tsx` with:**

```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Subject } from "@/lib/planner";

export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
  accent: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
  studentCount: number;
}

interface Props {
  title: string;
  items: OverflowSessionItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SessionOverflowPopover({ title, items, onSelect, onClose }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Autofocus first item on open
  useEffect(() => {
    const first = popoverRef.current?.querySelector<HTMLButtonElement>(
      "[data-overflow-item]"
    );
    first?.focus();
  }, []);

  // Viewport-aware flip detection
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > window.innerHeight - 8) setFlipUp(true);
    if (rect.right > window.innerWidth - 8) setFlipLeft(true);
  }, []);

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const btns = Array.from(
      popoverRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-overflow-item]"
      ) ?? []
    );
    const next =
      e.key === "ArrowDown"
        ? btns[(idx + 1) % btns.length]
        : btns[(idx - 1 + btns.length) % btns.length];
    next?.focus();
  };

  // title format: "11:30 · 숨은 세션 2개" — split on " · "
  const dotIdx = title.indexOf(" · ");
  const timeLabel = dotIdx !== -1 ? title.slice(0, dotIdx) : "";
  const countLabel = dotIdx !== -1 ? title.slice(dotIdx + 3) : title;

  const posY = flipUp ? "bottom-full mb-1" : "top-full mt-1";
  const posX = flipLeft ? "left-0" : "right-0";

  return (
    <>
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0 z-[998]"
        onClick={onClose}
      />
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={title}
        className={`absolute ${posY} ${posX} z-[999] overflow-hidden rounded-[var(--radius-admin-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md`}
        style={{ width: 272 }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
          <span className="flex-1 text-[11px] font-semibold text-[var(--color-text-primary)] truncate">
            {countLabel}
          </span>
          {timeLabel && (
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {timeLabel}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-base leading-none p-0.5 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <ul className="flex flex-col">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="border-b border-[var(--color-border)] last:border-b-0"
            >
              <button
                type="button"
                data-overflow-item="true"
                onClick={() => onSelect(item.id)}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
                className="w-full flex items-stretch gap-2.5 px-2.5 py-2 text-left hover:bg-[var(--color-overlay-light)] focus:outline-none focus:bg-[var(--color-overlay-light)]"
              >
                {/* 3px accent bar */}
                <span
                  className="w-[3px] rounded-[2px] shrink-0 self-stretch"
                  style={{ background: item.accent }}
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold text-[var(--color-text-primary)] truncate">
                    {item.subject?.name ?? "수업"}
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {item.startTime}–{item.endTime}
                    </span>
                    {item.teacherName && (
                      <>
                        <span
                          className="text-[10px] text-[var(--color-text-muted)]"
                          aria-hidden="true"
                        >
                          ·
                        </span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {item.teacherName}
                        </span>
                      </>
                    )}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-[var(--color-overlay-light)] text-[var(--color-text-muted)]">
                      학생 {item.studentCount}명
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
```

- [ ] **Run all tests — all 9 must pass**

```bash
pnpm test -- --testPathPattern=SessionOverflowPopover
```

Expected: `9 passed`

- [ ] **Commit**

```bash
git add src/components/molecules/SessionOverflowPopover.tsx \
        src/components/molecules/__tests__/SessionOverflowPopover.test.tsx
git commit -m "feat(overflow): rewrite SessionOverflowPopover with rich layout, autofocus, arrow-key"
```

---

## Task 4: Extend TimeTableRow.toOverflowItems to pass new fields

**Files:** Modify `src/components/molecules/TimeTableRow.tsx` lines 213–231

- [ ] **Replace the `toOverflowItems` callback (lines 213–231) with the following. The callback now also computes `accent`, `startTime`, `endTime`, `teacherName`, `studentCount`:**

```tsx
  // Map hidden sessions to OverflowSessionItem for the popover
  const toOverflowItems = React.useCallback(
    (sessions: Session[]): OverflowSessionItem[] =>
      sessions.map((session) => {
        const firstEnrollment = enrollments.find((e) =>
          session.enrollmentIds?.includes(e.id)
        );
        const subject = firstEnrollment
          ? (subjects.find((s) => s.id === firstEnrollment.subjectId) ?? null)
          : null;

        const studentNames = (session.enrollmentIds || []).flatMap((eid) => {
          const enr = enrollments.find((e) => e.id === eid);
          const st = enr ? students.find((s) => s.id === enr.studentId) : null;
          return st ? [st.name] : [];
        });

        // Resolve accent color from subject color (same logic as SessionBlock)
        const tone = resolveSessionTone(subject?.color);
        const accent = tone.accent;

        // Resolve teacher name from session.teacherId (optional field on Session)
        const teacherName = session.teacherId
          ? (teachers?.find((t) => t.id === session.teacherId)?.name ?? undefined)
          : undefined;

        return {
          id: session.id,
          subject,
          studentNames,
          accent,
          startTime: session.startsAt,
          endTime: session.endsAt,
          teacherName,
          studentCount: studentNames.length,
        };
      }),
    [enrollments, subjects, students, teachers]
  );
```

Note: `resolveSessionTone` is already imported at line 5 of `TimeTableRow.tsx`. No new import needed.

- [ ] **Run typecheck**

```bash
pnpm typecheck
```

Expected: `Found 0 errors.`

- [ ] **Run unit tests**

```bash
pnpm test -- --testPathPattern=SessionOverflowPopover
```

Expected: `9 passed` (no regression)

- [ ] **Commit**

```bash
git add src/components/molecules/TimeTableRow.tsx
git commit -m "feat(overflow): extend toOverflowItems with accent/time/teacher/studentCount"
```

---

## Task 5: Replace pill markup with dot-track trigger

**Files:** Modify `src/components/molecules/TimeTableRow.tsx` lines 458–504

The diff is: replace the old `<div style={{width:20}} ...>` wrapper + zinc `<button>` with a new wrapper + dot-track button that renders colored dots.

- [ ] **Replace the overflow pills section (lines 458–504) with:**

```tsx
      {/* Overflow dot-track triggers — one per contiguous group */}
      {isOverflow &&
        overflowGroups.map(({ startIdx, endIdx, hidden }) => {
          const timeString = timeSlots30Min[startIdx];
          const groupHeight = (endIdx - startIdx + 1) * SLOT_HEIGHT_PX - 4;
          const overflowItems = toOverflowItems(hidden);

          // Show up to 4 dots; if more, last slot becomes "+N" chip
          const MAX_DOTS = 4;
          const showDots = overflowItems.slice(0, MAX_DOTS);
          const extraCount =
            overflowItems.length > MAX_DOTS
              ? overflowItems.length - (MAX_DOTS - 1)
              : 0;
          const dotsToShow = extraCount > 0 ? showDots.slice(0, MAX_DOTS - 1) : showDots;

          return (
            <div
              key={`pill-group-${startIdx}`}
              style={{
                position: "absolute",
                top: startIdx * SLOT_HEIGHT_PX + 2,
                right: 4,
                height: groupHeight,
                zIndex: 110,
                display: "flex",
                alignItems: "flex-start",
              }}
              data-testid={`overflow-pill-wrapper-${timeString}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPillSlot((prev) =>
                    prev === timeString ? null : timeString
                  );
                }}
                aria-label={`${hidden.length}개 세션 더 보기`}
                aria-haspopup="dialog"
                aria-expanded={openPillSlot === timeString}
                data-testid={`overflow-pill-${timeString}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: 4,
                  background: "var(--color-cluster-overflow-bg)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)",
                  minWidth: 14,
                  minHeight: 24,
                  transition: "box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 1px 2px rgba(0,0,0,0.25), 0 0 0 1.5px var(--color-cluster-overflow-ring), inset 0 0 0 1px rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 1px 2px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)";
                }}
              >
                {dotsToShow.map((item, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 3,
                      background: item.accent,
                      display: "block",
                      flexShrink: 0,
                    }}
                  />
                ))}
                {extraCount > 0 && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "var(--color-text-muted)",
                      textAlign: "center",
                    }}
                  >
                    +{extraCount}
                  </span>
                )}
              </button>

              {openPillSlot === timeString && (
                <SessionOverflowPopover
                  title={`${timeString} · 숨은 세션 ${hidden.length}개`}
                  items={overflowItems}
                  onSelect={(id) => {
                    const session = hidden.find((s) => s.id === id);
                    if (session) onSessionClick(session);
                    setOpenPillSlot(null);
                  }}
                  onClose={() => setOpenPillSlot(null)}
                />
              )}
            </div>
          );
        })}
```

- [ ] **Typecheck**

```bash
pnpm typecheck
```

Expected: `Found 0 errors.`

- [ ] **Run full unit test suite**

```bash
pnpm test
```

Expected: all pass, no regressions.

- [ ] **Commit**

```bash
git add src/components/molecules/TimeTableRow.tsx
git commit -m "feat(overflow): replace zinc pill with color-dot-stack trigger"
```

---

## Task 6: Appearance animation (reduced-motion safe)

**Files:** Modify `src/components/molecules/TimeTableRow.tsx` (the dot-track button style)

The dot-track button needs a subtle fade-in + translateY animation when it mounts. Since this is a purely visual enhancement with no logic change, we add it via a CSS class in `globals.css` and apply the class to the button.

- [ ] **Add the keyframe and utility class to `globals.css` — append just before the final `}` that closes the file:**

```css
/* Cluster overflow dot-track entrance */
@keyframes clusterDotIn {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cluster-dot-enter {
  animation: clusterDotIn 200ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .cluster-dot-enter { animation: none; }
}
```

- [ ] **Apply the class to the dot-track `<button>` — add `className="cluster-dot-enter"` to the button in `TimeTableRow.tsx`:**

Find the dot-track button (the one with `data-testid={overflow-pill-${timeString}}`). Add `className="cluster-dot-enter"` alongside its existing `style` prop:

```tsx
              <button
                type="button"
                className="cluster-dot-enter"
                onClick={...}
                ...
```

- [ ] **Typecheck**

```bash
pnpm typecheck
```

Expected: `Found 0 errors.`

- [ ] **Commit**

```bash
git add src/app/globals.css src/components/molecules/TimeTableRow.tsx
git commit -m "feat(overflow): add entrance animation with reduced-motion guard"
```

---

## Task 7: Build verification + UI verification

- [ ] **Full test suite**

```bash
pnpm test
```

Expected: all pass.

- [ ] **Quick check (type + lint + build)**

```bash
pnpm run check
```

Expected: no errors, build succeeds.

- [ ] **Start dev server**

```bash
pnpm dev
# → http://localhost:3000
```

- [ ] **Playwright UI verification** — run each step with the Playwright MCP:

1. Navigate to `http://localhost:3000/schedule`
2. Locate a day column with **4 or more overlapping sessions**.  
   If no real data has 4+ overlaps, temporarily add dummy sessions via the UI (same day, overlapping times) or use the seed script if one exists. Remove after testing.
3. **Screenshot 1:** Confirm the dot-track trigger is visible (glassy container with colored dots in the cluster's top-right corner). Old zinc pill must be gone.
4. Click the dot-track trigger. **Screenshot 2:** Confirm the popover opens showing subject name, time range (e.g., `11:30–12:30`), optional teacher name, and `학생 N명` chip for each item.
5. Confirm `×` button closes the popover.
6. Hover over the dot-track trigger (desktop). **Screenshot 3:** Confirm amber ring appears on hover.
7. Set viewport to `375×667` (mobile). **Screenshot 4:** Confirm the dot-track tap area is adequate (minimum 14px wide, 24px tall).
8. With popover open, check that the first item is auto-focused (focus visible style).
9. Navigate a cluster near the RIGHT edge of the screen. **Screenshot 5:** Confirm popover flips to open on the LEFT side instead of clipping.

- [ ] **computer-use verification** (visual — required per CLAUDE.md policy for popover/animation changes):

Use computer-use to verify:
- The dot entrance animation plays smoothly (cluster area → dots fade in from below)
- The popover scale-in animation is visible on open
- Under `@media (prefers-reduced-motion: reduce)` (toggle in DevTools → Rendering → Emulate CSS media), dots appear without animation

- [ ] **Commit final verification sentinel if all checks pass**

```bash
printf '%s\n%s\n' "$(cat .claude/session-id 2>/dev/null || echo session)" "UI verified by Playwright + computer-use" > .claude/ui-verified
```

---

## Task 8: PR

- [ ] **Push branch and open PR targeting `dev`**

```bash
git push -u origin feat/overflow-cluster-redesign
gh pr create \
  --base dev \
  --title "feat(overflow): Hybrid B+A cluster indicator (color-dot + polished popover)" \
  --body "$(cat <<'EOF'
## Summary

- Replaces invisible zinc-800 `+N` pill with a glassy color-dot-stack trigger
- Each dot uses the hidden session's `tone.accent` color → at-a-glance subject preview
- Popover rewritten: 272px, time range + teacher + student-count chip per item
- A11y: autofocus, arrow-key navigation, `aria-haspopup`/`aria-expanded`, Esc close
- Viewport-aware flip (right/bottom edge detection)
- Entrance animation with `prefers-reduced-motion` guard
- 2 new design tokens: `--color-cluster-overflow-bg`, `--color-cluster-overflow-ring`

## Test plan

- [ ] `pnpm test` — all 9 SessionOverflowPopover tests pass
- [ ] `pnpm run check` — typecheck + lint + build clean
- [ ] Playwright: dot-track visible, popover fields correct, hover ring, mobile tap, flip
- [ ] computer-use: animation visual, reduced-motion emulation

Spec: `docs/superpowers/specs/2026-04-29-overflow-cluster-redesign-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Glassy dot-track trigger, 8×8 dots, tone.accent color | Task 5 |
| Max 4 dots, 5번째부터 +N chip | Task 5 |
| Amber ring on hover | Task 5 (`onMouseEnter/Leave`) |
| Entrance animation 200ms + reduced-motion | Task 6 |
| `aria-haspopup`, `aria-expanded`, `aria-label` | Task 5 |
| Popover 272px width | Task 3 |
| Header: countLabel + timeLabel + X button | Task 3 |
| Item: 3px accent bar + subject + time + teacher + studentCount chip | Task 3 |
| Autofocus first item | Task 3 |
| Arrow-key navigation | Task 3 |
| Esc + backdrop close | Task 3 (Esc already existed; carried over) |
| Viewport-aware flip | Task 3 |
| 2 new CSS tokens | Task 1 |
| `OverflowSessionItem` new fields | Task 2 |
| `toOverflowItems` computes accent/time/teacher/count | Task 4 |

All spec requirements are covered. No gaps.
