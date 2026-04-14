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

### 2.1 Landing (`/`)

- `src/app/page.tsx` → `/schedule`로 리다이렉트 (별도 랜딩 UI 없음)
- 익명 사용자도 바로 시간표 페이지로 진입

### 2.2 시간표 (`/schedule`)

**컴포넌트 트리:**
```
SchedulePage (AuthGuard 미사용 — 익명 허용)
  ├── ScheduleHeader (_components/ScheduleHeader.tsx)
  │     └── 타이틀 + 현재 날짜 + PDF 다운로드 버튼
  ├── ScheduleGridSection (_components/ScheduleGridSection.tsx)
  │     └── TimeTableGrid (organisms)
  │           ├── 좌측: 요일 헤더 (월~일)
  │           ├── 상단: 시간 헤더 (09:00~23:30, 30분 단위)
  │           └── 셀: SessionBlock (molecules) × N
  ├── StudentPanelSection (_components/StudentPanelSection.tsx)
  │     └── StudentPanel (organisms) — 플로팅, 드래그 이동 가능
  ├── PdfDownloadSection (_components/PdfDownloadSection.tsx)
  ├── GroupSessionModal (_components/GroupSessionModal.tsx)
  └── EditSessionModal (_components/EditSessionModal.tsx)
```

**레이아웃:**
- 전체 화면 활용, `paddingBottom: 60px` (footer 공간)
- TimeTableGrid: 가로/세로 스크롤, `max-height: 80vh`
- StudentPanel: `position: fixed`, 드래그로 위치 이동, 기본 280px 너비

**TimeTableGrid 상세:**
- 그리드 칼럼: `80px (요일) + 30 × 100px (시간슬롯)`
- 시간 범위: 09:00 ~ 23:30 (30분 단위, 30슬롯)
- 요일: 월~일 (7행), 높이는 `yPosition × SESSION_CELL_HEIGHT` (동적)
- 시간 헤더: sticky top, `z-index: 999`
- 가상 스크롤바: 하단 12px 높이 (dark/light 모두)
- 스크롤 위치 localStorage 보존: 키 `schedule_scroll_position`, 5분 TTL

**SessionBlock 상세:**
```
┌─────────────────────────┐
│ 과목명(좌)    HH:MM-HH:MM(우) │
│                              │
│            학생명들(우하단)   │
└─────────────────────────┘
```
- 배경색: 해당 과목 color
- 폰트 크기 동적 조정: 3명 이하 14px → 9명+ 5px
- 학생명 최대 표시: 8명 (`이름1, 이름2... 외 N명`)
- 드래그 가능 (`draggable=true`), 이동 시 `cursor: move`, 드래그 중 `opacity: 0.5`

**StudentPanel 상세:**
- 플로팅 패널 (position fixed)
- 헤더: "수강생 리스트" — 드래그로 패널 위치 이동
- 검색: 실시간 이름 필터
- 학생 아이템: 드래그 시작 → 시간표 셀에 드롭하여 수업 추가
- 선택된 학생: 하이라이트 표시, 해당 학생의 수업 블록 강조

### 2.3 학생 관리 (`/students`)

**컴포넌트 트리:**
```
StudentsPage
  └── StudentsPageLayout
        └── StudentManagementSection (좌측 340px 고정)
              ├── StudentInputSection (molecule) — 이름 입력 + 추가 버튼
              └── StudentList (molecule) — 학생 목록
                    └── StudentListItem (atom) × N
```

**레이아웃:**
- 2열 그리드: `340px | 1fr` (현재 우측 영역 미사용)
- padding: 16px

**StudentInputSection:**
- 이름 텍스트 입력 (placeholder: "학생 이름 입력")
- IME 한글 조합 중 Enter 방지 (`composing` 상태 체크)
- 이미 존재하는 이름 입력 시 에러 메시지
- `+` 버튼 또는 Enter 키로 추가

**StudentList:**
- 학생 아이템 클릭 → 선택 상태 (highlight)
- 선택된 학생 → 삭제 버튼 노출 → ConfirmModal 확인 후 삭제

### 2.4 과목 관리 (`/subjects`)

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

### 2.5 소개 (`/about`)

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

### 2.6 로그인 (`/login`)

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

---

## 3. 컴포넌트 인벤토리

### 3.1 Atoms (`src/components/atoms/`)

| 컴포넌트 | 파일 | 주요 Props | 설명 |
|----------|------|-----------|------|
| `AuthGuard` | `AuthGuard.tsx` | `children` | 인증된 사용자만 접근 허용. 미인증 시 로그인 안내 렌더 |
| `Button` | `Button.tsx` | `variant: primary\|secondary\|transparent`, `type`, `disabled` | 공통 버튼 원자 |
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
| `SessionBlock` | `SessionBlock.tsx` + `SessionBlock.utils.ts` | `session`, `subjects`, `enrollments`, `students`, `yPosition`, `left`, `width`, `yOffset`, `onClick`, `isDragging?`, `draggedSessionId?` | 시간표 셀 내 수업 블록. 과목색 배경, 과목명+시간+학생명 표시, 드래그 이동 가능 |
| `SessionForm` | `SessionForm.tsx` | `subjects`, `students`, `isOpen`, `onClose`, `onSubmit`, `initialData?` | 수업 추가/수정 폼. 과목·요일·시간·강의실·학생 선택 |
| `StudentInputSection` | `StudentInputSection.tsx` | `newStudentName`, `onNameChange`, `onAdd`, `errorMessage?` | 학생 추가 입력 영역 |
| `StudentList` | `StudentList.tsx` | `students`, `selectedStudentId`, `onSelect`, `onDelete` | 학생 목록 (StudentListItem 반복) |
| `SubjectInputSection` | `SubjectInputSection.tsx` | `onAdd`, `errorMessage?` | 과목 추가 입력 + 색상 선택 |
| `SubjectList` | `SubjectList.tsx` | `subjects`, `selectedSubjectId`, `onSelect`, `onDelete`, `onUpdate` | 과목 목록 (SubjectListItem 반복) |
| `TimeTableRow` | `TimeTableRow.tsx` | `weekday`, `height`, `sessions`, `subjects`, `enrollments`, `students`, ... | TimeTableGrid 내 1개 요일 행. SessionBlock + DropZone 조합 |

### 3.3 Organisms (`src/components/organisms/`)

| 컴포넌트 | 파일 | 설명 |
|----------|------|------|
| `AboutPageLayout` | `AboutPageLayout.tsx` | /about 페이지 전체 레이아웃 |
| `LoginButton` | `LoginButton.tsx` + `.module.css` | Nav bar 로그인 버튼. 모달로 Google OAuth 트리거. 로그인 시 아바타+드롭다운 |
| `StudentManagementSection` | `StudentManagementSection.tsx` | /students 메인 섹션. StudentInputSection + StudentList 조합 |
| `StudentPanel` | `StudentPanel.tsx` | 시간표 플로팅 패널. 학생 리스트, 검색, 드래그 소스 |
| `StudentsPageLayout` | `StudentsPageLayout.tsx` | /students 페이지 레이아웃. 2열 그리드 (340px \| 1fr) |
| `SubjectManagementSection` | `SubjectManagementSection.tsx` | /subjects 메인 섹션. SubjectInputSection + SubjectList 조합 |
| `SubjectsPageLayout` | `SubjectsPageLayout.tsx` | /subjects 페이지 레이아웃. 2열 그리드 (340px \| 1fr) |
| `TimeTableGrid` | `TimeTableGrid.tsx` | 주간 시간표 그리드. 드래그앤드롭, 스크롤 보존, 가상 스크롤바 포함 |
| `about/FeatureCard` | `about/FeatureCard.tsx` | 소개 페이지 기능 카드 |
| `about/FeatureDetail` | `about/FeatureDetail.tsx` | 소개 페이지 기능 상세 설명 |
| `about/HeroSection` | `about/HeroSection.tsx` | 소개 페이지 히어로 섹션 |

### 3.4 Schedule 전용 컴포넌트 (`src/app/schedule/_components/`)

| 컴포넌트 | 설명 |
|----------|------|
| `ScheduleGridSection` | TimeTableGrid를 감싸는 섹션 컴포넌트 |
| `StudentPanelSection` | StudentPanel을 감싸는 섹션 컴포넌트 |
| `PdfDownloadSection` | PDF 다운로드 버튼 섹션 |
| `ScheduleHeader` | 시간표 페이지 헤더 (타이틀, 날짜) |
| `GroupSessionModal` | 그룹 수업 생성/수정 모달 |
| `EditSessionModal` | 개별 수업 수정 모달 (학생 추가/제거, 시간 변경, 삭제) |

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
| `useStudentPanel` | `src/hooks/useStudentPanel.ts` | StudentPanel 상태 관리 (검색, 선택, 드래그 소스) |
| `useTimeValidation` | `src/hooks/useTimeValidation.ts` | 시간 유효성 검사 (시작 < 종료, 범위 체크) |

### 4.3 Schedule 전용

| 훅 | 파일 | 역할 |
|----|------|------|
| `useScheduleSessionManagement` | `src/hooks/useScheduleSessionManagement.ts` | 세션 CRUD + 충돌 해결 (repositionSessions 연동) |
| `useScheduleDragAndDrop` | `src/hooks/useScheduleDragAndDrop.ts` | 드래그앤드롭 이벤트 처리, DragPreview, 위치 계산 |
| `useDisplaySessions` | `src/hooks/useDisplaySessions.ts` | 표시용 세션 데이터 가공 (필터링, 정렬, yPosition 계산) |
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
  ├── useScheduleDragAndDrop()       → 드래그앤드롭
  ├── useDisplaySessions()           → 표시용 세션 가공
  └── useStudentPanel()              → 패널 상태
```

**신규 기능 훅 규칙:** `useXxxLocal` 패턴 사용. 레거시 API 기반 훅 사용 금지 (CLAUDE.md 참조).

---

## 5. 인터랙션 패턴

### 5.1 수업 추가 Flow (Golden Path)

```
1. /schedule 접속
2. StudentPanel에서 학생 클릭 → 학생 하이라이트
3. 학생 아이템을 시간표 셀로 드래그 → 드롭
   → GroupSessionModal 오픈 (과목/시간 pre-fill)
4. 과목 선택 + 시간 확인 → "추가" 클릭
   → localStorage 즉시 반영 → 시간표에 SessionBlock 렌더
   → 서버 동기화 (fire-and-forget, apiSync.ts)
```

**대안 경로 — 빈 셀 클릭:**
```
1. 빈 시간표 셀 클릭
   → GroupSessionModal 오픈 (요일/시간 pre-fill)
2. 학생 선택 + 과목 선택 → "추가"
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

## 6. 테마 시스템

### 6.1 Dark / Light 모드

- `ThemeContext` (`src/contexts/ThemeContext.tsx`)로 전역 관리
- CSS 변수 기반: `--color-bg-primary`, `--color-bg-secondary`, `--color-text-primary`, `--color-text-secondary`, `--color-border`, `--color-primary` 등
- `globals.css`에서 `[data-theme="dark"]` / `[data-theme="light"]` 셀렉터로 정의
- ThemeToggle: 로그인 사용자만 Nav bar에 표시 (`size="small"`, `variant="both"`)
- localStorage에 테마 저장 (key: `theme`)

### 6.2 Tailwind CSS 규칙

- 인라인 스타일 금지 (불가피한 경우 주석 필요)
- 모든 색상/간격은 Tailwind 클래스 또는 CSS 변수 사용
- CSS Module (`*.module.css`)은 기존 파일 유지. 신규 컴포넌트는 Tailwind 전용. (atoms/molecules에 기존 12개 CSS Module 파일 존재)

---

## 7. 반응형 & 접근성

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

## 8. 검증 라우트 매핑

UI 파일 변경 시 아래 라우트를 확인하세요.

| 변경 파일 패턴 | 확인할 라우트 |
|----------------|---------------|
| `src/app/schedule/**` | `/schedule` |
| `src/app/students/**` | `/students` |
| `src/app/subjects/**` | `/subjects` |
| `src/app/about/**` | `/about` |
| `src/app/login/**` | `/login` |
| `src/app/layout.tsx` | 모든 페이지 (nav, footer) |
| `src/components/molecules/SessionBlock*` | `/schedule` |
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
