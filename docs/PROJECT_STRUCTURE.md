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
│   │   │   ├── subjects/      # 과목 관리 API (개별 CRUD)
│   │   │   └── sessions/      # 세션 관리 API (개별 CRUD)
│   │   ├── students/          # 학생 페이지
│   │   ├── subjects/          # 과목 페이지
│   │   ├── schedule/          # 시간표 페이지
│   │   ├── about/             # 소개 페이지
│   │   ├── login/             # 로그인 페이지
│   │   ├── layout.tsx         # 루트 레이아웃 (네비게이션 포함)
│   │   ├── page.tsx           # 홈페이지
│   │   └── globals.css        # 전역 스타일
│   ├── components/            # Atomic Design 컴포넌트
│   │   ├── atoms/            # 원자 컴포넌트 (Button, Input, Label 등)
│   │   ├── molecules/        # 분자 컴포넌트 (FormField, SessionBlock 등)
│   │   └── organisms/        # 유기체 컴포넌트 (TimeTableGrid, StudentPanel 등)
│   ├── domain/               # Clean Architecture - Domain 계층
│   │   ├── entities/         # 도메인 엔티티 (Student, Subject, Session)
│   │   ├── value-objects/    # 값 객체 (StudentId, SubjectId, Color)
│   │   ├── repositories/     # 리포지토리 인터페이스
│   │   ├── services/         # 도메인 서비스
│   │   └── events/           # 도메인 이벤트
│   ├── application/          # Clean Architecture - Application 계층
│   │   ├── services/         # 애플리케이션 서비스
│   │   ├── use-cases/        # 유스케이스
│   │   ├── mappers/          # 데이터 매퍼
│   │   └── repositories/     # 리포지토리 인터페이스
│   ├── infrastructure/       # Clean Architecture - Infrastructure 계층
│   │   ├── repositories/     # Supabase 리포지토리 구현
│   │   ├── interfaces.ts     # 인터페이스 정의
│   │   └── RepositoryFactory.ts # 리포지토리 팩토리
│   ├── shared/               # 공유 타입 및 유틸리티
│   │   └── types/           # 공통 타입 정의
│   ├── hooks/                # 커스텀 훅
│   ├── contexts/             # React Context (ThemeContext)
│   ├── lib/                  # 유틸리티 함수
│   └── utils/                # API 클라이언트 및 유틸리티
├── docs/                     # 프로젝트 문서
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

## 📚 관련 문서

- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
- [컴포넌트 가이드](./COMPONENT_GUIDE.md)
- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
- [Supabase 가이드](./SUPABASE_JSONB_GUIDE.md)
- [문서 가이드](./README.md)

---

_이 문서는 프로젝트 구조의 전체적인 개요를 제공합니다. 자세한 개발 방법은 다른 가이드 문서를 참조하세요._
