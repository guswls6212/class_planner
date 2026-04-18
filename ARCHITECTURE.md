# Class Planner — Architecture

## 프로젝트 헌법
이 문서는 class-planner의 설계 원칙과 구조를 정의한다. 모든 구조적 변경은 이 문서를 먼저 업데이트한 후 코드에 반영한다.

## 1. 설계 원칙

### 1.1 Clean Architecture (4-Layer)
```
┌──────────────────────────────────────────────┐
│         Presentation (Next.js Pages)          │
│   Atomic Design: atoms → molecules → organisms│
├──────────────────────────────────────────────┤
│         Application (Use Cases, Services)      │
│   비즈니스 워크플로우 조합, DTO 변환           │
├──────────────────────────────────────────────┤
│         Domain (Entities, Value Objects)        │
│   순수 비즈니스 로직, 외부 의존성 없음         │
├──────────────────────────────────────────────┤
│         Infrastructure (Repositories, DB)       │
│   외부 시스템 통합, Domain 인터페이스 구현      │
└──────────────────────────────────────────────┘
```

**의존성 방향:** Presentation → Application → Domain ← Infrastructure
- Domain은 어떤 외부 계층도 의존하지 않는다.
- Infrastructure는 Domain의 Repository 인터페이스를 구현한다.

### 1.2 Local-First Architecture
- UI 조작 → localStorage 즉시 반영 (0ms)
- 서버 동기화: `apiSync.ts`의 fire-and-forget 함수 (syncStudentCreate, syncSubjectCreate 등)
- 익명 사용자: localStorage만 사용 (서버 호출 없음)
- 로그인 사용자: localStorage → 서버 양방향 동기화
- 네트워크 불안정 시에도 UX 유지

### 1.3 Atomic Design (Presentation Layer)
- **Atoms:** 최소 단위 UI 요소 (Button, Input, Label)
- **Common Primitives** (`src/components/common/`): 크로스-뷰 공유 디자인 원자. Atomic Design 계층을 초월하여 atoms/molecules/organisms 어디서나 소비 가능.
  - `SubjectChip` — 과목 색상을 표현하는 공유 칩 primitive. variant: `fill` (캘린더), `border-left` (리스트 행), `soft`.
- **Molecules:** Atoms 조합 (SessionBlock, SessionCard, SessionOverflowPopover, TimeTableCell, TimeTableRow, ConfirmModal, AccountMenu, HelpTooltip, ScheduleActionBar)
  - `SessionCard` — 4-variant 수업 카드 primitive (block/row/chip/preview). `data-variant`/`data-state` attr 계약. Daily/Monthly/Landing에서 소비.
  - `SessionOverflowPopover` — 겹침 4개↑일 때 "+N" pill 클릭 시 목록 팝오버 (D-hybrid).
  - `TimeTableCell` — 드롭존 + 빈 셀 클릭 처리를 통합한 단위 셀. 기존 DropZone을 대체.
  - `StudentFilterChipBar` — 학생 멀티셀렉트 필터 칩바. colorBy=student 시 표시.
  - `PdfExportRangeModal` — PDF 출력 범위 선택 다이얼로그. viewMode별 옵션 분기(weekly/daily: 현재 뷰 or 범위, monthly: 해당 월 전체).
- **Atoms:** Button, Input, Label, AuthGuard, ErrorBoundary, ThemeToggle, StudentListItem, SubjectListItem, SegmentedButton
- **Organisms:** Molecules 조합, 페이지 단위 레이아웃 (TimeTableGrid, HelpDrawer, AppShell)
- **Common Primitives:** 계층 공유 디자인 토큰 컴포넌트 (`src/components/common/`) — SubjectChip, SchedulePreview

## 2. 컴포넌트 구조

### 2.1 Pages (Next.js App Router)
```
src/app/
├── page.tsx                    # 랜딩 페이지
├── layout.tsx                  # 루트 레이아웃 (AppShell)
├── login/page.tsx              # OAuth 로그인
├── onboarding/page.tsx         # 첫 로그인 온보딩 (학원명 + 역할 입력)
├── students/page.tsx           # 학생 관리
├── subjects/page.tsx           # 과목 관리
├── teachers/page.tsx           # 강사 관리 (Phase 4)
├── teacher-schedule/page.tsx   # 강사 전용 시간표 뷰 (읽기 전용, Phase 4)
├── settings/page.tsx           # 학원 설정 (멤버 목록 + 초대 관리)
├── admin/
│   ├── layout.tsx              # ADMIN_EMAILS env 화이트리스트 게이트
│   └── logs/page.tsx           # 개발자 전용 로그 뷰어 (전체 학원 횡단 조회)
├── invite/[token]/page.tsx     # 초대 수락 페이지 (비로그인/로그인 분기)
├── share/[token]/              # 공유 시간표 (인증 불필요, W3)
│   ├── page.tsx                # 공유 링크 시간표 뷰 (읽기 전용)
│   └── layout.tsx              # 최소 레이아웃 (Nav 없음)
├── schedule/                   # 시간표 관리 (가장 복잡)
│   ├── page.tsx
│   ├── _components/            # 페이지 전용 컴포넌트
│   ├── _hooks/                 # 페이지 전용 훅
│   ├── _utils/                 # 페이지 전용 유틸리티
│   └── _constants/             # 페이지 전용 상수
└── about/page.tsx              # 소개 페이지
```

### 2.1.1 Middleware (`src/middleware.ts`)

온보딩 가드. 로그인한 사용자가 데이터 페이지(`/students`, `/subjects`, `/schedule`) 접근 시 `onboarded` 쿠키를 확인한다. 쿠키 없음 → `/onboarding` 리디렉트. 비로그인 사용자는 Anonymous-First 정책으로 통과.

matcher: `/students/:path*`, `/subjects/:path*`, `/schedule/:path*`

### 2.2 API Routes
```
src/app/api/
├── students/         # 학생 CRUD (GET, POST, [id] PUT/DELETE)
├── subjects/         # 과목 CRUD (GET, POST, [id] PUT/DELETE)
├── teachers/         # 강사 CRUD (GET, POST, [id] PUT/DELETE, Phase 4)
├── sessions/         # 세션 CRUD + position 업데이트 (GET, POST, [id] PUT/DELETE, [id]/position PATCH)
├── enrollments/      # 수강 등록 CRUD (GET, POST, DELETE — id는 request body로 전달)
├── onboarding/       # 신규 사용자 온보딩 (Academy 생성)
├── invites/          # 초대 토큰 (GET/POST 목록·생성, [id] DELETE 취소, check GET 공개조회, accept POST 수락)
├── members/          # 멤버 관리 (GET 목록, [userId] DELETE 제거)
├── share/[token]/    # 공유 링크 데이터 (GET — 인증 불필요, token 검증, W3)
├── share-tokens/     # 공유 토큰 CRUD (GET/POST 목록·생성, [id] DELETE 취소, W3)
├── templates/        # 시간표 템플릿 CRUD (GET/POST 목록·생성, [id] GET/PUT/DELETE, W4)
├── attendance/       # 출석 관리 (GET 조회/POST 단건 upsert, bulk/ POST 일괄 upsert, W5)
├── admin/
│   └── logs/         # GET — 개발자 전용 (ADMIN_EMAILS 화이트리스트), 전체 학원 횡단 조회, 필터/페이지네이션
└── user-settings/    # 사용자 설정
```
모든 API Route는 Service Role 클라이언트로 RLS 우회. CORS 미들웨어는 POST/PUT/DELETE에만 적용 (GET은 same-origin이므로 불필요).

### 2.3 Domain Layer
```
src/domain/
├── entities/          # Student, Subject
├── value-objects/     # StudentId, SubjectId, Color
├── repositories/      # Repository 인터페이스 (IStudentRepository 등)
└── services/          # Domain 서비스 (비즈니스 규칙)
```

### 2.4 Application Layer
```
src/application/
├── services/          # StudentApplicationService, SubjectApplicationService 등
├── use-cases/         # AddStudent, DeleteStudent, GetStudent, UpdateStudent, SubjectUseCases
└── mappers/           # StudentMapper, SubjectMapper (Domain ↔ DTO 변환)
```

### 2.5 Infrastructure Layer
```
src/infrastructure/
├── repositories/      # SupabaseStudentRepository, SupabaseSubjectRepository
├── factories/         # 각 Repository Factory
├── container/         # RepositoryRegistry
├── config/            # RepositoryConfig
├── interfaces.ts      # Repository 인터페이스 타입 정의
└── index.ts           # 공개 API 진입점
```

### 2.6 Shared Utilities
```
src/components/common/ # 디자인 시스템 공유 Primitive (Atomic Design 계층 공유)
├── SubjectChip.tsx            # 과목 색상 칩 — fill/border-left/soft 3가지 변형 (SSOT)
├── SubjectChip.types.ts       # SubjectChipProps, SubjectChipVariant, SubjectChipSize
├── SchedulePreview.tsx        # 미니 시간표 그리드 — SubjectChip 기반 (랜딩, HelpDrawer 등)
└── SchedulePreview.types.ts   # PreviewCell, SchedulePreviewProps, PreviewSubjectColor

src/lib/               # 핵심 유틸리티
├── schedule/                  # 시간표 도메인 유틸리티
│   ├── getSessionSubject.ts   # 세션 → 과목 조회 (정규 위치, Phase 5-B에서 승격)
│   └── subjectColorPalette.ts # PreviewSubjectColor → HEX 팔레트 (SUBJECT_PALETTE_HEX)
├── localStorageCrud.ts        # localStorage CRUD 시스템 (Anonymous/User 키 분리)
├── apiSync.ts                 # fire-and-forget 서버 동기화 (syncStudentCreate 등)
├── sessionCollisionUtils.ts   # 세션 충돌 감지 및 재배치
├── logger.ts                  # 로깅 시스템
├── errorTracker.ts            # 에러 추적
├── planner.ts                 # 핵심 데이터 타입 정의
├── dateUtils.ts               # Monday-based 주 계산 유틸 (getWeekStart, addWeeks, eachWeekStart, formatWeekRangeLabel, getMonthWeekRange)
├── pdf-utils.ts               # PDF 생성 유틸리티
├── timeUtils.ts               # 시간 관련 유틸리티
├── authUtils.ts               # 인증 관련 유틸리티
├── resolveAcademyId.ts        # Academy ID 조회 (온보딩 체크)
├── adminGuard.ts              # ADMIN_EMAILS env 화이트리스트 검증 유틸리티
├── supabaseServiceRole.ts     # Service Role 클라이언트 (서버 전용)
├── yPositionMigration.ts      # yPosition 마이그레이션 유틸리티
└── auth/                      # 로그인 데이터 마이그레이션
    ├── handleLoginDataMigration.ts  # 로그인 시 로컬/서버 충돌 감지
    ├── fullDataMigration.ts         # 로컬 전체 데이터 서버 업로드
    └── deduplication.ts             # 중복 데이터 제거

src/hooks/             # 커스텀 React 훅
├── useStudentManagementLocal.ts   # 학생 관리 (Local-first)
├── useSubjectManagementLocal.ts   # 과목 관리 (Local-first)
├── useTeacherManagementLocal.ts   # 강사 관리 (Local-first, Phase 4)
├── useIntegratedDataLocal.ts      # 통합 데이터 (Local-first)
├── useGlobalDataInitialization.ts # 앱 초기화 (익명/로그인 분기, 충돌 감지)
├── useScheduleDragAndDrop.ts      # 드래그앤드롭
├── useScheduleSessionManagement.ts # 세션 관리
├── useScheduleView.ts             # 뷰 모드 (daily/weekly/monthly) + 네비게이션 (W2)
├── useDisplaySessions.ts          # 세션 표시 로직
├── useTeacherDisplaySessions.ts   # 강사별 세션 표시 (Phase 4)
├── useColorBy.ts                  # 색상 기준 토글 (subject/teacher, Phase 4)
├── useAttendance.ts               # 날짜별 출석 데이터 + 마킹 (W5)
├── useTemplates.ts                # 시간표 템플릿 CRUD (W4)
├── useModalA11y.ts                # 모달 접근성 (focus trap + Escape)
├── useBottomSheet.ts              # 바텀시트 상태 관리
├── useMediaQuery.ts               # 반응형 미디어 쿼리
├── useSessionStatus.ts            # 세션 상태 계산 (Phase 4)
├── useLocal.ts                    # localStorage 기반 범용 훅
├── useStudentFilter (schedule/_hooks/) # 학생 멀티셀렉트 필터 (localStorage: ui:selectedStudentIds)
├── useTimeValidation.ts           # 시간 유효성 검사
├── useUserTracking.ts             # 사용자 행동 추적
└── usePerformanceMonitoring.ts    # 성능 모니터링

src/contexts/          # React Context
├── ThemeContext.tsx    # 테마 (Dark/Light)
└── HelpDrawerContext.tsx  # 도움말 드로워 전역 상태 (isOpen/open/close) — P5-A

src/middleware/         # API Route 미들웨어
├── cors.ts            # CORS 헤더 (POST/PUT/DELETE에만 적용)
└── logging.ts         # 요청 로깅

src/shared/            # 계층 간 공유 타입/상수
├── constants/
│   └── sessionConstants.ts  # 세션 관련 상수 (시간 범위, 요일 등)
└── types/
    ├── ApplicationTypes.ts  # Application 계층 DTO
    ├── CommonTypes.ts       # 공통 타입 (ID, Timestamp 등)
    ├── DomainTypes.ts       # Domain 계층 인터페이스
    ├── index.ts             # 재export
    ├── scheduleTypes.ts     # Schedule 전용 타입
    └── templateTypes.ts     # 시간표 템플릿 타입 (W4)

src/features/          # 기능별 순수 비즈니스 로직 (UI 없음)
└── schedule/
    └── filters.ts     # filterSessionsByStudents — OR 로직 멀티셀렉트 필터

src/types/             # 레거시 타입 (shared/types로 점진 통합 예정)
└── scheduleTypes.ts   # Schedule 관련 타입

src/utils/             # 클라이언트 유틸리티
└── supabaseClient.ts  # Supabase 브라우저 클라이언트 싱글톤
```

## 3. 데이터 모델

### 3.1 현재 구조 (정규화 + Academy 멀티테넌트)
> Phase 2A 완료 (2026-04-14). ADR-002 참조.
> 레거시 `user_data` JSONB 테이블은 마이그레이션 019로 제거됨.

```sql
-- 학원 (테넌트 단위)
-- 029: schedule_updated_at 추가 (sessions INSERT/UPDATE/DELETE trigger로 자동 갱신)
academies (id UUID PK, name TEXT, created_by UUID FK, created_at TIMESTAMPTZ, schedule_updated_at TIMESTAMPTZ)

-- 학원 구성원 (운영자 ↔ 학원, role: owner/admin/member)
academy_members (academy_id UUID FK, user_id UUID FK, role TEXT, invited_by UUID FK, joined_at TIMESTAMPTZ)

-- 초대 토큰 (1회용 + 7일 만료)
invite_tokens      (id UUID PK, academy_id UUID FK, token TEXT UNIQUE, role TEXT, created_by UUID FK, expires_at TIMESTAMPTZ, used_by UUID FK NULL, used_at TIMESTAMPTZ NULL)

-- 비즈니스 데이터: academy_id FK로 소유권 부여
students           (id UUID PK, academy_id UUID FK, name TEXT, gender TEXT)
subjects           (id UUID PK, academy_id UUID FK, name TEXT, color TEXT)
enrollments        (id UUID PK, student_id UUID FK, subject_id UUID FK)
sessions           (id UUID PK, academy_id UUID FK, weekday INT, starts_at TIME, ends_at TIME, room TEXT, y_position INT)
session_enrollments(session_id UUID FK, enrollment_id UUID FK)

-- 공유 링크 (W3 — supabase/migrations/026 + 029)
-- 029: last_viewed_at 추가 (방문 기준선 per-token)
share_tokens       (id UUID PK, academy_id UUID FK, token TEXT UNIQUE, label TEXT, filter_student_id UUID FK NULL, expires_at TIMESTAMPTZ, created_by UUID FK, revoked_at TIMESTAMPTZ NULL, last_viewed_at TIMESTAMPTZ NULL)

-- 시간표 템플릿 (W4 — supabase/migrations/027)
templates          (id UUID PK, academy_id UUID FK, name TEXT, description TEXT, template_data JSONB, created_by UUID FK, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)

-- 출석 관리 (W5 — supabase/migrations/028)
attendance         (id UUID PK, academy_id UUID FK, session_id UUID FK, student_id UUID FK, date DATE, status TEXT CHECK('present','absent','late','excused'), notes TEXT, marked_by UUID FK NULL, marked_at TIMESTAMPTZ, UNIQUE(session_id, student_id, date))
```

### 3.3 보조 테이블
- `user_profiles` — 사용자 프로필 (email, name, avatar)
- `user_settings` — 사용자 설정 (JSONB)
- `user_activity_logs` — 활동 로그
- `migration_log` — 마이그레이션 추적

## 4. 인증 흐름
1. 사용자 → Google/Kakao OAuth → Supabase Auth
2. JWT 토큰 발급 → localStorage 저장 (`sb-*` 키)
3. API Route → Service Role Key로 RLS 우회하여 DB 접근
4. 세션 자동 갱신 (Supabase client auto-refresh)

## 5. 핵심 비즈니스 로직

### 5.1 세션 충돌 해결
- 같은 요일, 겹치는 시간(`start1 < end2 && start2 < end1`)의 세션 감지
- 이동 대상 세션의 y 위치를 anchor로 고정, 겹치는 세션을 `y+1`로 재배치
- `src/lib/sessionCollisionUtils.ts`

### 5.2 시간표 PDF 생성
- html2canvas로 DOM 캡처 → jsPDF로 PDF 생성
- 인쇄 최적화 (A4, 여백, 폰트 크기)

### 5.3 그룹 수업
- 하나의 Session에 여러 Enrollment 연결
- SessionBlock에 학생명 표시 (최대 8명, 초과 시 "외 N명")

## 6. 배포 아키텍처

### 6.1 현재 (AWS Lightsail + Supabase 하이브리드) ✅
> ADR-001 참조. Self-hosted PostgreSQL + NextAuth.js 전환 계획은 폐기. Supabase 무료 티어 유지.

```
[User] → [Lightsail / Docker / Nginx] → [Next.js Standalone]
                                       → [Supabase PostgreSQL]
                                       → [Supabase Auth (Google OAuth)]
```

## 7. 변경 기록
- 2026-04-09: dev-pack으로 이전. ARCHITECTURE.md 초기 작성.
- 2026-04-11: 배포 아키텍처 업데이트 (self-hosted 폐기, Lightsail 하이브리드 확정). 데이터 모델 3.2 업데이트 (Academy 멀티테넌트 구조 반영, ADR-002).
- 2026-04-14: API Routes 현행화 (enrollments, onboarding 추가, data/auth 제거). lib/ 현행화 (apiSync, auth/, resolveAcademyId 등 추가, debouncedServerSync 제거). AuthContext.tsx 제거 (ThemeContext.tsx만 유지). Vercel 다이어그램 제거.
- 2026-04-15: invite_tokens 테이블 추가 (020 migration). /api/invites + /api/members API Routes 추가. /settings, /invite/[token] 페이지 추가. resolveAcademyMembership 헬퍼 추가.
- 2026-04-15: Step 5 개발자 로그 뷰어 추가. /admin/logs 페이지 + /api/admin/logs Route (ADMIN_EMAILS 화이트리스트). adminGuard.ts 신규. 023 마이그레이션: app_logs_select_by_owner RLS 정책 DROP.
- 2026-04-17: Phase 3 Full Redesign 완료 (AppShell, ScheduleDailyView, BottomTabBar, Sidebar, TopBar, DayChipBar, useModalA11y 등). Phase 4 Teacher 뷰 + Color-by 토글 완료 (teachers 페이지 + API, teacher-schedule 뷰, useColorBy, useTeacherManagementLocal 등). W2 월별 뷰 (ScheduleMonthlyView, MonthDayCell, useScheduleView). W3 공유 링크 (share/[token] 페이지, share-tokens API, migration 026). W4 시간표 템플릿 (templates API, SaveTemplateModal, ApplyTemplateModal, useTemplates, templateTypes, migration 027). W5 출석 관리 (attendance API + bulk, AttendanceSheet, useAttendance, migration 028).
- 2026-04-17: Phase 4 마지막 — 시간표 변경 배지 (migration 029: academies.schedule_updated_at + sessions trigger + share_tokens.last_viewed_at). /share/[token] 페이지에 ScheduleChangeBanner molecule 추가.
- 2026-04-17: Phase 5-B B-1 — SubjectChip + SchedulePreview Common Primitive 신설. getSessionSubject → src/lib/schedule/ 승격 (SessionBlock.utils.ts re-export). 랜딩 ScheduleMockup → SchedulePreview 교체. src/components/common/ 디렉터리 추가.
- 2026-04-18: Phase 6 Schedule Body Unification — `tintFromHex` util(`src/lib/colors/`), `SessionCard` 4-variant primitive + `SessionOverflowPopover` 신설. Weekly grid CSS Grid transpose(rows=time cols=weekday) + D-hybrid overlap(≤3 균등/≥4 cap-2+pill). Daily/Monthly/Landing/PDF → SessionCard로 통일. HelpTooltip viewport flip + AccountMenu compact anchor 수정.
