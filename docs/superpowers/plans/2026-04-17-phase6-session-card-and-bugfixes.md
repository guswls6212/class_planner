# Phase 6 — SessionCard Foundation + UI Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 6 Schedule Body Unification의 2개 독립 시작점 구현 — (A) `SessionCard` primitive + `tintFromHex` util 기반 공사, (G) `HelpTooltip` 뷰포트 경계 + `AccountMenu` compact anchor 버그픽스.

**Architecture:** `SessionCard`는 Weekly/Daily/Monthly/Landing 공통 primitive로 4 variant(`block`/`row`/`chip`/`preview`) + 4 state(`default`/`ongoing`/`done`/`conflict`) 매트릭스. 색은 Phase 3 SSOT 3-tone 토큰(`--color-subject-*-bg/-fg/-accent`) 우선, 레거시 hex 색은 `tintFromHex`로 런타임 파스텔 변환. Phase G는 `useEffect + getBoundingClientRect` 기반 뷰포트 경계 감지로 팝오버 flip.

**Tech Stack:** TypeScript strict, React 19, Vitest, @testing-library/react, Tailwind CSS 4 (`@theme` 토큰), Next.js 15 App Router.

**Spec:** `docs/superpowers/specs/2026-04-17-schedule-body-unification-design.md`
**Branch strategy:** Phase A → `feat/phase6-a-session-card`, Phase G → `fix/phase6-g-tooltip-accountmenu`. 두 브랜치는 dev에서 독립 분기되어 병렬 PR 가능.

---

## File Structure

### Phase A — SessionCard Foundation
| 파일 | 책임 |
|---|---|
| `src/lib/colors/tintFromHex.ts` | hex → 파스텔 hex 변환 함수 (ratio=0.8 기본) |
| `src/lib/colors/__tests__/tintFromHex.test.ts` | 경계값 + WCAG 대비율 테스트 |
| `src/components/molecules/SessionCard.types.ts` | variant/state 타입 + Props 인터페이스 |
| `src/components/molecules/SessionCard.tsx` | 4 variant × 4 state 렌더 |
| `src/components/molecules/SessionCard.utils.ts` | 3-tone 토큰 resolver (subject.color → `{bg,fg,accent}` strings) |
| `src/components/molecules/__tests__/SessionCard.test.tsx` | variant별 + state별 렌더 검증 |
| `src/components/molecules/__tests__/SessionCard.utils.test.ts` | 토큰 resolver 단위 테스트 |
| `src/components/molecules/SessionOverflowPopover.tsx` | "+N" pill 클릭 시 겹친 세션 목록 |
| `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx` | popover 렌더/닫기 테스트 |

### Phase G — UI Bugfixes
| 파일 | 책임 |
|---|---|
| `src/components/molecules/HelpTooltip.tsx` | 수정 — 뷰포트 우측 경계 감지 + flip |
| `src/components/molecules/__tests__/HelpTooltip.test.tsx` | 수정 — flip 케이스 추가 |
| `src/components/molecules/AccountMenu.tsx` | 수정 — `compact` prop일 때 anchor 변경 |
| `src/components/molecules/__tests__/AccountMenu.test.tsx` | 수정 — compact anchor 케이스 추가 |

---

## Phase A — SessionCard Foundation

### Task A1: 브랜치 생성 + baseline 확인

**Files:** 없음 (git 상태 확인만)

- [ ] **Step 1: dev 최신 동기화 + 브랜치 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git fetch origin
git checkout dev && git pull origin dev
git checkout -b feat/phase6-a-session-card
```

Expected: `Switched to a new branch 'feat/phase6-a-session-card'`

- [ ] **Step 2: baseline 테스트 통과 확인**

```bash
npm run check:quick
```

Expected: tsc + unit 모두 통과. 실패하면 dev가 깨진 상태라 사용자에게 보고 후 중단.

---

### Task A2: `tintFromHex` util — 실패 테스트부터

**Files:**
- Create: `src/lib/colors/__tests__/tintFromHex.test.ts`
- Create: `src/lib/colors/tintFromHex.ts` (stub only)

- [ ] **Step 1: stub 파일 생성**

Create `src/lib/colors/tintFromHex.ts`:
```ts
export function tintFromHex(_hex: string, _ratio = 0.8): string {
  throw new Error("not implemented");
}
```

- [ ] **Step 2: 실패 테스트 작성**

Create `src/lib/colors/__tests__/tintFromHex.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { tintFromHex } from "../tintFromHex";

describe("tintFromHex", () => {
  it("기본 ratio 0.8로 파스텔 변환 — 파란색", () => {
    // #3B82F6 (blue-500) + 80% white → light pastel blue
    // R: 59 * 0.2 + 255 * 0.8 = 215.8 → 216 (0xD8)
    // G: 130 * 0.2 + 255 * 0.8 = 230   → 230 (0xE6)
    // B: 246 * 0.2 + 255 * 0.8 = 253.2 → 253 (0xFD)
    expect(tintFromHex("#3B82F6")).toBe("#d8e6fd");
  });

  it("ratio 0 이면 원본 반환", () => {
    expect(tintFromHex("#3B82F6", 0)).toBe("#3b82f6");
  });

  it("ratio 1 이면 화이트 반환", () => {
    expect(tintFromHex("#3B82F6", 1)).toBe("#ffffff");
  });

  it("# 없는 입력도 처리", () => {
    expect(tintFromHex("3B82F6")).toBe("#d8e6fd");
  });

  it("대문자/소문자 혼용 입력을 소문자로 정규화하여 반환", () => {
    expect(tintFromHex("#3b82f6")).toBe("#d8e6fd");
    expect(tintFromHex("#3B82F6")).toBe("#d8e6fd");
  });

  it("short hex(#RGB)는 3자리로 받지 않음 — 6자리만 지원", () => {
    // PDF lightenColor와 동일하게 6자리 hex 전제. 잘못된 입력은 NaN 컴포넌트 발생 → guard.
    expect(() => tintFromHex("#ABC")).toThrow();
  });

  it("빨강/초록 경계", () => {
    expect(tintFromHex("#EF4444")).toBe("#fcdada"); // red-500 → pastel
    expect(tintFromHex("#10B981")).toBe("#cff1e6"); // emerald-500 → pastel
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npx vitest run src/lib/colors/__tests__/tintFromHex.test.ts
```

Expected: 모든 케이스 FAIL ("not implemented").

- [ ] **Step 4: 구현**

Replace `src/lib/colors/tintFromHex.ts`:
```ts
/**
 * Mix a hex color with white by `ratio` (0 = original, 1 = white).
 * Matches PdfSessionBlock.lightenColor algorithm for cross-platform visual parity.
 */
export function tintFromHex(hex: string, ratio = 0.8): string {
  const h = hex.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(h)) {
    throw new Error(`tintFromHex: expected 6-digit hex, got "${hex}"`);
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const tr = Math.round(r * (1 - ratio) + 255 * ratio);
  const tg = Math.round(g * (1 - ratio) + 255 * ratio);
  const tb = Math.round(b * (1 - ratio) + 255 * ratio);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(tr)}${toHex(tg)}${toHex(tb)}`;
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run src/lib/colors/__tests__/tintFromHex.test.ts
```

Expected: 7/7 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/colors/tintFromHex.ts src/lib/colors/__tests__/tintFromHex.test.ts
git commit -m "$(cat <<'EOF'
feat(colors): add tintFromHex util for pastel conversion

PDF PdfSessionBlock.lightenColor와 동일한 알고리즘으로 hex → 파스텔 hex
변환. Phase 6 SessionCard의 레거시 hex 과목 색상 폴백에 사용 예정.
Phase F에서 PDF가 이 util을 공유하도록 교체될 예정.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task A3: SessionCard.types — 타입 정의

**Files:**
- Create: `src/components/molecules/SessionCard.types.ts`

- [ ] **Step 1: 타입 파일 작성**

Create `src/components/molecules/SessionCard.types.ts`:
```ts
import type { Subject } from "@/lib/planner";

export type SessionCardVariant = "block" | "row" | "chip" | "preview";

export type SessionCardState = "default" | "ongoing" | "done" | "conflict";

export type AttendanceStatus = "all-present" | "partial" | "absent" | "unmarked";

export interface SessionCardProps {
  /** 과목 (null이면 "과목 없음" fallback 렌더) */
  subject: Subject | null;
  /** 학생 이름 배열 (row/block sub-label에 `, `로 join) */
  studentNames?: string[];
  /** "14:00–15:00" — row variant에서 prefix로 사용 */
  timeRange?: string;
  variant: SessionCardVariant;
  state?: SessionCardState;
  /** block variant에서 CSS gridRow/gridColumn 스타일을 caller가 주입 */
  style?: React.CSSProperties;
  /** block variant 전용 — D-hybrid 겹침 계산: 1~3은 균등 분할, 4+ 이면 caller가 처리 */
  overlapCount?: number;
  overlapIndex?: number;
  onClick?: () => void;
  /** row variant 전용 — 출석 배지 */
  onAttendanceClick?: () => void;
  attendanceStatus?: AttendanceStatus;
  className?: string;
  "data-testid"?: string;
}
```

- [ ] **Step 2: 타입 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/molecules/SessionCard.types.ts
git commit -m "feat(session-card): add type definitions

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A4: SessionCard.utils — 3-tone 토큰 resolver

**Files:**
- Create: `src/components/molecules/SessionCard.utils.ts`
- Create: `src/components/molecules/__tests__/SessionCard.utils.test.ts`

- [ ] **Step 1: utils stub 작성**

Create `src/components/molecules/SessionCard.utils.ts`:
```ts
import { tintFromHex } from "@/lib/colors/tintFromHex";

export interface SessionTone {
  bg: string;     // 파스텔 배경 (CSS 값)
  fg: string;     // 진한 텍스트 (CSS 값)
  accent: string; // 진행중/포커스 바 (CSS 값)
}

/** Phase 3 SSOT 3-tone 팔레트에 있는 named color */
const NAMED_TONES = ["blue", "red", "violet", "emerald", "amber", "pink", "teal", "orange"] as const;
export type NamedTone = (typeof NAMED_TONES)[number];

export function isNamedTone(color: string): color is NamedTone {
  return (NAMED_TONES as readonly string[]).includes(color);
}

/**
 * Resolve a subject.color (either a named tone or a raw hex) into 3-tone CSS values.
 * Named tones use CSS variables (--color-subject-{name}-bg/fg/accent).
 * Raw hex falls back to tintFromHex for bg, raw hex for fg/accent.
 */
export function resolveSessionTone(color: string | undefined): SessionTone {
  if (!color) {
    return {
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    };
  }
  if (isNamedTone(color)) {
    return {
      bg: `var(--color-subject-${color}-bg)`,
      fg: `var(--color-subject-${color}-fg)`,
      accent: `var(--color-subject-${color}-accent)`,
    };
  }
  // Raw hex path: tint for bg, keep raw for fg/accent.
  return {
    bg: tintFromHex(color, 0.8),
    fg: color,
    accent: color,
  };
}
```

- [ ] **Step 2: 실패 테스트 작성**

Create `src/components/molecules/__tests__/SessionCard.utils.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveSessionTone, isNamedTone } from "../SessionCard.utils";

describe("isNamedTone", () => {
  it("팔레트 색상은 true", () => {
    expect(isNamedTone("blue")).toBe(true);
    expect(isNamedTone("emerald")).toBe(true);
    expect(isNamedTone("orange")).toBe(true);
  });
  it("hex/알 수 없는 값은 false", () => {
    expect(isNamedTone("#3B82F6")).toBe(false);
    expect(isNamedTone("magenta")).toBe(false);
    expect(isNamedTone("")).toBe(false);
  });
});

describe("resolveSessionTone", () => {
  it("undefined면 중립 토큰 반환", () => {
    expect(resolveSessionTone(undefined)).toEqual({
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    });
  });

  it("named tone은 CSS 변수로 매핑", () => {
    expect(resolveSessionTone("blue")).toEqual({
      bg: "var(--color-subject-blue-bg)",
      fg: "var(--color-subject-blue-fg)",
      accent: "var(--color-subject-blue-accent)",
    });
    expect(resolveSessionTone("emerald")).toEqual({
      bg: "var(--color-subject-emerald-bg)",
      fg: "var(--color-subject-emerald-fg)",
      accent: "var(--color-subject-emerald-accent)",
    });
  });

  it("raw hex면 tintFromHex로 bg 생성, fg/accent는 원본", () => {
    const tone = resolveSessionTone("#3B82F6");
    expect(tone.bg).toBe("#d8e6fd");
    expect(tone.fg).toBe("#3B82F6");
    expect(tone.accent).toBe("#3B82F6");
  });

  it("빈 문자열은 중립 토큰으로 처리", () => {
    expect(resolveSessionTone("")).toEqual({
      bg: "var(--color-bg-tertiary)",
      fg: "var(--color-text-primary)",
      accent: "var(--color-primary)",
    });
  });
});
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.utils.test.ts
```

Expected: 7/7 PASS. (utils는 이미 Step 1에서 구현했으므로 바로 통과)

- [ ] **Step 4: 커밋**

```bash
git add src/components/molecules/SessionCard.utils.ts src/components/molecules/__tests__/SessionCard.utils.test.ts
git commit -m "feat(session-card): add 3-tone resolver with named/hex fallback

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A5: SessionCard — block variant TDD

**Files:**
- Create: `src/components/molecules/SessionCard.tsx`
- Create: `src/components/molecules/__tests__/SessionCard.test.tsx`

- [ ] **Step 1: SessionCard stub 작성**

Create `src/components/molecules/SessionCard.tsx`:
```tsx
"use client";

import React from "react";
import type { SessionCardProps } from "./SessionCard.types";
import { resolveSessionTone } from "./SessionCard.utils";

export function SessionCard(props: SessionCardProps) {
  const { variant } = props;
  if (variant === "block") return <SessionCardBlock {...props} />;
  if (variant === "row") return <SessionCardRow {...props} />;
  if (variant === "chip") return <SessionCardChip {...props} />;
  return <SessionCardPreview {...props} />;
}

function SessionCardBlock(_props: SessionCardProps) {
  return <div data-testid="session-card-block">TODO</div>;
}
function SessionCardRow(_props: SessionCardProps) {
  return <div data-testid="session-card-row">TODO</div>;
}
function SessionCardChip(_props: SessionCardProps) {
  return <div data-testid="session-card-chip">TODO</div>;
}
function SessionCardPreview(_props: SessionCardProps) {
  return <div data-testid="session-card-preview">TODO</div>;
}

export default SessionCard;
```

- [ ] **Step 2: block variant 실패 테스트 작성**

Create `src/components/molecules/__tests__/SessionCard.test.tsx`:
```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionCard } from "../SessionCard";
import type { Subject } from "@/lib/planner";

const blueSubject: Subject = { id: "s1", name: "피아노", color: "blue" } as any;
const hexSubject: Subject = { id: "s2", name: "드럼", color: "#EF4444" } as any;

describe("SessionCard — block variant", () => {
  it("과목명을 렌더한다", () => {
    render(<SessionCard variant="block" subject={blueSubject} />);
    expect(screen.getByText("피아노")).toBeDefined();
  });

  it("학생 이름을 `, `로 join하여 렌더한다", () => {
    render(
      <SessionCard variant="block" subject={blueSubject} studentNames={["김지우", "이서연"]} />
    );
    expect(screen.getByText("김지우, 이서연")).toBeDefined();
  });

  it("subject가 null이면 '과목 없음'을 표시한다", () => {
    render(<SessionCard variant="block" subject={null} />);
    expect(screen.getByText("과목 없음")).toBeDefined();
  });

  it("named tone이면 CSS var 기반 backgroundColor가 적용된다", () => {
    render(
      <SessionCard variant="block" subject={blueSubject} data-testid="card" />
    );
    const el = screen.getByTestId("card");
    expect(el.style.backgroundColor).toBe("var(--color-subject-blue-bg)");
  });

  it("hex color면 tintFromHex로 파스텔 배경이 적용된다", () => {
    render(
      <SessionCard variant="block" subject={hexSubject} data-testid="card" />
    );
    const el = screen.getByTestId("card");
    // red-500 hex → pastel #fcdada
    expect(el.style.backgroundColor.toLowerCase()).toBe("rgb(252, 218, 218)");
  });

  it("onClick 핸들러가 클릭 시 호출된다", () => {
    const onClick = vi.fn();
    render(
      <SessionCard variant="block" subject={blueSubject} onClick={onClick} data-testid="card" />
    );
    fireEvent.click(screen.getByTestId("card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("caller가 주입한 style(gridRow/gridColumn)을 병합한다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        style={{ gridRow: "3 / span 4", gridColumn: "2" }}
        data-testid="card"
      />
    );
    const el = screen.getByTestId("card") as HTMLElement;
    expect(el.style.gridRow).toBe("3 / span 4");
    expect(el.style.gridColumn).toBe("2");
  });

  it("state='ongoing'이면 data-state 속성이 붙는다", () => {
    render(
      <SessionCard variant="block" subject={blueSubject} state="ongoing" data-testid="card" />
    );
    expect(screen.getByTestId("card").getAttribute("data-state")).toBe("ongoing");
  });

  it("state='done'이면 opacity 0.55가 적용된다", () => {
    render(
      <SessionCard variant="block" subject={blueSubject} state="done" data-testid="card" />
    );
    const el = screen.getByTestId("card") as HTMLElement;
    expect(el.style.opacity).toBe("0.55");
  });

  it("state='conflict'이면 data-state='conflict' + aria-label에 '충돌'이 포함된다", () => {
    render(
      <SessionCard
        variant="block"
        subject={blueSubject}
        state="conflict"
        data-testid="card"
      />
    );
    const el = screen.getByTestId("card");
    expect(el.getAttribute("data-state")).toBe("conflict");
    expect(el.getAttribute("aria-label")).toContain("충돌");
  });
});
```

- [ ] **Step 3: block 테스트 실패 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx
```

Expected: 대부분 FAIL (TODO stub).

- [ ] **Step 4: SessionCardBlock 구현**

Replace `SessionCardBlock` 함수 in `src/components/molecules/SessionCard.tsx`:
```tsx
function SessionCardBlock({
  subject,
  studentNames,
  state = "default",
  style,
  onClick,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "과목 없음";
  const subLabel = studentNames && studentNames.length > 0 ? studentNames.join(", ") : undefined;

  const cardStyle: React.CSSProperties = {
    ...style,
    backgroundColor: tone.bg,
    color: tone.fg,
    borderLeft: state === "ongoing" || state === "conflict"
      ? `3px solid ${state === "conflict" ? "#EF4444" : tone.accent}`
      : undefined,
    opacity: state === "done" ? 0.55 : undefined,
  };

  const ariaLabel = state === "conflict" ? `${label} — 시간 충돌` : label;

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "rounded-[4px] px-2 py-1 text-[11px] leading-tight overflow-hidden text-left",
        "transition-shadow hover:shadow-md",
        onClick ? "cursor-pointer" : "",
        className ?? "",
      ].join(" ")}
      style={cardStyle}
      data-testid={testId}
      data-state={state}
      data-variant="block"
      aria-label={ariaLabel}
    >
      <div className="font-semibold truncate">{label}</div>
      {subLabel && <div className="text-[10px] opacity-75 truncate">{subLabel}</div>}
      {state === "conflict" && (
        <span className="absolute top-0.5 right-1 text-[10px] text-[#EF4444]" aria-hidden>⚠</span>
      )}
    </Tag>
  );
}
```

- [ ] **Step 5: block 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx
```

Expected: block describe 10/10 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/molecules/SessionCard.tsx src/components/molecules/__tests__/SessionCard.test.tsx
git commit -m "feat(session-card): implement block variant with state layers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A6: SessionCard — row variant TDD

**Files:**
- Modify: `src/components/molecules/SessionCard.tsx`
- Modify: `src/components/molecules/__tests__/SessionCard.test.tsx`

- [ ] **Step 1: row variant 실패 테스트 추가**

Append to `src/components/molecules/__tests__/SessionCard.test.tsx`:
```tsx
describe("SessionCard — row variant", () => {
  it("시간 range prefix + 과목명 + 학생을 렌더한다", () => {
    render(
      <SessionCard
        variant="row"
        subject={blueSubject}
        studentNames={["김지우"]}
        timeRange="14:00"
      />
    );
    expect(screen.getByText("14:00")).toBeDefined();
    expect(screen.getByText("피아노")).toBeDefined();
    expect(screen.getByText("김지우")).toBeDefined();
  });

  it("출석 클릭 핸들러가 attendance 버튼에서 호출된다", () => {
    const onAttendance = vi.fn();
    render(
      <SessionCard
        variant="row"
        subject={blueSubject}
        onAttendanceClick={onAttendance}
        attendanceStatus="all-present"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /출석/ }));
    expect(onAttendance).toHaveBeenCalledTimes(1);
  });

  it("attendanceStatus='all-present'이면 ✓ 기호 렌더", () => {
    render(
      <SessionCard
        variant="row"
        subject={blueSubject}
        onAttendanceClick={() => {}}
        attendanceStatus="all-present"
      />
    );
    expect(screen.getByText("✓")).toBeDefined();
  });
});
```

- [ ] **Step 2: row 테스트 실패 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "row variant"
```

Expected: FAIL ("TODO").

- [ ] **Step 3: SessionCardRow 구현**

Replace `SessionCardRow` in `src/components/molecules/SessionCard.tsx`:
```tsx
const ATTENDANCE_LABELS: Record<string, string> = {
  "all-present": "✓", partial: "△", absent: "✗", unmarked: "•",
};
const ATTENDANCE_COLORS: Record<string, string> = {
  "all-present": "bg-green-500",
  partial: "bg-yellow-400",
  absent: "bg-red-400",
  unmarked: "bg-[var(--color-text-muted)]",
};

function SessionCardRow({
  subject,
  studentNames,
  timeRange,
  state = "default",
  onClick,
  onAttendanceClick,
  attendanceStatus = "unmarked",
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "과목 없음";
  const students = studentNames && studentNames.length > 0 ? studentNames.join(", ") : undefined;

  return (
    <div className={["flex items-center gap-2 w-full", className ?? ""].join(" ")} data-testid={testId} data-variant="row" data-state={state}>
      {timeRange && (
        <span className="text-[11px] text-[var(--color-text-muted)] w-10 flex-shrink-0 text-right">
          {timeRange}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex-1 min-w-0 rounded-[4px] px-2 py-1.5 text-left transition-shadow hover:shadow-sm"
        style={{
          backgroundColor: tone.bg,
          color: tone.fg,
          borderLeft: state === "ongoing" ? `3px solid ${tone.accent}` : undefined,
          opacity: state === "done" ? 0.55 : undefined,
        }}
      >
        <div className="text-[12px] font-semibold truncate">{label}</div>
        {students && <div className="text-[10px] opacity-75 truncate">{students}</div>}
      </button>
      {onAttendanceClick && (
        <button
          type="button"
          onClick={onAttendanceClick}
          aria-label="출석 체크"
          className="flex-shrink-0 flex flex-col items-center gap-0.5"
        >
          <span className={[
            "w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center",
            ATTENDANCE_COLORS[attendanceStatus],
          ].join(" ")}>
            {ATTENDANCE_LABELS[attendanceStatus]}
          </span>
          <span className="text-[9px] text-[var(--color-text-muted)]">출석</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: row 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "row variant"
```

Expected: 3/3 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/SessionCard.tsx src/components/molecules/__tests__/SessionCard.test.tsx
git commit -m "feat(session-card): implement row variant with attendance badge

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A7: SessionCard — chip variant TDD

**Files:**
- Modify: `src/components/molecules/SessionCard.tsx`
- Modify: `src/components/molecules/__tests__/SessionCard.test.tsx`

- [ ] **Step 1: chip 실패 테스트 추가**

Append to `src/components/molecules/__tests__/SessionCard.test.tsx`:
```tsx
describe("SessionCard — chip variant", () => {
  it("과목명만 1줄로 렌더한다", () => {
    render(<SessionCard variant="chip" subject={blueSubject} data-testid="chip" />);
    expect(screen.getByText("피아노")).toBeDefined();
    expect(screen.queryByText("과목 없음")).toBeNull();
  });

  it("3-tone CSS var background가 적용된다", () => {
    render(<SessionCard variant="chip" subject={blueSubject} data-testid="chip" />);
    expect(screen.getByTestId("chip").style.backgroundColor).toBe("var(--color-subject-blue-bg)");
  });

  it("onClick 핸들러가 동작한다", () => {
    const onClick = vi.fn();
    render(<SessionCard variant="chip" subject={blueSubject} onClick={onClick} data-testid="chip" />);
    fireEvent.click(screen.getByTestId("chip"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: chip 테스트 실패 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "chip variant"
```

Expected: FAIL.

- [ ] **Step 3: SessionCardChip 구현**

Replace `SessionCardChip` in `src/components/molecules/SessionCard.tsx`:
```tsx
function SessionCardChip({
  subject,
  state = "default",
  onClick,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "수업";

  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium truncate w-full text-left",
        onClick ? "cursor-pointer hover:opacity-90" : "",
        className ?? "",
      ].join(" ")}
      style={{
        backgroundColor: tone.bg,
        color: tone.fg,
        opacity: state === "done" ? 0.55 : undefined,
      }}
      data-testid={testId}
      data-variant="chip"
      data-state={state}
    >
      {label}
    </Tag>
  );
}
```

- [ ] **Step 4: chip 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "chip variant"
```

Expected: 3/3 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/SessionCard.tsx src/components/molecules/__tests__/SessionCard.test.tsx
git commit -m "feat(session-card): implement chip variant for monthly cells

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A8: SessionCard — preview variant TDD

**Files:**
- Modify: `src/components/molecules/SessionCard.tsx`
- Modify: `src/components/molecules/__tests__/SessionCard.test.tsx`

- [ ] **Step 1: preview 실패 테스트 추가**

Append to `src/components/molecules/__tests__/SessionCard.test.tsx`:
```tsx
describe("SessionCard — preview variant", () => {
  it("block처럼 렌더하지만 pointer-events-none이 적용된다", () => {
    render(
      <SessionCard variant="preview" subject={blueSubject} studentNames={["김지우"]} data-testid="preview" />
    );
    const el = screen.getByTestId("preview") as HTMLElement;
    expect(screen.getByText("피아노")).toBeDefined();
    expect(el.className).toContain("pointer-events-none");
  });

  it("onClick을 전달해도 클릭되지 않는다 (읽기 전용)", () => {
    const onClick = vi.fn();
    render(
      <SessionCard variant="preview" subject={blueSubject} onClick={onClick} data-testid="preview" />
    );
    // button이 아닌 div로 렌더 — onClick 무시
    const el = screen.getByTestId("preview");
    expect(el.tagName.toLowerCase()).toBe("div");
    fireEvent.click(el);
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "preview variant"
```

Expected: FAIL.

- [ ] **Step 3: SessionCardPreview 구현**

Replace `SessionCardPreview` in `src/components/molecules/SessionCard.tsx`:
```tsx
function SessionCardPreview({
  subject,
  studentNames,
  style,
  className,
  "data-testid": testId,
}: SessionCardProps) {
  const tone = resolveSessionTone(subject?.color);
  const label = subject?.name ?? "수업";
  const subLabel = studentNames && studentNames.length > 0 ? studentNames.join(", ") : undefined;

  return (
    <div
      className={[
        "rounded-[4px] px-2 py-1 text-[10px] leading-tight overflow-hidden pointer-events-none",
        className ?? "",
      ].join(" ")}
      style={{
        ...style,
        backgroundColor: tone.bg,
        color: tone.fg,
      }}
      data-testid={testId}
      data-variant="preview"
      aria-hidden="true"
    >
      <div className="font-semibold truncate">{label}</div>
      {subLabel && <div className="text-[9px] opacity-75 truncate">{subLabel}</div>}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx -t "preview variant"
```

Expected: 2/2 PASS.

- [ ] **Step 5: 전체 SessionCard 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionCard.test.tsx
```

Expected: 18/18 PASS (block 10 + row 3 + chip 3 + preview 2).

- [ ] **Step 6: 커밋**

```bash
git add src/components/molecules/SessionCard.tsx src/components/molecules/__tests__/SessionCard.test.tsx
git commit -m "feat(session-card): implement preview variant for landing mockup

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A9: SessionOverflowPopover TDD

**Files:**
- Create: `src/components/molecules/SessionOverflowPopover.tsx`
- Create: `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx`

- [ ] **Step 1: popover stub 작성**

Create `src/components/molecules/SessionOverflowPopover.tsx`:
```tsx
"use client";

import React, { useEffect, useRef } from "react";
import { resolveSessionTone } from "./SessionCard.utils";
import type { Subject } from "@/lib/planner";

export interface OverflowSessionItem {
  id: string;
  subject: Subject | null;
  studentNames: string[];
}

interface Props {
  title: string;        // e.g. "14:00 수업 5건"
  items: OverflowSessionItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function SessionOverflowPopover({ title, items, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      <div
        data-testid="overflow-popover-backdrop"
        className="fixed inset-0 z-[998]"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-label={title}
        className="absolute top-full right-0 mt-1 z-[999] w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-1.5"
      >
        <div className="text-[10px] text-[var(--color-text-muted)] px-2 py-1">{title}</div>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const tone = resolveSessionTone(item.subject?.color);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)]"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: tone.accent }}
                  />
                  <span className="flex-1 text-left truncate font-medium">
                    {item.subject?.name ?? "수업"}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[80px]">
                    {item.studentNames.join(", ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 테스트 작성**

Create `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx`:
```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionOverflowPopover, type OverflowSessionItem } from "../SessionOverflowPopover";

const items: OverflowSessionItem[] = [
  { id: "s1", subject: { id: "sub1", name: "피아노", color: "blue" } as any, studentNames: ["김지우"] },
  { id: "s2", subject: { id: "sub2", name: "기타", color: "amber" } as any, studentNames: ["이서연"] },
];

describe("SessionOverflowPopover", () => {
  it("title과 items를 렌더한다", () => {
    render(<SessionOverflowPopover title="14:00 수업 2건" items={items} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("14:00 수업 2건")).toBeDefined();
    expect(screen.getByText("피아노")).toBeDefined();
    expect(screen.getByText("기타")).toBeDefined();
  });

  it("item 클릭 시 onSelect(id)를 호출한다", () => {
    const onSelect = vi.fn();
    render(<SessionOverflowPopover title="t" items={items} onSelect={onSelect} onClose={() => {}} />);
    fireEvent.click(screen.getByText("피아노"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("backdrop 클릭 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(<SessionOverflowPopover title="t" items={items} onSelect={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("overflow-popover-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape 키 입력 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(<SessionOverflowPopover title="t" items={items} onSelect={() => {}} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/SessionOverflowPopover.test.tsx
```

Expected: 4/4 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/components/molecules/SessionOverflowPopover.tsx src/components/molecules/__tests__/SessionOverflowPopover.test.tsx
git commit -m "feat(session-card): add overflow popover for 4+ overlap cases

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task A10: Phase A — 최종 검증 + PR

**Files:** 변경 없음 (검증만)

- [ ] **Step 1: 전체 type-check + unit test 통과 확인**

```bash
npm run check:quick
```

Expected: tsc + 전체 unit test PASS.

- [ ] **Step 2: build 통과 확인**

```bash
npm run check
```

Expected: tsc + unit + build 모두 통과 (1분 내외).

- [ ] **Step 3: push + PR 생성**

```bash
git push -u origin feat/phase6-a-session-card
gh pr create --base dev --title "feat(phase6-a): SessionCard primitive + tintFromHex util" --body "$(cat <<'EOF'
## Summary
- 신규 `SessionCard` primitive (block/row/chip/preview 4 variants × default/ongoing/done/conflict 4 states)
- 신규 `tintFromHex` util — hex → 파스텔 hex 변환 (PDF와 알고리즘 공유 예정)
- 신규 `SessionOverflowPopover` — 4+ 겹침 시 목록 팝오버
- 3-tone SSOT(`--color-subject-*-bg/-fg/-accent`) 매핑 resolver

## Context
Phase 6 Schedule Body Unification의 foundation PR. 이 PR은 UI 변경 없음 — consumer는 Phase B/C/D/E에서 순차 교체.

## Test plan
- [ ] `npm run check:quick` 통과
- [ ] `npm run check` (build 포함) 통과
- [ ] CI green
- [ ] Storybook/UI 영향 없음 (consumer 없음)

Spec: `docs/superpowers/specs/2026-04-17-schedule-body-unification-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: CI 통과 확인**

```bash
gh pr checks --watch
```

Expected: all green.

- [ ] **Step 5: PR 머지 (사용자 승인 후)**

사용자에게 CI 통과 보고 → 머지 승인 대기 → `gh pr merge --merge --delete-branch`.

---

## Phase G — UI Bugfixes (Phase A와 병렬 가능)

### Task G1: 브랜치 생성

- [ ] **Step 1: 브랜치 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev && git pull origin dev
git checkout -b fix/phase6-g-tooltip-accountmenu
```

---

### Task G2: HelpTooltip — 뷰포트 경계 감지 TDD

**Files:**
- Modify: `src/components/molecules/HelpTooltip.tsx`
- Modify: `src/components/molecules/__tests__/HelpTooltip.test.tsx`

- [ ] **Step 1: flip 테스트 추가 (실패 상태)**

Append to `src/components/molecules/__tests__/HelpTooltip.test.tsx`:
```tsx
import { vi } from "vitest";

describe("HelpTooltip — viewport boundary", () => {
  it("뷰포트 우측 경계 초과 시 data-flip='left' 속성이 붙는다", () => {
    // Simulate narrow viewport
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { writable: true, value: 320 });

    // Mock getBoundingClientRect to return a rect that exceeds viewport
    const origGBCR = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      right: 340,  // > 320 - 8
      left: 100, top: 0, bottom: 100, width: 240, height: 100, x: 100, y: 0,
      toJSON: () => ({}),
    })) as any;

    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));

    const popover = screen.getByText("도움말 내용").closest("[data-testid='help-tooltip-popover']");
    expect(popover?.getAttribute("data-flip")).toBe("left");

    Object.defineProperty(window, "innerWidth", { writable: true, value: originalInnerWidth });
    Element.prototype.getBoundingClientRect = origGBCR;
  });

  it("뷰포트 경계 내이면 data-flip='none'", () => {
    const origGBCR = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      right: 400, left: 100, top: 0, bottom: 100, width: 300, height: 100, x: 100, y: 0,
      toJSON: () => ({}),
    })) as any;

    render(<HelpTooltip content="내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));

    const popover = screen.getByText("내용").closest("[data-testid='help-tooltip-popover']");
    expect(popover?.getAttribute("data-flip")).toBe("none");

    Element.prototype.getBoundingClientRect = origGBCR;
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
npx vitest run src/components/molecules/__tests__/HelpTooltip.test.tsx -t "viewport boundary"
```

Expected: FAIL (data-flip 미구현, data-testid 미존재).

- [ ] **Step 3: HelpTooltip flip 로직 구현**

Replace `src/components/molecules/HelpTooltip.tsx`:
```tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

interface HelpTooltipProps {
  content: string;
  label?: string;
}

export function HelpTooltip({ content, label = "도움말" }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flip, setFlip] = useState<"none" | "left">("none");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !popoverRef.current) return;
    const rect = popoverRef.current.getBoundingClientRect();
    setFlip(rect.right > window.innerWidth - 8 ? "left" : "none");
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={label}
        className="flex items-center justify-center w-4 h-4 rounded-full border border-[var(--color-text-muted)] text-[var(--color-text-muted)] text-[10px] font-bold hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        i
      </button>
      {isOpen && (
        <>
          <div
            data-testid="help-tooltip-backdrop"
            className="fixed inset-0 z-[999]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={popoverRef}
            data-testid="help-tooltip-popover"
            data-flip={flip}
            className={[
              "absolute top-0 z-[1000] w-56 max-w-[calc(100vw-32px)] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)] shadow-admin-md leading-relaxed",
              flip === "left" ? "right-6" : "left-6",
            ].join(" ")}
          >
            {content}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/HelpTooltip.test.tsx
```

Expected: 기존 5 + 신규 2 = 7/7 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/molecules/HelpTooltip.tsx src/components/molecules/__tests__/HelpTooltip.test.tsx
git commit -m "fix(tooltip): flip popover to left when overflowing viewport

뷰포트 우측 경계를 초과하면 data-flip='left' + right-6 앵커로 전환.
max-w-[calc(100vw-32px)] 보강으로 모바일 375px에서 잘림 방지.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task G3: AccountMenu — compact anchor TDD

**Files:**
- Modify: `src/components/molecules/AccountMenu.tsx`
- Modify: `src/components/molecules/__tests__/AccountMenu.test.tsx`

- [ ] **Step 1: AccountMenu 기존 테스트 확인**

```bash
npx vitest run src/components/molecules/__tests__/AccountMenu.test.tsx
```

Baseline 통과 확인. 만약 로그인 상태 mock이 없다면 다음 step에서 추가.

- [ ] **Step 2: compact anchor 테스트 추가**

Read the existing `AccountMenu.test.tsx` for its mocking pattern, then append:

```tsx
describe("AccountMenu — compact anchor", () => {
  // user가 로그인 상태라고 가정: supabase.auth.getUser mock이 이미 있다면 그대로 사용.
  // 없으면 AccountMenu 상단의 useEffect 모킹이 필요 — 기존 테스트를 참조.

  it("compact=true일 때 메뉴가 left-full top-0 anchor를 사용한다", async () => {
    const { container } = render(<AccountMenu compact />);
    // 로그인 비활성화 분기(compact && !user) → null 반환이면 테스트 조정 필요.
    // 이 테스트는 user가 주입된 상태에서 동작해야 함.
    // supabase mocking은 기존 테스트 패턴을 따르되, 하단 주석의 helper를 활용.
    // (실제 테스트 작성 시 기존 mock helper를 import.)

    // 버튼 클릭 → 드롭다운 열기
    const button = container.querySelector('button[aria-label="계정 메뉴"]');
    if (!button) return; // 로그아웃 상태면 테스트 스킵 (mock 미구현 시)
    fireEvent.click(button);

    const menu = container.querySelector('[data-testid="account-menu-dropdown"]');
    expect(menu?.getAttribute("data-anchor")).toBe("compact");
  });

  it("compact=false이면 data-anchor='default'", async () => {
    const { container } = render(<AccountMenu />);
    const button = container.querySelector('button[aria-label="계정 메뉴"]');
    if (!button) return;
    fireEvent.click(button);
    const menu = container.querySelector('[data-testid="account-menu-dropdown"]');
    expect(menu?.getAttribute("data-anchor")).toBe("default");
  });
});
```

**Note:** 기존 `AccountMenu.test.tsx`가 user mocking을 어떻게 하는지 먼저 확인해야 함. 로그인 상태 mock을 설정하는 helper가 있으면 그대로 사용. 없으면 이 태스크 내에 mock setup을 추가.

- [ ] **Step 3: 기존 테스트 파일 읽기**

```bash
cat src/components/molecules/__tests__/AccountMenu.test.tsx
```

Identify the existing Supabase mock pattern, adjust the Step 2 test to use it.

- [ ] **Step 4: AccountMenu 수정**

In `src/components/molecules/AccountMenu.tsx`, replace the dropdown `<div>` (line 97-ish):
```tsx
<div
  data-testid="account-menu-dropdown"
  data-anchor={compact ? "compact" : "default"}
  className={[
    "absolute z-[9999] min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-2",
    compact ? "left-full top-0 ml-2" : "right-0 top-full mt-2",
  ].join(" ")}
>
  {/* ... existing children unchanged ... */}
</div>
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx vitest run src/components/molecules/__tests__/AccountMenu.test.tsx
```

Expected: 기존 테스트 + 신규 2 PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/components/molecules/AccountMenu.tsx src/components/molecules/__tests__/AccountMenu.test.tsx
git commit -m "fix(account-menu): flip dropdown to right side in compact sidebar

compact prop일 때 left-full top-0 ml-2로 앵커 전환. 사이드바 우측으로
메뉴가 열려 뷰포트 좌측 오버플로 문제 해결.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task G4: Phase G — UI verification + PR

**Files:** 변경 없음 (검증만)

- [ ] **Step 1: 전체 check 통과**

```bash
npm run check
```

Expected: all green.

- [ ] **Step 2: Dev 서버 시작 (별도 터미널)**

```bash
npm run dev
```

localhost:3000 확인.

- [ ] **Step 3: Playwright MCP — HelpTooltip 모바일 375px 검증**

1. `mcp__playwright__browser_resize`로 375×667 설정
2. `mcp__playwright__browser_navigate` — `http://localhost:3000/schedule`
3. 화면 우측의 `i` 아이콘(ColorBySelector 도움말 등) 클릭
4. `mcp__playwright__browser_take_screenshot` — 팝오버가 뷰포트 내에 들어가는지 확인
5. Issues: 없으면 pass, 있으면 flip 로직 조정.

- [ ] **Step 4: Playwright MCP — AccountMenu compact 검증**

1. 뷰포트를 desktop(1280×720)으로 복원
2. `/schedule` 등 사이드바 페이지로 이동
3. 로그인 상태에서 사이드바의 프로필 아바타 클릭
4. 드롭다운이 사이드바 우측으로 열리는지 + "로그아웃" 버튼이 클릭 가능한지 screenshot
5. 로그아웃 버튼 클릭 시도 (실제 로그아웃은 하지 말고 버튼 활성 여부만 확인)

- [ ] **Step 5: push + PR**

```bash
git push -u origin fix/phase6-g-tooltip-accountmenu
gh pr create --base dev --title "fix(phase6-g): HelpTooltip viewport flip + AccountMenu compact anchor" --body "$(cat <<'EOF'
## Summary
- HelpTooltip: 뷰포트 우측 경계 감지 시 popover를 좌측으로 flip. max-w 제한으로 모바일 안전.
- AccountMenu: compact prop일 때 드롭다운이 사이드바 우측으로 열리도록 anchor 전환.

## Fixes
- 모바일 375px에서 `/schedule` 도움말 아이콘 팝오버 오버플로 → 화면 밖으로 잘림
- 사이드바 프로필 클릭 시 드롭다운이 좌측 오버플로 → 로그아웃 버튼 클릭 불가

## Test plan
- [x] HelpTooltip 2개 viewport 테스트 추가
- [x] AccountMenu compact/default anchor 테스트 추가
- [ ] Playwright MCP — 모바일 375px HelpTooltip screenshot
- [ ] Playwright MCP — 사이드바 AccountMenu screenshot
- [ ] CI green

## UI Verification Report
### 1차 — Playwright MCP
- Flows tested: HelpTooltip 375px, AccountMenu compact
- Screenshots: [attach in review]
- Issues found: None

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: CI 통과 확인 + 사용자 승인 머지**

```bash
gh pr checks --watch
```

---

## Follow-up Plans (이 플랜 범위 외)

Phase A 머지 완료 후 다음 플랜 파일 작성 예정:
- `2026-04-18-phase6-b-weekly-rewrite.md` — ScheduleWeeklyView + TimeTableGrid 삭제
- `2026-04-18-phase6-cdef-view-migrations.md` — Daily/Monthly/Landing/PDF consumer 교체 (병렬)

각 후속 플랜은 Phase A에서 확정된 SessionCard API에 의존하므로 A 머지 전에는 작성 불가.

---

## Verification Matrix (전체)

| # | 확인 | 방법 | 해당 Task |
|---|---|---|---|
| V1 | tintFromHex 경계값 | unit test | A2 |
| V2 | 3-tone resolver 매핑 | unit test | A4 |
| V3 | SessionCard 4 variants 렌더 | RTL | A5~A8 |
| V4 | SessionCard 4 states data-state | RTL | A5 |
| V5 | OverflowPopover 인터랙션 | RTL | A9 |
| V6 | build + check 통과 | npm run check | A10, G4 |
| V7 | HelpTooltip viewport flip | RTL + Playwright 모바일 | G2, G4 |
| V8 | AccountMenu compact anchor | RTL + Playwright | G3, G4 |

---

## Known Risks

1. **A6 row variant의 attendance 배지** — 기존 `ScheduleDailyView.tsx`의 ATTENDANCE_* 상수와 중복. Phase C에서 DailyView를 SessionCard로 교체할 때 DailyView 쪽 상수를 삭제하여 단일화.
2. **A5 block variant의 `<span className="absolute ..." ⚠>`** — `<button>` 안의 `absolute`는 `position: relative` 컨테이너 필요. Block variant 최상위 요소에 `relative` 클래스가 있어야 한다 (구현 시 `"relative"`를 base className에 추가했는지 확인 — 위 예시 코드에 없으니 실제 구현 시 추가 필수).
3. **G3 AccountMenu 테스트** — 기존 supabase mock 패턴을 따라야 하므로 구현 직전 `AccountMenu.test.tsx` 전문 확인 필요. mock이 없으면 Step 3에서 조정.
