# Development Guide

class-planner 개발 프로세스, 테스트 전략, 검증 명령어, E2E 설정, 브랜치/CI/CD 전략을 하나로 정리한 문서.

---

## 1. 개발 프로세스

### 1.1 코드 작성 → 커밋 플로우

```
코드 작성 → npm run check:quick → 커밋 → PR → CI 통과 → 머지
```

**작업 중 빠른 피드백 (수십 초):**
```bash
npm run check:quick   # tsc + vitest run
```

**커밋/푸시 전 1회 (1분 내외):**
```bash
npm run check         # tsc + vitest run + next build
```

### 1.2 코드 작성 체크리스트

**수정 전**
- [ ] 전체 파일 읽기 완료
- [ ] 변경 계획 수립 (사용자 요청 범위 확인)
- [ ] 인라인 스타일 사용 금지 — Tailwind CSS 클래스로만

**수정 중**
- [ ] 한 번에 하나의 작은 변경
- [ ] 각 변경 후 즉시 검증
- [ ] 의존성 관계 확인

**수정 후**
- [ ] `npm run check:quick` 통과
- [ ] 브라우저에서 동작 확인 (UI 변경 시 Playwright MCP 필수)

### 1.3 TailwindCSS 스타일링 규칙

- **인라인 스타일 금지**: `style={{...}}` 사용 불가
- **Tailwind 클래스 사용**: 모든 스타일은 `className`에서 Tailwind 유틸리티 클래스로 관리
- **커스텀 값**: `tailwind.config.ts`에 등록하여 의미 있는 클래스명으로 사용

```jsx
// ❌ 금지
<div style={{ maxHeight: "400px", overflow: "auto" }} />

// ✅ 올바른 방식
<div className="max-h-[400px] overflow-auto" />
```

---

## 2. 테스트 전략

Clean Architecture 계층별로 격리하여 테스트한다.

### 2.1 테스트 피라미드

```
      /\
     /E2E\         ← 주요 시나리오 (Playwright)
    /______\
   /통합 테스트\    ← 중간 수, 중간 신뢰도
  /__________\
 / 단위 테스트 \    ← 많은 수, 빠른 실행 (Vitest)
/______________\
```

### 2.2 계층별 커버리지 목표

| 계층 | 목표 | 도구 | 현재 상태 |
|------|------|------|----------|
| Domain | 100% | Vitest (순수 단위) | ✅ 완료 |
| Application | 90%+ | Vitest (Mock Repository) | ✅ 완료 |
| Infrastructure | 80%+ | Vitest (env-based dispatch) | ✅ 완료 |
| Presentation | 70%+ | Vitest + RTL | ✅ 완료 |
| API Routes | 90%+ | Vitest (Mock Supabase) | ✅ 완료 |
| E2E | 주요 시나리오 | Playwright | ✅ 완료 |

### 2.3 계층별 테스트 가이드

#### Domain 계층
- **위치**: `src/domain/entities/__tests__/`, `src/domain/value-objects/__tests__/`
- **특징**: 외부 의존성 없음, 빠른 실행, 비즈니스 규칙 검증
```typescript
describe("Subject Entity", () => {
  it("과목 이름이 2글자 미만이면 에러를 던져야 한다", () => {
    expect(() => Subject.create("수", "#FF0000")).toThrow("과목 이름은 2글자 이상이어야 합니다.");
  });
});
```

#### Application 계층
- **위치**: `src/application/use-cases/__tests__/`, `src/application/services/__tests__/`
- **특징**: Mock Repository 사용, 애플리케이션 로직/비즈니스 플로우 검증

#### Infrastructure 계층
- **위치**: `src/infrastructure/**/__tests__/`
- **특징**: Factory env-dispatch 테스트 (`vi.stubEnv()` + `vi.resetModules()`)
```typescript
it("test 환경에서 MockRepository를 반환한다", async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();
  const { StudentRepositoryFactory } = await import("../StudentRepositoryFactory");
  expect(StudentRepositoryFactory.create()).toBeInstanceOf(MockStudentRepository);
});
```

#### Presentation 계층
- **위치**: `src/components/**/__tests__/`, `src/app/**/__tests__/`
- **특징**: React Testing Library, 사용자 관점 테스트
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
it("클릭 이벤트가 올바르게 처리되어야 한다", () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>클릭</Button>);
  fireEvent.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### API Routes
- **위치**: `src/app/api/**/__tests__/`
- **특징**: HTTP 요청/응답 테스트, CORS 헤더, Mock Supabase

### 2.4 테스트 작성 원칙

**AAA 패턴:**
```typescript
it("새로운 학생을 성공적으로 추가해야 한다", async () => {
  // Arrange
  const input = { name: "김철수" };
  mockStudentRepository.findAll.mockResolvedValue([]);
  // Act
  const result = await useCase.execute(input);
  // Assert
  expect(result.success).toBe(true);
});
```

**Mock 가이드:**
```typescript
// ✅ 필요한 부분만 Mock
const mockRepository = { findAll: vi.fn(), save: vi.fn() };

// ✅ 각 테스트 전 초기화
beforeEach(() => { vi.clearAllMocks(); });
```

**주의사항:**
- 테스트 간 의존성 금지 (전역 상태 공유 금지)
- 실제 외부 API 호출 금지 (vi.fn()으로 Mock)
- 테스트 후 정리: `localStorage.clear()`

---

## 3. 검증 명령어

3-Layer 검증 구조:
```
Layer 1 (로컬)  : npm run check         — tsc + unit + build
Layer 2 (CI)    : GitHub Actions ci.yml — Layer 1 + Playwright Chromium
Layer 3 (세션)  : Claude Stop 훅 + Playwright MCP
```

### Layer 1 — 로컬 검증

```bash
npm run check:quick   # 작업 중 빠른 피드백 (tsc + vitest run, 수십 초)
npm run check         # 커밋 전 (tsc + vitest run + next build, 1분 내외)
```

### Layer 2 — CI (GitHub Actions)

PR 또는 main/dev push 시 자동 실행.

- **check job**: `type-check` → `lint` → `test`
- **build job**: `next build` (NEXT_PUBLIC_* secrets 필요)
- **e2e job**: Playwright Chromium `final-working-test.spec.ts`

GitHub Secrets 필요: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 개별 명령어

```bash
# 단위 테스트
npm run test                            # 전체
npm run test -- src/domain/             # 특정 경로
npm run test:watch                      # 감시 모드
npm run test:coverage                   # 커버리지 포함

# E2E 테스트
npm run test:e2e                        # 헤드리스
npm run test:e2e:ui                     # Playwright UI
npm run test:e2e:headed                 # 헤드 모드

# 기타
npm run type-check                      # tsc만
npm run lint                            # lint만
npm run lint:fix                        # lint 자동 수정
npm run build                           # 빌드만
```

### 문제 해결

```bash
# TypeScript 에러
npm run type-check
npx tsc --noEmit src/specific-file.ts

# E2E 실패
npm run test:e2e:ui        # UI 모드로 디버그

# 빌드 실패
rm -rf .next && npm run build
```

---

## 4. E2E 테스트 설정

### 4.1 Google OAuth 테스트 계정 준비

- 실제 개인 계정 사용 금지, 테스트 전용 Google 계정 생성
- 2단계 인증 비활성화 (테스트 편의)

### 4.2 환경 변수 설정 (`.env.e2e`)

```bash
E2E_GOOGLE_EMAIL=classplanner.e2e.test@gmail.com
E2E_GOOGLE_PASSWORD=TestPassword123!
E2E_TEST_MODE=true
E2E_HEADLESS=false
```

`.gitignore`에 `.env.e2e` 추가 필수.

### 4.3 Playwright 설정에 dotenv 로드

```typescript
// playwright.config.ts
import { config } from "dotenv";
config({ path: ".env.e2e" });
```

### 4.4 E2E 실행

```bash
npm run test:e2e:auth    # 인증 포함 빠른 테스트
npm run test:e2e:full    # PR 전 전체 테스트
```

### 4.5 보안 주의사항

1. `.env.e2e` 파일 Git 커밋 금지
2. CI/CD에서는 환경 변수로 설정
3. 각 테스트 후 데이터 정리

---

## 5. 브랜치 전략 & CI/CD

### 5.1 브랜치 모델

```
main (프로덕션 — Lightsail 자동 배포)
  ↑ PR only (CI 통과 필수, --no-ff merge)
dev (통합/검증 — CI 실행, 배포 없음)
  ↑ PR only (CI 통과 필수, --no-ff merge)
feature/xxx, fix/xxx, chore/xxx, docs/xxx, phaseN/xxx (작업 브랜치)
```

**규칙 (Non-negotiable):**
- `main`/`dev` 직접 push/commit 금지
- 모든 작업은 dev에서 분기 → dev로 PR
- 머지 커밋 필수 (`git merge --no-ff`)

### 5.2 hotfix

- main에서 분기 → main + dev 양쪽에 PR
- 명명: `hotfix/긴급수정내용`

### 5.3 CI/CD 파이프라인

**ci.yml (검증):**
```
feature → PR to dev → type-check → lint → unit test → build → E2E → 머지
```

**deploy.yml (배포):**
```
main push → Docker image build → ghcr.io push → Lightsail SSH deploy → health check
```

### 5.4 Semantic Versioning

| 구분 | 변경 조건 | 예시 |
|------|----------|------|
| MAJOR | 호환성 깨지는 큰 변경 | v1.1.5 → v2.0.0 |
| MINOR | 호환되는 기능 추가 | v1.0.1 → v1.1.0 |
| PATCH | 버그 수정 | v1.0.0 → v1.0.1 |

### 5.5 세션 완료 체크리스트

- [ ] `npm run check:quick` 통과
- [ ] 작업 브랜치 → dev PR 생성 (CI 통과 확인)
- [ ] 로컬 작업 브랜치 삭제 (`git branch -d <branch>`)
- [ ] worktree 사용 시 제거 (`git worktree remove <path>`)

### 5.6 세션 중단 감지

로컬에 남아있는 작업 브랜치 = 이전 세션에서 중단된 작업.

```bash
bash scripts/check-stale-branches.sh
```
