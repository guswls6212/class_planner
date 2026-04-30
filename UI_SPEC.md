# Class Planner — UI Specification

> **이 문서는 UI 동작의 Source of Truth입니다.**
> UI 컴포넌트를 수정하기 전에 여기서 기대 동작을 확인하세요.
> UI를 변경한 후에는 이 문서를 업데이트하세요.
>
> 관련 문서: [CLAUDE.md](CLAUDE.md) § UI Verification Protocol · [docs/development-guide.md](docs/development-guide.md)

---

## 1. 전역 레이아웃

### 1.1 최상위 구조 (`src/app/layout.tsx`)

```
RootLayout
  └── ThemeProvider (dark/light 테마 공급)
        └── AppContent
              ├── Navigation (상단 고정 nav bar)
              ├── DataConflictModal (조건부 — 로그인 시 데이터 충돌 발생 시)
              ├── LoadingOverlay (조건부 — 서버 데이터 fetch 중)
              ├── <main> (페이지 컨텐츠, paddingBottom: 60px)
              └── Footer (하단 고정 footer)
```

### 1.2 Navigation Bar

| 위치 | 좌측 | 우측 |
|------|------|------|
| 고정 | 학생, 과목, 시간표, 소개 링크 | ThemeToggle (로그인 시만) + LoginButton |

- 현재 활성 페이지 링크: `font-weight: 600`, primary 색상 배경 (`var(--color-primary)`)
- 비활성 링크: `font-weight: 400`, transparent 배경
- 배경: `var(--color-bg-secondary)`, 하단 border: `var(--color-border)`

### 1.3 Footer

- 하단 고정, `z-index: 1000`
- 좌측: "클래스 플래너"
- 우측: "교육을 더 쉽게 만들어갑니다"
- 배경: `var(--color-bg-secondary)`, 상단 border: `var(--color-border)`

### 1.4 Loading Overlay

- `isInitializing` 상태에서 표시
- 스피너 + "사용자 데이터를 불러오는 중..." 텍스트
- CSS class: `loading-overlay` (globals.css)

### 1.5 DataConflictModal (전역)

- `conflictState`가 있을 때 모달 표시
- `useGlobalDataInitialization` 훅에서 관리
- 상세: [§ 5.5 Data Conflict Resolution](#55-data-conflict-resolution-로그인-시)

---

## 2. 페이지별 UI

### 2.1 랜딩 페이지 (`/`)

**구성:** Product-Led 랜딩 페이지 — 시간표 목업 중심 전환 유도

**섹션 구조:**
1. **HeroSection** — Split 레이아웃 (md↑: 좌측 텍스트/CTA + 우측 시간표 목업, sm: 수직 스택)
2. **StepsSection** (`id="how-it-works"`) — "이렇게 만들어집니다" 3단계 카드 (학생·과목 등록 → 시간표 배치 → PDF 출력)
3. **BottomCTA** — 다크 배경(`#1a1a1a`) + Amber CTA

**로그인 상태 처리:**
- 비로그인: 랜딩 페이지 렌더
- 로그인: `router.replace("/schedule")` 즉시 리디렉트

**Navigation:** 랜딩 전용 간소 Nav (로고 + 로그인 링크 + "무료로 시작" CTA). 내부 링크/ThemeToggle 없음.

**디자인 토큰:** Phase 3 `@theme` 토큰 전용 (`text-hero`, `bg-accent`, `rounded-admin-*`, 과목 팔레트 CSS vars).

### 2.2 시간표 (`/schedule`)

**3가지 뷰 모드:** 일별(daily) / 주간(weekly) / 월별(monthly). `SegmentedButton`으로 전환. `localStorage` 저장.

**컴포넌트 트리 (현행):**
```
SchedulePage
  ├── [Row 1: flex justify-between, border-b]
  │     ├── ScheduleHeader (_components/) — 타이틀("일별/주간/월별 시간표") + 로딩 상태
  │     └── ScheduleActionBar (_components/) — PDF Primary CTA + TemplateMenu▼ + 공유 아이콘
  │           └── TemplateMenu (molecules) — 드롭다운: "템플릿 저장" / "템플릿 적용"
  ├── StudentFilterChipBar (_components/) — colorBy=student 시만 표시
  ├── DayChipBar (molecules) — 일별 뷰만, 주 7일 칩
  ├── [Row 2: flex justify-between, 그리드 직전]
  │     ├── ScheduleDateNavigator (molecules) — ‹/›(±1일/주/월) + 오늘 버튼
  │     └── SegmentedButton(뷰 전환) + ColorByToggle + HelpTooltip(색상 기준, 1개)
  ├── [viewMode === "daily"]
  │     └── ScheduleDailyView (organisms) — 수업 카드 리스트 + 스와이프 제스처
  ├── [viewMode === "weekly"]
  │     └── ScheduleGridSection (_components/)
  │           └── TimeTableGrid (organisms)
  │                 ├── 헤더: Stacked Circle(요일명+날짜, 오늘=amber 배지)
  │                 └── 셀: TimeTableRow(molecules) × 7
  │                       ├── 수평 시간선 overlay
  │                       ├── now-line (오늘 컬럼만)
  │                       ├── TimeTableCell (drop zone) × 30
  │                       └── SessionBlock × N
  ├── [viewMode === "monthly"]
  │     └── ScheduleMonthlyView (organisms) — 달력 셀(MonthDayCell) × N
  ├── FAB (`+` button, fixed bottom-right, z-40) — 전 뷰 공통
  ├── GroupSessionModal (_components/) — 3-step Glass Stepper wizard
  └── EditSessionModal (_components/)
```

**ScheduleDateNavigator 상세:**
- 위치: Row 2 좌측 (그리드 바로 위, 뷰 컨트롤과 같은 행)
- 좌: `ChevronLeft` 버튼(이전 날/주/월) + 라벨 + `ChevronRight` 버튼
- 우: "오늘" 버튼 — `selectedDate`를 현재 시각으로 reset
- 라벨 포맷: 일별="YYYY년 M월 D일 (요)", 주간="YYYY년 M월 D일 — M월 D일", 월별="YYYY년 M월"

**TimeTableGrid 상세 (주간 뷰):**
- 그리드 칼럼: `56px(시간 라벨) + weekdayWidths[7]` (lane 수 × laneWidth px 동적)
- 시간 범위: 09:00 ~ 23:30 (30분 단위, SLOT_HEIGHT_PX=32px per slot)
- 헤더 높이: 60px. Stacked Circle: 요일명(10px) 위 + 날짜 숫자(22px bold, w-9 h-9 rounded-full) 아래
- 오늘: amber 원 배지(`var(--color-accent-hover)`) + 컬럼 배경 `rgba(245,158,11,0.025)` + now-line
- 수평 시간선: 정시 `rgba(255,255,255,0.09)` / 30분 `rgba(255,255,255,0.04)`, pointer-events:none
- 가상 스크롤바: 하단 12px
- 스크롤 위치 localStorage 보존: 키 `schedule_scroll_position`, 5분 TTL

**GroupSessionModal 상세 (3-step Glass Stepper):**
- 데스크톱: 중앙 `rounded-2xl` 카드, `backdrop-blur-xl`, max-w-md
- 모바일: BottomSheet (기존 유지)
- Step 1 — 학생: amber chip 태그 + 검색 input + 아바타(초성) autocomplete
- Step 2 — 과목/시간: 과목 select(전체 너비) + 요일/강의실(2열) + 통합 시간 range input
- Step 3 — 확인: 과목 색상 accent 헤더 카드 + 학생/요일/시간 구조화 요약
- Footer: "N / 3" 진행 표시 + 이전/다음/수업추가 버튼 (단계별 비활성화 조건 포함)

**FAB 상세:**
- `fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 z-40`
- 클릭 → `openGroupModal(selectedWeekday, currentTime, 1)` (전 뷰 동일)
- `bg-accent` (amber) + 흰색 `Plus` 아이콘(24px)

**SessionCard (Phase 6 공유 primitive) 상세:**
- Weekly는 SessionBlock 유지. Daily/Monthly/Landing은 SessionCard로 통일.
- `data-variant`: `block`(weekly) / `row`(daily) / `chip`(monthly) / `preview`(landing)
- `data-state`: `default` / `ongoing` / `done` / `conflict`
- 3-tone 파스텔 색: bg=`tintFromHex(color, 0.8)`, fg=어두운 텍스트, accent=원색 좌 3px 바
- 겹침 D-hybrid: ≤3개 균등 분할, ≥4개 앞 3개 표시, 4+는 inline +N 칩 클릭 시 모든 세션 표시 (토글 가능)

**StudentFilterChipBar (colorBy=student 시):**
- 학생 칩 멀티셀렉트 필터 — 선택 시 해당 학생 수업만 표시
- 학생 칩을 SessionBlock에 드롭 → 해당 수업에 학생 추가(드래그앤드롭)

**ColorBy 모드 동작 (student 모드 상세):**
- Student mode + 칩 미선택 → 과목 색상·라벨로 폴백 (이전: 학생 해시 색상). `resolveSessionColor`의 `selectedStudentIds` 빈 배열 → 과목 색 반환.
- Student mode + 칩 선택 → 비선택 세션 opacity 0.25로 dim; 선택된 세션은 학생 해시 색상 + outer glow ring (1.5px)
- 드래그 중 glow/dim 비활성 (포인터 인터랙션 우선)
- 이 동작은 weekly / daily / monthly 뷰 전체에 동일하게 적용 (Full Parity)
- 구현: 부모(`ScheduleDailyView`, `MonthDayCell`)에서 `resolvedColor`/`isDimmed` 계산 → `SessionCard`에 `overrideColor`/`dimmed`/`highlighted` props 전달

**Session Overflow (인라인 확장):**
- 겹침 세션 ≥ 4개: 최대 3개 인라인 표시 + `+N` 인라인 칩 버튼
- `+N` 클릭 → 그리드 내에서 모든 세션을 확장 표시 (토글)
- Portal/popover 없음 (`SessionOverflowPopover` 삭제됨) — PDF 인쇄·드래그 동작 보존
- ≤ 3개: 균등 분할 표시 (변경 없음)

**현재 시각 타임라인 (now-line):**
- `useNowMinute` hook: 분 boundary에 동기화 (`setTimeout` → 60초 `setInterval` + `visibilitychange` resync)
- 업데이트 주기: 매 분 경계에 정확히 동기화 (탭 비활성화 복귀 시 즉시 재동기화)
- z-index: 150 (세션 블록 z-index 상위, 클릭 포인터 이벤트는 none)
- 시각: 2px amber(`var(--color-accent)`) 수평선 + 좌측 `HH:MM` amber pill
- 이동 애니메이션: `transition: top 0.5s ease-out`

**SessionBlock 시각 디자인 (Editorial Polish):**
- 배경: gradient — `tintFromHex(color, 0.08)` (연한) → `color` (진한), `hexToRgba` 유틸 활용
- 좌측 accent stripe: 3px solid `rgba(0,0,0,0.2)` (유효한 hex 색상에만 적용)
- 타이포: 주 라벨 13px / font-weight 600; 시간 표시 `tabular-nums`; 보조 텍스트 opacity 0.85
- hover: ring 효과 (주 색상 기반)
- Today 컬럼 배경: amber wash gradient `rgba(251,191,36,0.04)` → `rgba(251,191,36,0.02)`
- 시간 라벨 계층화: 정시(`:00`) `font-semibold`, 반시(`:30`) `font-normal opacity-60`

### 2.3 학생 관리 (`/students`)

**컴포넌트 트리 (Phase 3 Admin Amber, organism 단일 파일):**
```
StudentsPage
  └── StudentsPageLayout          # 좌측 목록 + 우측 상세 2패널
        └── StudentDetailPanel   # 선택된 학생 상세 (우측)
```

**레이아웃:**
- 좌측 패널: `lg:w-[360px]` 고정, 모바일에서 `showDetail` state로 토글
- 우측 패널: `flex-1`, 미선택 시 "학생을 선택하세요" placeholder

**좌측 패널:**
- 헤더: "학생 목록"
- 추가 폼: input (placeholder: "학생 이름 (검색 가능)") + `+ 추가` 앰버 버튼. Enter 키 지원.
- 검색: `Search` 아이콘 + 이름으로 검색 input
- 학생 리스트: Amber 아바타(이니셜) + 이름 + 메타(학년·학교 또는 "프로필 미입력"). 선택 시 `border-l-2 border-l-accent`

**우측 패널 (StudentDetailPanel):**
- 헤더: 아바타(48px Amber 원형) + 이름 + 메타 + 편집(`Pencil`) / 삭제(`Trash2`) 버튼
- Summary Cards (2열 grid): "등록 과목" (enrollments 카운트) / "주간 수업" (sessions 카운트)
- 수업 일정: subject 색 dot + 과목명 + 요일 + 시간 리스트
- 프로필: 보기 모드(`<dl>`) / 편집 모드(name/grade/school/phone/gender/birthDate input 목록)

### 2.4 강사 관리 (`/teachers`)

**컴포넌트 트리 (Phase 3 Admin Amber, organism 단일 파일):**
```
TeachersPage
  └── TeachersPageLayout          # 좌측 목록 + 우측 상세 2패널 (학생과 동일 구조)
        └── TeacherDetailPanel   # 선택된 강사 상세 (우측)
```

**레이아웃:**
- 학생 화면과 동일 구조. 좌측 `lg:w-[360px]` / 우측 `flex-1`.

**좌측 패널:**
- 헤더: "강사 목록"
- 추가 폼: input (placeholder: "강사 이름 (검색 가능)") + `+ 추가` 앰버 버튼. 색상은 `DEFAULT_TEACHER_COLORS`에서 자동 순환 할당.
- 검색: `Search` 아이콘 + 이름으로 검색 input
- 강사 리스트: `teacher.color` 배경 12px 색상 dot + 이름 + "주간 N회". 선택 시 `border-l-2 border-l-accent`

**우측 패널 (TeacherDetailPanel):**
- 헤더: 강사 색상 배경 아바타(48px, 이니셜 흰색) + 이름 + 메타("주간 N회 · 담당 M명") + 편집/삭제 버튼
- Summary Cards (2열 grid): "담당 학생" (`Session.teacherId` → `Enrollment.studentId` join으로 unique 수) / "주간 수업" (sessions 카운트)
- 수업 일정: subject 색 dot + 과목명 + 요일 + 시간 리스트
- 프로필 (보기/편집):
  - 보기: 이름 + 색상 dot
  - 편집: 이름 input + 8색 팔레트(`DEFAULT_TEACHER_COLORS`) + `<input type="color">` 직접 선택 + 저장/취소 버튼

**색상 상수:** `src/lib/teacherColors.ts` — `DEFAULT_TEACHER_COLORS` (8색, 인디고/시안/에메랄드/앰버/레드/바이올렛/핑크/틸)

### 2.5 과목 관리 (`/subjects`)

**컴포넌트 트리:**
```
SubjectsPage
  └── SubjectsPageLayout
        └── SubjectManagementSection (좌측 340px 고정)
              ├── SubjectInputSection (molecule) — 이름 + 색상 + 추가 버튼
              └── SubjectList (molecule) — 과목 목록
                    └── SubjectListItem (atom) × N
```

**SubjectInputSection:**
- 이름 텍스트 입력
- 색상 선택 (색상 팔레트)
- 기본 제공 색상 9개 (초등수학 ~ 고등국어 매핑)

**SubjectList / SubjectListItem:**
- 색상 도트 + 과목명 표시
- 클릭 → 선택 (편집 모드)
- 편집 모드: 이름/색상 수정, 저장/취소
- 삭제 버튼 → ConfirmModal 확인 후 삭제

### 2.6 소개 (`/about`)

**컴포넌트 트리:**
```
AboutPage
  └── AboutPageLayout
        ├── HeroSection (about/)
        ├── FeatureCard (about/) × N
        └── FeatureDetail (about/)
```

- 정적 마케팅 페이지
- 인증 불필요, 익명 접근 가능

### 2.7 로그인 (`/login`)

**컴포넌트 트리:**
```
LoginPage (src/app/login/page.tsx, 309줄)
  └── 카드형 로그인 UI (중앙 정렬)
        ├── 로고 + "클래스 플래너" 타이틀
        ├── "시간표 관리를 더 쉽게" 설명 텍스트
        ├── Google 로그인 버튼 (아이콘 + 텍스트)
        ├── Kakao 로그인 버튼 (아이콘 + 텍스트)
        ├── 구분선 ("또는")
        └── "로그인 없이 사용하기" 링크 → /schedule
```

**동작:**
- Google/Kakao OAuth: `supabase.auth.signInWithOAuth()` → 콜백 후 `/schedule` 리다이렉트
- 이미 로그인 상태: 자동으로 `/schedule` 리다이렉트
- 로그인 없이 사용: 익명 모드로 `/schedule` 진입

**Nav bar LoginButton (organism):**
- 미로그인 상태: "로그인" 버튼 → `/login`으로 이동
- 로그인 상태: 프로필 아바타 버튼 → 클릭 시 드롭다운 (이름/이메일 + 로그아웃 버튼)

### 2.8 온보딩 (`/onboarding`)

**컴포넌트 트리:**
```
OnboardingPage (src/app/onboarding/page.tsx)
  └── 카드형 중앙 정렬 UI (login과 동일 스타일)
        ├── "학원 정보 설정" 타이틀
        ├── 환영 메시지 (사용자 이름)
        ├── 학원명 입력 (필수, 2글자 이상, placeholder: "예: 해피수학학원")
        ├── 역할 선택 (라디오: 원장/강사/직원)
        └── "시작하기" 버튼 → /students 리디렉트
```

**동작:**
- 비로그인 접근 → `/login` 리디렉트
- 이미 온보딩 완료 사용자 → `/schedule` 리디렉트
- 제출 성공 → `onboarded=1` 쿠키 설정 (서버) + `/students` 이동
- Middleware(`src/middleware.ts`)가 `/students`, `/subjects`, `/schedule` 접근 시 쿠키 없는 로그인 사용자를 이 페이지로 가드

---

## 3. 컴포넌트 인벤토리

### 3.1 Atoms (`src/components/atoms/`)

| 컴포넌트 | 파일 | 주요 Props | 설명 |
|----------|------|-----------|------|
| `AuthGuard` | `AuthGuard.tsx` | `children` | 인증된 사용자만 접근 허용. 미인증 시 로그인 안내 렌더 |
| `Button` | `Button.tsx` | `variant: primary\|secondary\|danger\|transparent\|accent\|tonal\|ghost`, `size`, `loading`, `feedback: inline\|toast\|both\|none`, `successLabel`, `toastMessage` | 공통 버튼 원자. `feedback="inline"` 시 클릭 후 ✓ 라벨 swap (1.5s). 모든 variant에 press state(scale+shadow) 내장. `accent`=amber 주 액션, `tonal`=옅은 accent(복사 등), `ghost`=배경 없음(취소 등) |
| `ErrorBoundary` | `ErrorBoundary.tsx` | `children`, `fallback?` | React 에러 경계. 전체 앱 감쌈 |
| `Input` | `Input.tsx` | `type`, `value`, `onChange`, `placeholder` | 공통 텍스트 입력 |
| `Label` | `Label.tsx` | `htmlFor`, `children` | 폼 레이블 |
| `StudentListItem` | `StudentListItem.tsx` | `student`, `isSelected`, `onClick`, `onDelete` | 학생 목록 단일 아이템. 선택/삭제 기능 |
| `SubjectListItem` | `SubjectListItem.tsx` | `subject`, `isSelected`, `onSelect`, `onDelete`, `onEdit` | 과목 목록 단일 아이템. 색상 도트 + 편집/삭제 |
| `ThemeToggle` | `ThemeToggle.tsx` | `size: small\|medium`, `variant: icon\|both` | 다크/라이트 테마 전환 토글 |

### 3.2 Molecules (`src/components/molecules/`)

| 컴포넌트 | 파일 | 주요 Props | 설명 |
|----------|------|-----------|------|
| `ConfirmModal` | `ConfirmModal.tsx` | `isOpen`, `title`, `message`, `onConfirm`, `onCancel` | 삭제 확인 등 이진 선택 모달 |
| `DataConflictModal` | `DataConflictModal.tsx` | `localData`, `serverData`, `onSelectServer`, `onSelectLocal`, `isMigrating?`, `migrationError?` | 로그인 시 로컬/서버 데이터 충돌 해결 모달. 데스크탑: 사이드바이사이드 카드 + 라디오. 모바일: 탭. 섹션(학생/과목/수업) 접기/펼치기 |
| `DropZone` | `DropZone.tsx` | `onDrop`, `weekday`, `time` | 시간표 셀의 드롭 수신 영역 |
| `PDFDownloadButton` | `PDFDownloadButton.tsx` | `targetRef` | html2canvas + jsPDF로 시간표 PDF 생성 후 다운로드 |
| `SessionCard` | `SessionCard.tsx` + `SessionCard.types.ts` + `SessionCard.utils.ts` | `subject`, `studentNames?`, `timeRange?`, `variant`, `state?`, `overlapCount?`, `overlapIndex?`, `onClick?` | 4-variant 수업 카드 primitive. `data-variant`(`block`/`row`/`chip`/`preview`) + `data-state`(`default`/`ongoing`/`done`/`conflict`) 계약. Daily/Monthly/Landing에서 소비. |
| `SessionBlock` | `SessionBlock.tsx` + `SessionBlock.utils.ts` | `session`, `subjects`, `enrollments`, `students`, `yPosition`, `left`, `width`, `yOffset`, `onClick`, `isDragging?`, `draggedSessionId?` | 주간 시간표 전용 수업 블록. 드래그 이동 가능. Phase 6 이후 Daily/Monthly/Landing은 SessionCard로 대체됨. |
| `SessionForm` | `SessionForm.tsx` | `subjects`, `students`, `isOpen`, `onClose`, `onSubmit`, `initialData?` | 수업 추가/수정 폼. 과목·요일·시간·강의실·학생 선택 |
| `StudentInputSection` | `StudentInputSection.tsx` | `newStudentName`, `onNameChange`, `onAdd`, `errorMessage?` | 학생 추가 입력 영역 |
| `StudentList` | `StudentList.tsx` | `students`, `selectedStudentId`, `onSelect`, `onDelete` | 학생 목록 (StudentListItem 반복) |
| `SubjectInputSection` | `SubjectInputSection.tsx` | `onAdd`, `errorMessage?` | 과목 추가 입력 + 색상 선택 |
| `SubjectList` | `SubjectList.tsx` | `subjects`, `selectedSubjectId`, `onSelect`, `onDelete`, `onUpdate` | 과목 목록 (SubjectListItem 반복) |
| `TimeTableRow` | `TimeTableRow.tsx` | `weekday`, `height`, `sessions`, `subjects`, `enrollments`, `students`, ... | TimeTableGrid 내 1개 요일 행. SessionBlock + DropZone 조합 |

> `ScheduleHeader`는 `src/components/molecules/`에 없음 — `src/app/schedule/_components/`에만 존재 (§3.4 참조)

### 3.3 Organisms (`src/components/organisms/`)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `AboutPageLayout` | `AboutPageLayout.tsx` | /about 페이지 전체 레이아웃 |
| `LoginButton` | `LoginButton.tsx` + `.module.css` | Nav bar 로그인 버튼. 모달로 Google OAuth 트리거. 로그인 시 아바타+드롭다운 |
| `StudentManagementSection` | `StudentManagementSection.tsx` | /students 메인 섹션. StudentInputSection + StudentList 조합 |
| `ScheduleDailyView` | `ScheduleDailyView.tsx` | 일별 수업 목록. SessionCard(row variant) + 스와이프 제스처 |
| `ScheduleMonthlyView` | `ScheduleMonthlyView.tsx` | 월별 달력. MonthDayCell × N, 날짜 클릭 → 일별 뷰 이동 |
| `StudentsPageLayout` | `StudentsPageLayout.tsx` | /students 페이지 레이아웃. 2열 그리드 (340px \| 1fr) |
| `SubjectManagementSection` | `SubjectManagementSection.tsx` | /subjects 메인 섹션. SubjectInputSection + SubjectList 조합 |
| `SubjectsPageLayout` | `SubjectsPageLayout.tsx` | /subjects 페이지 레이아웃. 2열 그리드 (340px \| 1fr) |
| `TimeTableGrid` | `TimeTableGrid.tsx` | 주간 시간표 그리드. Stacked Circle 헤더(요일+날짜), 수평 시간선, now-line, 드래그앤드롭, 스크롤 보존, 가상 스크롤바 |
| `about/FeatureCard` | `about/FeatureCard.tsx` | 소개 페이지 기능 카드 |
| `about/FeatureDetail` | `about/FeatureDetail.tsx` | 소개 페이지 기능 상세 설명 |
| `about/HeroSection` | `about/HeroSection.tsx` | 소개 페이지 히어로 섹션 |

### 3.4 Schedule 전용 컴포넌트 (`src/app/schedule/_components/`)

| 컴포넌트 | 설명 |
|----------|------|
| `ScheduleGridSection` | TimeTableGrid를 감싸는 섹션 컴포넌트. `baseDate` prop 통과 |
| `ScheduleHeader` | 시간표 페이지 헤더(Row 1 좌). title prop + 로딩 상태만 렌더 (뷰/색상 토글 제거됨) |
| `ScheduleActionBar` | Row 1 우측. PDFDownloadButton + TemplateMenu + 공유 아이콘(Share2). 로그인 시만 템플릿/공유 노출 |
| `StudentFilterChipBar` | colorBy=student 시 표시하는 학생 멀티셀렉트 필터 칩바 |
| `GroupSessionModal` | 수업 추가 3-step Glass Stepper wizard (학생→과목/시간→확인) |
| `EditSessionModal` | 개별 수업 수정 모달 (학생 추가/제거, 시간 변경, 삭제) |

### 3.4.1 Drag-Drop SSOT 선언 (Non-negotiable)

> schedule 페이지의 모든 drag 상태는 `src/hooks/useDragController.ts`의 `useDragController` 훅에서만 관리한다.
> 다른 컴포넌트가 `useState`/`useRef`로 drag 정보를 보관하면 PR 거절 사유.
>
> **이유:** 이전에 drag 상태가 `TimeTableGrid.dragPreview`, `useScheduleDragAndDrop`(dead code),
> `TimeTableCell.isDragOver`, `SessionBlock.isDragging` 등 5곳에 분산되어
> fix가 항상 다른 파일에 쌓이고 서로 상쇄됐다. 단일 SSOT로 "fix는 항상 useDragController.ts 한 곳"을 보장.

### 3.4.2 Drag State Machine

| Phase | 의미 | 전이 트리거 |
|-------|------|-------------|
| `idle` | 드래그 없음 | — |
| `dragging` | 세션/학생 드래그 중, target 없음 | dragstart → `startSessionDrag` / `startStudentDrag` |
| `hovering` | 드래그 중, 특정 cell 위에 있음 | dragover → `hoverTarget` |
| (→ `idle`) | 드래그 종료 | drop → `completeDrop` / dragend → `cancelDrag` |

**컴포넌트별 drag 책임:**
- `useDragController` (TimeTableGrid 내부): 상태 SSOT, 모든 전이 관리
- `SessionBlock`: drag 소스 (`onDragStart`, `onDragEnd` 이벤트 발생 → 콜백 전달)
- `TimeTableCell`: drop 수신 (`onDragOver`에서 `preventDefault`, `onDrop`에서 `onSessionDrop` 호출)
- `TimeTableGrid`: orchestrator — `useDragController` 호출, `sessionsForRender` 계산, props 분배

### 3.4.3 Drag Event Flow

```
SessionBlock.button --dragstart--> onDragStart(e, session) ---> TimeTableGrid.handleDragStart
                                                                  --> dragController.startSessionDrag(session)

TimeTableCell --dragover(e.preventDefault())--> onDragOver(weekday, time, yPos)
                                                  --> TimeTableGrid.handleDragOver
                                                    --> dragController.hoverTarget(weekday, time, yPos)
                                                      --> sessionsForRender 재계산 (computeTentativeLayout)
                                                        --> 드래그 세션이 target 좌표로 이동 (opacity:0.65, pointer-events:none)

TimeTableCell --drop--> onSessionDrop(sessionId, weekday, time, yPos)
                          --> updateSessionPosition --> repositionSessions --> updateData (localStorage WRITE)
                          --> dragController.completeDrop() (TimeTableGrid.handleDragEnd 경유)
```

### 3.4.4 Drag Failure Modes (점검 체크리스트)

"drop 이벤트가 발화하지 않을 때" 점검 순서:

1. `TimeTableCell`의 `onDragOver`에서 `e.preventDefault()` 호출하는가?
2. drop target 위에 `pointer-events: auto`인 다른 요소가 덮고 있는가? (드래그 세션 본체가 `pointer-events: none`인지 `SessionBlock.utils.ts`에서 확인)
3. dragImage(`setDragImage(e.currentTarget)`)가 설정됐는데 본체 DOM이 동일 프레임에 이동해 dragend가 즉시 발화하는가?
4. wrapper에 `onDrop`만 있고 `onDragOver`가 없는가? (drop target 등록 실패 — 표준 요구사항)
5. `dataTransfer.clearData`가 dragstart 이전 다른 핸들러에서 호출되는가?
6. omni-radar 로그에서 `dragenter`는 보이는데 `handleDrop`이 없다면 → 2번 우선 점검.

**omni-radar로 진단:**
```bash
omni-radar/scripts/radar-query --target browser --keyword handleDrop --since 5m
omni-radar/scripts/radar-query --target browser --keyword "드래그\|dragstart\|dragenter\|drop" --since 5m
```

### 3.4.5 Drag Naming Glossary

| 이름 | 의미 | Owner |
|------|------|-------|
| `dragController.draggedSession` | 현재 드래그 중인 세션 객체. null = idle. | `useDragController` |
| `dragController.targetWeekday/Time/YPosition` | hover 중인 target 좌표. null = dragging phase. | `useDragController` |
| `dragController.isAnyDragging()` | 드래그가 진행 중인지 (phase !== "idle") | `useDragController` |
| `dragController.isDraggingSession(id)` | 특정 세션이 드래그 대상인지 | `useDragController` |
| `dragRole: "self" \| "other-dragging" \| "idle"` | SessionBlock에 전달되는 selector 결과 (향후 B4 리팩터링 시 도입 목표) | `TimeTableGrid` |

**Deprecated (코드에서 제거됨):**
- `useScheduleDragAndDrop` — dead code 삭제 (`useDragController`로 대체)

---

## 4. Custom Hooks

### 4.1 전역 / 통합 데이터

| 훅 | 파일 | 역할 |
|----|------|------|
| `useGlobalDataInitialization` | `src/hooks/useGlobalDataInitialization.ts` | 앱 초기화. 익명/로그인 분기, 서버 fetch, 충돌 감지 (DataConflictModal 트리거) |
| `useIntegratedDataLocal` | `src/hooks/useIntegratedDataLocal.ts` | 학생+과목+수강+세션 통합 Local-first 데이터 관리. 대부분의 페이지에서 사용 |
| `useLocal` | `src/hooks/useLocal.ts` | localStorage 기반 범용 CRUD 훅. 다른 useXxxLocal 훅의 기반 |

### 4.2 개별 도메인

| 훅 | 파일 | 역할 |
|----|------|------|
| `useStudentManagementLocal` | `src/hooks/useStudentManagementLocal.ts` | 학생 CRUD (Local-first + fire-and-forget sync) |
| `useSubjectManagementLocal` | `src/hooks/useSubjectManagementLocal.ts` | 과목 CRUD (Local-first + fire-and-forget sync) |
| `useScheduleView` | `src/hooks/useScheduleView.ts` | 뷰 모드(일별/주간/월별) + selectedDate 상태. goToNextDay/PrevDay/Week/PrevWeek/NextMonth/PrevMonth/Today 제공 |
| `useTimeValidation` | `src/hooks/useTimeValidation.ts` | 시간 유효성 검사 (시작 < 종료, 범위 체크) |

### 4.3 Schedule 전용

| 훅 | 파일 | 역할 |
|----|------|------|
| `useScheduleSessionManagement` | `src/hooks/useScheduleSessionManagement.ts` | 세션 CRUD + 충돌 해결 (repositionSessions 연동) |
| `useDragController` | `src/hooks/useDragController.ts` | **Drag SSOT.** 드래그 상태 단일 reducer (idle/dragging/hovering). 모든 drag 상태의 유일한 소유자. |
| `useDisplaySessions` | `src/hooks/useDisplaySessions.ts` | 표시용 세션 데이터 가공 (필터링, 정렬, yPosition 계산) |
| `useNowMinute` | `src/hooks/useNowMinute.ts` | 현재 시각(분 단위) 실시간 제공. 분 boundary `setTimeout` 동기화 + 60s interval + `visibilitychange` resync. TimeTableGrid now-line에서 소비. |
| `useEditModalState` | `src/app/schedule/_hooks/useEditModalState.ts` | EditSessionModal 열기/닫기 상태 |
| `useUiState` | `src/app/schedule/_hooks/useUiState.ts` | Schedule 페이지 UI 상태 (선택, 하이라이트 등) |

### 4.4 관측 / 유틸

| 훅 | 파일 | 역할 |
|----|------|------|
| `usePerformanceMonitoring` | `src/hooks/usePerformanceMonitoring.ts` | 렌더 성능 측정 |
| `useUserTracking` | `src/hooks/useUserTracking.ts` | 사용자 행동 추적 |

### 4.5 사용 패턴

```
SchedulePage
  ├── useGlobalDataInitialization()  → 초기화 + 충돌 감지
  ├── useIntegratedDataLocal()       → students, subjects, enrollments, sessions
  ├── useScheduleSessionManagement() → 세션 CRUD
  ├── useDragController()            → 드래그앤드롭 SSOT (TimeTableGrid 내부에서 호출)
  ├── useDisplaySessions()           → 표시용 세션 가공
  └── useStudentPanel()              → 패널 상태
```

**신규 기능 훅 규칙:** `useXxxLocal` 패턴 사용. 레거시 API 기반 훅 사용 금지 (CLAUDE.md 참조).

---

## 5. 인터랙션 패턴

### 5.1 수업 추가 Flow (Golden Path)

**FAB 경로 (주 경로):**
```
1. 우하단 FAB(+) 클릭 (일별/주간/월별 전 뷰)
   → GroupSessionModal Step 1 오픈 (selectedWeekday, currentTime pre-fill)
2. Step 1 — 학생 이름 검색 → 자동완성 클릭으로 추가 → amber chip 표시 → "다음"
3. Step 2 — 과목 선택 + 요일/시간 설정 → "다음"
4. Step 3 — 확인 카드 검토 → "수업 추가"
   → localStorage 즉시 반영 → 시간표에 세션 렌더
   → 서버 동기화 (fire-and-forget, apiSync.ts)
```

**대안 경로 — 빈 셀 클릭 (주간 뷰):**
```
1. 빈 TimeTableCell 클릭
   → GroupSessionModal Step 1 오픈 (weekday/time pre-fill)
2. Step 1~3 동일
```

**대안 경로 — 학생 드래그앤드롭 (주간 뷰):**
```
1. StudentFilterChipBar 학생 칩 → 시간표 셀로 드래그 → 드롭
   → GroupSessionModal 오픈 (학생 pre-fill)
2. Step 2부터 진행
```

### 5.2 수업 수정/삭제

```
1. 기존 SessionBlock 클릭
   → EditSessionModal 오픈
2. 시간 변경 / 학생 추가·제거 / 과목 변경
3. "저장" → localStorage 반영 → 서버 동기화
4. "삭제" → ConfirmModal → 삭제 후 SessionBlock 제거
```

### 5.3 세션 드래그앤드롭 (시간표 내 이동)

```
1. SessionBlock 드래그 시작 → 해당 블록 opacity: 0.5
2. 다른 셀 위를 지나며 DragPreview 표시
3. 드롭 → 새 weekday/time/yPosition 계산
   → 충돌 감지: 겹치는 세션 yPosition 재계산 (repositionSessions)
   → localStorage 즉시 반영 → 스크롤 위치 복원
```

### 5.4 학생 추가 (학생 페이지)

```
1. 이름 입력 → Enter 또는 "+" 버튼 클릭
2. IME 조합 중 Enter: 한글 입력 완료 후에만 추가 (composing 체크)
3. 중복 이름: 에러 메시지 표시, 추가 안 됨
4. 성공: 목록에 즉시 추가 → 서버 동기화
```

### 5.5 Data Conflict Resolution (로그인 시)

```
1. 로그인 완료
   → useGlobalDataInitialization: 서버 데이터 fetch
   → checkLoginDataConflict: 로컬 vs 서버 비교
2. 충돌 있으면 → DataConflictModal 표시
   - 좌측 카드: "이 기기의 데이터" (로컬 localStorage)
   - 우측 카드: "내 계정의 데이터" (서버)
   - 각 카드: 학생/과목/수업 섹션 접기/펼치기 가능
3. 라디오 선택 → "선택한 데이터로 시작" 클릭
   - 서버 선택: localStorage에 서버 데이터 덮어쓰기
   - 로컬 선택: 로컬 데이터를 서버에 업로드 (fullDataMigration)
     → isMigrating=true → 로딩 오버레이
4. 완료: 모달 닫힘 → 정상 사용
```

### 5.6 Anonymous-First Flow

```
익명 (비로그인) 상태:
- localStorage 키: "class_planner_anonymous"
- 모든 기능 사용 가능 (시간표/학생/과목 CRUD)
- 기본 과목 9개 자동 시딩 (초등수학 ~ 고등국어)

로그인 후:
- localStorage 키: "class_planner_{userId}"
- handleLoginDataMigration.ts 실행
  → 충돌 없으면 서버 데이터 사용
  → 로컬에만 데이터 있으면 서버에 업로드
  → 양쪽 모두 데이터 있으면 DataConflictModal
```

---

## 6. 테마 시스템 (Dual-Mode)

### 아키텍처
두 개의 시각 언어가 하나의 토큰 체계 위에서 공존한다. 페이지 단위가 아닌 **표면(surface) 단위**로 모드가 결정된다.

| 모드 | 적용 영역 | 다크모드 |
|---|---|---|
| **Admin (A)** | 랜딩·관리 페이지·`/schedule` chrome | 라이트/다크 전환 지원 |
| **Surface (C)** | `/schedule` 그리드, SessionBlock, PDF 출력물 | **라이트 고정** |

### 구현
- `ThemeProvider`: `document.body.setAttribute("data-theme", theme)` — dark/light 전환
- `[data-surface="surface"]` 속성: Surface 컨테이너에 적용. CSS 커스텀 프로퍼티를 라이트 값으로 고정하여 다크모드 상속을 차단.
- 현재 적용된 컴포넌트: `ScheduleGridSection` (`data-surface="surface"`)

### 토큰 SSOT
`src/app/globals.css`의 `@theme` 블록이 Phase 3 신규 토큰의 단일 소스.
- **Admin 토큰**: `--color-accent (#FBBF24)`, `--font-sans (Pretendard)`, `--text-hero/page/section/label/caption`, `--radius-admin-sm/md/lg`, `--shadow-admin-sm/md/lg`
- **Surface 과목 팔레트**: `:root`의 `--color-subject-{color}-{bg|fg|accent}` (8색 × 3 tone)
- **Surface 그리드 토큰**: `--color-grid-canvas/line-major/line-minor/header-text/time-text`
- **레거시 토큰** (`:root` + `[data-theme]`): 기존 컴포넌트가 참조 중. 컴포넌트별 리뉴얼 시 점진 교체.

### 다크모드 동작
- `body[data-theme="dark"]` → Admin 영역 전체 다크 적용 (`@custom-variant dark` in globals.css)
- `[data-surface="surface"]` 하위 요소 → 라이트 고정 (`[data-surface="surface"]` 블록이 상속된 다크 CSS 변수를 오버라이드)

### Tailwind CSS 규칙
- 인라인 스타일 금지 (불가피한 경우 주석 필요)
- 모든 색상/간격은 Tailwind 클래스 또는 CSS 변수 사용
- CSS Module (`*.module.css`)은 기존 파일 유지. 신규 컴포넌트는 Tailwind 전용. (atoms/molecules에 기존 12개 CSS Module 파일 존재)

---

## 7. 타이포그래피 시스템

### 폰트
- **Primary**: Pretendard Variable (CDN: jsdelivr.net/gh/orioncactus/pretendard)
- **Fallback**: `-apple-system`, `SF Pro Display`, `Segoe UI`, `sans-serif`
- **적용**: `font-sans` Tailwind 클래스 (Phase 3 신규 컴포넌트부터). 레거시 컴포넌트는 기존 system font 유지.

### 스케일 (`@theme` 정의)

| 클래스 | 크기 | 굵기 | Letter-spacing | 용도 |
|---|---|---|---|---|
| `text-hero` | 48px (3rem) | 800 | −3.5% | 랜딩 Hero 헤드라인 |
| `text-page` | 32px (2rem) | 800 | −3.5% | 페이지 타이틀 |
| `text-section` | 22px (1.375rem) | 700 | −2% | 섹션 헤더 |
| `text-label` | 13px (0.8125rem) | 500 | −2% | 라벨·메타 |
| `text-caption` | 11px (0.6875rem) | 600 | −2% | 오버라인·캡션 |
| (Tailwind 기본 `text-base`) | 16px | 400 | −2% | 본문 (기본 유지) |

> **Note:** `font-weight`와 `letter-spacing`은 `@theme`으로 자동 생성되지 않으므로 컴포넌트에서 직접 지정. 예: `className="text-hero font-[800] tracking-[-0.035em]"`

### 카피 보이스 가이드 (Admin 영역)
- 헤드라인: 따뜻한 2인칭, 구체적 가치 — "원장님의 1시간을 아껴드립니다"
- 버튼: 동사 중심, 간결 — "무료로 시작", "시간표 만들기"
- 에러: 비난하지 않는 톤 — "충돌이 있어요. 한 번 확인해주세요"

---

## 8. 반응형 & 접근성

### 7.1 뷰포트 기준

| 범위 | 설명 |
|------|------|
| 640px 이상 (desktop) | 기본 레이아웃. TimeTableGrid 풀 사이즈, StudentPanel 플로팅 |
| 640px 미만 (mobile) | DataConflictModal 탭 뷰 전환. TimeTableGrid 가로 스크롤. StudentPanel 접힘 |

### 7.2 주요 반응형 동작

- **DataConflictModal**: 640px 미만에서 `.cardsGrid` 숨김 → `.tabsContainer` 표시 (탭 전환 + 선택 버튼)
- **TimeTableGrid**: 가로 스크롤, 가상 스크롤바

### 7.3 접근성

- ConfirmModal, DataConflictModal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- DataConflictModal 섹션: `role="button"`, `aria-expanded` (접기/펼치기)
- 에러 배너: `role="alert"`, 안내 배너: `role="note"`
- Navigation: `<nav>` 사용
- 폼 입력: `<label>` + `htmlFor` 연결

---

## 9. 검증 라우트 매핑

UI 파일 변경 시 아래 라우트를 확인하세요.

| 변경 파일 패턴 | 확인할 라우트 |
|----------------|---------------|
| `src/app/page.tsx` | `/` (랜딩 — 비로그인 상태) |
| `src/app/schedule/**` | `/schedule` |
| `src/app/students/**` | `/students` |
| `src/app/subjects/**` | `/subjects` |
| `src/app/about/**` | `/about` |
| `src/app/login/**` | `/login` |
| `src/app/onboarding/**` | `/onboarding` |
| `src/middleware.ts` | `/students`, `/subjects`, `/schedule` (가드 동작) |
| `src/app/layout.tsx` | 모든 페이지 (nav, footer) |
| `src/components/molecules/SessionBlock*` | `/schedule` (weekly 전용) |
| `src/components/molecules/SessionCard*` | `/schedule` (daily/monthly), `/` (landing) |
| `src/components/molecules/ScheduleChangeBanner*` | `/share/{token}` (변경 배지) |
| `src/components/molecules/DataConflictModal*` | 로그인 + 충돌 시나리오 |
| `src/components/molecules/ConfirmModal*` | `/students`, `/subjects` (삭제 흐름) |
| `src/components/organisms/TimeTableGrid*` | `/schedule` |
| `src/components/organisms/StudentPanel*` | `/schedule` |
| `src/components/organisms/LoginButton*` | 모든 페이지 (nav bar) |
| `src/components/atoms/**` | 관련된 모든 페이지 |

---

## 9. 알려진 제약 & 주의 사항

| 항목 | 내용 |
|------|------|
| 인라인 스타일 | `SessionBlock.tsx`는 동적 스타일이 필요해 인라인 사용. 고정 스타일은 Tailwind 사용 |
| SessionBlock 폰트 크기 | 학생 수에 따라 동적 계산. 기준: 세션 셀 너비 ~72px, 이름 4글자 가정 |
| 스크롤 위치 보존 | `localStorage: schedule_scroll_position`, 5분 TTL, 드래그앤드롭 후 자동 복원 |
| 충돌 감지 | `repositionSessions` (sessionCollisionUtils.ts): 겹치는 세션 yPosition 밀어내기 |
| 기본 과목 | `DEFAULT_SUBJECTS` 9개 (초등수학~고등국어). 사용자 추가 과목과 구분하여 DataConflictModal에서 표시 |
| PDF | A4 종이 인쇄 최적화. html2canvas 캡처 → jsPDF |
| 로그아웃 | 현재 `supabase.auth.signOut()` 대신 localStorage 토큰 수동 삭제. 개선 예정 (TASKS.md) |
| 공유 페이지 변경 배지 | `/share/{token}` 페이지 상단. `hasChanges=true && lastViewedAt !== null`일 때만 `ScheduleChangeBanner` 렌더. 최초 방문(lastViewedAt=null)은 배너 미표시. 배지 표시 후 페이지 갱신 시 자동 사라짐 (last_viewed_at 갱신됨). |
