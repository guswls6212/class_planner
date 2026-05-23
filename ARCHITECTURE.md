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
- 서버 동기화 (개별 mutation): `apiSync.ts`의 fire-and-forget 함수 (syncStudentCreate 등) — 10회 retry + outbox enqueue
- 익명 사용자: localStorage만 사용 (서버 호출 없음)
- 로그인 사용자: localStorage → 서버 양방향 동기화
- 네트워크 불안정 시에도 UX 유지
- **Phase 1 (현재)**: passive timestamp sync — 페이지 로드 시 1회 server fetch + `decideOverwrite` (`src/lib/sync/timestamps.ts`)
- **Phase 2 (미구현)**: 활성 탭 30s 백그라운드 폴링 — `docs/superpowers/specs/2026-05-04-hybrid-sync-phases-design.md`
- **Phase 3 (미구현)**: Supabase Realtime + BroadcastChannel multi-tab dedup — 동상 spec 참조

#### Deferred-commit + await 패턴 (CUD 정합성, ADR-012)
삭제 흐름은 5초 deferred-commit (undo) + commit 시점 server response **await** 패턴 의무 (UAT 2026-05-09 학생 부활 사고 5사이클 후 정착):
1. localStorage 즉시 제거 (UI 0ms)
2. `pendingDeletes` 영속화 + 5초 timer
3. 5초 후 commit timer fires → `await fetch DELETE` → 응답 OK 후에만 `removePendingDelete`
4. 실패 시 `pendingDeletes` 그대로 → 다음 mount의 recovery hook이 자동 재시도

**Race window 0** 보장 — `useGlobalDataInitialization` 재실행과 fire-and-forget DELETE in-flight 시점 race 제거. 자세한 결정 + trade-off는 ADR-012 참조.

적용: `useStudentManagementLocal`, `useTeacherManagementLocal`, `useSubjectManagementLocal`, `useIntegratedDataLocal` (session).

#### AuthContext 단일화 (PR #313)
페이지/컴포넌트별 `supabase.auth.getSession()` 직접 호출 → `RootProviders`의 `AuthProvider` + `useAuth()` 훅 단일 source. 7곳 마이그레이션 완료. `useGlobalDataInitialization`, `invite/[token]/page.tsx`, `lib/authUtils.ts`는 OAuth flow / hook 사용 불가 등 사유로 보류.

#### Cursor-based Pagination (PR #307~#312)
List endpoint 공통 helper: `src/lib/pagination.ts` SSOT.
- `encodeCursor` / `decodeCursor` (base64 JSON of `{createdAt, id}`)
- `parsePaginationParams` / `isPaginatedRequest` / `buildNextCursor`
- `PAGINATION_DEFAULT_LIMIT=50`, `PAGINATION_MAX_LIMIT=200`

적용: students, teachers, share_tokens, audit_log, app_logs (cursor 옵션 + 기존 offset 호환), enrollments (studentId 필터). 옵션 미지정 시 기존 흐름 유지로 회귀 0.

### 1.3 Atomic Design (Presentation Layer)
- **Atoms:** 최소 단위 UI 요소 (Button, Input, Label)
- **Common Primitives** (`src/components/common/`): 크로스-뷰 공유 디자인 원자. Atomic Design 계층을 초월하여 atoms/molecules/organisms 어디서나 소비 가능.
  - `SubjectChip` — 과목 색상을 표현하는 공유 칩 primitive. variant: `fill` (캘린더), `border-left` (리스트 행), `soft`.
- **Molecules:** Atoms 조합
  - `SessionCard` — 4-variant 수업 카드 primitive (block/row/chip/preview). `data-variant`/`data-state` attr 계약. Daily/Monthly/Landing에서 소비.
  - `SessionBlock` — 주간 그리드 내 드래그 가능한 세션 블록.
  - `SessionOverflowPopover` — 겹침 4개↑일 때 "+N" pill 클릭 시 목록 팝오버 (D-hybrid).
  - `TimeTableCell` — 드롭존 + 빈 셀 클릭 처리를 통합한 단위 셀. 기존 DropZone을 대체.
  - `TimeTableRow` — 요일 컬럼. 수평 시간선 overlay(정시/30분 두 단계), `isToday` 시 now-line 표시, `nowLinePx` prop.
  - `ScheduleDateNavigator` — 일별/주간/월별 공통 날짜 네비게이터. ‹/›(lucide 아이콘) + 중앙 라벨 + 오늘 버튼. (J-1, PR#96)
  - `DayChipBar` — 일별 뷰 상단 주중 7일 칩 바. 오늘 강조.
  - `MonthDayCell` — 월별 캘린더 단위 셀.
  - `StudentFilterChipBar` — 학생 멀티셀렉트 필터 칩바. colorBy=student 시 표시.
  - `TeacherFilterChipBar` — 강사 멀티셀렉트 필터 칩바. colorBy=teacher 시 표시. 색상 dot 포함.
  - `TeacherAddModal` — 강사 초대 추가 모달. Smart CTA — 이메일 유무에 따라 "초대 링크 보내기" vs "바로 추가" 버튼 adaptive (K-2).
  - `InviteModal` — 초대 링크 발송 모달. `defaultTeacherId` prop으로 강사 행 pre-selection (K-2, K-6).
  - `MemberListItem` — 팀 멤버 목록 행. member에게는 이메일 비공개 (K-5).
  - `TeacherPillPicker` — 수업 모달용 강사 단일선택 pill bar. 색상 dot + 보라 accent. Group/Edit 모달에서 소비.
  - `TeacherColorPicker`, `TeacherContactDisplay`, `TeacherEditForm`, `TeacherScheduleList`, `TeacherSubjectPills` — 강사 상세 패널 서브컴포넌트.
  - `DragOverlayCard` — 드래그 중 오버레이 카드 (DnD Kit 연동).
  - `HiddenSessionsPopover` — 겹침 overflow 팝오버.
  - `AttendanceSheet` — 출석 체크 시트.
  - `BottomSheet` — 모바일 하단 슬라이드 시트. GroupSessionModal 모바일 렌더에 사용.
  - `BottomTabBar` — 모바일 하단 탭 네비게이션.
  - `Sidebar` — 데스크톱 사이드 네비게이션.
  - `TopBar` — 데스크톱 상단 헤더.
  - `PdfExportRangeModal` — PDF 출력 범위 선택 다이얼로그. viewMode별 옵션 분기.
  - `SlotPickerModal` — 시간표 템플릿 슬롯 picker (save/apply mode 분기, ADR-008 multi-slot UI).
  - `TemplateMenuV2`, `ApplyTemplateConfirm`, `TemplatePreviewModal` — 템플릿 메뉴 + 적용 확인 + 미리보기.
  - `ConfirmModal`, `DataConflictModal` — 범용 확인/충돌 모달.
  - `TypedConfirmationModal` — 위험 액션용 "이름 타이핑 확인" 모달 (GitHub repo delete 패턴). 멤버 학원 제외 등에 사용 (PR 4, design-exploration member-removal-ux Variant B).
  - `StudentAddDetailModal` — `/students` 헤더 "+ 상세 등록" 진입점. 이름 필수 + 성별/생년월일 권장 입력 (PR #289). 동명이인 식별 + dedup 정확도 보강 목적.
  - `TeacherAddDetailModal` — `/teachers` 헤더 "+ 상세 등록" 진입점. 이름 필수 + 이메일/전화번호 권장 입력 + 이메일 형식 검증 (PR #289). settings의 `TeacherAddModal`(invite/share)과 별개.
  - `HelpTooltip`, `ColorByToggle`, `ScheduleChangeBanner` — UI 헬퍼. (`AccountMenu` 제거 — 2026-05-03)
  - `NotificationItem` — 알림 히스토리 단일 항목 row. level 아이콘(AlertCircle/AlertTriangle/CheckCircle2/Info) + 메시지 + chip + relative time + hover X dismiss. (PR #372)
  - `NotificationDropdown` — `NotificationBell` trigger + 패널 통합. 필터 chip / 오늘·어제·이전 그룹 / 헤더 요약 / 풋터 카운트 / outside-click·ESC 닫기. Sidebar academy 영역에 inline(Expanded) / stack(Collapsed nav size) 배치 + TopBar에 compact 배치. `size` prop으로 NotificationBell 사이즈 forward. spec SSOT: [`docs/notification-history-spec.md`](docs/notification-history-spec.md). (PR #372 + 후속 PR 위치 조정)
  - `LaneInsertSlot` — 시간표 셀 좌/우 edge hover insert 슬롯 (Variant E lane-insert UX, PR #388). 드래그 중 다른 lane 사이 boundary droppable. dashed overlay + 강조선 + "여기 삽입" 텍스트. Cmd/Multi-drag 시 비활성화.
  - `ColorPicker` — 6/8/9색 grid palette + selected state. SubjectAddDetailModal·TeacherAddDetailModal·SubjectDetailPanel에서 공유.
  - `StudentChip` / `TeacherChip` — 선택된 학생/강사 chip representation. `TeacherChip`은 PR Q 단계의 `TeacherColorPicker` 교체본 (chip 패턴 통일).
  - `SlotPickerModal` — 템플릿 슬롯 picker (save/apply 분기) — ADR-008 multi-slot UI.
  - `SubjectAddDetailModal` — `/subjects` 헤더 "+ 상세 등록" 진입점 (PR #340, students/teachers와 패턴 통일).
- **Atoms:** Button, Input, Label, AuthGuard, ErrorBoundary, ThemeToggle, SegmentedButton, StudentListItem, SubjectListItem
  - `TeacherStatusPill` — 강사 초대/공유 상태 6-state 표시 pill (active/invite_pending/invite_expired/share_only/none, K-1)
  - `InfoTrigger` — 통일된 정보 아이콘 버튼. lucide Info SVG의 자체 원만 사용 (button border 제거 — 동심원 2겹 회피, PR #372). `size="sm"` (24×24, icon 14) / `size="md"` (32×32, icon 18). HelpTooltip·ScheduleActionBar에서 사용.
  - `NotificationBell` — 알림 트리거 atom. unread 배지(에러+경고 unread 수) + `motion-safe:animate-ping` pulse. `size` prop: `"sm"` (TopBar w-8 h-8 icon 16) / `"md"` (Sidebar expanded inline w-9 h-9 icon 18) / `"nav"` (Sidebar collapsed nav-style w-10 h-10 icon 22 strokeWidth 1.5). NotificationDropdown trigger로만 사용. (PR #372, size prop 확장은 후속 PR — academy 영역 inline 배치 시 nav size로 nav menu와 동등)
  - `Modal` — Headless 모달 primitive (focus trap + ESC + backdrop click). `modalFadeIn` 0.2s 키프레임 (Schedule edit/add 모달 회귀 가드: tests/e2e/modal-transition.spec.ts, PR #409).
  - `DetailTooltip` — Detail panel용 정보 hint tooltip atom.
  - `EmptyState` — 데이터 없음 상태 표시 (학생/강사/세션 list).
  - `GradeBadge` — 학생 학년 표기 amber chip (PR #338 동명이인 분기 보강).
  - `IconButton` — 아이콘 전용 버튼 primitive (kebab/X/edit 등 통일).
  - `SectionHeader` — Detail panel 섹션 제목 + actions 슬롯.
  - `Select` — 단일 선택 dropdown primitive (요일/시간 선택 등).
- **Organisms:** Molecules 조합, 페이지 단위 레이아웃
  - `TimeTableGrid` — 주간 시간표 CSS Grid. `baseDate?: Date` prop으로 주 날짜 배열 계산. 헤더 Stacked Circle(요일명+날짜, 오늘 amber 배지). `nowLinePx` 계산 후 오늘 `TimeTableRow`에 전달. (J-2, PR#97)
  - `ScheduleDailyView` — 일별 수업 목록. 스와이프 제스처 지원.
  - `ScheduleMonthlyView` — 월별 캘린더. `onDayClick`으로 일별 뷰 이동.
  - `HelpDrawer`, `AppShell` — 앱 쉘/도움말 드로어.
  - `StudentsPageLayout`, `StudentDetailPanel` — 학생 관리 두 패널 레이아웃 (Admin Amber).
  - `TeachersPageLayout`, `TeacherDetailPanel` — 강사 관리 두 패널 레이아웃. Stacked Sections: Header → Summary Cards → 담당 과목 M:N chip → 연락처·역할(email/phone/role/notes) → 수업 일정 → 색상 팔레트.
- **Common Primitives:** 계층 공유 디자인 토큰 컴포넌트 (`src/components/common/`) — SubjectChip, SchedulePreview

### 1.4 PWA & Mobile-First (전제)
class-planner는 **모바일 PWA(Progressive Web App) 확장을 전제**로 설계한다. 신규 UI/UX 결정은 데스크톱 웹뿐 아니라 모바일 PWA 환경을 함께 고려한다.

- **Touch targets**: 모든 인터랙티브 요소는 최소 44×44px (Apple HIG 권장) — kebab 메뉴, 토글, 액션 버튼 등에 적용
- **Responsive breakpoints**: Tailwind 기본 (`md:` 768px 이상 = 데스크톱). 모바일 전용 컴포넌트(TopBar, BottomTabBar)는 이미 존재 (`src/components/molecules/`)
- **Offline-first capable**: localStorage가 SSOT 역할 → 네트워크 끊겨도 핵심 기능(시간표 조회·편집·학생/과목/강사 CRUD) 동작. PWA service worker는 정적 자산 캐싱 + 오프라인 페이지를 추가할 예정 (현재 미구현)
- **Installable**: 향후 `manifest.json` + `apple-touch-icon` + `service-worker` 추가 시 홈 화면 추가 / 풀스크린 모드 지원
- **Toast UX**: 모바일에서도 위에서 슬라이드, 충분한 hit area, 자동 dismiss + 명시적 dismiss 양쪽 지원

**도입 현황** (2026-05 PR Q~S):
- ✅ Web App Manifest — `src/app/manifest.ts` (Next.js 15 metadata API, `/manifest.webmanifest`로 expose)
- ✅ Icon 세트 — `src/app/icon1.tsx` (192×192), `icon2.tsx` (512×512), `apple-icon.tsx` (180×180) (ImageResponse 동적 생성, amber theme)
- ✅ theme-color, viewport-fit=cover, apple-mobile-web-app-* 메타 — `src/app/layout.tsx` (metadata + viewport export)
- ✅ Service Worker (offline cache + fallback) — `@serwist/next` 기반, `src/app/sw.ts` (PR R)
- ❌ 푸시 알림 (수업 시작 알림, 코드 만료 임박 등 — 학부모 PWA에서 가치 大). iOS PWA push는 2026 시점에도 미지원 영역 다수, 별도 plan에서 도입 검토.

도입 결정 근거: `docs/adr/006-pwa-adoption.md`

**설계 원칙**: 신규 컴포넌트/기능 PR은 모바일 화면(360–414px)에서 합리적으로 동작하는지 검토. PWA 인프라가 추가되기 전이라도 디자인은 미리 PWA 친화적으로.

## 2. 컴포넌트 구조

### 2.1 Pages (Next.js App Router)
```
src/app/
├── page.tsx                        # 랜딩 페이지
├── layout.tsx                      # 루트 레이아웃 (AppShell)
├── login/page.tsx                  # OAuth 로그인
├── onboarding/page.tsx             # 첫 로그인 온보딩 (학원명 + 역할 입력)
├── students/page.tsx               # 학생 관리
├── subjects/page.tsx               # 과목 관리
├── teachers/page.tsx               # 강사 관리 (Phase 4)
├── teacher-schedule/page.tsx       # 강사 전용 시간표 뷰 (읽기 전용, Phase 4)
├── settings/page.tsx               # 학원 설정 (멤버 목록 + 초대 관리 + slug 편집기)
├── academy/[identifier]/page.tsx   # 공개 학부모 접속 코드 입력 페이지 (K-4)
├── admin/
│   ├── layout.tsx                  # ADMIN_EMAILS env 화이트리스트 게이트
│   └── logs/page.tsx               # 개발자 전용 로그 뷰어 (전체 학원 횡단 조회)
├── invite/[token]/page.tsx         # 초대 수락 페이지 — 4-state (비로그인/수락/이메일불일치/이미멤버, K-2)
├── share/[token]/                  # 공유 시간표 (인증 불필요, W3)
│   ├── page.tsx                    # 공유 링크 시간표 뷰 (읽기 전용)
│   └── layout.tsx                  # 최소 레이아웃 (Nav 없음)
├── schedule/                       # 시간표 관리 (가장 복잡)
│   ├── page.tsx
│   ├── _components/                # 페이지 전용 컴포넌트
│   ├── _hooks/                     # 페이지 전용 훅
│   ├── _utils/                     # 페이지 전용 유틸리티
│   └── _constants/                 # 페이지 전용 상수
└── about/page.tsx                  # 소개 페이지
```

### 2.1.1 Middleware (`src/middleware.ts`)

온보딩 가드 + RBAC 라우트 보호. 로그인한 사용자가 데이터 페이지 접근 시 두 단계로 검증한다.

1. **온보딩 가드:** `onboarded` 쿠키 없음 → `/onboarding` 리디렉트.
2. **RBAC 라우트 가드 (K-5):** `role_cookie` 쿠키가 `member`이면 `/students`, `/subjects`, `/teachers` 접근 시 `/schedule` 리디렉트.

matcher: `/students/:path*`, `/subjects/:path*`, `/schedule/:path*`, `/teachers/:path*`

### 2.2 API Routes
```
src/app/api/
├── academies/            # 학원 CRUD
│   ├── route.ts          # GET/POST 학원 목록·생성
│   ├── check-slug/       # GET — slug 중복 확인 (K-7)
│   ├── mine/             # GET — 내가 속한 학원 목록 (K-7, Multi-academy)
│   └── slug/             # PATCH — slug 변경 (K-7)
├── academy/[identifier]/
│   └── public/           # GET — 공개 학원 정보 (UUID/slug 지원, K-4)
├── audit-log/            # GET — 변경 이력 조회 (K-1, migration 035)
├── auth/
│   ├── set-active-academy/  # POST — active_academy_id 쿠키 설정 (K-7)
│   └── set-role-cookie/     # POST — role 쿠키 설정
├── students/             # 학생 CRUD (GET, POST, [id] PUT/DELETE)
├── subjects/             # 과목 CRUD (GET, POST, [id] PUT/DELETE)
├── teachers/             # 강사 CRUD (GET, POST, [id] PATCH/DELETE)
│                         #   PATCH: M1 field-level guard (name/color: owner/admin only, K-1)
│                         #   GET: invite/share status join → 6-state 응답 (K-1)
├── teacher-subjects/     # 강사↔과목 M:N (POST/DELETE)
├── sessions/             # 세션 CRUD + position 업데이트 (GET, POST, [id] PUT/DELETE, [id]/position PATCH)
│                         #   public_description: owner/admin only, internal_note: all staff (K-3)
├── enrollments/          # 수강 등록 CRUD (GET, POST, DELETE — id는 request body로 전달)
├── onboarding/           # 신규 사용자 온보딩 (Academy 생성)
├── invites/              # 초대 토큰 (GET/POST 목록·생성 — admin 발급 시 invitee_label 필수 추적, [id] DELETE 취소, [id]/regenerate POST atomic 재발급 (기존 row token/expires_at 갱신), check GET 공개조회, accept POST 이메일 매칭 검증 K-2)
├── members/              # 멤버 관리 (GET 목록, [userId] DELETE 제거, [userId] PATCH 역할 변경 K-3)
├── share/
│   ├── [token]/          # GET — 공개 링크 데이터 (인증 불필요, token 검증, W3)
│   └── code/             # POST — 접속 코드 검증 → share token 반환 (K-4)
├── share-tokens/         # 공유 토큰 CRUD (GET/POST 목록·생성, [id] DELETE 취소, W3)
│   ├── access-codes/     # POST — 일괄 접속 코드 생성/갱신 (K-4)
│   └── from-invite/      # POST — "링크만 받기" — 초대→share token 전환 (K-2)
├── templates/            # 시간표 템플릿 CRUD (GET/POST 목록·생성, [id] GET/PUT/DELETE, W4)
├── attendance/           # 출석 관리 (GET 조회/POST 단건 upsert, bulk/ POST 일괄 upsert, W5)
├── admin/
│   └── logs/             # GET — 개발자 전용 (ADMIN_EMAILS 화이트리스트), 전체 학원 횡단 조회, 필터/페이지네이션
└── user-settings/        # 사용자 설정
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
├── accessCode.ts              # 학부모 접속 코드 생성/검증 유틸리티 (6자 alphanumeric, K-4)
├── slug.ts                    # Academy slug 정규화/검증 유틸리티 (K-7)
├── sessionClusters.ts         # 시간대별 cluster 계산 (row-level overflow expand, PR #392/399)
├── laneInsert.ts              # Lane insert compaction + preview parity utils (ADR-017 v2, PR #388)
├── pendingDeletes.ts          # 5초 deferred-commit pending delete 영속화 (ADR-012)
├── duplicateLabel.ts          # 동명이인 식별 label 생성 (학년/이메일 등)
├── teacherPickerFilter.ts     # 강사 picker dropdown 필터링 로직
├── subjectColors.ts           # DEFAULT_SUBJECT_COLORS (9색 SSOT, PR #340)
├── notificationCenter.ts      # 알림 history SSOT (push/dismiss/filter, PR #372)
├── conflict/
│   └── computeLossDiff.ts     # 데이터 충돌 시 로컬↔서버 차이 계산 (DataConflictModal)
├── validation/
│   └── profileSchemas.ts      # 학생/강사/과목/학원 이름 정책 (학생 6/강사 6/과목 12/학원 30, PR #326)
├── server/
│   └── teacherServiceFactory.ts  # 서버사이드 강사 서비스 팩토리 (API Route 전용)
└── auth/                      # 로그인 데이터 마이그레이션
    ├── handleLoginDataMigration.ts  # 로그인 시 로컬/서버 충돌 감지
    ├── fullDataMigration.ts         # 로컬 전체 데이터 서버 업로드 (5 entity sequential, ADR-013)
    ├── deduplication.ts             # 중복 데이터 제거 (student/subject/teacher/enrollment/session)
    └── permissions.ts               # Role 기반 권한 검사 유틸리티 (canManage, canEdit 등)

src/hooks/             # 커스텀 React 훅
├── useStudentManagementLocal.ts   # 학생 관리 (Local-first)
├── useSubjectManagementLocal.ts   # 과목 관리 (Local-first)
├── useTeacherManagementLocal.ts   # 강사 관리 (Local-first, Phase 4)
├── useIntegratedDataLocal.ts      # 통합 데이터 (Local-first) — PR #380 server fetch 제거 (Context 공유로 dedup)
├── useGlobalDataInitialization.ts # 앱 초기화 (익명/로그인 분기, 충돌 감지)
├── useDragController.ts           # 드래그앤드롭 controller (dnd-kit + lane insert + visual feedback SSOT, PR #389-390)
├── useScheduleSessionManagement.ts # 세션 관리
├── useScheduleView.ts             # 뷰 모드 (daily/weekly/monthly) + 네비게이션 (W2)
├── useDisplaySessions.ts          # 세션 표시 로직 + enrollmentIds 빈 배열 warn 폭주 차단 (PR #379)
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
├── useMyRole.ts                   # 현재 사용자 역할 조회. 초기값 canManage: false (Flash of Unauthorized UI 방지, K-5) — MemberContext 공유 (PR #380)
├── useMyTeacher.ts                # 현재 로그인 사용자의 강사 프로필 조회 — MemberContext 공유 (PR #380)
├── useNotificationCenter.ts       # `notificationCenter` SSOT subscribe + dispatch (PR #372)
├── useScheduleLayout.ts           # 시간표 레이아웃 계산 (시간 범위, 셀 크기)
├── useScheduleMeta.ts             # academies.schedule_updated_at 폴링 + lastViewed 비교 (W3+W5)
├── useSessionSelection.ts         # 세션 multi-select 상태
├── useNowMinute.ts                # 현재 시각 갱신 (now-line)
├── useTimeValidation.ts           # 시간 유효성 검사
├── useTimeRange.ts                # 운영 시간 범위 훅 (학원 settings)
├── useOutboxFlush.ts              # outbox enqueue/flush trigger
├── useSyncStatus.ts               # 동기화 상태 (idle/syncing/error)
├── useAccessCodes.ts              # 학부모 접속 코드 CRUD (K-4)
├── useUserTracking.ts             # 사용자 행동 추적
├── usePerformanceMonitoring.ts    # 성능 모니터링
└── _sessionValidationLogger.ts    # session 유효성 warn dedup logger (PR #379 로그 폭주 차단)

src/contexts/          # React Context
├── AuthContext.tsx       # Supabase Auth 단일 source (PR #313 — useAuth 훅)
├── ThemeContext.tsx      # 테마 (Dark/Light)
├── SidebarContext.tsx    # Sidebar Expand/Collapse 상태
├── MemberContext.tsx     # 현재 사용자의 academy member role 공유 — useMyRole/useMyTeacher Context 단일화 (PR #380, 중복 fetch 차단)
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
-- ADR-019: 1인당 owner 1개 + invited(admin|member) 1개 = 최대 2학원.
-- 첫 진입은 owner 강제 (POST /api/onboarding 서버-사이드 hardcoded), admin/member 는 초대 수락(/invite/[token]) 경로로만 부여.
-- 정책 강제 layer: ADR + 코드 주석 + 자연 가드 (sidebar "+ 새 학원" disabled + onboarding owner-강제). DB constraint/API check 는 학원 추가 기능 도입 시 함께 (정책 5 트리거).
academy_members (academy_id UUID FK, user_id UUID FK, role TEXT, invited_by UUID FK, joined_at TIMESTAMPTZ)

-- 초대 토큰 (1회용 + 7일 만료)
-- 037: email 컬럼 추가 (이메일 바운드 초대 — 수락 시 로그인 이메일과 매칭 검증, K-2)
-- 033: teacher_id FK 추가 (강사 초대 연결)
invite_tokens      (id UUID PK, academy_id UUID FK, token TEXT UNIQUE, role TEXT, created_by UUID FK, expires_at TIMESTAMPTZ, used_by UUID FK NULL, used_at TIMESTAMPTZ NULL, email TEXT NULL, teacher_id UUID FK NULL)

-- 비즈니스 데이터: academy_id FK로 소유권 부여
students           (id UUID PK, academy_id UUID FK, name TEXT, gender TEXT)
subjects           (id UUID PK, academy_id UUID FK, name TEXT, color TEXT)
enrollments        (id UUID PK, student_id UUID FK, subject_id UUID FK)
-- sessions: enrollment_ids JSONB 컬럼은 migration 030에서 추가됐다가 migration 044(PR #379)에서 drop.
-- enrollment 관계는 session_enrollments(M:N) SSOT만 사용. (audit_log race 회피 + dedupe 단순화)
sessions           (id UUID PK, academy_id UUID FK, weekday INT, starts_at TIME, ends_at TIME, room TEXT, y_position INT)
session_enrollments(session_id UUID FK, enrollment_id UUID FK)

-- 공유 링크 (W3 — supabase/migrations/026 + 029)
-- 029: last_viewed_at 추가 (방문 기준선 per-token)
-- 038: teacher_id FK 추가 (강사 스코프), watermark_meta JSONB 추가 (K-2)
-- 040: access_code TEXT UNIQUE 추가 (학부모 6자 접속 코드, per-academy UNIQUE, K-4)
share_tokens       (id UUID PK, academy_id UUID FK, token TEXT UNIQUE, label TEXT, filter_student_id UUID FK NULL, expires_at TIMESTAMPTZ, created_by UUID FK, revoked_at TIMESTAMPTZ NULL, last_viewed_at TIMESTAMPTZ NULL, teacher_id UUID FK NULL, watermark_meta JSONB NULL, access_code TEXT NULL)

-- 시간표 템플릿 (W4 — supabase/migrations/027)
templates          (id UUID PK, academy_id UUID FK, name TEXT, description TEXT, template_data JSONB, created_by UUID FK, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)

-- 출석 관리 (W5 — supabase/migrations/028)
attendance         (id UUID PK, academy_id UUID FK, session_id UUID FK, student_id UUID FK, date DATE, status TEXT CHECK('present','absent','late','excused'), notes TEXT, marked_by UUID FK NULL, marked_at TIMESTAMPTZ, UNIQUE(session_id, student_id, date))

-- 세션 노트 (migration 039 — K-3)
-- public_description: owner/admin만 편집, 학부모 공유 링크에 노출 가능
-- internal_note: 모든 staff(owner/admin/member) 편집 가능, 내부 전용
sessions           (... public_description TEXT NULL, internal_note TEXT NULL)  -- 기존 컬럼 + 추가분

-- 강사 (Phase 4 + K-1 확장 — migration 032: email/phone/role/notes 추가, migration 036: RLS member_own)
-- RLS: name/color 수정은 owner/admin만, email/phone/notes는 본인(user_id 매칭) member도 가능 (K-1)
teachers           (id UUID PK, academy_id UUID FK, name TEXT NOT NULL, color TEXT, user_id UUID FK NULL, email TEXT NULL, phone TEXT NULL, role TEXT CHECK('owner','admin','member') DEFAULT 'member', notes TEXT NULL)
-- 강사↔과목 M:N (migration 032)
teacher_subjects   (teacher_id UUID FK, subject_id UUID FK, academy_id UUID FK, created_at TIMESTAMPTZ, PRIMARY KEY(teacher_id, subject_id))

-- 감사 로그 (migration 035 — K-1)
-- 멤버 초대/역할 변경/강사 편집 등 중요 변경 이력
audit_log          (id UUID PK, academy_id UUID FK, actor_id UUID FK, action TEXT, target_type TEXT, target_id UUID NULL, before_data JSONB NULL, after_data JSONB NULL, created_at TIMESTAMPTZ)

-- 학원 slug (migration 041 — K-7)
-- academies 테이블에 slug 컬럼 추가 (UNIQUE, 공개 URL용)
academies          (... slug TEXT UNIQUE NULL)  -- 기존 컬럼 + 추가분
```

### 3.3 보조 테이블
- `user_profiles` — 사용자 프로필 (email, name, avatar)
- `user_settings` — 사용자 설정 (JSONB)
- `user_activity_logs` — 활동 로그
- `migration_log` — 마이그레이션 추적

## 3.2 신규 기능 아키텍처 (Phase K)

### 학부모 접속 코드 시스템 (K-4)
- 원장이 학생별 6자 alphanumeric 코드 생성 (Settings "학부모 접속 코드" 섹션)
- 부모가 `/academy/[slug]` 공개 페이지에서 코드 입력 → 해당 학생 수업 시간표 `share_tokens`로 반환
- 코드 만료 6개월, 원장이 `POST /api/share-tokens/access-codes`로 일괄 갱신 가능
- `share_tokens.access_code` (UNIQUE per academy) 기반

### Academy Slug (K-7)
- 공개 URL: `/academy/[slug]` (예: `/academy/현진학원`)
- `/academy/[UUID]` 접근 시 slug로 301 redirect
- Settings에서 원장이 slug 커스텀 설정 (실시간 중복 확인: `GET /api/academies/check-slug`)
- `academies.slug` 컬럼 UNIQUE 제약

### Multi-academy 사용자 (K-7)
- `classPlannerData:{userId}:{academyId}` — localStorage 학원별 완전 분리
- 사이드바 상단 로고 클릭 → Academy Switcher 드롭다운 (`GET /api/academies/mine`)
- `active_academy_id` 쿠키 (`POST /api/auth/set-active-academy`)로 서버 컨텍스트 결정

### Member RBAC (K-5)
- Sidebar: member 역할은 시간표 + 설정만 표시 (학생/과목/강사 nav 숨김)
- Middleware: `/students`, `/subjects`, `/teachers` 접근 시 member → `/schedule` redirect
- `ScheduleActionBar`: member에게 share 버튼 숨김
- Settings 팀 멤버 리스트: member에게 타인 이메일 비공개
- `useMyRole` 초기값 `canManage: false` — 역할 로드 전 UI 깜빡임(FOUU) 방지

### 강사 Invite 흐름 (K-1, K-2)
- `/invite/[token]` 4-state: A(비로그인 → OAuth 유도), B(수락), C(이메일 불일치 403), D(이미 멤버)
- `invite_tokens.email` 바운드: 수락 시 로그인 이메일과 일치해야 함
- "링크만 받기" (`POST /api/share-tokens/from-invite`): 초대 수락 없이 강사 뷰 share_token 발급
- 링크 생성 후 자동 클립보드 복사 + 모달 닫힘 (K-6)

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
- 2026-04-26: Phase J Schedule UX — `ScheduleDateNavigator` molecule 신설(PR#96). `TimeTableGrid` Stacked Circle 헤더+수평 시간선+now-line+`baseDate` prop, `TimeTableRow` 시간선 overlay 추가(PR#97). FAB `page.tsx`로 이동(전 뷰 공통화), `GroupSessionModal` 3-step Glass Stepper 재설계(PR#98). Organisms 목록 현행화(ScheduleDailyView, ScheduleMonthlyView 추가).
- 2026-05-02: Phase K Teacher Invite 리디자인 + 보안 강화 (PR#152-161). migrations 032-041. Pages: `academy/[identifier]` 추가. API: `academies/check-slug`, `academies/mine`, `academies/slug`, `academy/[identifier]/public`, `audit-log`, `auth/set-active-academy`, `share/code`, `share-tokens/access-codes`, `share-tokens/from-invite`, `members/[userId] PATCH`, `teachers/[id] PATCH` 추가. Atoms: `TeacherStatusPill` 추가. Molecules: `TeacherAddModal`, `InviteModal`, `MemberListItem`, `DragOverlayCard`, `HiddenSessionsPopover`, teacher 서브컴포넌트 5개 추가. Hooks: `useMyRole`, `useMyTeacher` 추가. Lib: `accessCode.ts`, `slug.ts`, `server/teacherServiceFactory.ts`, `auth/permissions.ts` 추가. Data model: `invite_tokens.email/teacher_id`, `share_tokens.access_code/teacher_id/watermark_meta`, `academies.slug`, `sessions.public_description/internal_note`, `audit_log` 테이블, `teacher_subjects` M:N 추가. RBAC: middleware route guard + useMyRole FOUU fix + Sidebar/ScheduleActionBar member 필터링. Multi-academy: localStorage per-academy scope + Academy Switcher + active_academy_id 쿠키.
- 2026-05-03: 보안·UX 통합 (PR#163-166). Security: `accessCode.ts` 코드 6자 확장(7.6→20 bits), academyId 격리 복원, IP rate limit + lockout, CSPRNG(`crypto.randomInt`), `L` 혼동 문자 제거. migration 042(Phase B 4자 코드 강제 만료, 미실행). UX: 강사 역할 라벨 통일(member=강사/admin=관리자 전사 통일), `AccountMenu` molecule 삭제 → `Sidebar` Academy Switcher 하단에 이메일·로그아웃 통합, `TopBar` 로그인/로그아웃 섹션으로 단순화. Lib: `auth/signOut.ts` 신설(supabase signOut + 3쿠키 + localStorage 전체 정리). Atoms: `InfoTrigger` 신설(i 아이콘 통일). Settings: 시간표 공유 섹션 → 아코디언(기본 닫힘). Login: OAuth 도메인 안내 문구 추가.
- 2026-05-04: Storybook 10 도입. `@storybook/nextjs-vite` framework, addons: addon-a11y + addon-docs. 첫 stories: SaveTemplateModal (5종 시나리오), ApplyTemplateModal (6종, 레거시 강사 없는 템플릿 호환 포함). `npm run storybook` (port 6006), `npm run build-storybook` 추가. Visual regression 도입 트리거 문서: `docs/future-work/visual-regression-trigger.md` (Stage 0~3, 임계치 컴포넌트 100+/디자이너 합류/hardcoded hex 20+/Tailwind config 분기 2회+ 등). Mac Studio M3 Ultra 도착(2026-05-07) 후 self-host visual regression(Lost Pixel/Reg-Suit) Stage 2 검토 가능.
- 2026-05-04: UAT 수동 체크리스트 도입. `tests/manual/uat-checklist.md` — 13 카테고리 73 시나리오 + 10 edge case. Core(40분 P0)/Extended(80분 P0+P1)/Full(120분) 3-tier 실행 가이드. PR #211(템플릿 round-trip) 회귀 가드 cross-reference 포함 (S-7.1~7.8 + 자동 테스트 4개 매핑). Main 머지 전 본인이 1회 직접 실행 워크플로우 확립.
- 2026-05-10: UAT 2026-05-10 후속 일괄 fix + 정책-스키마 일관성 (PR #338, #339, #340, ADR-014). Migration `043_drop_teachers_unique_name.sql` — `teachers_academy_id_name_key UNIQUE(academy_id, name)` 제약 제거 (동명이인 강사 등록 정책-스키마 일치, students/subjects와 일관성 회복). `useStudentManagementLocal` / `useSubjectManagementLocal` / `useTeacherManagementLocal` 추가 분기의 `showToast` 호출 제거 (토스트 중복 사고 종결, layout이 SSOT). `StudentsPageLayout` 학생 카드 amber 학년 chip(`student-grade-chip-{id}`) 노출 — 동명이인 분기에서 학년 누락 보완. `httpErrors.ts` `serializeCause` 신설 — Supabase PostgrestError 등 비-Error 객체에서 `code/message/details/hint` 추출 (`[object Object]` 직렬화 사고 종결). 신규 atom/molecule: `SubjectAddDetailModal` + `lib/subjectColors.ts` (`DEFAULT_SUBJECT_COLORS` 9색) — 학생/강사와 동일한 "+ 상세 등록" 패턴을 과목에도 도입.
- 2026-05-13: drag-drop lane stack + Variant E lane insert UX (PR #387-#390). `LaneInsertSlot` molecule 신설 — 시간표 셀 좌/우 edge hover 시 dashed overlay + "여기 삽입" 텍스트 보여주는 droppable. cell half droppable id unique 화(빈 시간대 overlay hide). 3 시각 피드백 SSOT 통일 (lane-highlight, overlay, preview parity). `useDragController` hook 통합 (mode-aware lane-highlight + cmd-drag insert 비활성). `lib/laneInsert.ts` + compaction 알고리즘. `lib/sessionCollisionUtils.anchorStack.test.ts` — isMovingToHigherLane chain의 anchor stack 회귀 가드 (PR #387). `docs/dnd-visual-feedback.md` + design-explorations `/lane-insert` 4 variants.
- 2026-05-13: 모달 stale studentId reconcile (PR #385/#386). `sanitizeStudentIds.ts` + `sanitizeTempEnrollments.ts` — students reconcile 후 stale id 자동 제거 (local-first id race + GroupSessionModal/EditSessionModal 양쪽 적용). memory `feedback_local_first_id_reconcile_state_sync` 영구화.
- 2026-05-13: 다른 주로 세션 이동 (PR #378). `EditSessionModal` V3 month calendar + 날짜 chip label, weekday → weekStartDate + weekday 조합 (memory `feedback_no_paradigm_assumption` 영구화). `migrations 031: add week_start_date to sessions`. `useScheduleView` 시간표 자동 navigate.
- 2026-05-14: Phase F perf — Context dedup (PR #380-#383). `MemberContext.tsx` 신설 + `useMyRole`/`useMyTeacher` Context 공유 (Sidebar+TopBar+Detail panel 중복 fetch 차단). `useIntegratedDataLocal` server fetch 제거. `MemberContext.useEffect` deps `user.id`로 좁힘 (중복 fetch 차단).
- 2026-05-14: Repository row-level skip + invariant 보강 (PR #381-#382). `_helpers/mapRowsSafely.ts` — invariant 위반 row가 전체 빈 배열로 swallow 되던 함정 차단 (개별 row skip + warn). Student/Subject/Teacher/Enrollment/Session 5 repos 적용.
- 2026-05-15: Row-level overflow expand (PR #392+#399+#397). `sessionClusters.ts` 시간대별 cluster 계산, `TimeTableRow`에 +N/− chip 클릭으로 weekday 모든 cluster 일괄 expand (Image #14 회귀 fix). `computeBulkMoveTargets` group-shift contiguous yPos 분배 (ADR-017 v2 — Option D 폐기 후 group-shift 분배 확정).
- 2026-05-15: Notification history Phase 1 (PR #372 + 후속 PR #375). `notificationCenter` SSOT — push/subscribe/filter/dismiss. `useNotificationCenter` 훅. `NotificationBell` atom + `NotificationDropdown` molecule (Sidebar inline + TopBar compact). spec: `docs/notification-history-spec.md`. `InfoTrigger` 동심원 fix (button border 제거).
- 2026-05-15: `middleware.ts` design-explorations 라우트 production 404 차단 (PR #374, mock 페이지 외부 노출 차단).
- 2026-05-17: API session yPosition persist (PR #394). `/api/sessions` POST/PUT 에서 yPosition 누락 → 멀티선택 복사 후 lane 1 stack 회귀 fix. `SessionApplicationService` 전면 검증.
- 2026-05-18: 수업 추가 모달 V3 chip+popover (PR #396). `GroupSessionModal` 요일/날짜 + 시간 chip+popover (EditSessionModal V3 패턴 미러). `GroupSessionData.weekStartDate?: string`, `SessionCreateInput.weekStartDate` 추가.
- 2026-05-18: E2E multi-academy 안정화 + chip 일괄 expand (PR #399-#401). `seedSecondAcademy` 멱등성 + orphan sweep, multi-academy spec auth-mock pre-seed academyId.
- 2026-05-20: ADR-019 first-user owner-강제 + Academy Singularity (PR #413). `/onboarding/page.tsx` 역할 라디오 3개 제거 → amber Crown 안내 + "원장으로 학원 만들기" + secondary "초대 받았어요" link (Variant E). `/api/onboarding` body.role 무시 + hardcoded owner. Sidebar "+ 새 학원" tooltip "본인 학원 1개 제한 (ADR-019)". 정책 영구화: owner 1 + invited 1 = 최대 2학원, 학원 추가 기능 deferred. design-explorations/onboarding-role 5 variants 영구 보존 (production middleware 404 가드).
- 2026-05-19: Test harness — flaky 8 원칙 가드 자동화 (PR #403-#410). `eslint.config.mjs` `@typescript-eslint/no-floating-promises: warn` (Phase 1, fix는 future-work doc), `setupTests.ts` 글로벌 `afterEach(vi.clearAllMocks)` (P1-3 unit state pollution 가드), `tests/e2e/schedule-multi-select-drag` + `scroll-position-preservation` waitForTimeout 17곳 → expect.poll/waitOneFrame (P0). `docs/test-authoring-guide.md` SSOT + PreToolUse hook (`dev-pack/scripts/hooks/test-authoring-guide-hook.sh`)으로 spec 작성 시 8 원칙 가이드 auto-inject. `modal-transition.spec.ts` modalFadeIn 0.2s 회귀 가드 (P2). `share-link/teachers-crud/templates` 1주일 산발적 fail root cause fix → `gotoAuthenticated` helper (page.goto → /login redirect 감지 → reload 1회 → throw, PR #410). ADR-018 (postgres self-host 의식적 보류) + `docs/future-work/supabase-usage-tracking.md` (Phase 2 트리거 모니터 절차).
- 2026-05-08: UAT 사고 fix + 점진적 보강 Phase 1·2 (PR #286-#290). Migration 안전망: `fullDataMigration`의 sessions POST에 `weekStartDate` fallback (PR #286), 통일 에러 응답 포맷(`{success:false, error:{code, message}}`)에 맞춘 폴백 + `extractErrorMessage` helper로 `[object Object]` 회귀 차단(PR #286), `upload-local` 자동 경로 throw 시 `toast.error` 표면화 + 앱 진입 보장(PR #287). Dedup 정책 변경: `findDuplicateStudent` graceful 매칭 — academy 단위 격리 가정으로 동명이인 0명+빈 메타 케이스에 이름 매칭 허용, 동명이인 다수일 때만 strict 비교 (PR #288). UI 점진적 보강: 학생/강사 등록 페이지 헤더 "+ 상세 등록" 진입점 + `StudentAddDetailModal`/`TeacherAddDetailModal` molecules 추가 (PR #289), 학생/강사 목록 행에 빈 메타 보강 hint(ⓘ 인디고 칩) 추가 (PR #290). 사용자 발화: 학생 추가 시점 메타 함께 입력 가능 + 등록 후에도 빈 메타 학생 발견형 인지.
