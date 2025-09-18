# 테스트 실행 명령어 가이드

## 📋 개요

클래스 플래너 프로젝트의 테스트 실행 명령어와 설정 방법을 설명합니다.

## 🚀 테스트 실행 명령어

### 단위 테스트

```bash
# 전체 테스트 실행
npm run test

# 특정 테스트 실행
npm run test -- Student.test.ts

# Watch 모드로 테스트 실행
npm run test:watch

# 테스트 커버리지
npm run test:coverage

# 테스트 UI 실행
npm run test:ui
```

### 계층별 테스트

```bash
# Domain 계층 테스트만 실행
npm run test -- src/domain/

# Application 계층 테스트만 실행
npm run test -- src/application/

# Infrastructure 계층 테스트만 실행
npm run test -- src/infrastructure/

# Presentation 계층 테스트만 실행
npm run test -- src/components/

# API Routes 테스트만 실행
npm run test -- src/app/api/
```

### E2E 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# E2E 테스트 UI 실행
npm run test:e2e:ui

# 헤드리스 모드로 E2E 테스트 실행
npm run test:e2e:headed

# 특정 페이지 E2E 테스트
npm run test:e2e -- students.spec.ts

# E2E 테스트 브라우저 설치
npx playwright install
```

### 시스템 테스트

```bash
# 시스템 테스트 실행 (브라우저 표시)
npm run test:system

# 시스템 테스트 실행 (헤드리스 모드)
npm run test:system:headless
```

## 🔧 테스트 설정

### Vitest 설정 (`vitest.config.ts`)

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@domain": path.resolve(__dirname, "./src/domain"),
      "@application": path.resolve(__dirname, "./src/application"),
      "@infrastructure": path.resolve(__dirname, "./src/infrastructure"),
    },
  },
});
```

### Playwright 설정 (`playwright.config.ts`)

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

## 📊 테스트 결과 해석

### 단위 테스트 결과

```bash
✓ Domain 계층 테스트: 15/15 통과
✓ Application 계층 테스트: 12/12 통과
✓ Infrastructure 계층 테스트: 8/8 통과
✓ Presentation 계층 테스트: 50+/50+ 통과
✓ API Routes 테스트: 30/30 통과

총 테스트: 200+/200+ 통과 (100%)
```

### 커버리지 결과

```bash
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   95.2  |   89.1   |   92.3  |   94.8  |
```

### E2E 테스트 결과

```bash
✓ students.spec.ts: 5/5 통과
✓ subjects.spec.ts: 4/4 통과
✓ schedule.spec.ts: 6/6 통과
✓ browser-compatibility.spec.ts: 3/3 통과
✓ real-user-scenarios.spec.ts: 7/7 통과

총 E2E 테스트: 25/25 통과 (100%)
```

## 🛠️ 테스트 환경 설정

### 환경 변수 설정

테스트를 실행하기 위해서는 환경 변수가 필요합니다:

```bash
# .env.local 파일에 추가
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 테스트 데이터베이스 설정

```bash
# 테스트용 Supabase 프로젝트 설정
# 1. Supabase 대시보드에서 새 프로젝트 생성
# 2. 환경 변수에 테스트 프로젝트 정보 입력
# 3. 테스트 실행
```

## 🚨 문제 해결

### 일반적인 문제들

#### 테스트 실행 실패

```bash
# 해결 방법
npm install
npm run test:coverage
```

#### E2E 테스트 타임아웃

```bash
# 해결 방법
npx playwright install
npm run test:e2e -- --timeout=60000
```

#### 브라우저 설치 문제

```bash
# 해결 방법
npx playwright install --force
```

### 디버깅 팁

1. **개별 테스트 실행**: 특정 테스트만 실행하여 문제 격리
2. **Watch 모드 사용**: 코드 변경 시 자동으로 테스트 실행
3. **UI 모드 사용**: 테스트 결과를 시각적으로 확인
4. **로그 확인**: 테스트 실행 중 콘솔 로그 확인

## 📚 관련 문서

- [테스트 전략 가이드](./TESTING_STRATEGY.md)
- [프로젝트 구조 가이드](./PROJECT_STRUCTURE.md)
- [개발 워크플로우 가이드](./DEVELOPMENT_WORKFLOW.md)
- [컴포넌트 가이드](./COMPONENT_GUIDE.md)
- [환경 설정 가이드](./ENVIRONMENT_SETUP.md)
- [문서 가이드](./README.md)

---

_이 문서는 테스트 실행 명령어와 설정 방법을 설명합니다. 테스트 전략에 대한 자세한 내용은 [테스트 전략 가이드](./TESTING_STRATEGY.md)를 참조하세요._
