# EditSessionModal 재설계 — Spec

> Variant C (헤더 chip + body flex column) + V1-disabled validation. 디자인 탐색 라우트 `src/app/design-explorations/edit-session-modal/page.tsx`에서 사용자 결정 (2026-05-12).
>
> **Status:** Approved.
> **Scope:** `EditSessionModal` UI/UX 재설계 + validation 가드. 기존 picker 컴포넌트(`StudentChip`, `TeacherPillPicker`, colorPanel)는 100% 보존.

## 1. Motivation

### 1.1 트리거가 된 사고
- 학생 0명 + 저장 → 세션이 자동 삭제되는 UX 사고 (validation 없음, `handleSave`가 `onSave(weekday)` 무조건 호출).
- 헤더의 요일/시간 카드가 read-only라 편집하려면 body까지 스크롤. 정보 중복 (`weekdays[weekday]` 헤더 + body select 두 번).
- 학생 chip 앞 색 dot — 학생은 색 편집 기능 없는데 시각 노이즈.

### 1.2 디자인 탐색 결과
사용자가 4 variants 검토 후 **C (헤더 요일·시간 chip + body sticky→flex column + 학생 영역 우선)** + **V1-disabled validation** 채택.

## 2. Acceptance Criteria

| # | 요구사항 |
|---|---|
| AC-1 | 헤더에 요일 chip + 시간 chip이 노출되고 클릭 시 popover로 편집 가능. |
| AC-2 | 요일 popover — 7-grid (월~일) 버튼. 선택 시 즉시 chip 라벨 갱신 + popover 닫힘. |
| AC-3 | 시간 popover — 시작/종료 time input + "적용" 버튼. 적용 시에만 state 반영. |
| AC-4 | body에서 기존 요일·시간 select 제거 (헤더 chip이 SSOT). 중복 제거. |
| AC-5 | body는 flex column 구조 — 자체 scroll 없음. 학생 영역만 자체 scroll. |
| AC-6 | 학생 selected chips bar + 검색 input은 `flex-shrink-0` — 학생 list 스크롤 시 절대 가려지지 않음. |
| AC-7 | 학생 영역이 `flex-1 min-h-0`로 modal body의 남은 공간 다 차지. 미선택 list가 4명 row 이상 자연 표시. |
| AC-8 | 학생 selected chip + 미선택 list 항목의 **색 dot 제거** (학생은 색 편집 기능 없음). 강사 chip 색 dot은 유지. |
| AC-9 | 저장 버튼은 `selectedStudents.length === 0`일 때 **disabled**. 좌측에 helper text "학생 1명 이상 선택 필요". |
| AC-10 | `handleSave`에 가드 추가 — `selectedStudents.length === 0`이면 `onSave` 호출 X. UX disabled가 실패해도 함수 차원에서 차단. |
| AC-11 | 강사 그룹화(`TeacherPillPicker`의 `subjectId` prop으로 "담당/기타" 분리)는 그대로. |
| AC-12 | 색 선택 panel (헤더 우측 colorPanel) 그대로 유지 — `IconButton variant="tinted"` + `PRESET_COLORS` 12색 swatch + 직접 색상 선택 fallback. |
| AC-13 | 동명이인 부제 — `StudentChip`의 `metaRight` + 부제 helper(`formatStudentSubtitleExceptGrade`) 그대로 (ADR-015). |
| AC-14 | 모바일 viewport(`!isDesktop`)에서 `BottomSheet`로 wrap되는 흐름 유지. 헤더 chip + popover도 모바일에서 동작. |
| AC-15 | body 순서: **과목 → 강사 → 학생** (Variant C 결정). 학생 picker가 본문 비중 가장 크므로 마지막. 위 두 필수 메타가 항상 위에 보임. |
| AC-16 | 헤더 weekday chip 라벨: `weekStartDate` prop 있으면 **"X월 Y일 (요일)"** 형식. 없으면 fallback으로 "요일"만. |
| AC-17 | weekday chip 클릭 → **V3 month calendar popover** (`weekStartDate` 있을 때). 7-row × 7-col grid + 이전/다음 달 navigation. weekStartDate 없으면 fallback 7-grid. |
| AC-18 | calendar 시각: **선택된 날짜만** 진한 amber(주중 1개), **오늘**은 amber ring (옅게). 같은 weekday 다른 날짜는 강조 X. |
| AC-19 | ~~calendar의 임의 날짜 클릭 → 그 날의 weekday만 추출해 `setWeekday(weekday)`. schedule paradigm(주간 반복) 보존~~ → **AC-20으로 교체** (2026-05-12 paradigm 재해석). |
| AC-20 | calendar의 임의 날짜 클릭 → `weekday` + `weekStartDate` **둘 다** state 갱신. 다른 주의 날짜 선택 시 그 주의 월요일(YYYY-MM-DD)이 `selectedWeekStart`로. paradigm은 "매주 반복"이 아니라 **"특정 주(weekStartDate) + 요일(weekday) 조합"** — 데이터 모델(`planner.ts:47-50`)이 이미 둘 다 보존. |
| AC-21 | `onSave(weekday, weekStartDate?)` 시그니처. 다른 주로 이동 시 부모는 (a) `syncSessionUpdate` payload에 `weekStartDate` forward, (b) `setSelectedDate(new Date(weekStartDate))`로 시간표 자동 navigate(사용자 결정 ii). |
| AC-22 | API/Application/Repository chain 모두 `weekStartDate` forward — `PATCH /api/sessions/[id]` body, `SessionApplicationService.updateSession`, `SupabaseSessionRepository.update`(SQL `week_start_date` column). 미지정 시 기존 값 유지. |

## 3. 변경 파일

### 수정
- **`src/app/schedule/_components/EditSessionModal.tsx`** (대상)
  - 헤더 (line 313-380): 요일·시간 read-only 카드 → 클릭 가능 chip + popover anchor
  - body (line 382-539): 기존 요일/시간 select 제거. 학생 영역을 `flex-1 min-h-0`로. 학생 chip+검색은 `flex-shrink-0`.
  - footer (line 541-557): disabled state + helper text.
  - `handleSave` (line 196-202): 학생 0명 guard.
- **`src/components/molecules/StudentChip.tsx`** (검토 필요)
  - 만약 `compact` variant에 색 dot이 있으면 제거. row variant는 유지(검색 결과 시각 구분).

### 신규 (EditSessionModal 내부 sub-component)
- `WeekdayPopover` — 7-grid 버튼
- `TimePopover` — 시작/종료 time input + 적용 버튼

### 영향 없는 영역 (회귀 가드)
- `TeacherPillPicker` (그대로 재사용 — subjectId로 그룹화)
- `colorPanel` JSX (line 232-310, 그대로)
- `IconButton`, `EmptyState`, `BottomSheet` (그대로)
- `formatStudentSubtitleExceptGrade`, `buildDuplicateNameSet` (그대로)
- 부모 컴포넌트 props 시그니처 — `EditSessionModalProps` 변경 없음 (헤더 chip이 기존 `onStartTimeChange`/`onEndTimeChange`/`setWeekday` 그대로 호출)

## 4. Component 트리

```
EditSessionModal
├─ Header
│   ├─ 색 띠 (top 4px, previewColor)
│   ├─ 좌측 메타
│   │   ├─ subject.name (큰 텍스트)
│   │   ├─ studentNames (작은 메타)
│   │   └─ Chip row (NEW)
│   │       ├─ WeekdayChip → WeekdayPopover (NEW)
│   │       └─ TimeChip → TimePopover (NEW)
│   └─ 우측 액션
│       ├─ ColorPanel (기존 유지)
│       ├─ IconButton Delete (기존 유지)
│       └─ IconButton Close (기존 유지)
├─ Body (flex flex-col, overflow-hidden, max-h-[55vh])
│   ├─ Subject select (기존 유지, 위치 그대로)
│   ├─ TeacherPillPicker (기존 유지)
│   └─ Student area (flex-1 min-h-0)
│       ├─ Selected chips + 검색 input (flex-shrink-0)
│       ├─ Dropdown list (flex-1 min-h-0, overflow-y-auto)
│       └─ EmptyState (조건부)
└─ Footer
    ├─ Helper text (V1: 학생 0명일 때만)
    ├─ 취소
    └─ 저장 (disabled if 학생 0명)
```

## 5. Edge cases

| # | 케이스 | 처리 |
|---|---|---|
| EC-1 | 학생 0명 + 저장 클릭 | 버튼 disabled + helper text. handleSave 가드도 추가 (이중 방어). |
| EC-2 | 헤더 chip popover 외부 클릭 | popover 닫힘. 같은 chip 클릭 → toggle. |
| EC-3 | 두 popover 동시 open 시도 | 한 번에 하나만 — `openPopover` state로 단일 관리. 새 chip 클릭 시 이전 popover 자동 닫힘. |
| EC-4 | 시간 popover에서 시작/종료 역전 입력 (시작 > 종료) | 기존 `timeError` prop이 처리 — 적용 시 `onStartTimeChange`/`onEndTimeChange` 호출, 부모에서 `timeError` 갱신, body의 시간 영역에 표시 (현재 line 534-536). EditSessionModal 자체는 그대로 부모에 위임. |
| EC-5 | 색 선택 후 과목 변경 | 기존 effect(line 163) 그대로 — 과목 변경 시 previewColor를 해당 과목 색으로 sync. |
| EC-6 | 모바일 BottomSheet 안에서 popover 위치 | popover anchor가 chip의 absolute child라 BottomSheet 안에서도 자연 동작. fixed positioning 없음. |
| EC-7 | ESC로 popover 닫기 | popover 자체 ESC 처리 (modal ESC와 충돌 X — popover open 시 ESC는 popover만 닫힘, modal은 그대로). |
| EC-8 | 키보드 navigation | weekday popover: Tab으로 7-grid 순환, Enter로 선택. time popover: 표준 input Tab. |
| EC-9 | 학생 100명+ 검색 | 기존 검색 로직(`onEditStudentInputChange`, `editSearchResults` 부모 위임) 그대로. flex-1 min-h-0로 list가 modal 안에서 자연 scroll. |
| EC-10 | 학생 chip 색 dot 제거 후 동명이인 식별 | `StudentChip` 의 `metaRight` 부제(grade/birth/school)로 식별 가능. ADR-015 그대로. |

## 6. Tests

### Unit (Vitest + RTL)
- 학생 0명 + 저장 클릭 → `onSave` 호출되지 않음 + 버튼 disabled state
- 학생 1명+ 선택 후 저장 → `onSave(weekday)` 호출됨
- 헤더 요일 chip 클릭 → WeekdayPopover 표시. 다른 요일 클릭 → chip 라벨 갱신
- 헤더 시간 chip 클릭 → TimePopover 표시. 시간 변경 + "적용" → `onStartTimeChange`/`onEndTimeChange` 호출
- 색 패널 동작 (기존 테스트 회귀 0)
- 강사 그룹화 (기존 `TeacherPillPicker` 단위 테스트 그대로)

### E2E (Playwright)
- 시간표에서 세션 클릭 → 모달 열림 → 학생 추가/제거 → 저장 → 시간표 갱신 확인
- 학생 0명 → 저장 버튼 disabled 확인 (세션 삭제 X)
- 헤더 요일 chip 변경 → 저장 → 시간표에서 요일 이동 확인

## 7. Devil's Advocate

### Weaknesses
1. **헤더 chip popover 위치** — 모달이 viewport 가장자리에 있을 때 popover가 잘릴 수 있음. mockup의 `absolute top-full` 기본은 좌측 정렬. 우측 가장자리에선 popover가 화면 밖 → `right-0` 또는 dynamic anchor 필요. 보강: chip 위치별 popover 방향 결정.
2. **모바일 BottomSheet 안 popover** — 작은 viewport(375px)에서 popover width 280px가 거의 화면 width. 좌측 잘림 가능. 모바일은 popover 대신 bottom sheet 안의 inline panel로 fallback 검토.
3. **body의 요일/시간 select 제거 → 헤더만 SSOT** — 키보드 사용자가 form 위→아래 Tab 순서로 진입할 때 헤더 chip이 form context 외부라 어색할 수 있음. `<form>` 안에 headerChip 묶는지 검토.

### Rejected alternatives
- **B variant** (헤더에 과목 chip 추가) — 과목 변경 빈도 낮음, popover dropdown이 select와 중복.
- **D variant** (헤더에 강사까지) — 강사 chip이 6+명일 때 헤더 줄 wrapped 어색.
- **V2-inline / V3-toast** — 사용자 결정 V1-disabled가 안전 + 다른 모달과 일관(GroupSessionModal Step 1).

### Uncertainties
- `StudentChip` compact variant에 색 dot 있는지 확인 후 변경 범위 결정. 없으면 EditSessionModal 자체 변경만으로 충분.
- 모바일 BottomSheet header의 chip + popover 동작 — 실제 안드로이드/iOS Safari에서 keyboard interaction 검증 필요.

## 8. Rollout

1. spec doc 승인 (이 문서)
2. 같은 작업 branch (`feat/edit-session-modal-redesign-mockup`)에 구현 commit
3. RTL 테스트 추가 (validation + chip popover)
4. type-check + 기존 EditSessionModal 테스트 회귀 0 확인
5. Playwright로 desktop + mobile viewport 검증
6. UAT spec 추가 (S-17.X 또는 § 18 신설)
7. PR to dev → CI → 머지 → dev 배포 후 사용자 본인 검증
8. dev → main (사용자 명시 요청 시)

## 9. References

- 디자인 탐색: `src/app/design-explorations/edit-session-modal/page.tsx`
- 메모리 `feedback_class_planner_input_pattern` — Enter는 매칭만, 신규는 의식적 버튼
- 메모리 `feedback_ui_verify_user_browser_first` — 사용자 본인 브라우저 검증 우선
- ADR-015 동명이인 부제 정책 (검색 결과 + 호버 툴팁)
- `UI_SPEC.md` § 3.2 `StudentChip` / `TeacherPillPicker`
