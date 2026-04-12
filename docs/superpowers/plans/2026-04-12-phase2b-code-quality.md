# Phase 2B — 코드 품질 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인프라 과추상화 제거, 데드코드 정리, 거대 파일 분할로 코드베이스 유지보수성 향상

**Architecture:** Bottom-up 순서 (인프라 → 데드코드 → 파일 분할). 각 태스크는 독립적이며 타입체크 + 유닛 테스트로 검증 가능. UI 변경 태스크(Task 7~8)는 Playwright MCP 브라우저 검증 필수.

**Tech Stack:** Next.js 15, TypeScript strict, Vitest, React 19, Tailwind CSS 4

---

## File Map

| 파일 | 액션 | 태스크 |
|------|------|--------|
| `src/infrastructure/container/RepositoryRegistry.ts` | 수정 (DIContainer 로직 흡수) | Task 1 |
| `src/infrastructure/container/DIContainer.ts` | 삭제 | Task 2 |
| `src/infrastructure/container/RepositoryInitializer.ts` | 삭제 | Task 2 |
| `src/infrastructure/RepositoryFactory.ts` | 삭제 | Task 2 |
| `src/infrastructure/__tests__/RepositoryFactory.test.ts` | 삭제 | Task 2 |
| `src/infrastructure/index.ts` | 수정 | Task 2 |
| `src/infrastructure/__tests__/RepositoryRegistry.test.ts` | 수정 | Task 3 |
| `src/application/services/__tests__/ServiceFactory.test.ts` | 수정 | Task 3 |
| `src/contexts/AuthContext.tsx` | 삭제 | Task 4 |
| `src/components/atoms/E2ETestAuthGuard.tsx` | 삭제 | Task 4 |
| `src/lib/errorTracker.ts` | 수정 | Task 5 |
| `src/components/atoms/AuthGuard.tsx` | 수정 | Task 5 |
| `src/hooks/usePerformanceMonitoring.ts` | 수정 | Task 5 |
| `src/lib/pdf-utils.ts` | 수정 | Task 5 |
| `src/components/atoms/LoginButton.tsx` | 이동 → `organisms/LoginButton.tsx` | Task 6 |
| `src/app/layout.tsx` | 수정 (import 경로) | Task 6 |
| `src/components/organisms/about/FeatureCard.tsx` | 신규 | Task 7 |
| `src/components/organisms/about/FeatureDetail.tsx` | 신규 | Task 7 |
| `src/components/organisms/about/HeroSection.tsx` | 신규 | Task 7 |
| `src/components/organisms/AboutPageLayout.tsx` | 수정 (분할 후 ~150줄) | Task 7 |
| `src/app/schedule/page.tsx` | 수정 (dead repositionSessions 삭제) | Task 8 |
| `src/lib/pdf-utils.ts` | 수정 (중복 함수 제거) | Task 9 |

---

## Task 1: RepositoryRegistry — DIContainer 로직 흡수

**Files:**
- Modify: `src/infrastructure/container/RepositoryRegistry.ts`

DIContainer의 Map 기반 lazy singleton 로직을 RepositoryRegistry에 직접 인라인한다.
외부 API는 그대로 유지 (getStudentRepository, isRegistered, clear, registerAll, registerForTest).

- [ ] **Step 1: RepositoryRegistry.ts 전체 교체**

`src/infrastructure/container/RepositoryRegistry.ts`를 다음으로 교체:

```typescript
import { logger } from "../../lib/logger";
import { RepositoryConfigFactory } from "../config/RepositoryConfig";
import type {
  EnrollmentRepository,
  SessionRepository,
  StudentRepository,
  SubjectRepository,
} from "../interfaces";

export const REPOSITORY_KEYS = {
  STUDENT_REPOSITORY: "studentRepository",
  SUBJECT_REPOSITORY: "subjectRepository",
  SESSION_REPOSITORY: "sessionRepository",
  ENROLLMENT_REPOSITORY: "enrollmentRepository",
} as const;

type RepositoryKey = (typeof REPOSITORY_KEYS)[keyof typeof REPOSITORY_KEYS];

/**
 * Repository 등록·조회 클래스
 * 이전 DIContainer 추상화를 제거하고 Map 기반 lazy singleton을 직접 관리한다.
 */
export class RepositoryRegistry {
  private static factories = new Map<RepositoryKey, () => unknown>();
  private static instances = new Map<RepositoryKey, unknown>();

  // -------------------------------------------------------
  // 내부 헬퍼
  // -------------------------------------------------------
  private static register(key: RepositoryKey, factory: () => unknown): void {
    this.factories.set(key, factory);
    logger.debug("Repository 등록", { key });
  }

  private static resolve<T>(key: RepositoryKey): T {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(
        `Repository ${key} not found. 등록된 키: ${[...this.factories.keys()].join(", ")}`
      );
    }
    const instance = factory() as T;
    this.instances.set(key, instance);
    return instance;
  }

  // -------------------------------------------------------
  // 등록
  // -------------------------------------------------------
  static registerAll(): void {
    logger.info("📋 Repository 등록 시작...");
    const config = RepositoryConfigFactory.create();
    this.register(REPOSITORY_KEYS.STUDENT_REPOSITORY, () => config.studentRepository);
    this.register(REPOSITORY_KEYS.SUBJECT_REPOSITORY, () => config.subjectRepository);
    this.register(REPOSITORY_KEYS.SESSION_REPOSITORY, () => config.sessionRepository);
    this.register(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY, () => config.enrollmentRepository);
    logger.info("✅ 모든 Repository 등록 완료");
  }

  static registerForTest(): void {
    logger.info("🧪 테스트용 Repository 등록 시작...");
    const config = RepositoryConfigFactory.createForTest();
    this.register(REPOSITORY_KEYS.STUDENT_REPOSITORY, () => config.studentRepository);
    this.register(REPOSITORY_KEYS.SUBJECT_REPOSITORY, () => config.subjectRepository);
    this.register(REPOSITORY_KEYS.SESSION_REPOSITORY, () => config.sessionRepository);
    this.register(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY, () => config.enrollmentRepository);
    logger.info("✅ 테스트용 Repository 등록 완료");
  }

  // -------------------------------------------------------
  // 조회
  // -------------------------------------------------------
  private static autoRegisterIfNeeded(): void {
    if (!this.isRegistered()) {
      logger.info("⚠️ Repository가 등록되지 않음. 자동 등록 시도...");
      this.registerAll();
    }
  }

  static getStudentRepository(): StudentRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<StudentRepository>(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  static getSubjectRepository(): SubjectRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<SubjectRepository>(REPOSITORY_KEYS.SUBJECT_REPOSITORY);
  }

  static getSessionRepository(): SessionRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<SessionRepository>(REPOSITORY_KEYS.SESSION_REPOSITORY);
  }

  static getEnrollmentRepository(): EnrollmentRepository {
    this.autoRegisterIfNeeded();
    return this.resolve<EnrollmentRepository>(REPOSITORY_KEYS.ENROLLMENT_REPOSITORY);
  }

  static getAllRepositories() {
    return {
      studentRepository: this.getStudentRepository(),
      subjectRepository: this.getSubjectRepository(),
      sessionRepository: this.getSessionRepository(),
      enrollmentRepository: this.getEnrollmentRepository(),
    };
  }

  // -------------------------------------------------------
  // 상태
  // -------------------------------------------------------
  static isRegistered(): boolean {
    return this.factories.has(REPOSITORY_KEYS.STUDENT_REPOSITORY);
  }

  static clear(): void {
    this.factories.clear();
    this.instances.clear();
    logger.info("🧹 Repository 등록 초기화 완료");
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run type-check
```

Expected: 에러 없음 (DIContainer import가 다른 곳에 없으므로)

---

## Task 2: 사용 안 하는 인프라 파일 삭제 + index.ts 수정

**Files:**
- Delete: `src/infrastructure/container/DIContainer.ts`
- Delete: `src/infrastructure/container/RepositoryInitializer.ts`
- Delete: `src/infrastructure/RepositoryFactory.ts`
- Delete: `src/infrastructure/__tests__/RepositoryFactory.test.ts`
- Modify: `src/infrastructure/index.ts`

- [ ] **Step 1: 4개 파일 삭제**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
rm src/infrastructure/container/DIContainer.ts
rm src/infrastructure/container/RepositoryInitializer.ts
rm src/infrastructure/RepositoryFactory.ts
rm src/infrastructure/__tests__/RepositoryFactory.test.ts
```

- [ ] **Step 2: `src/infrastructure/index.ts` 교체**

```typescript
/**
 * Infrastructure 계층 진입점
 */

// 설정
export type { RepositoryConfig } from "./config/RepositoryConfig";
export { RepositoryConfigFactory } from "./config/RepositoryConfig";

// Registry (ServiceFactory의 진입점)
export { REPOSITORY_KEYS, RepositoryRegistry } from "./container/RepositoryRegistry";

// 개별 Factory (RepositoryConfig 내부에서 사용)
export { EnrollmentRepositoryFactory } from "./factories/EnrollmentRepositoryFactory";
export { SessionRepositoryFactory } from "./factories/SessionRepositoryFactory";
export { StudentRepositoryFactory } from "./factories/StudentRepositoryFactory";
export { SubjectRepositoryFactory } from "./factories/SubjectRepositoryFactory";

// 인터페이스
export * from "./interfaces";

// Repository 구현체
export { SupabaseStudentRepository } from "./repositories/SupabaseStudentRepository";
export { SupabaseSubjectRepository } from "./repositories/SupabaseSubjectRepository";
```

- [ ] **Step 3: 타입 체크 + 유닛 테스트**

```bash
npm run type-check
npm run test -- --reporter=verbose 2>&1 | head -50
```

Expected: 타입 에러 없음. RepositoryFactory 관련 테스트가 사라졌으므로 테스트 수가 줄어있어야 함.

- [ ] **Step 4: 커밋**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git add -A
git commit -m "refactor(infra): inline DIContainer into RepositoryRegistry, remove dead abstractions

Removes DIContainer, RepositoryInitializer, RepositoryFactory (deprecated shim).
RepositoryRegistry now manages Map<key, factory> + Map<key, instance> directly.
External API unchanged: getStudentRepository/isRegistered/clear/registerAll."
```

---

## Task 3: 영향받은 테스트 수정

**Files:**
- Modify: `src/infrastructure/__tests__/RepositoryRegistry.test.ts`
- Modify: `src/application/services/__tests__/ServiceFactory.test.ts`

- [ ] **Step 1: RepositoryRegistry.test.ts 수정**

`src/infrastructure/__tests__/RepositoryRegistry.test.ts`의 `beforeEach`에서 `RepositoryInitializer.reset()` 제거:

```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RepositoryRegistry } from "../container/RepositoryRegistry";

describe("RepositoryRegistry", () => {
  beforeEach(() => {
    RepositoryRegistry.clear();
  });

  afterEach(() => {
    RepositoryRegistry.clear();
  });

  // 나머지 테스트는 그대로 유지
```

- [ ] **Step 2: ServiceFactory.test.ts 수정**

`src/application/services/__tests__/ServiceFactory.test.ts`에서 `RepositoryInitializer` import 제거 후 `RepositoryRegistry`로 교체:

```typescript
import { RepositoryRegistry } from "@/infrastructure";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ServiceFactory } from "../ServiceFactory";

describe("ServiceFactory", () => {
  beforeEach(() => {
    RepositoryRegistry.clear();
  });

  afterEach(() => {
    RepositoryRegistry.clear();
  });

  // 나머지 테스트는 그대로 유지
```

- [ ] **Step 3: 테스트 실행**

```bash
npm run test -- src/infrastructure/__tests__/RepositoryRegistry.test.ts src/application/services/__tests__/ServiceFactory.test.ts --reporter=verbose
```

Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add src/infrastructure/__tests__/RepositoryRegistry.test.ts \
        src/application/services/__tests__/ServiceFactory.test.ts
git commit -m "test(infra): replace RepositoryInitializer.reset() with RepositoryRegistry.clear()"
```

---

## Task 4: Dead code 파일 삭제 (AuthContext, E2ETestAuthGuard)

**Files:**
- Delete: `src/contexts/AuthContext.tsx`
- Delete: `src/components/atoms/E2ETestAuthGuard.tsx`

두 파일은 서로 연결되어 있고 src/ 내 어디서도 import되지 않는다 (grep 확인).

- [ ] **Step 1: import 없음 재확인**

```bash
grep -r "AuthContext\|E2ETestAuthGuard" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "AuthContext.tsx" | grep -v "E2ETestAuthGuard.tsx"
```

Expected: 출력 없음

- [ ] **Step 2: 파일 삭제**

```bash
rm src/contexts/AuthContext.tsx
rm src/components/atoms/E2ETestAuthGuard.tsx
```

- [ ] **Step 3: 타입 체크**

```bash
npm run type-check
```

Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: delete unused AuthContext and E2ETestAuthGuard

Both files have zero imports in src/. AuthContext was only consumed by
E2ETestAuthGuard, which itself was never used."
```

---

## Task 5: `as any` 제거 (4개 파일)

**Files:**
- Modify: `src/lib/errorTracker.ts` (2개)
- Modify: `src/components/atoms/AuthGuard.tsx` (1개)
- Modify: `src/hooks/usePerformanceMonitoring.ts` (1개)
- Modify: `src/lib/pdf-utils.ts` (6개 → declare global)

### 5-1. errorTracker.ts (line 131-132)

- [ ] **Step 1: errorTracker.ts 수정**

`src/lib/errorTracker.ts`의 `getErrorStats()` 안에서:

```typescript
// Before:
const errorsByCategory: Record<ErrorCategory, number> = {} as any;
const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

// After:
const errorsByCategory = {} as Record<ErrorCategory, number>;
const errorsBySeverity = {} as Record<ErrorSeverity, number>;
```

`as any`를 `as Record<ErrorCategory, number>`로 좁힌다. 바로 아래 `forEach`에서 모든 값을 채우므로 타입적으로 안전하다.

### 5-2. AuthGuard.tsx (line 64)

- [ ] **Step 2: AuthGuard.tsx 수정**

`src/components/atoms/AuthGuard.tsx` line 64:

```typescript
// Before:
} = (await Promise.race([sessionPromise, timeoutPromise])) as any;

// After:
} = (await Promise.race([
  sessionPromise,
  timeoutPromise,
])) as Awaited<ReturnType<typeof supabase.auth.getSession>>;
```

### 5-3. usePerformanceMonitoring.ts (line 116)

- [ ] **Step 3: usePerformanceMonitoring.ts 수정**

`src/hooks/usePerformanceMonitoring.ts` line 114-117 영역:

```typescript
// Before:
if (typeof window === "undefined" || !globalThis.performance || !("memory" in globalThis.performance)) return;
const memory = (globalThis.performance as any).memory;

// After:
interface ChromeMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}
type PerformanceWithMemory = Performance & { memory?: ChromeMemoryInfo };
if (typeof window === "undefined" || !globalThis.performance || !("memory" in globalThis.performance)) return;
const memory = (globalThis.performance as PerformanceWithMemory).memory;
```

`ChromeMemoryInfo` 인터페이스는 함수 내부에 선언해도 되고 파일 상단에 옮겨도 된다.

### 5-4. pdf-utils.ts (6개 → declare global)

- [ ] **Step 4: pdf-utils.ts 파일 상단에 declare global 추가**

`src/lib/pdf-utils.ts` import 직후 (line 4 이후)에 추가:

```typescript
declare global {
  interface Window {
    __pdfCaptureState?: {
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    };
    __pdfDebugInfo?: Record<string, unknown>;
    __canvasDebugInfo?: Record<string, unknown>;
    __debugCanvasImage?: string;
  }
}
```

이후 파일 내 6개의 `(window as any).__pdfXxx` → `window.__pdfXxx`로 수정:

- line 535: `(window as any).__pdfCaptureState = {` → `window.__pdfCaptureState = {`
- line 539: `(window as any).__pdfCaptureState` → `window.__pdfCaptureState`
- line 669: `(window as any).__pdfDebugInfo = {` → `window.__pdfDebugInfo = {`
- line 685: `(window as any).__pdfDebugInfo` → `window.__pdfDebugInfo`
- line 791: `(window as any).__canvasDebugInfo = debugInfo` → `window.__canvasDebugInfo = debugInfo`
- line 806: `(window as any).__debugCanvasImage = canvasDataUrl` → `window.__debugCanvasImage = canvasDataUrl`

- [ ] **Step 5: 타입 체크 + 테스트**

```bash
npm run type-check
npm run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: 타입 에러 없음, 테스트 PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/errorTracker.ts \
        src/components/atoms/AuthGuard.tsx \
        src/hooks/usePerformanceMonitoring.ts \
        src/lib/pdf-utils.ts
git commit -m "refactor: replace as any casts with proper TypeScript types

- errorTracker: {} as Record<ErrorCategory,number> instead of {} as any
- AuthGuard: Promise.race typed as Awaited<ReturnType<getSession>>
- usePerformanceMonitoring: ChromeMemoryInfo interface for performance.memory
- pdf-utils: declare global Window interface for __pdf* debug properties"
```

---

## Task 6: LoginButton — atoms → organisms 이동

**Files:**
- Move: `src/components/atoms/LoginButton.tsx` → `src/components/organisms/LoginButton.tsx`
- Modify: `src/app/layout.tsx` (import 경로 1곳)

LoginButton은 311줄이며 OAuth 모달, 인증 상태 관리, 사용자 드롭다운 메뉴를 포함한다.
Atomic Design 기준으로 organism (자기완결적 기능 단위)이다.

- [ ] **Step 1: 파일 이동**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
mv src/components/atoms/LoginButton.tsx src/components/organisms/LoginButton.tsx
# CSS module이 있다면 같이 이동
ls src/components/atoms/LoginButton* 2>/dev/null && mv src/components/atoms/LoginButton*.module.css src/components/organisms/ || true
```

- [ ] **Step 2: layout.tsx import 경로 수정**

`src/app/layout.tsx`에서:

```typescript
// Before:
import LoginButton from "../components/atoms/LoginButton";

// After:
import LoginButton from "../components/organisms/LoginButton";
```

- [ ] **Step 3: LoginButton 내부 자기 참조 경로 확인**

LoginButton.tsx 내부에 atoms/ 내 파일을 상대 경로로 import하는 경우 경로 조정:

```bash
grep "from.*atoms\|from.*\.\." src/components/organisms/LoginButton.tsx
```

relative path가 변경되었으므로 `../../` → `../` 등 필요 시 조정.

- [ ] **Step 4: 타입 체크**

```bash
npm run type-check
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/components/organisms/LoginButton.tsx \
        src/app/layout.tsx
git add -u src/components/atoms/LoginButton.tsx  # deleted
git commit -m "refactor(components): move LoginButton from atoms to organisms

LoginButton manages OAuth state, renders a modal and user dropdown —
organism-level complexity per Atomic Design. atoms/ should contain
primitive elements only (Button, Input, Label)."
```

---

## Task 7: AboutPageLayout.tsx 분할 + 인라인 style 제거

**Files:**
- Create: `src/components/organisms/about/FeatureCard.tsx`
- Create: `src/components/organisms/about/FeatureDetail.tsx`
- Create: `src/components/organisms/about/HeroSection.tsx`
- Modify: `src/components/organisms/AboutPageLayout.tsx` (~1607줄 → ~150줄)

현재 파일은 1607줄의 순수 JSX로, 4개의 동일한 구조 카드, 피처 상세 섹션, 히어로, 푸터로 구성된다.
모든 div에 Tailwind 클래스와 동일한 내용의 `style={}` 객체가 중복되어 있다 (CLAUDE.md 규칙 위반).

### 7-1. FeatureCard 컴포넌트

- [ ] **Step 1: `src/components/organisms/about/FeatureCard.tsx` 생성**

```typescript
import React from "react";

export interface FeatureCardProps {
  emoji: string;
  title: string;
  description: string;
  featureKey: string;
  onSelect: (key: string) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  emoji,
  title,
  description,
  featureKey,
  onSelect,
}) => (
  <div
    className="group cursor-pointer"
    onClick={() => onSelect(featureKey)}
  >
    <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
      <div className="text-5xl mb-6 text-center">{emoji}</div>
      <h3 className="text-xl font-bold mb-4 text-center text-gray-900">
        {title}
      </h3>
      <p className="text-gray-600 text-center leading-relaxed">{description}</p>
    </div>
  </div>
);

export default FeatureCard;
```

### 7-2. HeroSection 컴포넌트

- [ ] **Step 2: `src/components/organisms/about/HeroSection.tsx` 생성**

```typescript
import React from "react";

const HeroSection: React.FC = () => (
  <div className="text-center mb-16">
    <h1 className="text-6xl font-bold mb-6 text-white [text-shadow:0_4px_8px_rgba(0,0,0,0.3)]">
      📚 클래스 플래너 소개
    </h1>
    <p className="text-2xl mb-8 text-white/90 font-light">
      교육을 더 쉽게 만들어가는 현대적인 시간표 관리 도구
    </p>
  </div>
);

export default HeroSection;
```

### 7-3. FeatureDetail 컴포넌트

- [ ] **Step 3: `src/components/organisms/about/FeatureDetail.tsx` 생성**

About 페이지의 "상세 설명 섹션" (selectedFeature !== null 일 때 표시되는 영역)을 추출한다.

```typescript
import React from "react";

interface FeatureDetailProps {
  selectedFeature: string;
  onClose: () => void;
}

// 색상 배지 유틸
const Badge: React.FC<{ step: number; colorClass: string; bgClass: string; borderClass: string; children: React.ReactNode }> = ({
  step,
  colorClass,
  bgClass,
  borderClass,
  children,
}) => (
  <div className={`flex items-start p-3 ${bgClass} rounded-lg border-l-4 ${borderClass}`}>
    <div className={`${colorClass} mr-3 mt-0.5 font-bold text-sm`}>{step}</div>
    <p className="text-gray-700 text-sm">{children}</p>
  </div>
);

const FEATURE_META: Record<string, { emoji: string; title: string }> = {
  student: { emoji: "👥", title: "학생 관리 상세" },
  subject: { emoji: "📚", title: "과목 관리 상세" },
  schedule: { emoji: "📅", title: "시간표 관리 상세" },
  sync: { emoji: "☁️", title: "데이터 동기화 상세" },
};

const FeatureDetail: React.FC<FeatureDetailProps> = ({ selectedFeature, onClose }) => {
  const meta = FEATURE_META[selectedFeature];
  if (!meta) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="text-3xl mr-3">{meta.emoji}</div>
          <h2 className="text-xl font-bold text-gray-900">{meta.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200 w-8 h-8 flex items-center justify-center rounded"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      <div className="text-gray-600 leading-relaxed">
        {selectedFeature === "student" && (
          <div className="grid gap-3">
            <Badge step={1} colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-400">
              학생 페이지에서 학생 이름을 입력하여 추가
            </Badge>
            <Badge step={2} colorClass="text-green-500" bgClass="bg-green-50" borderClass="border-green-400">
              Enter 키를 누르거나 추가 버튼을 클릭
            </Badge>
            <Badge step={3} colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-400">
              학생 목록에서 선택하여 편집 또는 삭제
            </Badge>
            <Badge step={4} colorClass="text-orange-500" bgClass="bg-orange-50" borderClass="border-orange-400">
              시간표 패널에서 학생을 드래그하여 시간표에 배치
            </Badge>
          </div>
        )}
        {selectedFeature === "subject" && (
          <div className="grid gap-3">
            <Badge step={1} colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-400">
              과목 페이지에서 과목 이름과 색상을 설정
            </Badge>
            <Badge step={2} colorClass="text-green-500" bgClass="bg-green-50" borderClass="border-green-400">
              기본 과목 9개가 첫 로그인 시 자동 생성됨
            </Badge>
            <Badge step={3} colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-400">
              과목별 색상으로 시간표에서 시각적으로 구분 가능
            </Badge>
          </div>
        )}
        {selectedFeature === "schedule" && (
          <div className="grid gap-3">
            <Badge step={1} colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-400">
              학생 패널에서 학생을 시간표 셀로 드래그
            </Badge>
            <Badge step={2} colorClass="text-green-500" bgClass="bg-green-50" borderClass="border-green-400">
              그룹 수업 모달에서 과목, 요일, 시간 선택 후 추가
            </Badge>
            <Badge step={3} colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-400">
              세션 블록 클릭으로 편집·삭제 가능
            </Badge>
            <Badge step={4} colorClass="text-orange-500" bgClass="bg-orange-50" borderClass="border-orange-400">
              시간 충돌 시 자동으로 세션 위치 재배치
            </Badge>
          </div>
        )}
        {selectedFeature === "sync" && (
          <div className="grid gap-3">
            <Badge step={1} colorClass="text-blue-500" bgClass="bg-blue-50" borderClass="border-blue-400">
              Google 계정으로 로그인하면 데이터가 서버에 저장됨
            </Badge>
            <Badge step={2} colorClass="text-green-500" bgClass="bg-green-50" borderClass="border-green-400">
              로컬 스토리지 우선 저장 후 백그라운드에서 서버 동기화
            </Badge>
            <Badge step={3} colorClass="text-purple-500" bgClass="bg-purple-50" borderClass="border-purple-400">
              다른 기기에서 로그인해도 동일한 시간표 접근 가능
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureDetail;
```

> **주의:** FeatureDetail의 상세 내용은 기존 AboutPageLayout.tsx의 내용을 참고하여 동일하게 유지한다.
> 원본 파일(1607줄)을 읽고 각 feature의 단계별 설명을 그대로 옮긴다.

### 7-4. AboutPageLayout.tsx 교체

- [ ] **Step 4: `src/components/organisms/AboutPageLayout.tsx` 전체 교체**

```typescript
import React, { useState } from "react";
import FeatureCard from "./about/FeatureCard";
import FeatureDetail from "./about/FeatureDetail";
import HeroSection from "./about/HeroSection";

const FEATURES = [
  {
    featureKey: "student",
    emoji: "👥",
    title: "학생 관리",
    description:
      "학생 정보를 체계적으로 관리하고 그룹별로 구성할 수 있습니다. 실시간 검색 기능으로 빠르게 찾을 수 있습니다.",
  },
  {
    featureKey: "subject",
    emoji: "📚",
    title: "과목 관리",
    description:
      "과목별 색상 설정과 함께 직관적인 과목 관리 시스템을 제공합니다. 기본 과목들이 자동으로 생성됩니다.",
  },
  {
    featureKey: "schedule",
    emoji: "📅",
    title: "시간표 관리",
    description:
      "드래그 앤 드롭으로 간편하게 시간표를 구성하고 관리할 수 있습니다. 충돌 자동 해결 기능을 제공합니다.",
  },
  {
    featureKey: "sync",
    emoji: "☁️",
    title: "데이터 동기화",
    description:
      "Google 로그인과 스마트 동기화로 여러 기기에서 동일한 데이터에 접근할 수 있습니다.",
  },
] as const;

const AboutPageLayout: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  return (
    <div
      data-testid="about-page"
      className="min-h-screen py-10 px-5"
      style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <HeroSection />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {FEATURES.map((f) => (
            <FeatureCard key={f.featureKey} {...f} onSelect={setSelectedFeature} />
          ))}
        </div>

        {/* Feature Detail */}
        {selectedFeature && (
          <FeatureDetail
            selectedFeature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />
        )}

        {/* 추가 기능 및 저작권 섹션은 FeatureDetail 아래 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            📄 저작권 및 라이선스
          </h2>
          <div className="text-gray-600 text-center leading-relaxed text-sm">
            <p className="mb-3">
              <strong>저작권:</strong> © 2024 클래스 플래너. 모든 권리 보유.
            </p>
            <p className="mb-3">
              <strong>라이선스:</strong> 이 소프트웨어는 교육 목적으로 제작되었으며,
              개인 및 교육 기관에서 자유롭게 사용할 수 있습니다.
            </p>
            <p>
              <strong>문의사항:</strong> contact@info365.studio
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AboutPageLayout };
```

> **주의:** 원본 AboutPageLayout.tsx에는 "추가 기능" 섹션(다크모드, 반응형 등)이 있다.
> 위 코드는 저작권 섹션만 남겼지만, **원본 파일을 먼저 전체 읽고** 누락된 섹션을 포함해야 한다.

- [ ] **Step 5: 타입 체크**

```bash
npm run type-check
```

Expected: 에러 없음

- [ ] **Step 6: 브라우저 검증 (Playwright MCP)**

```bash
npm run dev
# localhost:3000/about 접속
```

1. `mcp__playwright__navigate` → `http://localhost:3000/about`
2. 스크린샷 캡처 (전체 페이지)
3. 4개 카드 클릭 → 상세 섹션 표시 확인
4. X 버튼 클릭 → 상세 닫힘 확인
5. 레이아웃/색상이 원본과 동일한지 비교

- [ ] **Step 7: 커밋**

```bash
git add src/components/organisms/AboutPageLayout.tsx \
        src/components/organisms/about/
git commit -m "refactor(about): split AboutPageLayout 1607-line JSX into components

Extract FeatureCard, FeatureDetail, HeroSection sub-components.
Remove inline style={} objects that duplicated Tailwind classes (CLAUDE.md violation).
AboutPageLayout reduced from 1607 to ~150 lines."
```

---

## Task 8: schedule/page.tsx — dead `repositionSessions` useCallback 삭제

**Files:**
- Modify: `src/app/schedule/page.tsx`

`repositionSessions` useCallback (line ~376-600)은 정의되어 있지만 실제로 호출되지 않는다.
`updateSessionPosition`의 deps 배열에만 포함되어 있으나, 내부 구현은 `repositionSessionsUtil`을 직접 사용한다.
이 dead callback을 삭제하면 ~200줄이 줄어든다.

- [ ] **Step 1: 실제로 호출되는지 확인**

```bash
grep -n "repositionSessions(" src/app/schedule/page.tsx | grep -v "useCallback\|repositionSessionsUtil\|//\|debug\|완료"
```

Expected: 호출 라인 없음 (deps 배열 참조만 있어야 함)

- [ ] **Step 2: `repositionSessions` useCallback 블록 삭제**

page.tsx에서 다음 범위를 삭제한다:
- 시작: `// 🆕 우선순위 기반 충돌 해결 로직` 주석 라인
- 끝: `[sessions, updateData, enrollments, subjects]` deps 배열을 포함하는 `);` 라인

삭제 후 `updateSessionPosition`의 deps 배열에서 `repositionSessions` 참조도 제거:

```typescript
// Before:
  }, [sessions, updateData, repositionSessions]);

// After:
  }, [sessions, updateData, enrollments, subjects]);
```

- [ ] **Step 3: 관련 타입 선언 정리**

`SessionWithPriority` 인터페이스가 삭제된 콜백 내부에만 있었다면 함께 제거.
page.tsx 상단의 `SessionWithPriority` 타입 선언이 다른 곳에서 사용되는지 확인:

```bash
grep -n "SessionWithPriority" src/app/schedule/page.tsx
```

다른 곳에서 사용되지 않으면 해당 선언도 삭제.

- [ ] **Step 4: 타입 체크 + 테스트**

```bash
npm run type-check
npm run test -- --reporter=verbose 2>&1 | tail -20
```

Expected: 에러 없음, 테스트 PASS

- [ ] **Step 5: 브라우저 검증**

```bash
# 서버가 이미 실행 중이라면 생략
npm run dev
```

1. `mcp__playwright__navigate` → `http://localhost:3000/schedule`
2. 수업 추가 golden path 실행:
   - "수업 추가" 클릭 → 학생 선택 → 과목/요일/시간 설정 → "추가"
   - 시간표 그리드에 블록 등록 확인
3. 세션 블록 드래그 → 새 위치로 이동 확인 (충돌 재배치 동작)
4. 스크린샷 캡처

- [ ] **Step 6: 커밋**

```bash
git add src/app/schedule/page.tsx
git commit -m "refactor(schedule): remove dead repositionSessions useCallback (~200 lines)

The callback was defined but never called — updateSessionPosition uses
repositionSessionsUtil directly. Removed from deps array too."
```

---

## Task 9: pdf-utils.ts — 중복 함수 제거

**Files:**
- Modify: `src/lib/pdf-utils.ts`

`timeToMinutes`와 `minutesToTime`이 `src/lib/planner.ts`에도 동일하게 정의되어 있다.
pdf-utils.ts의 중복 정의를 제거하고 planner.ts에서 import한다.

- [ ] **Step 1: planner.ts에 두 함수가 export되어 있는지 확인**

```bash
grep -n "export.*timeToMinutes\|export.*minutesToTime" src/lib/planner.ts
```

Expected: 두 함수 모두 export 확인

- [ ] **Step 2: pdf-utils.ts에서 중복 정의 제거 + import 추가**

`src/lib/pdf-utils.ts` 파일 상단 import 수정:

```typescript
// 기존 import 아래에 추가:
import { minutesToTime, timeToMinutes } from "./planner";
```

파일 내 `timeToMinutes` 함수 정의 (line ~19-26) 전체 삭제:
```typescript
// 삭제:
export function timeToMinutes(time: string): number { ... }
```

파일 내 `minutesToTime` 함수 정의 (line ~31-37) 전체 삭제:
```typescript
// 삭제:
export function minutesToTime(minutes: number): string { ... }
```

> **주의:** pdf-utils.ts에서 `export function timeToMinutes` / `export function minutesToTime`으로 export되고 있다면
> 외부 소비자가 있을 수 있다. 확인 후 re-export 필요:
> ```bash
> grep -r "from.*pdf-utils.*timeToMinutes\|from.*pdf-utils.*minutesToTime" src/
> ```
> import가 있으면 `export { timeToMinutes, minutesToTime } from "./planner";` 추가.

- [ ] **Step 3: 타입 체크**

```bash
npm run type-check
```

Expected: 에러 없음

- [ ] **Step 4: 전체 테스트 + 빌드**

```bash
npm run check
```

Expected: type-check + unit test + build 모두 성공

- [ ] **Step 5: 커밋**

```bash
git add src/lib/pdf-utils.ts
git commit -m "refactor(pdf-utils): remove duplicate timeToMinutes/minutesToTime, import from planner.ts"
```

---

## 완료 후 검증

```bash
# 전체 체크
npm run check

# 최종 라인 수 확인 (목표 대비)
wc -l src/infrastructure/container/RepositoryRegistry.ts  # ~120
wc -l src/components/organisms/AboutPageLayout.tsx        # ~150
wc -l src/app/schedule/page.tsx                           # ~1200
wc -l src/lib/pdf-utils.ts                                # ~950
```

### 브라우저 최종 검증 체크리스트
- [ ] `/about` — 4개 카드, 상세 섹션 토글, 저작권 섹션
- [ ] `/schedule` — 수업 추가 golden path, 드래그앤드롭, 편집/삭제
- [ ] `/students` — 기존 동작 무결성 (LoginButton organisms 이동 후)
- [ ] 다크 모드 토글 — ThemeContext 영향 없음 확인
