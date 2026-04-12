# Phase 2B — 코드 품질 개선 설계

**Date:** 2026-04-12  
**Scope:** class-planner  
**Approach:** Bottom-up (인프라 → 데드코드 → 거대 파일 분할)

---

## Context

Phase 2A (JSONB → 정규화 테이블, Academy 멀티테넌트 구조)가 완료된 상태.
기능 구현은 끝났지만 세 가지 코드 품질 문제가 누적되어 있다:

1. **인프라 과추상화**: Repository 생성에 7개 클래스가 관여하지만 실제 프로덕션 호출 체인은 단선형
2. **데드코드**: E2ETestAuthGuard/AuthContext 미사용, `as any` 15개, LoginButton 위치 오분류
3. **거대 파일**: AboutPageLayout(1607줄), schedule/page(1403줄), pdf-utils(1005줄), localStorageCrud(974줄)

---

## 실행 순서

```
Step 1: 인프라 단순화
Step 2: Dead code 정리
Step 3: AboutPageLayout 분할 + 인라인 style → Tailwind
Step 4: schedule/page.tsx render 추출
Step 5: pdf-utils.ts 정리
Step 6: (선택) localStorageCrud.ts 분리
```

---

## Step 1: 인프라 단순화

### 현재 프로덕션 호출 체인
```
API Routes
  → ServiceFactory
    → RepositoryRegistry.get*()
      → DIContainer.resolve()
        → RepositoryConfig.create()
          → 4개 individual Factory
```

### 삭제 대상

| 파일 | 줄수 | 삭제 이유 |
|------|------|----------|
| `src/infrastructure/RepositoryFactory.ts` | 109 | deprecated 심. 프로덕션 import 0 |
| `src/infrastructure/container/DIContainer.ts` | 142 | RepositoryRegistry 내부에서만 사용. 로직 흡수 |
| `src/infrastructure/container/RepositoryInitializer.ts` | 140 | 테스트 reset()만 사용. 프로덕션 import 0 |
| `src/infrastructure/__tests__/RepositoryFactory.test.ts` | — | 본체 삭제 |

**총 제거: ~400줄**

### RepositoryRegistry 수정
DIContainer의 핵심 로직(Map 기반 lazy singleton)을 RepositoryRegistry에 직접 인라인:
- `Map<string, Repository>` 인스턴스 캐시를 멤버 변수로 보유
- `register()` / `resolve()` 제거 → `get*Repository()` 내부에서 직접 처리
- `clear()` 메서드는 테스트용으로 유지
- 결과: ~199줄 → ~120줄

### 테스트 수정
- `RepositoryRegistry.test.ts`: DIContainer 관련 테스트 제거, RepositoryRegistry 직접 테스트로 전환
- `ServiceFactory.test.ts`: `RepositoryInitializer.reset()` → `RepositoryRegistry.clear()` 직접 호출로 변경

### 유지
- `factories/` 4개 파일 — RepositoryConfig에서 사용, 외부 노출 불필요하므로 barrel re-export 제거
- `config/RepositoryConfig.ts` — 환경별 구현체 선택 (dev/prod/test) 유지
- `interfaces.ts` — 인터페이스 정의 유지

---

## Step 2: Dead Code 정리

### 2-1. 파일 삭제

| 파일 | 이유 |
|------|------|
| `src/contexts/AuthContext.tsx` | 유일한 소비자(E2ETestAuthGuard)가 미사용 |
| `src/components/atoms/E2ETestAuthGuard.tsx` | src/ 어디서도 import 없음 |

### 2-2. `as any` 수정 (15개 → 목표 5개 이하)

| 파일 | 개수 | 조치 |
|------|------|------|
| `contexts/AuthContext.tsx` (삭제) | 4 | 파일 삭제로 해소 |
| `pdf-utils.ts` | 6 | `declare global { interface Window { __pdfCaptureState: ...; ... } }` 추가 |
| `errorTracker.ts` | 2 | `{} as any` → 적절한 타입 초기값 사용 |
| `DIContainer.ts` (삭제) | 1 | 파일 삭제로 해소 |
| `AuthGuard.tsx` | 1 | `Promise.race<[Response, null]>([...])` 제네릭 타입 파라미터 추가 |
| `usePerformanceMonitoring.ts` | 1 | `(performance as Performance & { memory?: ... })` 타입 단언 개선 |

### 2-3. LoginButton.tsx 재분류
- 이동: `atoms/LoginButton.tsx` → `organisms/LoginButton.tsx`
- 이유: auth 상태 + OAuth 모달 + 사용자 드롭다운 + localStorage 조작 = organism 수준 복잡도
- import 경로 변경: `src/app/layout.tsx` 1곳만 수정

---

## Step 3: AboutPageLayout.tsx 분할

### 현황
- 1,607줄의 순수 JSX
- 인라인 `style={}` 객체로 Tailwind 클래스 중복 (CLAUDE.md 규칙 위반)
- 로직: `useState(selectedFeature)` 1개뿐

### 분할 계획

```
src/components/organisms/
├── AboutPageLayout.tsx          # ~200줄 (조합만 담당)
└── about/                       # (신규)
    ├── HeroSection.tsx
    ├── FeaturesGrid.tsx
    ├── FeatureCard.tsx
    └── FooterSection.tsx
```

- 인라인 style → Tailwind 클래스 전환 동시 진행
- `selectedFeature` 상태: FeaturesGrid 또는 AboutPageLayout에 유지 (props drilling)

### 검증
- Playwright MCP: `/about` 라우트 스크린샷
- computer-use: 기능 카드 인터랙션 확인

---

## Step 4: schedule/page.tsx render 추출

### 현황
- 1,403줄. 이미 `_components/`, `_hooks/`, `_utils/` 구조 있음
- 문제: render 함수 끝 ~300줄이 조건부 블록으로 구성된 인라인 JSX

### 추출 대상
- 이미 존재하는 `_components/` 파일들이 충분히 분리되어 있는지 재검토
- render 내 남아있는 인라인 JSX 블록을 추가로 `_components/`로 추출
- 목표: `SchedulePageContent` render → ~200줄

### 검증
- Playwright MCP: `/schedule` 수업 추가 golden path
- computer-use: 드래그앤드롭, 모달 인터랙션

---

## Step 5: pdf-utils.ts 정리

### 조치 목록
1. **중복 제거**: `timeToMinutes` / `minutesToTime` 삭제 → `../lib/planner` import
2. **debug globals 타입 선언**: `(window as any).__pdfXxx` → `declare global { interface Window { ... } }`
3. **no-op 삭제**: `adjustColorForLightTheme` (입력 = 출력인 항등 함수)
4. **분할 (선택)**: PDF 생성 로직 / 캔버스 유틸 / 레이아웃 계산 분리

**목표: 1,005줄 → ~600줄**

---

## Step 6: localStorageCrud.ts 분리 (선택)

### 현황
- 974줄이지만 구조는 깔끔함 (entity별 CRUD 섹션화)
- 기능 문제 없음

### 분할 방향 (시간 여유 시)
```
src/lib/
├── localStorageCrud.ts      # 공통 타입/유틸 + barrel re-export
└── crud/
    ├── studentCrud.ts
    ├── subjectCrud.ts
    ├── sessionCrud.ts
    └── enrollmentCrud.ts
```

---

## 검증 계획

```bash
# Step 1~2 완료 후
npm run check:quick   # tsc + unit tests

# Step 3~4 완료 후 (UI 변경)
npm run dev
# Playwright MCP: /about, /schedule golden path
# computer-use: 드래그앤드롭, 모달

# 전체 완료 후
npm run check         # tsc + unit + build
```

---

## 주요 파일 목록

| 파일 | 액션 |
|------|------|
| `src/infrastructure/RepositoryFactory.ts` | 삭제 |
| `src/infrastructure/container/DIContainer.ts` | 삭제 |
| `src/infrastructure/container/RepositoryInitializer.ts` | 삭제 |
| `src/infrastructure/container/RepositoryRegistry.ts` | 수정 (DIContainer 로직 흡수) |
| `src/infrastructure/index.ts` | 수정 (삭제된 파일 export 제거) |
| `src/infrastructure/__tests__/RepositoryFactory.test.ts` | 삭제 |
| `src/infrastructure/__tests__/RepositoryRegistry.test.ts` | 수정 |
| `src/application/services/__tests__/ServiceFactory.test.ts` | 수정 |
| `src/contexts/AuthContext.tsx` | 삭제 |
| `src/components/atoms/E2ETestAuthGuard.tsx` | 삭제 |
| `src/components/atoms/LoginButton.tsx` | 이동 → `organisms/LoginButton.tsx` |
| `src/app/layout.tsx` | 수정 (LoginButton import 경로) |
| `src/lib/pdf-utils.ts` | 수정 (중복 제거, 타입 선언, no-op 삭제) |
| `src/lib/errorTracker.ts` | 수정 (as any → 타입 초기값) |
| `src/components/atoms/AuthGuard.tsx` | 수정 (as any → 제네릭) |
| `src/hooks/usePerformanceMonitoring.ts` | 수정 (as any → 타입 단언 개선) |
| `src/components/organisms/AboutPageLayout.tsx` | 분할 → about/ 하위 컴포넌트 |
| `src/app/schedule/page.tsx` | 수정 (render 추출) |
