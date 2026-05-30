# Overflow Cluster Indicator Redesign — Design Spec

**Date:** 2026-04-29  
**Status:** Approved (Hybrid B+A — "Smart Cluster Indicator")  
**Scope:** class-planner 주간시간표 오버플로우 UX 개선

---

## Problem

4개 이상의 수업이 시간 겹침으로 같은 요일-시간대에 배치될 때, 3번째 이상의 세션은 우상단의 작은 `+N` 배지 뒤에 숨는다. 현재 배지가:

- `#27272A` (zinc-800) 하드코딩 색상 — Admin amber 디자인 시스템과 어긋남
- `width: 20px`, `text-[9px]` — 다크 배경 위에서 거의 안 보임
- 클릭 전에는 숨은 세션이 "몇 개인지 + 무슨 과목인지" 완전히 불투명
- 팝오버에 시간·선생 정보 없음, focus trap/키보드 내비게이션 없음

---

## Solution: Hybrid B+A ("Smart Cluster Indicator")

> B의 **색점 인라인 프리뷰** + A의 **polished amber 팝오버** 결합

### 1. Trigger — Color-Dot Track

**Closed state (항상 보임):**

```
┌──────────────────────┐
│ 중등사회         ╭─╮ │
│ 11:30–12:30      │●│ │  ← 8×8 dot, color = 중등국어 tone.accent (#3b82f6)
│ 이현진, 김요섭   │●│ │  ← 8×8 dot, color = 고등영어 tone.accent (#8b5cf6)
│                  ╰─╯ │
│   (고등수학 카드)    │
└──────────────────────┘
```

**시각 스펙 (trigger container):**

| Property | Value | 근거 |
|---|---|---|
| position | `absolute; top: 4px; right: 4px` | 현재 pill 좌표 근접 |
| background | `rgba(255,255,255, 0.06)` | `--color-cluster-overflow-bg` (신규 토큰) |
| backdrop-filter | `blur(4px)` | 글래스모피즘 subtle |
| border-radius | `6px` (`--radius-admin-md`) | Admin DS 정합 |
| box-shadow | `0 1px 2px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.08)` | 구분감 |
| padding | `4px` | dots 주위 숨공간 |
| gap (dots) | `3px` | vertical stack |
| min tap area | `min-width: 14px; min-height: 24px` | 모바일 hit area |
| `::before` hit padding | `4px` 확장 | 터치 정확도 보완 |

**dot 스펙:**

| Property | Value |
|---|---|
| size | `8×8px` |
| border-radius | `3px` |
| color | hidden session의 `tone.accent` |
| 최대 표시 dot 수 | **4개** (hidden sessions 수 ≤ 4이면 그 수만큼, >4이면 3개 dot + 마지막 `+N` 텍스트 칩) |
| +N 칩 | `bg: var(--color-bg-tertiary)`, `color: var(--color-text-primary)`, `text-[9px]`, `border-radius: 3px` |

**Hover / Focus state:**

```css
box-shadow: 0 1px 2px rgba(0,0,0,0.25),
            0 0 0 1.5px var(--color-accent),   /* amber ring */
            inset 0 0 0 1px rgba(255,255,255,0.08);
```

**등장 애니메이션:**

```css
@keyframes clusterIn {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: clusterIn 200ms ease-out;
```

`@media (prefers-reduced-motion: reduce)` → 애니메이션 비활성화.

**ARIA:**

```tsx
<button
  aria-haspopup="dialog"
  aria-expanded={isOpen}
  aria-label={`숨은 세션 ${count}개 보기`}
>
```

---

### 2. Popover — Polished Rich Card

**Layout:**

```
╭──────────────────────────────────╮
│ 숨은 세션 2개           11:30  × │  ← header
├──────────────────────────────────┤
│ ▎ 중등국어    11:30–12:30        │  ← 3px accent bar (blue)
│   김선생 · [학생 4명]            │
├──────────────────────────────────┤
│ ▎ 고등영어    11:30–13:00        │  ← 3px accent bar (violet)
│   박선생 · [학생 6명]            │
╰──────────────────────────────────╯
```

**시각 스펙:**

| Property | Value |
|---|---|
| width | `272px` |
| padding | `8px` |
| border-radius | `var(--radius-admin-md)` (6px) |
| background | `var(--color-bg-primary)` |
| border | `1px solid var(--color-border)` |
| box-shadow | `var(--shadow-admin-md)` |
| z-index | `999` (기존 `SessionOverflowPopover` 유지) |
| 등장 애니메이션 | `scale(0.95)→scale(1) + opacity 0→1, 150ms ease-out` |

**Header row:**

- 좌: `숨은 세션 N개` — `text-[11px] font-medium text-primary`
- 우: 시간 string (e.g. `11:30`) — `text-[11px] text-muted` + X 닫기 버튼 `size-4`

**Item row:**

- `padding: 8px 10px`
- 좌: `width: 3px; height: 100%; border-radius: 2px; background: tone.accent`
- 중앙 상단: 과목명 `text-[12px] font-semibold`
- 중앙 하단: `시간 · [선생] · [학생N명 chip]` — `text-[10px] text-muted`
  - chip: `bg-overlay-light text-[10px] px-1.5 py-0.5 rounded`
- hover: `bg: var(--color-overlay-light)`

**Viewport-aware flip:**

```
기본: top-full right-0 (아래, 우측 정렬)
우측 잘림: right-0 → left-0
하단 잘림: top-full → bottom-full (위로 열림)
```

`HelpTooltip` (`e2e9b0c`)의 flip 패턴 재사용.

**Keyboard & A11y:**

| 동작 | 구현 |
|---|---|
| 오픈 | trigger click |
| 닫기 | Esc, backdrop click, X 버튼 |
| 포커스 | 오픈 시 첫 번째 항목 autofocus |
| 이동 | ↑↓ arrow key roving tabindex |
| 선택 | Enter → onSessionClick(id) |
| role | `role="dialog" aria-label="숨은 세션 목록"` |
| focus trap | Modal 패턴 재사용 (react-focus-lock 또는 동일 자체 구현) |

---

## Design Decisions (confirmed)

| 결정 | 선택 | 이유 |
|---|---|---|
| Trigger 라벨 | **dot-only** (숫자 없음) | 점 수가 곧 개수 → 깔끔. 5번째부터만 +N 칩 |
| Hover preview | **없음** (click-only) | 모바일 우선, 단순성 유지 |
| Overflow threshold | **4+ 유지** | 기존 behavior 그대로, 위험 최소 |
| 모바일 threshold | **4+ 유지** | 별도 분기 피함 (lane 72px에서도 3-overlap은 equal-split 유지) |

---

## New CSS Tokens

```css
/* globals.css :root (lines 74–173) 에 추가 */
--color-cluster-overflow-bg: rgba(255, 255, 255, 0.06);
--color-cluster-overflow-ring: var(--color-accent);
```

---

## Files to Modify

| File | Change |
|---|---|
| `src/components/molecules/TimeTableRow.tsx` | pill 마크업(lines 458–504) → dot-track 컨테이너 교체; hidden sessions의 `tone.accent` 추출 |
| `src/components/molecules/SessionOverflowPopover.tsx` | 전체 레이아웃 재작성; 시간·선생·학생수 필드 추가; flip 로직; focus trap; autofocus; arrow-key |
| `src/app/globals.css` | 신규 토큰 2개 추가 |
| `src/components/molecules/__tests__/SessionOverflowPopover.test.tsx` | 시간/학생수 렌더, flip, autofocus, arrow-key 케이스 추가 |

**재사용할 기존 유틸:**

- `resolveSessionColor(session, colorBy, ...)` → `resolveSessionTone(color)` — `src/components/molecules/SessionCard.utils.ts:41-57`  
  dot의 `accent` 색은 이 파이프라인에서 `tone.accent`로 추출. `TimeTableRow`는 이미 `colorBy` prop을 받으므로 hidden sessions에도 동일 파이프라인 적용 가능.
- `tintFromHex(hex, 0.8)` — 임의 hex tone 처리
- `HelpTooltip` flip 패턴 — commit `e2e9b0c`
- Modal focus trap 패턴 — 구현 시 프로젝트 내 Modal 컴포넌트의 trap 로직 먼저 확인, 없으면 자체 구현

**`OverflowSessionItem` 타입 보강 필요** (현재 위치: `src/components/molecules/SessionOverflowPopover.tsx`):

```ts
interface OverflowSessionItem {
  id: string;
  subjectName: string;
  accent: string;       // tone.accent hex
  startTime: string;    // "11:30"
  endTime: string;      // "12:30"
  teacherName?: string;
  studentCount: number;
}
```

---

## Verification Plan

**빌드 검증:**

```bash
cd class-planner
pnpm test -- --testPathPattern=SessionOverflowPopover
pnpm typecheck
pnpm lint
pnpm build
```

**UI 검증 (CLAUDE.md 정책 — 필수):**

1. `pnpm dev` → `localhost:3000`
2. Playwright 시나리오:
   - 4+ overlap 클러스터에서 dot-track 트리거가 렌더되는지 + dot 색이 `tone.accent` 와 일치하는지 스크린샷
   - 트리거 클릭 → 팝오버 오픈 → 시간·선생·학생수 표시 확인
   - 첫 항목 autofocus, ↑↓ 이동, Enter 선택, Esc 닫힘
   - 우측 끝 클러스터에서 popover flip 확인
   - 모바일 뷰포트(375×667)에서 dot-track 탭 성공
3. 회귀: ≤3 overlap equal-split 케이스 시각 변화 없음 확인
4. 회귀: 드래그 중(`isDragging`) dot-track 숨김 동작 유지

---

## Out of Scope

- Threshold를 3+로 낮추는 것 (후속 단계에서 데이터 확인 후 결정)
- hover-preview mini-tooltip (클릭만으로 충분한지 사용 데이터 확인 후 결정)
- Design C/D/E 구현
