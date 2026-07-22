# Class Planner — AI Assistant 지침

## 프로젝트 개요
학원 운영자를 위한 시간표 관리 시스템. 학원생 변동이 잦은 환경에서 시간표를 빠르게 구성하고, PDF로 다운로드하여 바로 인쇄할 수 있도록 설계됨.

- **도메인:** `class-planner.deepcraft.app` (2026-07-22 이전 완료 — Mac Studio Docker(:3013) + cloudflared 터널 앱 서버, Supabase: Auth + DB. AWS Lightsail 은 인스턴스 삭제됨)
- **사용자:** 학원 운영자 (현재 1명, 확장 계획)
- **핵심 가치:** 시간표 구성 속도, 인쇄 가능한 PDF 출력, 직관적 UI

## SSOT 참조 우선순위
1. `ARCHITECTURE.md` — 프로젝트 헌법 (계층 구조, 데이터 모델, 배포)
2. `UI_SPEC.md` — UI 동작 소스 오브 트루스 (컴포넌트, 인터랙션, 검증 라우트)
3. `docs/adr/` — 아키텍처 결정 기록 (왜 이 결정을 했는지)
4. `docs/code-convention.md` — class-planner 코딩 규칙 (글로벌: `../docs/code-convention.md`)
5. `TASKS.md` — 단계별 진행 현황

## 문서 맵 (Documentation Map)

| 토픽 | 문서 | 언제 읽을지 |
|------|------|------------|
| 계층 구조, 데이터 모델, 배포 | [ARCHITECTURE.md](ARCHITECTURE.md) | 구조적 변경 전 |
| UI 컴포넌트, 훅, 인터랙션, 검증 라우트 | [UI_SPEC.md](UI_SPEC.md) | **UI/컴포넌트 수정 전 필독** |
| 개발 프로세스, 테스트, 검증, E2E, 브랜치/CI | [docs/development-guide.md](docs/development-guide.md) | 개발/테스트/커밋 시 |
| 배포 절차, 환경 변수, Mac Studio 롤아웃 에이전트 | [docs/deployment-guide.md](docs/deployment-guide.md) | 배포/환경설정 시 |
| 코딩 규칙 (파일크기, 언어, 스타일) | [docs/code-convention.md](docs/code-convention.md) | 코드 작성/리뷰 시 |
| 아키텍처 결정 이유 | [docs/adr/](docs/adr/) | "왜 이렇게 됐는지" 이해 시 |
| AI 워크플로우 (Superpowers, 훅, opusplan) | [../docs/ai-workflow-guide.md](../docs/ai-workflow-guide.md) | AI 도구/모드 사용 시 |
| 기능 설계 문서 | [docs/superpowers/specs/](docs/superpowers/specs/) | 기능 배경 이해 시 |
| AI 워크플로우, 도구 선택 기준 | [../docs/ai-workflow-guide.md](../docs/ai-workflow-guide.md) | Superpowers/도구 사용 시 |

## 기술 스택
- **Frontend:** Next.js 15.5.9 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS 4.0 (인라인 스타일 금지)
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (현재 Supabase JSONB, 정규화 마이그레이션 예정)
- **Auth:** OAuth (Google, Kakao) — 현재 Supabase Auth
- **Testing:** Vitest, Playwright, React Testing Library
- **Architecture:** Clean Architecture + Atomic Design

## 아키텍처 규칙

### Clean Architecture 계층 분리 (Non-negotiable)
- **Domain:** 비즈니스 로직, 엔티티, 값 객체. 외부 의존성 절대 금지.
- **Application:** 유스케이스, 서비스, 매퍼. Domain만 의존.
- **Infrastructure:** 외부 의존성 구현 (DB, API). Application 인터페이스를 구현.
- **Presentation:** React 컴포넌트 (Atomic Design: atoms → molecules → organisms).

### Atomic Design 컴포넌트 분류
- **Atoms:** Button, Input, Label, AuthGuard, ErrorBoundary, ThemeToggle, StudentListItem, SubjectListItem
- **Molecules:** SessionBlock, TimeTableRow, ConfirmModal, DropZone, PDFDownloadButton, DataConflictModal, SessionForm, StudentInputSection, StudentList, SubjectInputSection, SubjectList
- **Organisms:** TimeTableGrid, StudentPanel, StudentsPageLayout, SubjectsPageLayout, LoginButton, StudentManagementSection, SubjectManagementSection, AboutPageLayout
- 상세 컴포넌트 인벤토리: [UI_SPEC.md](UI_SPEC.md) § 3

### 데이터 관리 패턴
- **Local-first:** localStorage 직접 조작으로 즉시 반응 (0ms)
- **Fire-and-forget sync (개별 mutation):** `src/lib/apiSync.ts`의 `syncXxxCreate` 등이 사용. 10회 retry + outbox enqueue로 reliable delivery.
- **Deferred-commit + await (CUD commit, ADR-012):** 5초 deferred-commit 패턴(undo)에서 commit 시점은 **server response를 await**한 후에만 `pendingDeletes` 정리. fire-and-forget commit은 `useGlobalDataInitialization` 재실행과 race window 발생 (UAT 2026-05-09 학생 부활 5사이클 사고). 실패 시 `pendingDeletes` 그대로 → recovery hook 자동 재시도.
- **익명 사용자:** localStorage만 사용 (key: `classPlannerData:anonymous`). 서버 호출 없음.
- **로그인 후:** localStorage (key: `classPlannerData:{userId}:{academyId}` — multi-academy scoped, academy 미선택 시 legacy fallback `classPlannerData:{userId}`) + 서버 양방향 동기화. 상수/구현은 `src/lib/localStorageCrud.ts`(`ANONYMOUS_STORAGE_KEY`, `getStorageKey`).
- **AuthContext 단일화 (PR #313):** `useAuth()` 훅 단일 source. 페이지/컴포넌트별 `supabase.auth.getSession()` 직접 호출 금지 (보류 3곳 외).
- **useLocal 훅 우선:** 신규 기능은 반드시 `useXxxLocal` 훅 사용 (레거시 API 기반 훅 사용 금지)
- **새 sync 흐름 추가 시 fire-and-forget vs await 점검 의무:** `docs/adr/012-fire-and-forget-vs-await-for-cud.md` 체크리스트 통과 후에만 도입 결정.
- **anonymous→로그인 마이그레이션 entity 누락 가드 (ADR-013):** `src/lib/auth/fullDataMigration.ts`는 user-facing entity 전체(students/subjects/teachers/enrollments/sessions) 포함 의무. 신규 entity 추가 시 mig Step + `MigrationSyncResult.syncedCounts` 동시 갱신. session-teacher 같은 cross-entity 연결은 reconcile 책임이 마이그레이션에 있다 (PR #322 사고).

## 코딩 규칙
- TypeScript strict mode 준수
- 모든 스타일은 Tailwind CSS 클래스 사용 (인라인 스타일 금지)
- 수정된 코드에 대한 테스트 작성/업데이트 필수
- Clean Architecture 계층 분리 위반 금지
- Merge commit 필수 (`git merge --no-ff`)

### 브랜치 규칙 (Non-negotiable)
- `main`/`dev` 직접 push/commit 금지
- 모든 작업은 `dev`에서 분기한 작업 브랜치에서 진행 (worktree 의무 — `bash dev-pack/scripts/worktree-new.sh class-planner <prefix>/<설명>`)
- 작업 브랜치 → `dev` PR → CI 통과 → 머지
- `dev` → `main` PR → CI 통과 → 머지 → 자동 배포
- hotfix 예외: `main`에서 분기 → `main` + `dev` 양쪽에 PR
- 상세: `docs/development-guide.md` § 브랜치 전략 & CI/CD

### Branch Prefix Convention (auto-merge 룰 통합, 2026-05-28 SSOT)

| Prefix | 의미 | auto-merge (dev 향) |
|---|---|---|
| `chore/` | 잡일, 셋업, 의존성 | ✅ ON |
| `docs/` | 문서만 | ✅ ON |
| `refactor/` | 동일 동작 구조 개선 | ✅ ON |
| `feat/` | 새 기능 | ✅ ON |
| `fix/` | bug fix | ✅ ON |
| `test/` | 테스트만 | ✅ ON |
| `ci/` | CI workflow 변경 | ❌ 수동 review |
| `migration/` | DB schema | ❌ 수동 |
| `infra/` | runner / Docker | ❌ 수동 |
| `security/` | auth / token / RLS | ❌ 수동 |
| `release/` | dev → main | ❌ 수동 |

- 시행: `dev-pack/scripts/hooks/class-planner-branch-policy-hook.sh` (PreToolUse hook)
- override label: `no-auto-merge`, `quick-pr` (자세히 `dev-pack/docs/protocols/ai-pr-label-policy.md`)

### CI 셋업 SSOT (2026-05-28)

dev 향 PR 은 Mac Studio M3 Ultra 의 cp-runner Docker 6 container 에서 실행 — e2e 6 shard parallel + user 6 격리.

- **상세 셋업**: `dev-pack/docs/protocols/cp-runner-ci-setup.md` (cp-runner 구성 / E2E user 6 / secret 6 / 측정 history / PR 만들 때 Claude 체크리스트 10항목)
- **PR label 자동 판단**: `dev-pack/docs/protocols/ai-pr-label-policy.md` (quick-pr / no-auto-merge 기준 + Claude 자동 흐름)

### E2E test user 6 (옵션 A, 2026-05-28)

CI 의 e2e 6 shard 가 각자 다른 user 사용 → DB row 격리 → academy data race 영구 해소.

- email: `e2e-test-1@class-planner.test` ~ `e2e-test-6@class-planner.test` (hardcode)
- password: `E2E_TEST_USER_PASSWORD` (USER_1) + `E2E_USER_PASSWORD_2` ~ `_6` (GitHub secret 5 set 추가)
- 각 user 의 owner academy = **`"E2E Test Academy"`** (literal — spec regex `/E2E Test Academy/` 매칭 의무, 6 user 같은 name 가능 — `academies.name` unique 없음)
- setup-e2e-test-user.ts 매 CI 마다 idempotent (array 처리)

### branch protection (dev branch, 2026-05-28 Step 3 적용)

required status check:
- `Type check, Lint, Unit tests`
- `Production build`
- **`E2E all shards required`** (summary job — e2e matrix 6 shard 중 하나라도 fail 시 PR 머지 차단)

### Worktree 강제 (Non-negotiable, hook 시행)
- class-planner 모든 branch 생성은 **worktree 안에서만**. main checkout 직접 `git checkout -b` 금지.
- 정석 명령: `bash dev-pack/scripts/worktree-new.sh class-planner <branch>`
- 시행: `dev-pack/scripts/hooks/class-planner-branch-policy-hook.sh` (PreToolUse hook). main 에서 `git -C class-planner checkout -b X` 시도 시 자동 BLOCK + worktree 명령 제안.

### Branch Prefix Convention (auto-merge 룰 통합)
`dev-pack/.github/workflows/auto-merge.yml` 와 일치:

| Prefix | 의미 | auto-merge (dev 향) |
|---|---|---|
| `chore/` | 잡일, 셋업, 의존성 | ✅ ON |
| `docs/` | 문서만 | ✅ ON |
| `refactor/` | 동일 동작 구조 개선 | ✅ ON |
| `feat/` | 새 기능 (출시 전 ON, 출시 후 OFF 권장) | ✅ ON |
| `fix/` | bug fix | ✅ ON |
| `test/` | 테스트만 | ✅ ON |
| `migration/` | DB schema (Supabase) | ❌ 수동 |
| `infra/` | CI / Docker / runner | ❌ 수동 |
| `security/` | auth / token / RLS | ❌ 수동 |
| `release/` | dev → main | ❌ 수동 |

- 개별 PR override: `gh pr edit <N> --add-label no-auto-merge`
- 시행: branch-policy hook 이 미준수 prefix 생성 시 BLOCK + 권장 prefix 제시

## 테스트 전략
| 계층 | 목표 커버리지 | 도구 |
|------|-------------|------|
| Domain | 100% | Vitest (순수 단위 테스트) |
| Application | 90%+ | Vitest (Mock Repository) |
| Infrastructure | 80%+ | Vitest (실제 외부 의존성) |
| Presentation | 70%+ | Vitest + RTL |
| API Routes | 90%+ | Vitest (Mock Supabase) |
| E2E | 주요 시나리오 | Playwright |

## Test Authoring Protocol (Non-negotiable)

spec/test 파일 작성/수정 시 PreToolUse hook (`dev-pack/scripts/hooks/test-authoring-guide-hook.sh`)이 `docs/test-authoring-guide.md` 본문을 자동 inject — flaky 8 원칙(timing, race, state pollution, 외부 의존성, 비결정적 데이터, animation, network, 비동기 미처리) 가드.

### 발동 조건 (Write/Edit 도구 호출 시 AND)
- `tool_name ∈ {Write, Edit}`
- `file_path` 매칭: `*.test.{ts,tsx}`, `*.spec.{ts,tsx}`, `tests/e2e/**`, `**/__tests__/**`
- 경로에 `class-planner` 포함 (class-planner 한정)

### 8 원칙 핵심 (상세는 SSOT)
1. **명시적 대기** — `waitForTimeout` 금지. `expect.poll`, `waitForFunction`, `waitForResponse`, `expect(...).toBeVisible({timeout})`
2. **테스트 격리** — `beforeEach` 깨끗한 상태 + globalTeardown 의존
3. **고유 데이터** — `Date.now()`, `crypto.randomUUID()` prefix
4. **안정 selector** — `data-testid` + `getByRole`. CSS class 의존 X
5. **Retry 보수적** — `retries: CI ? 2 : 0` 유지
6. **외부 의존성** — `seedAnonymous` / `injectRealSession` / `page.route` 의식적 선택
7. **애니메이션** — opacity transition 후 visible 가정 X. `waitOneFrame` 또는 명시적 wait
8. **비동기 await** — CUD `await` 의무 (ADR-012). fire-and-forget 은 `void` prefix + 주석 (PR #403 `no-floating-promises` warn)

### SSOT
- 가이드 본문: `docs/test-authoring-guide.md` (헬퍼 인벤토리 + 체크리스트 + 참고 PR/ADR 포함)
- hook 스크립트: `dev-pack/scripts/hooks/test-authoring-guide-hook.sh`
- 등록: `~/.claude/settings.json` § `hooks.PreToolUse` (`matcher: "Write|Edit"`)

### Bypass (예외 상황만)
non-test 파일이거나 가이드가 적용되지 않아야 할 의도적 케이스 → hook 매칭 자체에서 자동 통과 (filter 작동). 강제 우회 mechanism 없음 (Warning 모드라 차단 X — Claude 가 가이드 read 후 자유 의지로 진행).

## 개발 워크플로우

### 브랜치 플로우
```
dev에서 분기 → 작업 → PR to dev → CI 통과 → 머지 → dev→main PR → 배포
```

### 로컬 검증
```bash
# 작업 중 빠른 피드백 (tsc + unit, 수십 초)
npm run check:quick

# 커밋/푸시 전 1회 (tsc + unit + build, 1분 내외)
npm run check

# dev 서버 (worktree 동시 실행 가능 — PR #246)
npm run dev               # localhost:3000 (default)
PORT=3001 npm run dev     # localhost:3001 (다른 worktree에서)
```

상세: `docs/development-guide.md` § 1.4 Concurrent Dev.

### CI/CD (GitHub Actions)
- **ci.yml**: PR 생성 또는 main/dev push 시 자동 실행
  - check job: type-check + lint + unit test
  - build job: production build
  - e2e job: Playwright Chromium **(SW 활성 환경)** — 13-spec + offline-network 통합. PR #244 이후 `e2e_pwa` job 제거됨 (root cause fix: `sw.ts` `/api/*` NetworkOnly + AuthGuard 7s). 자세히 `docs/adr/007-sw-timing-fix.md`.
- **deploy.yml**: main CI 성공 시 이미지 빌드/push (ghcr.io). **프로덕션 롤아웃은 Mac Studio 의 launchd pull 에이전트**가 `latest` digest 를 3분 주기로 확인해 수행 — GitHub 이 SSH 배포하지 않는다(이 repo 가 PUBLIC 이라 fork PR 이 self-hosted 러너 라벨을 지정할 수 있어 docker socket 노출이 곧 호스트 root). 운영/롤백 명령은 `docs/deployment-guide.md` § 현행 배포.

### 세션 완료 체크리스트
- [ ] `npm run check:quick` 통과
- [ ] 작업 브랜치 → dev PR 생성 (CI 통과 확인)
- [ ] 로컬 작업 브랜치 삭제 (`git branch -d <branch>`)
- [ ] worktree 사용 시 제거 (`git worktree remove <path>`)
- [ ] 로컬에 main, dev 외 브랜치 없음 확인

### 세션 중단 감지
로컬에 남아있는 작업 브랜치 = 이전 세션에서 중단된 작업.
`bash scripts/check-stale-branches.sh`로 확인 가능.

## UAT (수동 acceptance test)

PR #240 (2026-05-05) 도입. e2e 와 별도 — UAT 는 사용자(개발자) **수동 시나리오 검증**, e2e 는 **CI 자동 회귀 가드**. 2026-05-20 부터 **3 계정 (owner/admin/member) + 학생·학부모 incognito view** 모델로 전환.

### 빠른 명령
```bash
# 1회 셋업 (멱등 — 이미 있으면 skip): 3 계정 모두 생성
npm run uat:setup

# Phase 2 진입 — owner academy 시드 데이터 (학생/과목/강사/세션)
npm run uat:seed

# Phase 4/5 진입 — admin/member 자동 초대 + 수락 fast-path
npm run uat:invite                              # default: admin + member 두 역할
npm run uat:invite -- --role admin              # admin 만
npm run uat:invite -- --role member             # member 만 (teacher "강사_uat" 자동 link)

# 3 계정 모두 cleanup (academy/member/invite 정리, user 보존)
npm run uat:teardown                            # default: all
npm run uat:teardown -- --user owner            # 특정 역할만

# 새 run 기록 시작 (template 복사 + 메타 자동 채움)
bash scripts/uat-new.sh release

# 결과 요약 (자주 fail 하는 시나리오 ranking)
bash scripts/uat-summary.sh
```

### 환경 (`.env.local`)
**3 계정 필요** (E2E user 와 별도, 격리):
```bash
UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
UAT_TEST_OWNER_PASSWORD=<강한-password>
UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
UAT_TEST_ADMIN_PASSWORD=<강한-password>
UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
UAT_TEST_MEMBER_PASSWORD=<강한-password>
```
- legacy `UAT_TEST_USER_*` 도 인식 (owner 로 fallback, 1주일 후 deprecated)
- `_ID` 환경변수는 선택 (email lookup 으로 자동 발견)
- 학생/학부모 view 는 **계정 X** — incognito 창 + share-token / 6자리 access-code

### 시나리오 SSOT
- `tests/manual/uat-checklist.md` — **Smoke (10-15분, owner 1 계정) / Release (180분, 3 계정 + 10 Phase)** 모드 분기. P0 50개 (§1~§18 41개 + §19 관리자 3개 + §20 멤버 4개 + §21 학생/학부모 2개).
- 결과 누적: `tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md` (git commit 으로 시계열 보존)

상세: `docs/development-guide.md` § 6 UAT 절차.

## Claude Code 훅 시스템

dev-pack 전체에서 공유하는 Claude Code 훅. 상세: [`../docs/ai-workflow-guide.md`](../docs/ai-workflow-guide.md)

| 훅 | 트리거 | 역할 | 위치 |
|----|--------|------|------|
| `session-start-reset.sh` | 세션 시작 | 이전 세션 센티넬 삭제, stale 브랜치 감지, baseline 저장 | `scripts/hooks/` |
| `dirty-tree-stop-hook.sh` | 세션 종료 | 커밋되지 않은 변경 파일이 있으면 종료 차단 | `scripts/hooks/` |
| `ui-verify-stop-hook.sh` | 세션 종료 | UI 파일 변경 시 브라우저 검증 없으면 종료 차단 | `scripts/hooks/` |
| `check-stale-branches.sh` | 수동/세션 시작 | 로컬에 남아있는 작업 브랜치(중단된 세션) 감지 | `scripts/` |

**Bypass:** `.claude/dirty-ok` (dirty-tree), `.claude/ui-verified` (ui-verify) — 센티넬은 다음 세션 시작 시 자동 삭제.

## UI Verification (class-planner 전용 가이드)

dev-pack 공통 UI Verification Protocol(`../CLAUDE.md` § UI Verification Protocol)에 따른 class-planner 세부 사항.

### Dev 서버 시작
```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run dev
# → http://localhost:3000
```

### 검증 대상 라우트 (변경된 컴포넌트/페이지에 따라 선택)
| 변경 파일 패턴 | 확인할 라우트 |
|---|---|
| `src/app/schedule/**` | `/schedule` |
| `src/app/students/**` | `/students` |
| `src/app/subjects/**` | `/subjects` |
| `src/components/molecules/SessionBlock*` | `/schedule` |
| `src/components/atoms/**` | 관련 모든 페이지 |

### 주요 Golden Path (수업 추가 모달)
1. `/schedule` 접속 → "수업 추가" 버튼 클릭
2. 학생 이름 입력 → 기존 학생 검색 → 추가
3. 존재하지 않는 이름 입력 → CTA `＋ '{이름}' 새 학생으로 추가` 렌더 확인
4. CTA 클릭 → 학생 생성 → 선택 탭 반영 확인
5. 과목/요일/시간 선택 → "추가" → 시간표에 블록 등록 확인

### 모바일 뷰포트 확인 (모달 변경 시)
Playwright MCP 설정에서 viewport를 375×667로 변경 후 재확인.

### 검증 도구 선택

**1차 — Playwright MCP (항상 실행)**
구조적 검증: 버튼 동작, 폼 입력, API 연동, 라우트 이동.
`mcp__playwright__navigate` → 클릭/입력 → `mcp__playwright__screenshot`

**2차 — computer-use (시각적 변경 시 추가 실행)**
탐험적 검증: Playwright 스크립트로 표현하기 어려운 시각적 상호작용.

실행 기준 (하나라도 해당하면 사용):
- 모달/드로어/팝오버 수정
- 드래그앤드롭 (시간표 블록 이동 등)
- 스크롤 위치 보존 관련 변경
- 반응형 레이아웃 (모바일 뷰포트 영향)
- CSS 애니메이션/트랜지션 변경
- 시각적 색상/폰트/간격 변경

Claude Max 구독 내 실행 (추가 API 비용 없음). computer-use tool로 브라우저를 직접 조작하며 시각적 이상을 탐지한다.

### UI Verification Report 포맷

```
## UI Verification Report

### 1차 — Playwright MCP
- Flows tested: ...
- Screenshots: ...
- Issues found: None / [목록]

### 2차 — computer-use (해당 시)
- Scope: [어떤 시각적 요소를 탐험했는지]
- Observations: [발견 사항]
- Issues found: None / [목록]
```

## omni-radar 연동

class-planner는 omni-radar-extension(Chrome MV3)이 `radar_console_hook.js`를
`document_start`에 주입하는 방식으로 omni-radar에 연동된다. console/fetch/XHR/
localStorage 이벤트가 실시간으로 `omni-radar/logs/radar_YYYYMMDD.jsonl`에 기록되며
`http://127.0.0.1:8888` 대시보드에서 확인 가능.

**Extension 설정 (Chrome 확장 프로그램 팝업):**
- Server URL: `http://127.0.0.1:8888`
- Target patterns: `http://localhost:3000/*`

**디버깅 시 진입점 (`../CLAUDE.md` § Debug Protocol 참조):**
```bash
omni-radar/scripts/radar-query --target browser --keyword <symbol> --since 10m
omni-radar/scripts/radar-query --type console_log --level ERROR --since 10m
```

**알려진 보안 주의:** 현재 hook은 localStorage 변경 페이로드를 마스킹 없이 전송한다.
Supabase auth token (`sb-*-auth-token`)이 평문으로 로그에 남으므로, 로그 파일을
외부에 공유하지 말 것. 향후 token-key 마스킹 필터를 hook 측에 추가할 예정 (별도 ADR).

## Analysis Perspectives (Multi-Perspective Analysis용)
- **학원 운영자:** 이 변경이 시간표 구성 속도에 영향을 주는가? 비개발자가 혼란 없이 사용할 수 있는가?
- **인쇄 품질:** PDF 출력 시 레이아웃이 깨지지 않는가? 종이에 인쇄했을 때 읽을 수 있는가?
- **오프라인 내성:** 네트워크 불안정 시 데이터 유실 가능성은?

## 배포 현황 (2026-07-22 Mac Studio 이전 기준)

**현행 아키텍처:**
- **앱 서버:** Mac Studio M3 Ultra — Docker 컨테이너 `class-planner` (:3013, amd64/Rosetta) + cloudflared 터널
- **Auth + DB:** Supabase 유지 (OAuth, PostgreSQL) — 이전 대상 아니었음
- **도메인:** `class-planner.deepcraft.app`
- **CI/CD:** GitHub Actions `ci.yml` (check→build→e2e) + `deploy.yml` (ghcr.io push까지) + **Mac Studio launchd 롤아웃 에이전트** (ghcr `latest` 3분 폴링 → pull → 재생성 → 헬스체크 → 실패 시 자동 롤백)

**이력:**
- 2026-04-10 ADR-001: AWS Lightsail 1GB + Nginx + Let's Encrypt 하이브리드 (`class-planner.info365.studio`)
- 2026-07-22: AWS Japan 계정 미납 closed → 4일 다운 → Mac Studio 이전. Lightsail 인스턴스 삭제(스냅샷 `class-planner-server-final-20260722` 보존)
- 2026-07-22: 죽은 SSH 배포 → pull 에이전트로 자동배포 재연결 (proposal `class-planner-autodeploy-reconnect`)

**결정된 사항 (변경 없음):**
- Self-hosted PostgreSQL/NextAuth 전환 기각 (결합도 높음, ADR-001)
- JSONB → 정규화 마이그레이션은 별도 Phase에서 진행 (ADR-002)
- 모니터링은 omni-radar 연동 방안 검토 중 (별도 스펙 필요)
