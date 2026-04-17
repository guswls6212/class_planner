# Schedule Body Unification — Design Spec

**Date:** 2026-04-17  
**Status:** Approved  
**Replaces:** N/A (신규 Phase 6 범위)  
**Related:** `specs/2026-04-15-phase3-design-system-design.md`, `specs/2026-04-16-landing-page-redesign-design.md`

---

## 1. Problem Statement

`/schedule`의 세 뷰(Weekly/Daily/Monthly)와 랜딩 목업/PDF 출력물이 시각적으로 일치하지 않는다.

| 컴포넌트 | 현재 상태 | 목표 |
|---|---|---|
| `SessionBlock` (Weekly) | `SubjectChip variant="fill"` — 불투명 bg + 흰 글자 | 3-tone 파스텔 bg + 진한 fg |
| `ScheduleDailyView` | `SubjectChip variant="border-left"` | `SessionCard variant="row"` |
| `MonthDayCell` | `SubjectChip variant="fill"` | `SessionCard variant="chip"` |
| `SchedulePreview` (랜딩) | `SubjectChip variant="fill"` | `SessionCard variant="preview"` |
| `PdfSessionBlock` | 로컬 `lightenColor` | 공유 `tintFromHex` util |
| Weekly 축 | rows=요일, cols=시간 | rows=시간, cols=요일 (세로 시간축) |

추가 버그:
- `HelpTooltip`: 고정 `left-6` offset → 우측 뷰포트 오버플로
- `AccountMenu`: compact 사이드바에서 `right-0 top-full` → 좌측 오버플로, 로그아웃 불가

---

## 2. Design Decisions

### 2.1 시각 기준 — Phase 3 SSOT

`specs/2026-04-15-phase3-design-system-design.md` L236-246의 SessionBlock 상태 레이어가 유일한 SSOT.

| 상태 | 스타일 |
|---|---|
| **기본** | `-bg` 파스텔 bg + `-fg` 진한 텍스트 + `radius 4px` + `padding 6px 8px` |
| **진행 중** | 좌측 `3px solid -accent` 바 추가 |
| **완료** | `opacity: 0.55` |
| **호버** | `translateY(-1px)` + `shadow-md` |
| **드래그** | `shadow-lg` + `cursor-grabbing` |
| **충돌** | 좌측 `3px solid #EF4444` + ⚠ 아이콘 |
| **포커스** | `outline: 2px solid #FBBF24` |

**Note:** border-left는 기본 상태에 없음. 진행중/충돌 상태의 시각 신호 전용.

### 2.2 색 시스템 — 3-tone 토큰

CSS 변수 직접 사용. 레거시 hex 색상(과목 생성 시 hex로 저장된 경우)만 `tintFromHex` 폴백.

```
bg:     var(--color-subject-{color}-bg)   // 파스텔 배경
fg:     var(--color-subject-{color}-fg)   // 진한 텍스트
accent: var(--color-subject-{color}-accent) // 진행중/포커스 바
```

### 2.3 Weekly 레이아웃 — CSS Grid 세로 시간축

- **축 전환:** rows=요일 → rows=시간슬롯, cols=요일
- **셀 높이:** 32px / 30분 (1시간 = 64px)
- **시간 범위:** 9~23시 (28슬롯)
- **요일 수:** 5(기본) — 데이터에 토/일 세션 있으면 동적 확장

```
gridTemplateColumns: 48px repeat(N, minmax(100px, 1fr))
gridTemplateRows:    28px repeat(28, 32px)   // 헤더 + 28슬롯
```

세션 블록 위치: `gridColumn: weekday + 2`, `gridRow: startSlot + 2 / span durationSlots`

**30분 스냅:** 분 단위 startsAt이 30분 경계에 있지 않은 경우 가장 가까운 30분으로 반올림. 세션 추가 모달이 이미 30분 기준이므로 실데이터 영향 없음.

### 2.4 겹침 처리 — D·하이브리드

같은 요일·시간 슬롯에 N개 세션이 겹칠 때:

| 겹침 수 | 처리 |
|---|---|
| 1 | 전체 너비 |
| 2 | 50/50 균등 분할 |
| 3 | 33/33/33 균등 분할 |
| 4+ | 앞 2개 50/50 + 우하단 "+N" pill |

"+N" pill 클릭 → `SessionOverflowPopover` (과목 점 + 이름 + 학생, 읽기 전용). popover 안에서 드래그 불가(1차 범위).

---

## 3. Component Architecture

### 3.1 신규 Primitive — `SessionCard`

**위치:** `src/components/molecules/SessionCard.tsx`  
**역할:** Weekly/Daily/Monthly/Landing 공통 세션 표현 단위.

```tsx
type Variant = "block" | "row" | "chip" | "preview";
type SessionCardState = "default" | "ongoing" | "done" | "conflict";

interface SessionCardProps {
  subject: Subject | null;
  studentNames?: string[];
  timeRange?: string;       // "14:00–15:00" (row variant)
  variant: Variant;
  state?: SessionCardState;
  overlapCount?: number;    // block: 겹침 수 (D-hybrid 계산용)
  overlapIndex?: number;
  onClick?: () => void;
  onAttendanceClick?: () => void; // row variant 전용
  attendanceStatus?: "all-present" | "partial" | "absent" | "unmarked";
}
```

**variant별 렌더:**

- `block` — Weekly 그리드 내. 높이·위치는 CSS Grid `gridRow/gridColumn` (caller가 주입). 3-tone bg/fg/accent.
- `row` — Daily 뷰. `flex items-center gap-3`. 시간 prefix → 과목 → 학생(muted) → 출석 배지.
- `chip` — Monthly 셀. 과목명만, 1줄 `truncate`. `+N` overflow는 MonthDayCell이 처리.
- `preview` — 랜딩 목업. block 축소형, pointer-events none.

### 3.2 신규 Util — `tintFromHex`

**위치:** `src/lib/colors/tintFromHex.ts`

```ts
export function tintFromHex(hex: string, ratio = 0.8): string
// ratio=0.8 → 80% white mix (pastel). PDF PdfSessionBlock.lightenColor와 동일 알고리즘.
```

용도: 레거시 hex 과목 색 → 파스텔 bg 폴백. PDF `PdfSessionBlock`이 공유.

### 3.3 신규 Organism — `ScheduleWeeklyView`

**위치:** `src/components/organisms/ScheduleWeeklyView.tsx`  
**역할:** CSS Grid 기반 세로 시간축 주간 뷰. `TimeTableGrid` 대체.

내부 구성:
- 시간 라벨 컬럼 (48px)
- 요일 헤더 행 (28px)
- 세션 블록들 (`SessionCard variant="block"`, `gridRow: span N`)
- 드래그 영역 (drop zone cells — pointer-events 전용, visual 없음)

### 3.4 신규 Molecule — `SessionOverflowPopover`

**위치:** `src/components/molecules/SessionOverflowPopover.tsx`  
**역할:** "+N" pill 클릭 시 겹친 세션 전체 목록 표시. 읽기 전용.

---

## 4. Migration Map

### 삭제 (폐기)
| 파일 | 대체 |
|---|---|
| `organisms/TimeTableGrid.tsx` | `ScheduleWeeklyView` |
| `molecules/TimeTableRow.tsx` | `ScheduleWeeklyView` 내부 |
| `molecules/TimeTableCell.tsx` | CSS Grid 셀 (컴포넌트 불필요) |
| `molecules/SessionBlock.tsx` | `SessionCard variant="block"` |

### 수정
| 파일 | 변경 |
|---|---|
| `organisms/ScheduleDailyView.tsx` | `SubjectChip border-left` → `SessionCard row` |
| `molecules/MonthDayCell.tsx` | `SubjectChip fill` → `SessionCard chip` |
| `common/SchedulePreview.tsx` | `SubjectChip fill` → `SessionCard preview` |
| `lib/pdf/PdfSessionBlock.ts` | `lightenColor` → `tintFromHex` import |
| `app/schedule/page.tsx` | `TimeTableGrid` → `ScheduleWeeklyView` |
| `molecules/HelpTooltip.tsx` | viewport boundary flip |
| `molecules/AccountMenu.tsx` | compact anchor fix |

### 보존 (재사용)
- `hooks/useSessionOverlap.ts` — D-hybrid 계산에 확장
- `hooks/useSessionDrag.ts` — `@dnd-kit` DnD 그대로
- `lib/schedule/resolveSessionColor.ts`
- `lib/schedule/getGroupStudentNames.ts`
- `lib/schedule/getSessionSubject.ts`

---

## 5. Bug Fixes

### HelpTooltip — 뷰포트 경계 감지
```tsx
// 현재: 고정 left-6 (우측 오버플로)
// 수정: open 시 getBoundingClientRect → 우측 경계 초과면 right-6으로 flip
useEffect(() => {
  if (!open || !ref.current) return;
  const rect = ref.current.getBoundingClientRect();
  setFlipLeft(rect.right > window.innerWidth - 8);
}, [open]);
```
추가: `max-w-[calc(100vw-32px)]`

### AccountMenu — compact 사이드바 anchor
```tsx
// 현재: right-0 top-full (compact에서 좌측 오버플로)
// 수정: compact prop일 때 left-full top-0 ml-2 (사이드바 우측으로 열기)
const positionClass = compact
  ? "left-full top-0 ml-2"
  : "right-0 top-full mt-2";
```

---

## 6. Phased PR Plan

| # | 브랜치 | 내용 | 의존 |
|---|---|---|---|
| A | `feat/phase6-a-session-card` | `tintFromHex` + `SessionCard` + 테스트 | — |
| B | `feat/phase6-b-weekly-rewrite` | `ScheduleWeeklyView` + 폐기 4개 삭제 | A |
| C | `feat/phase6-c-daily-unify` | DailyView → SessionCard row | A |
| D | `feat/phase6-d-monthly-unify` | MonthDayCell → SessionCard chip | A |
| E | `feat/phase6-e-landing-unify` | SchedulePreview → SessionCard preview | A |
| F | `feat/phase6-f-pdf-tint-share` | PDF lightenColor → tintFromHex | A |
| G | `fix/phase6-g-tooltip-accountmenu` | HelpTooltip + AccountMenu bugfix | — (A와 병렬) |

권장 실행 순서: A → G(병렬) → B → C/D/E/F(병렬)

---

## 7. Verification Checklist

| # | 항목 | 방법 |
|---|---|---|
| V1 | tsc + unit | `npm run check:quick` |
| V2 | Weekly 렌더·드래그 | Playwright `/schedule?view=week` + 드래그 시나리오 |
| V3 | Daily/Monthly/Landing 파스텔 통일 | screenshot 4장 비교 |
| V4 | 겹침 2/3/5개 | 시드 데이터 렌더 + screenshot |
| V5 | PDF 정상 | snapshot + 수동 다운로드 |
| V6 | HelpTooltip 375px 뷰포트 | 모바일에서 i 아이콘 클릭 |
| V7 | AccountMenu compact | 사이드바 프로필 → 로그아웃 |
| V8 | computer-use 2차 | Phase B, G 필수 — 시각/드래그/팝오버 탐험 |

---

## 8. Out of Scope

- Teacher 뷰 리디자인 (Phase 4 deferred)
- 공유 링크 `/share/{token}`
- Color-by 토글 UI
- 30분 단위 외 분 단위 입력 지원
