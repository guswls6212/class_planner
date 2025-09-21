# 프로젝트 구조 가이드

## 📋 개요

클래스 플래너 프로젝트의 **Next.js + Atomic Design + Clean Architecture** 구조를 설명합니다.

## 🏗️ 디렉토리 구조

```
class-planner/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 라우트 (Clean Architecture 통합)
│   │   │   ├── data/          # 통합 데이터 관리 API (JSONB 기반)
│   │   │   ├── students/      # 학생 관리 API (개별 CRUD)
│   │   │   │   └── [id]/      # 개별 학생 API
│   │   │   ├── subjects/      # 과목 관리 API (개별 CRUD)
│   │   │   │   └── [id]/      # 개별 과목 API
│   │   │   ├── sessions/      # 세션 관리 API (개별 CRUD)
│   │   │   │   └── [id]/      # 개별 세션 API
│   │   │   │       └── position/ # 세션 위치 업데이트 API
│   │   │   └── user-settings/ # 사용자 설정 API
│   │   ├── about/             # 소개 페이지
│   │   ├── login/             # 로그인 페이지
│   │   ├── schedule/          # 시간표 페이지
│   │   ├── students/          # 학생 페이지
│   │   ├── subjects/          # 과목 페이지
│   │   ├── layout.tsx         # 루트 레이아웃 (네비게이션 포함)
│   │   ├── page.tsx           # 홈페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # Atomic Design 컴포넌트
│   │   ├── atoms/            # 원자 컴포넌트 (Button, Input, Label 등)
│   │   ├── molecules/        # 분자 컴포넌트 (FormField, SessionBlock 등)
│   │   └── organisms/        # 유기체 컴포넌트 (TimeTableGrid, StudentPanel 등)
│   ├── domain/               # Clean Architecture - Domain 계층
│   │   ├── entities/         # 도메인 엔티티 (Student, Subject)
│   │   ├── value-objects/    # 값 객체 (StudentId, SubjectId, Color)
│   │   ├── repositories/     # 리포지토리 인터페이스
│   │   └── services/         # 도메인 서비스
│   ├── application/          # Clean Architecture - Application 계층
│   │   ├── services/         # 애플리케이션 서비스
│   │   ├── use-cases/        # 유스케이스
│   │   └── mappers/          # 데이터 매퍼
│   ├── infrastructure/       # Clean Architecture - Infrastructure 계층
│   │   ├── config/           # 설정 파일
│   │   ├── container/        # DI 컨테이너 및 레지스트리
│   │   ├── factories/        # 리포지토리 팩토리들
│   │   ├── repositories/     # Supabase 리포지토리 구현
│   │   ├── interfaces.ts     # 인터페이스 정의
│   │   └── RepositoryFactory.ts # 메인 리포지토리 팩토리
│   ├── shared/               # 공유 타입 및 유틸리티
│   │   ├── constants/        # 공통 상수
│   │   └── types/           # 공통 타입 정의
│   ├── hooks/                # 커스텀 훅
│   │   ├── useStudentManagementLocal.ts  # 🆕 localStorage 직접 조작 학생 관리
│   │   ├── useSubjectManagementLocal.ts  # 🆕 localStorage 직접 조작 과목 관리
│   │   ├── useIntegratedDataLocal.ts     # 🆕 localStorage 직접 조작 통합 데이터
│   │   ├── useGlobalDataInitialization.ts # 🔄 스마트 초기화 (보안 강화)
│   │   ├── useCachedData.ts              # 캐시 우선 데이터 관리 (레거시)
│   │   ├── useStudentManagement.ts       # 기존 학생 관리 (레거시)
│   │   ├── useSubjectManagement.ts       # 기존 과목 관리 (레거시)
│   │   ├── useIntegratedData.ts          # 기존 통합 데이터 (레거시)
│   │   └── [기타 훅들...]               # 기타 유틸리티 훅들
│   ├── lib/                  # 🆕 핵심 유틸리티 라이브러리
│   │   ├── localStorageCrud.ts        # localStorage 직접 조작 CRUD 시스템
│   │   ├── debouncedServerSync.ts     # 🔄 리셋 디바운스 서버 동기화 (30초+5분 안전장치)
│   │   ├── dataSyncUtils.ts           # 데이터 동기화 유틸리티
│   │   ├── sessionCollisionUtils.ts   # 세션 충돌 감지 및 해결
│   │   ├── logoutUtils.ts             # 보안 로그아웃 (사용자 데이터 완전 삭제)
│   │   ├── debugUtils.ts              # 디버깅 유틸리티
│   │   ├── logger.ts                  # Vercel 최적화 로깅 시스템
│   │   ├── errorTracker.ts            # 에러 추적 및 모니터링
│   │   └── planner.ts                 # 핵심 데이터 타입 정의
│   ├── contexts/             # React Context (ThemeContext)
│   ├── middleware/           # Next.js 미들웨어
│   ├── types/                # 레거시 타입 정의
│   ├── utils/                # API 클라이언트 및 유틸리티
│   └── setupTests.ts         # 테스트 설정
├── docs/                     # 프로젝트 문서
├── scripts/                  # 개발 도구 스크립트
│   ├── clear-localstorage.js    # localStorage 정리 도구
│   ├── detailed-unused-analysis.sh # 상세 미사용 파일 분석
│   ├── find-unused-files.sh     # 미사용 파일 탐지 도구
│   ├── find-unused-src-files.sh # src 폴더 미사용 파일 탐지
│   ├── performance-monitor.js   # 성능 모니터링 도구
│   ├── system-test.js          # 시스템 테스트 자동화
│   ├── pre-commit-check.sh     # 커밋 전 검증 (1-3분)
│   ├── pre-pr-check.sh         # PR 전 통합 검증 (5-15분)
│   ├── pre-deploy-check.sh     # 배포 전 완전 검증 (15-30분)
│   └── protection-check.sh     # 기존 기능 보호 검증
├── migration/                # 데이터베이스 마이그레이션
│   ├── migrations/           # SQL 마이그레이션 파일들
│   ├── run-migration.sh      # 마이그레이션 실행 스크립트
│   └── MIGRATION_GUIDE.md    # 마이그레이션 가이드
├── tests/                    # 테스트 파일들
│   ├── e2e/                 # End-to-End 테스트
│   └── integration/         # 통합 테스트
├── public/                   # 정적 파일
├── .env.local               # 환경 변수 (Next.js 방식)
├── next.config.ts           # Next.js 설정
├── package.json             # 프로젝트 의존성
├── tsconfig.json            # TypeScript 설정
└── vitest.config.ts         # 테스트 설정
```

## 🎯 주요 페이지 구조

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

### **About 페이지** (`/about`)

- 프로젝트 소개
- 주요 기능 설명
- 사용 팁
- 저작권 정보

## 🏛️ Clean Architecture 계층

### **Domain 계층**

- **엔티티**: Student, Subject, Session
- **값 객체**: StudentId, SubjectId, Color
- **리포지토리 인터페이스**: IStudentRepository, ISubjectRepository
- **도메인 서비스**: 비즈니스 로직

### **Application 계층**

- **서비스**: StudentApplicationService, SubjectApplicationService
- **유스케이스**: AddStudentUseCase, AddSubjectUseCase
- **매퍼**: 데이터 변환 로직

### **Infrastructure 계층**

- **리포지토리 구현**: SupabaseStudentRepository, SupabaseSubjectRepository
- **팩토리**: RepositoryFactory
- **외부 의존성**: Supabase 클라이언트

## 🧩 Atomic Design 구조

### **Atoms (원자 컴포넌트)**

- Button, Input, Label, Typography
- 가장 기본적인 UI 요소
- 재사용 가능한 최소 단위

### **Molecules (분자 컴포넌트)**

- SessionBlock, TimeTableRow, StudentInputSection
- Atoms를 조합한 단위
- 특정 기능을 담당

### **Organisms (유기체 컴포넌트)**

- TimeTableGrid, StudentPanel, StudentsPageLayout
- Molecules를 조합한 복합 컴포넌트
- 페이지의 주요 섹션을 담당

## 🔧 API Routes 구조

### **통합 데이터 API** (`/api/data`)

- JSONB 기반 통합 데이터 관리
- GET: 전체 사용자 데이터 조회
- PUT: 전체 사용자 데이터 업데이트

### **개별 CRUD API**

- `/api/students` - 학생 관리 API
- `/api/subjects` - 과목 관리 API
- `/api/sessions` - 세션 관리 API

## 🛠️ 개발 도구 스크립트 (scripts/)

### **유틸리티 스크립트**

| 파일                     | 목적                      | 사용 빈도 | 명령어                                |
| ------------------------ | ------------------------- | --------- | ------------------------------------- |
| `clear-localstorage.js`  | 개발 중 localStorage 정리 | 가끔      | 브라우저 콘솔에서 실행                |
| `find-unused-files.sh`   | 미사용 파일 탐지          | 가끔      | `./scripts/find-unused-files.sh`      |
| `performance-monitor.js` | 성능 모니터링             | 가끔      | `node scripts/performance-monitor.js` |
| `system-test.js`         | 시스템 테스트 자동화      | 정기적    | `npm run test:system`                 |

### **3단계 검증 스크립트**

| 스크립트              | 용도                | 소요시간 | 실행 시점          |
| --------------------- | ------------------- | -------- | ------------------ |
| `pre-commit-check.sh` | 커밋 전 필수 검증   | 1-3분    | 매번 커밋 시       |
| `pre-pr-check.sh`     | PR 전 통합 검증     | 5-15분   | PR 생성 전         |
| `pre-deploy-check.sh` | 배포 전 완전 검증   | 15-30분  | 릴리스 전          |
| `protection-check.sh` | 기존 기능 보호 검증 | 3-5분    | 레거시 호환성 확인 |

### **검증 스크립트 사용법**

```bash
# 개발 중 (매번)
npm run pre-commit

# 기능 완성 후 (매일)
npm run pre-pr

# 릴리스 준비 (릴리스할 시)
npm run pre-deploy

# 기존 기능 보호 (필요 시)
npm run prepare-commit
```

## 🚀 **NEW** - localStorage 직접 조작 시스템 (2025-09-21 구현)

### **📊 시스템 아키텍처**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   사용자 액션   │ -> │  localStorage   │ -> │   즉시 UI 반영  │
│  (ADD/UPDATE)   │    │   직접 조작     │    │    (⚡ 0ms)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ debounce 서버   │
                       │ 동기화 (1분마다) │
                       └─────────────────┘
```

### **🔄 데이터 흐름**

1. **READ**: localStorage → 즉시 UI 표시 ⚡
2. **WRITE**: localStorage 즉시 업데이트 → UI 반영 → 1분 후 서버 동기화
3. **초기화**: 스마트 로딩 (캐시 우선, 필요시에만 서버 호출)
4. **보안**: 로그아웃 시 완전한 데이터 삭제, 사용자 간 격리

### **🛡️ 보안 특징**

- **사용자 간 데이터 완전 격리**
- **로그아웃 시 민감 데이터 완전 삭제**
- **UI 설정 보존** (테마, 언어 등)
- **다른 사용자 로그인 시 이전 데이터 자동 삭제**

### **⚡ 성능 특징**

- **즉시 반응**: localStorage 직접 조작으로 0ms 응답
- **효율적 동기화**: debounce로 서버 부하 최소화
- **스마트 로딩**: 불필요한 API 호출 제거
- **메모리 최적화**: 통합 데이터 구조로 메모리 효율성

---

## 📚 관련 문서

- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
- [컴포넌트 가이드](./COMPONENT_GUIDE.md)
- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
- [Supabase 가이드](./SUPABASE_JSONB_GUIDE.md)
- [문서 가이드](./README.md)
- [Future TODO](./FUTURE_TODO.md) - 🆕 다음 단계 개선 계획

---

_이 문서는 프로젝트 구조의 전체적인 개요를 제공합니다. 자세한 개발 방법은 다른 가이드 문서를 참조하세요._
