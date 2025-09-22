# 테스트 전략 가이드

## 📋 개요

**Next.js + Atomic Design + Clean Architecture** 구조에서 테스트 코드를 작성하는 방법을 설명합니다. 각 계층별로 명확하게 구분하여 테스트하는 것이 핵심입니다.

## 🎯 테스트 전략: 계층별로 격리하여 테스트하기

클린 아키텍처의 가장 큰 장점은 계층이 분리되어 있어 테스트가 매우 쉽다는 점입니다. 우리는 각 계층의 책임에만 집중하여 테스트를 작성합니다.

### 📊 테스트 피라미드

```
        /\
       /  \
      / E2E \     ← 적은 수, 높은 신뢰도
     /______\
    /        \
   /통합 테스트\  ← 중간 수, 중간 신뢰도
  /__________\
 /            \
/   단위 테스트  \  ← 많은 수, 빠른 실행
/________________\
```

## 🏗️ 계층별 테스트 가이드

### 1. Domain 계층 테스트: 순수한 단위 테스트

**목표**: 엔티티(`Student.ts`, `Subject.ts` 등)의 핵심 비즈니스 로직이 외부 의존성 없이 정확하게 동작하는지 확인합니다.

**위치**: `src/domain/entities/__tests__/`, `src/domain/value-objects/__tests__/`

**도구**: `Vitest` 또는 `Jest`

**특징**:

- 외부 의존성 없음
- 빠른 실행 속도
- 높은 신뢰도
- 비즈니스 규칙 검증

**예시 파일**:

- `src/domain/entities/__tests__/Student.test.ts`
- `src/domain/entities/__tests__/Subject.test.ts`
- `src/domain/value-objects/__tests__/StudentId.test.ts`

**테스트 작성 예시**:

```typescript
import { describe, it, expect } from "vitest";
import { Subject } from "../Subject";

describe("Subject Entity", () => {
  it("과목 이름이 2글자 미만이면 에러를 던져야 한다", () => {
    expect(() => Subject.create("수", "#FF0000")).toThrow(
      "과목 이름은 2글자 이상이어야 합니다."
    );
  });

  it("create 팩토리 메서드로 유효한 과목을 생성해야 한다", () => {
    const subject = Subject.create("수학", "#FF0000");

    expect(subject.name).toBe("수학");
    expect(subject.color.value).toBe("#FF0000");
  });
});
```

### 2. Application 계층 테스트: Mock을 사용한 통합 테스트

**목표**: Use Case가 외부 의존성(Repository)과 올바르게 상호작용하며 애플리케이션 로직을 수행하는지 확인합니다.

**위치**: `src/application/use-cases/__tests__/`, `src/application/services/__tests__/`

**도구**: `Vitest` 또는 `Jest` (Mocking 기능 사용)

**특징**:

- Mock Repository 사용
- 애플리케이션 로직 검증
- 의존성 주입 테스트
- 비즈니스 플로우 검증

**예시 파일**:

- `src/application/use-cases/__tests__/AddStudentUseCase.test.ts`
- `src/application/services/__tests__/StudentApplicationService.test.ts`

**테스트 작성 예시**:

```typescript
import { describe, it, expect, vi } from "vitest";
import { AddStudentUseCase } from "../AddStudentUseCase";
import { IStudentRepository } from "../../domain/repositories";

const mockStudentRepository: IStudentRepository = {
  findAll: vi.fn(),
  save: vi.fn(),
};

describe("AddStudentUseCase", () => {
  it("중복된 학생 이름이 있을 때 에러를 던져야 한다", async () => {
    const useCase = new AddStudentUseCase(mockStudentRepository);
    const input = { name: "수학", color: "#FF0000" };

    vi.spyOn(mockStudentRepository, "findAll").mockResolvedValueOnce([
      Subject.create("수학", "#0000FF"),
    ]);

    await expect(useCase.execute(input)).rejects.toThrow(
      "이미 존재하는 과목 이름입니다."
    );
  });
});
```

### 3. Infrastructure 계층 테스트: 실제 외부 의존성 테스트

**목표**: Supabase 리포지토리가 실제 데이터베이스와 올바르게 상호작용하는지 확인합니다.

**위치**: `src/infrastructure/__tests__/`

**도구**: `Vitest` + 실제 Supabase 연결 (테스트 환경)

**특징**:

- 실제 외부 의존성 사용
- 통합 테스트
- 느린 실행 속도
- 실제 환경 검증

**예시 파일**:

- `src/infrastructure/__tests__/SupabaseStudentRepository.test.ts`

### 4. Presentation 계층 테스트: 컴포넌트 & E2E 테스트

**목표**: UI 컴포넌트가 올바르게 렌더링되고, 사용자의 행동에 따라 예상대로 반응하는지 확인합니다.

**위치**: `src/components/__tests__/`, `src/app/__tests__/`

**도구**: `React Testing Library`, `Playwright`

**특징**:

- 사용자 관점 테스트
- 컴포넌트 격리 테스트
- 상호작용 테스트
- 접근성 테스트

**예시 파일**:

- `src/components/atoms/__tests__/Button.test.tsx`
- `src/components/molecules/__tests__/StudentInputSection.test.tsx`
- `src/app/students/__tests__/page.test.tsx`

**테스트 작성 예시**:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../../Button";

describe("Button Component", () => {
  it("클릭 이벤트가 올바르게 처리되어야 한다", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>클릭하세요</Button>);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 5. API Routes 테스트: Next.js API 테스트

**목표**: Next.js API Routes가 올바른 HTTP 응답을 반환하는지 확인합니다.

**위치**: `src/app/api/__tests__/`

**도구**: `Vitest` + `@testing-library/jest-dom`

**특징**:

- HTTP 요청/응답 테스트
- API 계약 검증
- 에러 처리 테스트
- CORS 헤더 테스트

**예시 파일**:

- `src/app/api/students/__tests__/route.test.ts`

**테스트 작성 예시**:

```typescript
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../route";

describe("/api/students API Routes", () => {
  it("모든 학생을 성공적으로 조회해야 한다", async () => {
    const request = new NextRequest("http://localhost:3000/api/students");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

## 🧪 E2E 테스트: 사용자 시나리오 테스트

**목표**: 실제 사용자의 시나리오 전체를 테스트합니다.

**위치**: `tests/e2e/`

**도구**: `Playwright`

**특징**:

- 실제 브라우저에서 실행
- 전체 사용자 플로우 테스트
- 느린 실행 속도
- 높은 신뢰도

**예시 파일**:

- `tests/e2e/students.spec.ts`
- `tests/e2e/subjects.spec.ts`
- `tests/e2e/schedule.spec.ts`

**테스트 작성 예시**:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Students 페이지 E2E 테스트", () => {
  test("새로운 학생을 추가할 수 있어야 한다", async ({ page }) => {
    await page.goto("http://localhost:3000/students");

    await page.fill('input[placeholder*="학생 이름"]', "김철수");
    await page.click('button:has-text("추가")');

    await expect(page.locator('[data-testid="student-list"]')).toContainText(
      "김철수"
    );
  });
});
```

## 📊 테스트 커버리지 목표

### Domain 계층

- **목표**: 100%
- **중요도**: 매우 높음
- **이유**: 비즈니스 로직의 핵심
- **현재 상태**: ✅ 완료

### Application 계층

- **목표**: 90% 이상
- **중요도**: 높음
- **이유**: 애플리케이션 로직의 핵심
- **현재 상태**: ✅ 완료

### Infrastructure 계층

- **목표**: 80% 이상
- **중요도**: 중간
- **이유**: 외부 의존성으로 인한 제약
- **현재 상태**: ✅ 완료

### Presentation 계층

- **목표**: 70% 이상
- **중요도**: 중간
- **이유**: UI 변경이 빈번함
- **현재 상태**: ✅ 완료

### API Routes

- **목표**: 90% 이상
- **중요도**: 높음
- **이유**: API 계약의 안정성
- **현재 상태**: ✅ 완료

### E2E 테스트

- **목표**: 주요 사용자 시나리오 커버
- **중요도**: 높음
- **이유**: 실제 사용자 경험 검증
- **현재 상태**: ✅ 완료

## 📝 테스트 작성 가이드라인

### 1. 테스트 명명 규칙

```typescript
// 좋은 예
describe("Student Entity", () => {
  it("과목 이름이 2글자 미만이면 에러를 던져야 한다", () => {
    // ...
  });
});

// 나쁜 예
describe("Student", () => {
  it("test1", () => {
    // ...
  });
});
```

### 2. AAA 패턴 사용

```typescript
it("새로운 학생을 성공적으로 추가해야 한다", async () => {
  // Arrange (준비)
  const input = { name: "김철수" };
  mockStudentRepository.findAll.mockResolvedValue([]);

  // Act (실행)
  const result = await useCase.execute(input);

  // Assert (검증)
  expect(result.success).toBe(true);
  expect(result.data?.name).toBe("김철수");
});
```

### 3. Mock 사용 가이드

```typescript
// 좋은 예: 필요한 부분만 Mock
const mockRepository = {
  findAll: vi.fn(),
  save: vi.fn(),
};

// 나쁜 예: 전체 객체 Mock
vi.mock("../../RepositoryFactory", () => ({
  createStudentRepository: vi.fn(),
}));
```

### 4. 테스트 격리

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // 각 테스트 전에 Mock 초기화
});
```

## 🚨 주의사항

### 1. 테스트 순서 의존성 금지

```typescript
// 나쁜 예: 테스트 간 의존성
let globalCounter = 0;

it("첫 번째 테스트", () => {
  globalCounter++;
  expect(globalCounter).toBe(1);
});

it("두 번째 테스트", () => {
  globalCounter++;
  expect(globalCounter).toBe(2); // 첫 번째 테스트에 의존
});
```

### 2. 실제 외부 의존성 사용 금지

```typescript
// 나쁜 예: 실제 API 호출
it("실제 API 테스트", async () => {
  const response = await fetch("https://api.example.com/data");
  // ...
});

// 좋은 예: Mock 사용
it("API 테스트", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: "mock data" }),
  });
  // ...
});
```

### 3. 테스트 데이터 정리

```typescript
afterEach(() => {
  // 테스트 후 정리 작업
  localStorage.clear();
  sessionStorage.clear();
});
```

## 📚 관련 문서

- [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)
- [프로젝트 구조 가이드](./PROJECT_STRUCTURE.md)
- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
- [컴포넌트 가이드](./COMPONENT_GUIDE.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
- [문서 가이드](./README.md)

---

_이 문서는 테스트 전략과 계층별 테스트 방법을 설명합니다. 테스트 실행 방법은 [테스트 실행 명령어 가이드](./TESTING_COMMANDS.md)를 참조하세요._
