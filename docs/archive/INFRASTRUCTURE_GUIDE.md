> **ARCHIVED:** 이 문서는 최신이 아닙니다. 현행 문서는 [CLAUDE.md](../../CLAUDE.md)를 참조하세요.

# Infrastructure 계층 - 새로운 Repository 구조

## 🎯 개요

클린 아키텍처 원칙에 따라 Repository 구조를 개선했습니다. 환경별 설정 분리, 의존성 주입, 단일 책임 원칙을 적용했습니다.

## 🏗️ 새로운 구조

```
src/infrastructure/
├── factories/           # 각 Repository별 Factory
│   ├── StudentRepositoryFactory.ts
│   ├── SubjectRepositoryFactory.ts
│   ├── SessionRepositoryFactory.ts
│   └── EnrollmentRepositoryFactory.ts
├── config/             # 환경별 설정
│   ├── RepositoryConfig.ts
│   └── EnvironmentConfig.ts
├── container/          # Repository 레지스트리
│   └── RepositoryRegistry.ts
├── repositories/       # Repository 구현체
│   ├── SupabaseStudentRepository.ts
│   └── SupabaseSubjectRepository.ts
└── index.ts              # 공개 API 진입점
```

## 🚀 사용 방법

### 1. 기본 사용법 (권장)

```typescript
import { RepositoryRegistry } from "@/infrastructure";

// 앱 시작 시 Repository 등록
RepositoryRegistry.registerAll();

// Repository 사용
const studentRepo = RepositoryRegistry.getStudentRepository();
const students = await studentRepo.findAll();
```

### 2. 개별 Factory 사용

```typescript
import { StudentRepositoryFactory } from "@/infrastructure";

// 환경에 따라 적절한 구현체 자동 선택
const studentRepo = StudentRepositoryFactory.create();
const students = await studentRepo.findAll();
```

### 3. 테스트 환경

```typescript
import { RepositoryRegistry } from "@/infrastructure";

// 테스트용 Repository 등록
RepositoryRegistry.registerForTest();

// 모든 Repository가 Mock 구현체로 등록됨
const studentRepo = RepositoryRegistry.getStudentRepository();
```

### 4. 하위 호환성 (기존 코드)

```typescript
import { createStudentRepository } from "@/infrastructure";

// 기존 코드와 동일하게 사용 가능
const studentRepo = createStudentRepository();
const students = await studentRepo.findAll();
```

## 🌍 환경별 설정

### 개발 환경 (development)

- StudentRepository: Supabase
- SubjectRepository: Supabase
- SessionRepository: Mock
- EnrollmentRepository: Mock

### 테스트 환경 (test)

- 모든 Repository: Mock

### 프로덕션 환경 (production)

- StudentRepository: Supabase
- SubjectRepository: Supabase
- SessionRepository: Mock
- EnrollmentRepository: Mock

## 🔧 Repository 레지스트리

`DIContainer`는 제거되었습니다. Repository 등록 및 조회는 `RepositoryRegistry`를 통해 직접 수행합니다. (위의 기본 사용법 및 테스트 환경 섹션 참조)

## 📊 장점

1. **단일 책임 원칙**: 각 Factory는 하나의 Repository만 담당
2. **환경별 설정**: 개발/테스트/프로덕션 환경 구분
3. **의존성 주입**: 느슨한 결합과 테스트 용이성
4. **확장성**: 새로운 Repository 추가가 쉬움
5. **하위 호환성**: 기존 코드 수정 없이 사용 가능

## 🧪 테스트

```typescript
import { RepositoryRegistry } from "@/infrastructure";

describe("StudentService", () => {
  beforeEach(() => {
    RepositoryRegistry.registerForTest();
  });

  afterEach(() => {
    RepositoryRegistry.clear();
  });

  it("should get students", async () => {
    const studentRepo = RepositoryRegistry.getStudentRepository();
    const students = await studentRepo.findAll();
    expect(students).toHaveLength(2);
  });
});
```

## 🔄 마이그레이션 가이드

### 기존 코드

```typescript
import { createStudentRepository } from "@/infrastructure";

const studentRepo = createStudentRepository();
```

### 새로운 코드 (권장)

```typescript
import { RepositoryRegistry } from "@/infrastructure";

RepositoryRegistry.registerAll();
const studentRepo = RepositoryRegistry.getStudentRepository();
```

### 또는 개별 Factory 사용

```typescript
import { StudentRepositoryFactory } from "@/infrastructure";

const studentRepo = StudentRepositoryFactory.create();
```

