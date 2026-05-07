# ADR-009: Schedule 운영시간 customization + Layout 자유도

## Status
Proposed (2026-05-07)

## Context
class-planner의 `/schedule` 페이지는 학원 운영자의 메인 작업 화면이다. 다음 두 가지 한계가 있다.

### Layout 한계
- `timetable-container`가 헤더 + chip bar + 그리드를 모두 감싼 후 grid에만 `max-h-[80vh]`를 줌 → 학생 30+명일 때 chip bar가 3-4줄 wrap → 페이지 outer scroll + grid inner scroll = **scroll 2개 발생**
- 헤더(주간 시간표 / PDF / 템플릿)와 chip bar가 sticky가 아니라 스크롤 시 함께 사라짐 → 재방향(reorientation) 어려움
- 학생 수가 많은 학원일수록 **메인 콘텐츠인 시간표 영역이 압박**된다

### 시간 범위 한계
- `START_HOUR=9, END_HOUR=23` 하드코드. 2-3곳 중복 정의 (`shared/constants/sessionConstants.ts`, `lib/pdf/preflightCheck.ts`, `lib/pdf/PdfRenderer.ts`)
- 학원별 운영 패턴 차이:
  - 오전 7-9시 시작 학원 → 위쪽 빈 영역
  - 23시 이후 운영 학원 → 잘림
  - 오전/오후 dual-shift 학원 → 점심 시간대 비효율
- 운영시간 변경 UI 부재

## Decision

### 1. Schedule Layout 자유도 (P3 패키지)
- **Sticky 헤더**: 제목 + PDF + 템플릿 영역 `sticky top-0` + 배경색
- **Active Chips Only**: 학생/과목 필터를 활성 N개만 1줄로 표시 + "+더보기" dropdown
- **Outer scroll 제거**: page를 `flex flex-col h-screen`. 그리드만 `flex-1 overflow-auto`
- **In-page Time Selector**: grid 헤더 우측에 `[⏱ 9-23 ⌄]` 토글. localStorage 기억
- 새 layout은 default가 아닌 **opt-in** (안정성 + 점진적 검증)

### 2. Time Range Customization
- 새 hook `useTimeRange()`: `{ startHour, endHour, mode, dualShift? }` 반환
- mode 우선순위 (높은 → 낮은):
  1. URL query: `?range=auto|7-22|...` (디버깅·미리보기)
  2. User setting (localStorage `class_planner_{userId}_time_range`)
  3. Auto-detect (sessions의 min/max ± 1h padding)
  4. Default `9-18` (sessions 0개)
- mode 옵션:
  - `default`: 9-23 (기존 호환, BC)
  - `auto`: 데이터 기반 자동
  - `custom`: `{ startHour, endHour }`
  - `dual`: `{ morning: { start, end }, afternoon: { start, end } }` — Phase 3
- 운영시간 변경은 **PDF 출력에도 동일 적용** (preflightCheck / PdfRenderer가 동적 startHour/endHour 받음)

### 3. Visual A/B Toggle (Live Preview)
- query param `?layout=p3` → P3 layout enable
- query param 없으면 default(현재) layout
- **Production default는 현재 layout 그대로** (사용자 경험 보존)
- 사용자 + reviewer가 라이브 비교 후 default 전환은 **별도 PR + 새 ADR**로 결정

## Consequences

### Positive
- 시간표 영역이 viewport의 70-80% 점유 (현재 50-60%)
- 학원별 운영 패턴 자유롭게 표현 (오전반·오후반·24시간 학원 OK)
- 점진적 rollout — 토글로 검증 후 default 전환
- PDF 출력이 운영시간 따라 자동 정렬 → 인쇄 효율 ↑

### Negative / Trade-offs
- `useTimeRange` hook 도입 → TimeTableGrid · PdfRenderer · preflightCheck 등 ~5-7곳 변경
- Auto-detect 모드는 session 추가/삭제마다 grid 점프 가능 → debounce + smooth transition 필요
- Settings 새 섹션 → 학습 비용 (단, default `auto`로 비활성 사용자도 자동 혜택)
- 두 layout 한시적 dual maintenance

### Migration
- **BC 우선**: storage 없음(기존+신규 사용자) → default 9-23 유지
- 사용자가 settings에서 `auto` 또는 `custom`으로 명시 변경 시에만 적용
- query `?range=auto|7-22|...`는 preview/debug 용도 (URL 공유 시 일회성)
- 인증 사용자 DB 저장: 별도 ADR로 분리 (현 phase는 localStorage)

## Alternatives Considered

- **Side filter panel** (B): 좁은 화면 학원에서 시간표 압박 — 거부
- **Floating-only action bar** (D): 데스크톱 발견성 낮음 — 거부
- **Compress empty hours**: 시간 비균일 → 인쇄 PDF 인지 혼란 — 거부
- **Time range 하드코드 유지**: 학원별 자유도 0 — 거부

## Related
- ADR-003 (schedule view), ADR-004 (week isolation), ADR-008 (multi-slot template)
- 후속: default layout 전환 결정 시 새 ADR
