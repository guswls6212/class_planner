# FOR AI - 프로젝트 가이드

## 📋 프로젝트 개요

**Class Planner**: Next.js + Atomic Design + Clean Architecture 기반 학원 시간표 관리 시스템

### 🏗️ 기술 스택

- **Frontend**: Next.js 15.5.2, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication)
- **Data Management**: 🆕 localStorage 직접 조작 + 30초 debounce 서버 동기화 (최대 5분 안전장치)
- **Testing**: Vitest, Playwright, React Testing Library
- **Architecture**: Clean Architecture + Atomic Design
- **Styling**: Tailwind CSS 4.0 (인라인 스타일 금지)

---

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Clean Architecture 통합)
│   │   ├── data/          # 통합 데이터 관리 API (JSONB 기반)
│   │   ├── students/      # 학생 관리 API (개별 CRUD)
│   │   │   └── [id]/      # 개별 학생 API
│   │   ├── subjects/      # 과목 관리 API (개별 CRUD)
│   │   │   └── [id]/      # 개별 과목 API
│   │   ├── sessions/      # 세션 관리 API (개별 CRUD)
│   │   │   └── [id]/      # 개별 세션 API
│   │   │       └── position/ # 세션 위치 업데이트 API
│   │   ├── user-settings/ # 사용자 설정 API
│   │   └── auth/          # 인증 API
│   ├── schedule/          # 시간표 페이지
│   │   ├── _components/   # 페이지 전용 컴포넌트
│   │   ├── _hooks/        # 페이지 전용 훅
│   │   └── _utils/        # 페이지 전용 유틸리티
│   ├── students/          # 학생 페이지
│   ├── subjects/          # 과목 페이지
│   ├── login/             # 로그인 페이지
│   ├── about/             # 소개 페이지
│   ├── layout.tsx         # 루트 레이아웃 (네비게이션 포함)
│   └── page.tsx           # 홈페이지
├── components/            # Atomic Design 컴포넌트
│   ├── atoms/            # 원자 컴포넌트 (Button, Input, Label 등)
│   ├── molecules/        # 분자 컴포넌트 (FormField, SessionBlock 등)
│   └── organisms/        # 유기체 컴포넌트 (TimeTableGrid, StudentPanel 등)
├── domain/               # Clean Architecture - Domain 계층
│   ├── entities/         # 도메인 엔티티 (Student, Subject)
│   ├── value-objects/    # 값 객체 (StudentId, SubjectId, Color)
│   ├── repositories/     # 리포지토리 인터페이스
│   └── services/         # 도메인 서비스
├── application/          # Clean Architecture - Application 계층
│   ├── services/         # 애플리케이션 서비스
│   ├── use-cases/        # 유스케이스
│   └── mappers/          # 데이터 매퍼
├── infrastructure/       # Clean Architecture - Infrastructure 계층
│   ├── config/           # 설정 파일
│   ├── container/        # DI 컨테이너 및 레지스트리
│   ├── factories/        # 리포지토리 팩토리들
│   ├── repositories/     # Supabase 리포지토리 구현
│   └── RepositoryFactory.ts # 메인 리포지토리 팩토리
├── hooks/                # React 커스텀 훅
│   ├── useStudentManagementLocal.ts  # 🆕 localStorage 직접 조작 학생 관리
│   ├── useSubjectManagementLocal.ts  # 🆕 localStorage 직접 조작 과목 관리
│   ├── useIntegratedDataLocal.ts     # 🆕 localStorage 직접 조작 통합 데이터
│   ├── useGlobalDataInitialization.ts # 스마트 초기화 (보안 강화)
│   ├── useStudentManagement.ts       # 기존 학생 관리 (레거시)
│   ├── useSubjectManagement.ts       # 기존 과목 관리 (레거시)
│   └── useIntegratedData.ts          # 기존 통합 데이터 (레거시)
├── lib/                  # 핵심 유틸리티 라이브러리
│   ├── localStorageCrud.ts        # localStorage 직접 조작 CRUD 시스템
│   ├── debouncedServerSync.ts     # 30초 debounce 서버 동기화 (최대 5분 안전장치)
│   ├── sessionCollisionUtils.ts   # 세션 충돌 감지 및 해결
│   ├── logger.ts                  # Vercel 최적화 로깅 시스템
│   ├── errorTracker.ts            # 에러 추적 및 모니터링
│   └── planner.ts                 # 핵심 데이터 타입 정의
├── contexts/             # React Context (AuthContext, ThemeContext)
├── middleware/           # Next.js 미들웨어 (CORS, Logging)
├── shared/               # 공유 타입 및 상수
└── utils/                # API 클라이언트 및 유틸리티
```

---

## 🏛️ Clean Architecture 계층

### **Domain 계층** (`src/domain/`)

- **엔티티**: Student, Subject, Session
- **값 객체**: StudentId, SubjectId, Color
- **리포지토리 인터페이스**: IStudentRepository, ISubjectRepository
- **도메인 서비스**: 비즈니스 로직

### **Application 계층** (`src/application/`)

- **서비스**: StudentApplicationService, SubjectApplicationService
- **유스케이스**: AddStudentUseCase, AddSubjectUseCase
- **매퍼**: 데이터 변환 로직

### **Infrastructure 계층** (`src/infrastructure/`)

- **리포지토리 구현**: SupabaseStudentRepository, SupabaseSubjectRepository
- **팩토리**: RepositoryFactory
- **외부 의존성**: Supabase 클라이언트

### **Presentation 계층** (`src/components/`, `src/app/`)

- **Atomic Design**: atoms → molecules → organisms
- **React 컴포넌트**: UI 렌더링 및 사용자 상호작용

---

## 🧩 Atomic Design 컴포넌트 구조

### **Atoms (원자 컴포넌트)** - `src/components/atoms/`

기본 UI 요소: `Button`, `Input`, `Label`, `AuthGuard`, `ErrorBoundary`, `LoginButton`, `StudentListItem`, `SubjectListItem`, `ThemeToggle`

### **Molecules (분자 컴포넌트)** - `src/components/molecules/`

기능 단위: `ConfirmModal`, `DropZone`, `PDFDownloadButton`, `SessionBlock`, `StudentInputSection`, `StudentList`, `SubjectInputSection`, `SubjectList`, `TimeTableRow`

**특징**:

- `SessionBlock`: 학생명 표시 규칙 (최대 3명 + "외 N명" 요약)
- 시간 겹침/충돌: `start1 < end2 && start2 < end1`
- 재배치 알고리즘: 이동 대상 세션의 목표 y 고정(anchor), 겹치는 세션들을 `y+1`로 이동

### **Organisms (유기체 컴포넌트)** - `src/components/organisms/`

복합 컴포넌트: `TimeTableGrid`, `StudentPanel`, `StudentsPageLayout`, `SubjectsPageLayout`, `AboutPageLayout`, `StudentManagementSection`, `SubjectManagementSection`

---

## 🔧 API Routes 구조

### **통합 데이터 API** (`/api/data`)

- **GET**: 전체 사용자 데이터 조회 (JSONB 기반)
- **PUT**: 전체 사용자 데이터 업데이트

### **개별 CRUD API**

- `/api/students` - 학생 관리 (GET, POST)
- `/api/students/[id]` - 개별 학생 (GET, PUT, DELETE)
- `/api/subjects` - 과목 관리 (GET, POST)
- `/api/subjects/[id]` - 개별 과목 (GET, PUT, DELETE)
- `/api/sessions` - 세션 관리 (GET, POST, PUT)
- `/api/sessions/[id]` - 개별 세션 (GET, PUT, DELETE)
- `/api/sessions/[id]/position` - 세션 위치 업데이트
- `/api/user-settings` - 사용자 설정
- `/api/auth` - 인증

**특징**: Service Role 클라이언트 사용 (RLS 우회), CORS 미들웨어 적용

---

## 🚀 localStorage 직접 조작 시스템

### **🎯 핵심 개념**

1. **즉시 반응**: 모든 CRUD 작업이 localStorage 직접 조작으로 0ms 응답
2. **스마트 동기화**: 30초 debounce로 서버와 자동 동기화 (최대 5분 안전장치)
3. **보안 강화**: 사용자 간 완전한 데이터 격리
4. **성능 최적화**: 불필요한 API 호출 제거
5. **스크롤 위치 보존**: 드래그앤드롭 후 스크롤 위치 자동 복원

### **🔧 핵심 파일**

- `src/lib/localStorageCrud.ts` - 통합 CRUD 시스템
- `src/lib/debouncedServerSync.ts` - 30초 debounce 서버 동기화 (최대 5분 안전장치)
- `src/hooks/useStudentManagementLocal.ts` - 학생 관리 (Local)
- `src/hooks/useSubjectManagementLocal.ts` - 과목 관리 (Local)
- `src/hooks/useIntegratedDataLocal.ts` - 통합 데이터 (Local)

### **🔄 동기화 메커니즘**

- **Debounce**: 변경 발생 시 30초 대기 후 동기화 (연속 변경 시 타이머 리셋)
- **안전장치**: 최대 5분 후 강제 동기화로 무한 연기 방지
- **자동 재시도**: 실패 시 최대 3회 재시도 (5초 간격)
- **이벤트 기반**: localStorage 변경 이벤트로 다른 탭 동기화

### **🆕 스크롤 위치 보존 시스템**

**핵심 기능**:

- 즉시 복원: DOM 마운트 시 저장된 스크롤 위치로 즉시 이동
- 깜빡임 방지: 09:00로 이동했다가 다시 돌아오는 현상 완전 제거
- 스마트 저장: 5분 이내의 스크롤 위치만 복원하여 데이터 신선도 보장
- 에러 안전: localStorage 오류 시에도 앱 정상 동작

**테스트 커버리지**:

- 유닛 테스트: `TimeTableGrid.scrollPosition.test.tsx`
- 통합 테스트: `scrollPositionManager.test.ts`
- E2E 테스트: `scroll-position-preservation.spec.ts`
- 저장소 테스트: `scrollPositionStorage.test.ts`

### **🔄 사용 방법**

```typescript
// ✅ 권장: Local 훅 사용 (localStorage 직접 조작)
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { useSubjectManagementLocal } from "../../hooks/useSubjectManagementLocal";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";

// ❌ 레거시: 기존 API 기반 훅 (사용 지양)
import { useStudentManagement } from "../../hooks/useStudentManagement";
```

---

## 🧪 테스트 전략

### **계층별 테스트**

1. **Domain 계층**: 순수한 단위 테스트 (외부 의존성 없음)

   - 목표: 100% 커버리지
   - 위치: `src/domain/__tests__/`

2. **Application 계층**: Mock을 사용한 통합 테스트

   - 목표: 90% 이상 커버리지
   - 위치: `src/application/__tests__/`

3. **Infrastructure 계층**: 실제 외부 의존성 테스트

   - 목표: 80% 이상 커버리지
   - 위치: `src/infrastructure/__tests__/`

4. **Presentation 계층**: 컴포넌트 & E2E 테스트
   - 목표: 70% 이상 커버리지
   - 위치: `src/components/__tests__/`, `tests/e2e/`

### **E2E 테스트 공용 설정**

**파일**: `tests/e2e/config/e2e-config.ts`

```typescript
export const E2E_CONFIG = {
  TEST_USER_ID: "05b3e2dd-3b64-4d45-b8fd-a0ce90c48391",
  TEST_EMAIL: "info365001.e2e.test@gmail.com",
  SUPABASE_TOKEN_KEY: "sb-your-project-id-auth-token",
  BASE_URL: "http://localhost:3000",
  TIMEOUTS: {
    AUTH_WAIT: 15000,
    PAGE_LOAD: 10000,
    STUDENT_ADD_WAIT: 5000,
    STUDENT_VISIBLE_WAIT: 15000,
    ELEMENT_WAIT: 5000,
  },
};
```

**핵심 함수**:

- `setupE2EAuth(page, customData?)`: 테스트용 인증 및 기본 데이터 설정
- `loadPageWithAuth(page, path)`: 인증 후 페이지 로드
- `createAuthData(userId, email)`: 테스트용 인증 데이터 생성
- `createDefaultData()`: 기본 테스트 데이터 생성

---

## 🚀 개발 워크플로우

### **1. 개발 중** (매번 커밋 시)

```bash
npm run pre-commit  # 1-3분 (타입체크, 린트, 핵심테스트, 빌드)
```

**포함 검증**:

- TypeScript 타입 체크
- ESLint 자동 수정 및 검사
- 핵심 비즈니스 로직 테스트 (Domain + Application)
- API Routes 테스트
- 컴포넌트 기본 테스트
- 빌드 가능 여부 확인

### **2. 기능 완성 후** (PR 생성 전)

```bash
npm run pre-pr  # 5-15분 (전체테스트, E2E, 통합테스트)
```

**포함 검증**:

- 커밋 전 검증 (기본 품질 보장)
- 전체 단위 테스트
- 실제 Supabase 통합 테스트
- 테스트 커버리지 측정
- 주요 E2E 시나리오 테스트
- 브라우저 호환성 테스트
- 프로덕션 빌드 검증
- 시스템 통합 테스트

### **3. 릴리스 준비** (배포 전)

```bash
npm run pre-deploy  # 15-30분 (보안, 성능, 완전검증)
```

**포함 검증**:

- PR 검증 (모든 이전 단계 포함)
- 전체 E2E 테스트 스위트
- 모든 브라우저 호환성 검증
- 성능 벤치마크 테스트
- 보안 취약점 검사 (npm audit)
- 환경 변수 및 설정 검증
- 데이터베이스 마이그레이션 상태 확인
- 최종 프로덕션 빌드 검증

### **서버 관리 명령어**

```bash
npm run server:start    # 개발 서버 시작 (포트 충돌 방지)
npm run server:stop     # 개발 서버 종료
npm run server:restart   # 개발 서버 재시작
npm run server:status    # 서버 상태 확인
npm run server:clean     # 포트 3000 정리
```

### **CI/CD 지원**

```bash
# 자동 진행 모드 활성화
export AUTO_PROCEED=Y
npm run pre-pr
npm run pre-deploy
```

---

## 📋 주요 명령어

### **테스트**

```bash
npm run test                # 단위 테스트
npm run test:watch          # 개발 중 감시 모드
npm run test:e2e            # E2E 테스트
npm run test:coverage       # 커버리지 측정
npm run test:system         # 시스템 테스트
```

### **개발**

```bash
npm run dev                 # 개발 서버 시작
npm run build               # 프로덕션 빌드
npm run type-check          # TypeScript 타입 체크
npm run lint:fix            # ESLint 자동 수정
```

---

## 🎯 AI 명령어 처리 시 주의사항

### **1. 아키텍처 준수**

- **Domain**: 비즈니스 로직, 엔티티, 값 객체 (외부 의존성 없음)
- **Application**: 유스케이스, 서비스, 매퍼 (Mock Repository 사용)
- **Infrastructure**: 외부 의존성, 리포지토리 구현 (실제 Supabase)
- **Presentation**: React 컴포넌트 (Atomic Design)

### **2. 코드 수정 시**

- **타입 안전성**: TypeScript 엄격 모드 준수
- **테스트**: 수정된 코드에 대한 테스트 작성/업데이트
- **스타일**: Tailwind CSS 사용, **인라인 스타일 금지**
- **Local 훅 우선**: 새로운 기능은 localStorage 직접 조작 방식 사용

### **3. 파일 구조 변경 시**

- **Clean Architecture** 계층 분리 유지
- **Atomic Design** 컴포넌트 분류 준수

### **4. 테스트 전략**

- **개발 중**: `pre-commit` 스크립트 사용 (빠른 검증)
- **기능 완성**: `pre-pr` 스크립트 사용 (통합 검증)
- **배포 준비**: `pre-deploy` 스크립트 사용 (완전 검증)

---

## 🔍 현재 프로젝트 상태

### **✅ 완료된 기능**

- 학생 관리 (CRUD)
- 과목 관리 (CRUD)
- 시간표 관리 (드래그앤드롭)
- Supabase 통합
- 3단계 테스트 전략 구현
- Clean Architecture 구조
- Atomic Design 컴포넌트
- localStorage 직접 조작 시스템
- 스크롤 위치 보존 시스템
- E2E 테스트 공용 설정 시스템

### **✅ 완벽한 현재 상태**

- **TypeScript 에러**: **0개** ✅
- **ESLint 에러**: **0개** ✅
- **테스트 통과**: **79/79개 (100%)** ✅
- **빌드 상태**: **100% 성공** ✅
- **코드 품질**: **최고 수준** ✅

---

## 🌳 Git 브랜치 관리 규칙

### **⚠️ 중요: 항상 Merge Commit 생성**

```bash
# ❌ Fast-forward 병합 (가지가 안 보임)
git merge feature-branch

# ✅ Merge commit 생성 (가지 구조 시각화)
git merge --no-ff feature-branch
```

### **브랜치 병합 워크플로우**

```bash
# 1. feature 브랜치에서 작업 완료
git checkout feature/new-feature
npm run pre-commit && npm run pre-pr  # 검증

# 2. develop으로 이동
git checkout develop

# 3. Merge commit으로 병합 (가지 구조 유지)
git merge --no-ff feature/new-feature

# 4. 병합된 브랜치 삭제
git branch -d feature/new-feature
```

### **브랜치 명명 규칙**

- `feature/기능명`: 새로운 기능 개발
- `fix/버그명`: 버그 수정
- `refactor/개선명`: 코드 리팩토링
- `test/테스트명`: 테스트 관련 작업

---

## 📚 주요 페이지 구조

### **Students 페이지** (`/students`)

- 학생 관리 (추가, 삭제, 선택)
- 기본 과목 자동 생성
- localStorage 데이터 저장/복원
- Clean Architecture 패턴 적용

### **Subjects 페이지** (`/subjects`)

- 과목 관리 (추가, 삭제, 편집, 선택)
- 색상 선택 기능
- 실시간 검색 기능
- Clean Architecture 패턴 적용

### **Schedule 페이지** (`/schedule`)

- 시간표 표시 (9:00-23:00, 30분 단위)
- 드래그 앤 드롭으로 수업 추가
- 수업 편집 및 삭제
- 학생별 필터링
- PDF 다운로드
- 충돌 해결 로직
- 스크롤 위치 보존

**페이지 분할 구조**:

- `_components/`: `ScheduleHeader`, `ScheduleGridSection`, `StudentPanelSection`, `PdfDownloadSection`
- `_hooks/`: `useEditModalState`, `useUiState`
- `_utils/`: `collisionHelpers`, `collisionQueries`, `dndHelpers`, `modalHandlers`, `editStudentHandlers`, `editSaveHandlers`

### **About 페이지** (`/about`)

- 프로젝트 소개
- 주요 기능 설명
- 사용 팁
- 저작권 정보

---

## 💡 핵심 개발 원칙

1. **항상 워크플로우 준수**: 변경사항 규모에 맞는 검증 스크립트 실행
2. **테스트 우선**: 기능 수정 시 관련 테스트 확인/업데이트
3. **아키텍처 일관성**: Clean Architecture 원칙 준수
4. **타입 안전성**: TypeScript 에러 해결 우선
5. **Local 훅 우선**: 새로운 기능은 localStorage 직접 조작 방식 사용
6. **인라인 스타일 금지**: 모든 스타일은 Tailwind CSS 클래스 사용

---

**마지막 업데이트**: 2025-01-29  
**프로젝트 버전**: v0.1.0  
**상태**: localStorage 직접 조작 시스템 완성 + 스크롤 위치 보존 시스템 완성 🚀
