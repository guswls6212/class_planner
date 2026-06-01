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

### 1.4 Concurrent Dev (Worktree 동시 실행)

PR #246 (2026-05-05) 이후 `npm run dev` 가 `lsof -ti:$PORT` 로 자기 PORT만 죽이도록 변경됨 → 본체와 worktree 동시 실행 안전.

```bash
# 본체 (default port 3000)
npm run dev

# worktree A
cd <dev-pack-worktrees>/class-planner-feat-foo
PORT=3001 npm run dev

# worktree B
cd <dev-pack-worktrees>/class-planner-fix-bar
PORT=3002 npm run dev
```

`PORT` 환경변수 미지정 시 기본 3000. turbopack 유지 (HMR 빠름).

worktree 자동 생성: `bash dev-pack/scripts/worktree-new.sh class-planner <branch>` 사용 시 PORT 안내 메시지가 자동 출력됨. 자세히는 `dev-pack/CLAUDE.md` "Worktree Automation" + "Concurrent Session Detection" 참조.

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

## 3.X PWA 검증 (Service Worker)

class-planner는 `@serwist/next` 기반 PWA. SW는 **production build에서만 활성** (dev에서 disable — 개발자 경험 보호).

### 로컬에서 PWA 동작 확인

```bash
npm run build       # public/sw.js + swe-worker-*.js 생성 (Webpack — turbopack 비호환)
npm run start       # localhost:3000
```

Chrome DevTools → Application 탭:
- **Manifest**: 인식 + icons 200 + start_url=/schedule
- **Service Workers**: scriptURL=/sw.js, status=activated, scope=/

Console에서 직접:
```js
const reg = await navigator.serviceWorker.getRegistration();
console.log(reg?.active?.scriptURL, reg?.active?.state, reg?.scope);
// → http://localhost:3000/sw.js  activated  http://localhost:3000/
```

### Offline 시뮬레이션

DevTools Network 탭 → Offline 토글 → reload:
- 캐시된 라우트 (예: `/schedule`) → 정상 mount (localStorage 데이터로 SessionBlock 그림)
- 캐시 미존재 라우트 → `/~offline` fallback page

### 함정

- `next build --turbopack` ❌ Serwist 비호환 → `npm run build` 스크립트는 **webpack 사용**.
- `public/sw.js`, `swe-worker-*.js`, `workbox-*.js`는 빌드 산출물 — `.gitignore`로 제외.
- 캐시 invalidation: `skipWaiting: true` + `clientsClaim: true` 설정. 배포 후 reload 1회로 신버전 활성.

상세 결정 근거: `docs/adr/006-pwa-adoption.md`

---

## 4. E2E 테스트 설정 (Supabase password auth 기반)

PR C 이후 Google OAuth 자동화를 우회하고 **Supabase password auth로 e2e 전용 user**를 사용. CI에서는 매 job마다 멱등 셋업 + globalTeardown 자동 cleanup.

### 4.1 환경 변수 (`.env.local`)

다음을 `.env.local`에 추가 (CI는 GitHub Secrets로 주입):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # admin API용 (RLS 우회 cleanup)
E2E_TEST_USER_EMAIL=info365001.e2e.test@gmail.com  # 또는 자체 도메인
E2E_TEST_USER_PASSWORD=<강한 password>
```

`E2E_TEST_USER_ID` / `E2E_TEST_ACADEMY_ID` 는 **선택** — `setup-e2e-test-user.ts` 가 email lookup으로 처리. 명시 시 globalSetup ~100ms 단축.

### 4.2 Test user + Academy 멱등 셋업

```bash
npx tsx scripts/setup-e2e-test-user.ts
# → admin API로 user 생성 (이미 존재하면 password 갱신)
# → user 소유 academy 생성 (이미 있으면 skip)
# → 출력에 user_id, academy_id 표시
```

CI에서는 매 e2e job 시작 시 자동 실행 (`continue-on-error: true`).

### 4.3 globalSetup / globalTeardown (자동)

`playwright.config.ts` 가:
- **globalSetup** (`tests/e2e/global-setup.ts`): Supabase password auth로 로그인 → `playwright/.auth/session.json` 저장
- **globalTeardown** (`tests/e2e/global-teardown.ts`): `cleanupTestUserData()` 호출 → academy_members 단위 모든 데이터 삭제 (PR M, 환경 누적 영구 차단)

조건: `E2E_TEST_USER_EMAIL && E2E_TEST_USER_PASSWORD` 환경변수 존재 시만 globalSetup 활성. `SUPABASE_SERVICE_ROLE_KEY` 존재 시만 globalTeardown 활성.

### 4.4 E2E 실행

```bash
# .env.local 로드 후 실행 (사용자가 source)
( set -a; source .env.local; set +a; npx playwright test --project=chromium --reporter=list )

# 또는 단일 spec
( set -a; source .env.local; set +a; npx playwright test tests/e2e/multi-academy.spec.ts --project=chromium )

# 헤드 모드 (디버그)
( set -a; source .env.local; set +a; npx playwright test --project=chromium --headed )
```

### 4.5 spec 안에서 진짜 session 사용

```typescript
// tests/e2e/multi-academy.spec.ts
import { injectRealSession } from "./helpers/auth-mock";

test.beforeEach(async ({ page }) => {
  await injectRealSession(page);  // session.json의 진짜 token inject → AuthGuard 통과
});
```

### 4.6 service_role 보안 주의

- `SUPABASE_SERVICE_ROLE_KEY` 는 **admin API 전용** — RLS 완전 우회.
- **client/browser bundle 노출 절대 금지**. `.env.local` (gitignore) + GitHub Secrets에만.
- `auth.admin.createUser`, table direct INSERT/DELETE 가능 — production DB 영향 가능. 강한 password + 주기적 rotation 권장.

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
feature → PR to dev → check (type-check + lint + unit) → build → e2e (Chromium, SW 활성) → 머지
```

PR #244 (2026-05-05) 이후 변경:
- 이전: `e2e` job(`E2E_DISABLE_SW=1`) + `e2e_pwa` job(SW 활성, offline-network spec만, `needs: e2e`) 분리.
- 현재: **단일 `e2e` job** (SW 활성 환경, 13-spec + offline-network 통합). `e2e_pwa` job 제거됨. 환경 충실도 = production. CI 시간 5-10분 절약.
- root cause fix: `src/app/sw.ts`에 `/api/*` `NetworkOnly` prepend (defaultCache `/api/*` NetworkFirst 가로채기 우회) + `AuthGuard.tsx` timeout 3s → 7s. 자세히는 `docs/adr/007-sw-timing-fix.md`.

`E2E_DISABLE_SW=1` 환경변수는 **개발자 로컬 escape hatch**로 유지 (`next.config.ts`). CI에서는 사용 안 함.

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

`bash scripts/check-stale-branches.sh` 로 확인 가능.

---

## 6. UAT 절차 (수동 acceptance test)

PR #240 (2026-05-05) 도입. 2026-05-20 부터 **3 계정 (owner/admin/member) + 10-Phase 흐름** 모델로 전환. e2e 와 별도 유지 — UAT 는 **사용자(개발자) 수동 시나리오 검증**, e2e 는 **CI 자동 회귀 가드**.

### 6.1 UAT vs e2e vs Smoke

| 계층 | 도구 | 시간 | 계정 | 모드 |
|---|---|---|---|---|
| **e2e** | Playwright Chromium | 5-10분 | E2E_TEST_USER | 자동 (CI 매 PR) |
| **Smoke** | UAT P0 핵심 5개 (S-1.1/2.1/5.6/12.1/14.1) | 10-15분 | owner 1 계정 | 수동 (dev→main 전) |
| **Release UAT** | UAT 전체 §1~§21 + Edge (P0 50개) | 180분 | 3 계정 + incognito | 수동 (분기 release / 큰 리팩터 후) |

UAT 시나리오 SSOT: `tests/manual/uat-checklist.md` (Smoke/Release 모드 + 10-Phase 가이드).

### 6.2 UAT 환경 셋업 (멱등) — 3 계정

```bash
# .env.local 에 추가 (e2e 와 별도 user — 격리)
UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
UAT_TEST_OWNER_PASSWORD=<강한 password>
UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
UAT_TEST_ADMIN_PASSWORD=<강한 password>
UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
UAT_TEST_MEMBER_PASSWORD=<강한 password>

# 1회 셋업 — 3 계정 모두 멱등 생성 (이미 있으면 password 갱신)
npm run uat:setup
```

| 계정 | 역할 (academy_members.role) | 검증 시나리오 |
|---|---|---|
| OWNER | owner (학원장) | Phase 2 첫 학원 생성 + Phase 3 owner 권한 전체 |
| ADMIN | admin (관리자) | Phase 4 §19 — invite 4-state + admin CUD + owner 강등 차단 |
| MEMBER | member (멤버=강사 본인) | Phase 5 §20 — teacher_id link + /teacher-schedule + RBAC 차단 |

> 학생 / 학부모 view = **계정 X**. 별도 incognito 창 + share-link / 6자리 access-code 로 검증 (Phase 6 §21).
> legacy `UAT_TEST_USER_*` 도 인식 (OWNER 로 fallback, 1주일 alias 후 deprecated).

`E2E_TEST_USER_*` 와 별도 user. 같은 Supabase 프로젝트지만 **user_id 단위 격리** — UAT 데이터 cleanup 이 e2e 에 영향 없음.

### 6.3 매 사이클 명령

```bash
# 0. cleanup — 3 계정 모두 fresh-start (academy/member/invite 모두 정리, user 보존)
npm run uat:teardown                            # default: all
npm run uat:teardown -- --user owner            # 특정 역할만 (owner | admin | member)

# Phase 2 진입 — owner academy + 시드 데이터 (학생/과목/강사/세션)
npm run uat:seed

# Phase 4/5 진입 — admin/member 자동 초대 + 수락 fast-path
npm run uat:invite                              # default: admin + member 두 역할
npm run uat:invite -- --role admin              # admin 만
npm run uat:invite -- --role member             # member 만 (teacher "강사_uat" 자동 link)
```

> **uat:invite 와 UI 초대 (S-19.1, S-20.1) 둘 다 필요**:
> - UI 초대: invite 발급 + 4-state 페이지 + accept 흐름 자체 검증 — **매 Release UAT 직접 실행 의무**.
> - uat:invite 스크립트: 그 외 시나리오 (admin RBAC / member /teacher-schedule view) 빠른 진입용 alt path.

`scripts/uat-cleanup-helper.ts` 가 email lookup 으로 user_id 자동 발견 → 환경변수 minimum (EMAIL/PASSWORD 만 필수).

### 6.4 console.uat 자동 inject

PR #240 이후 `process.env.NODE_ENV === "development"` 일 때만 `<script src="/uat/console-tools.js">` 자동 inject (production tree-shaking 검증 완료).

콘솔에서:
```js
console.uat.seedSchedule({ weeks: 4 });   // 시간표 seed
console.uat.toggleNetworkError();          // 500 강제
console.uat.exportLogs();                  // 디버그 로그 저장
```

`public/uat/console-tools.js` 가 정적 서빙 — production bundle에 포함 X (`grep` 검증 통과).

### 6.5 결과 누적 (시계열)

```bash
bash scripts/uat-new.sh             # template 복사 + 메타 자동 채움
# → tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md 생성
# 시나리오 진행 + Pass/Fail/Skip/Pending 기록

bash scripts/uat-summary.sh         # 자주 fail하는 시나리오 ranking
```

git commit으로 시계열 보존. 시각화 도구 없이 markdown + grep만으로 추세 분석.

```bash
bash scripts/check-stale-branches.sh
```

## CI 셋업 SSOT (2026-05-28 도입)

dev 향 PR 은 Mac Studio cp-runner 6 container 에서 e2e 6 shard parallel + user 6 격리로 실행. 자세한 셋업/측정 history/PR label 자동 판단:

- `dev-pack/docs/protocols/cp-runner-ci-setup.md` — cp-runner 구성 + E2E user 6 + 측정 history
- `dev-pack/docs/protocols/ai-pr-label-policy.md` — PR 생성 시 quick-pr / no-auto-merge 자동 판단

<!-- 2026-05-29: cp-runner image v2026-05 rebuild (옵션 A-full) 측정 trigger PR -->
