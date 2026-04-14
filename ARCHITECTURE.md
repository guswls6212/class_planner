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
- **Molecules:** Atoms 조합 (SessionBlock, TimeTableRow, ConfirmModal)
- **Organisms:** Molecules 조합, 페이지 단위 레이아웃 (TimeTableGrid, StudentPanel)

## 2. 컴포넌트 구조

### 2.1 Pages (Next.js App Router)
```
src/app/
├── page.tsx              # 랜딩 페이지
├── layout.tsx            # 루트 레이아웃 (Nav + Footer)
├── login/page.tsx        # OAuth 로그인
├── onboarding/page.tsx   # 첫 로그인 온보딩 (학원명 + 역할 입력)
├── students/page.tsx     # 학생 관리
├── subjects/page.tsx     # 과목 관리
├── settings/page.tsx     # 학원 설정 (멤버 목록 + 초대 관리)
├── invite/[token]/page.tsx # 초대 수락 페이지 (비로그인/로그인 분기)
├── schedule/             # 시간표 관리 (가장 복잡)
│   ├── page.tsx
│   ├── _components/      # 페이지 전용 컴포넌트
│   ├── _hooks/           # 페이지 전용 훅
│   ├── _utils/           # 페이지 전용 유틸리티
│   └── _constants/       # 페이지 전용 상수
└── about/page.tsx        # 소개 페이지
```

### 2.1.1 Middleware (`src/middleware.ts`)

온보딩 가드. 로그인한 사용자가 데이터 페이지(`/students`, `/subjects`, `/schedule`) 접근 시 `onboarded` 쿠키를 확인한다. 쿠키 없음 → `/onboarding` 리디렉트. 비로그인 사용자는 Anonymous-First 정책으로 통과.

matcher: `/students/:path*`, `/subjects/:path*`, `/schedule/:path*`

### 2.2 API Routes
```
src/app/api/
├── students/       # 학생 CRUD (GET, POST, [id] PUT/DELETE)
├── subjects/       # 과목 CRUD (GET, POST, [id] PUT/DELETE)
├── sessions/       # 세션 CRUD + position 업데이트 (GET, POST, [id] PUT/DELETE, [id]/position PATCH)
├── enrollments/    # 수강 등록 CRUD (GET, POST, DELETE — id는 request body로 전달)
├── onboarding/     # 신규 사용자 온보딩 (Academy 생성)
├── invites/        # 초대 토큰 (GET/POST 목록·생성, [id] DELETE 취소, check GET 공개조회, accept POST 수락)
├── members/        # 멤버 관리 (GET 목록, [userId] DELETE 제거)
└── user-settings/  # 사용자 설정
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
src/lib/               # 핵심 유틸리티
├── localStorageCrud.ts        # localStorage CRUD 시스템 (Anonymous/User 키 분리)
├── apiSync.ts                 # fire-and-forget 서버 동기화 (syncStudentCreate 등)
├── sessionCollisionUtils.ts   # 세션 충돌 감지 및 재배치
├── logger.ts                  # 로깅 시스템
├── errorTracker.ts            # 에러 추적
├── planner.ts                 # 핵심 데이터 타입 정의
├── pdf-utils.ts               # PDF 생성 유틸리티
├── timeUtils.ts               # 시간 관련 유틸리티
├── authUtils.ts               # 인증 관련 유틸리티
├── resolveAcademyId.ts        # Academy ID 조회 (온보딩 체크)
├── supabaseServiceRole.ts     # Service Role 클라이언트 (서버 전용)
├── yPositionMigration.ts      # yPosition 마이그레이션 유틸리티
└── auth/                      # 로그인 데이터 마이그레이션
    ├── handleLoginDataMigration.ts  # 로그인 시 로컬/서버 충돌 감지
    ├── fullDataMigration.ts         # 로컬 전체 데이터 서버 업로드
    └── deduplication.ts             # 중복 데이터 제거

src/hooks/             # 커스텀 React 훅
├── useStudentManagementLocal.ts   # 학생 관리 (Local-first)
├── useSubjectManagementLocal.ts   # 과목 관리 (Local-first)
├── useIntegratedDataLocal.ts      # 통합 데이터 (Local-first)
├── useGlobalDataInitialization.ts # 앱 초기화 (익명/로그인 분기, 충돌 감지)
├── useScheduleDragAndDrop.ts      # 드래그앤드롭
├── useScheduleSessionManagement.ts # 세션 관리
├── useDisplaySessions.ts          # 세션 표시 로직
├── useLocal.ts                    # localStorage 기반 범용 훅
├── useStudentPanel.ts             # StudentPanel 상태 관리
├── useTimeValidation.ts           # 시간 유효성 검사
├── useUserTracking.ts             # 사용자 행동 추적
└── usePerformanceMonitoring.ts    # 성능 모니터링

src/contexts/          # React Context
└── ThemeContext.tsx    # 테마 (Dark/Light)
```

## 3. 데이터 모델

### 3.1 현재 구조 (정규화 + Academy 멀티테넌트)
> Phase 2A 완료 (2026-04-14). ADR-002 참조.
> 레거시 `user_data` JSONB 테이블은 마이그레이션 019로 제거됨.

```sql
-- 학원 (테넌트 단위)
academies (id UUID PK, name TEXT, created_by UUID FK, created_at TIMESTAMPTZ)

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
