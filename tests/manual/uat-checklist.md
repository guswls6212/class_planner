# class-planner — User Acceptance Test (UAT) Checklist

**대상:** Release 전 사용자 시각 검증 + Smoke 즉석 spot-check.
**소요:** Smoke 10-15분 / Release UAT 150분.
**소유:** 1인 학원 운영자 (개발자 = 테스터) + Claude (자동 검증).
**모델:** Hybrid C — 매 PR 자동 e2e + Claude Playwright MCP / computer-use 자동 검증, 사용자 직접 UAT 는 Smoke (매 PR 직전) + Release UAT (분기/큰 리팩터 후) 두 시점만.

> **이 파일은 template.** 실제 결과는 `tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md` 사본에 기록 (§3 참조).
> 시나리오 본문의 **Quick Setup** 박스에 적힌 `uat.xxx()` 함수는 `localhost:3000` 진입 시 자동 노출 (콘솔 paste 0번).

---

## 사용법

### 0. 전체 흐름 (Quick Reference) — 빠뜨리지 말 것

#### 처음 1회만 (셋업)

1. `.env.local` 에 두 줄 추가:
   ```bash
   UAT_TEST_USER_EMAIL=uat-test@class-planner.test
   UAT_TEST_USER_PASSWORD=<강한-password>
   ```
2. `npm run uat:setup` — UAT 전용 user + academy 멱등 생성 (이미 있으면 skip).
3. `npm run dev` — `localhost:3000` 서버 띄움 (브라우저 열어둠).

#### Smoke 모드 매 사이클 (10-15분, 매 PR 직전 — 사본 X)

```bash
# ─ cwd 이동 (처음만) ─
cd ~/lee_file/entrepreneur/project/dev-pack/class-planner

# dev 서버 시작 (다른 터미널, 같은 cwd)
PORT=3000 npm run dev   # http://localhost:3000

# 브라우저 진입 후 콘솔 (F12)
# uat.clearAll();   ← 깨끗한 상태 보장
```

§2 의 **Smoke 5개 시나리오** (S-1.1, S-2.1, S-5.6, S-12.1, S-14.1) 즉석 진행. fail 발견 시 GitHub Issue 등록 — 사본/commit 없음. Pass 면 main 머지 진행.

#### Release UAT 모드 매 사이클 (150분, 분기 1회 — 사본 commit + PR)

```bash
# ─ 사전: cwd 를 class-planner 로 이동 (이후 모든 명령 이 cwd 기준) ─
cd ~/lee_file/entrepreneur/project/dev-pack/class-planner

# 0. dev 최신 동기화
git switch dev
git pull --ff-only origin dev

# 1. 새 branch cut (dev/main 직접 commit 금지 — § 브랜치 케이스 참조)
git switch -c chore/uat-$(date +%Y-%m-%d)-release

# 2. dev 서버 시작 (다른 터미널, 같은 cwd 에서)
PORT=3000 npm run dev   # http://localhost:3000

# 3. 사본 생성 — 메타(Build, 실행 일시) 자동 채움
bash scripts/uat-new.sh release
# → tests/manual/runs/<DATE>-<COMMIT>-release.md 생성됨

# 4. UAT_TEST_USER fresh-start cleanup (이전 사이클 잔재 academy 까지 모두 삭제)
#    → S-1.5 (첫 로그인 학원 자동 생성) 시나리오 매 사이클 자연 발동 보장
npm run uat:teardown
```

> **cwd 주의** — 위 명령들은 cwd 가 `class-planner` 디렉토리일 때 동작. 다른 곳에서 실행하면 `cannot change to 'class-planner'` 또는 `scripts/uat-new.sh: No such file` 에러. 사전 `cd ~/lee_file/entrepreneur/project/dev-pack/class-planner` 필수.

이후 그 **사본**을 에디터에서 열고 위에서부터 따라간다:

| 단계 | 어디서 | 무엇을 |
|---|---|---|
| 사전. cwd 이동 | 터미널 | `cd ~/lee_file/entrepreneur/project/dev-pack/class-planner` |
| 0. dev 최신 동기화 | 터미널 | `git switch dev && git pull --ff-only origin dev` |
| 1. 새 branch cut | 터미널 | `git switch -c chore/uat-YYYY-MM-DD-<mode>` |
| 2. dev 서버 시작 | 터미널 (다른 창, 같은 cwd) | `PORT=3000 npm run dev` |
| 3. 사본 생성 (Release UAT 만) | 터미널 | `bash scripts/uat-new.sh release` |
| 4. 사전 준비 (익명) | 브라우저 콘솔 | `uat.seed()` (익명 시드) 또는 `uat.clearAll()` (깨끗한 상태) |
| 5. 인증 셋업 (인증 시나리오 시) | 터미널 | `npm run uat:seed` → 브라우저에서 UAT_TEST_USER_EMAIL로 password 로그인 |
| 6. §1~§16 + Edge | 브라우저 | 시나리오 진행, `[ ]` → `[x]` (Pass) / `[!]` (Fail + note) / `[~]` (Skip + 사유) 기록 |
| 7. 인증 cleanup (인증 시나리오 끝) | 터미널 | `npm run uat:teardown` (academy/user 보존, scope 데이터만 삭제) |
| 8. 결과 commit | 터미널 | `git add tests/manual/runs/<file>.md && git commit -m "chore(uat): <메모>"` |
| 9. push + PR | 터미널 | `git push -u origin <branch>` + `gh pr create --base dev --title "chore(uat): <YYYY-MM-DD> <mode> run"` |
| 10. (선택) 추세 확인 | 터미널 | `bash scripts/uat-summary.sh` |

> **다른 cwd 에서 진행해야 한다면** (예: dev-pack workspace 루트) — `git` 명령은 `git -C ~/lee_file/entrepreneur/project/dev-pack/class-planner ...` 절대경로로, `npm`/`bash scripts/...` 는 `npm --prefix ~/...` 또는 사전 cd 후 실행. dev-pack/CLAUDE.md § Shell Command Conventions 참조.

> **본 `uat-checklist.md` 는 직접 수정 X** — 사본(`runs/<...>.md`)에 결과 기록.
> 사본 내용은 본 파일과 같지만 메타가 자동 채워진 버전.

#### 브랜치 선택 케이스

검증 대상에 따라 어디서 branch 를 cut 하느냐가 다름. UAT 사본의 commit hash 메타는 **그 시점 HEAD** 를 자동으로 박으므로, "검증할 코드가 있는 branch" 에서 실행해야 의미 있음.

| 검증 대상 | 어디서 cut | branch 이름 예시 |
|---|---|---|
| **dev 누적 변경** (가장 흔함, 매 dev → main 머지 전) | `dev` 최신 | `chore/uat-2026-05-07-release` |
| **특정 PR 검증** (그 PR 안전성 확인 — 머지 전) | 그 PR branch 그대로 (별도 cut 불필요) | (그 PR branch 자체) |
| **머지 직전 main 검증** (production 배포 전) | `main` 최신 | `chore/uat-2026-05-07-pre-main` |

**왜 dev/main 직접 X**:
- `class-planner/CLAUDE.md` § 브랜치 규칙 — main/dev 직접 commit 금지. UAT run 결과도 PR 거쳐야 시계열 보존 + review 가능.
- `bash scripts/uat-summary.sh` 가 git history 의 `chore(uat): ...` commit 들을 grep 해서 추세 분석. PR 통과한 것만 집계.

**임시 spot-check (commit 없이)**:
사본 생성 자체는 dev 에서 `bash scripts/uat-new.sh` 해도 untracked 파일로 만들어짐. 단 시계열 누적 가치 잃음 — 끝나면 새 branch 만들어 commit 권장.

#### 이전 cycle 사본이 untracked 로 남아 있다면

```bash
cd ~/lee_file/entrepreneur/project/dev-pack/class-planner

# 새 branch 로 옮겨 commit
git switch -c chore/uat-<원래-실행일>-release-late-commit
git add tests/manual/runs/<해당-run>.md
git commit -m "chore(uat): <원래-실행일> release run (late commit)"
git push -u origin chore/uat-<원래-실행일>-release-late-commit
gh -R guswls6212/class_planner pr create --base dev --title "chore(uat): <원래-실행일> release run"
```

---

### 1. 메타 기록

`scripts/uat-new.sh` 가 메타 두 줄(Build, 실행 일시)을 자동 채움. 나머지는 수동.

| 필드 | 값 |
|---|---|
| Build (commit hash) | `git rev-parse --short HEAD` |
| 실행 일시 | YYYY-MM-DD HH:MM |
| 실행자 | (이름) |
| 환경 | dev server (localhost:3000) / staging / prod |
| 뷰포트 | 데스크탑 1440×900 / 모바일 375×667 |

### 2. 실행 모드 선택 (Hybrid C 모델)

UAT 자체가 매 PR 60분이면 1인 환경 부담 → **자동화 가능 영역은 자동 e2e + Claude AI 검증으로 분산**. 사용자 직접 검증은 두 모드만:

| 모드 | 시간 | 시점 | 사본 |
|---|---|---|---|
| **Smoke** | 10-15분 | 매 PR (dev → main 머지 직전 또는 변경 큰 PR) | ❌ 즉석 spot-check, 사본 없음 |
| **Release UAT** | 150분 | 분기 1회 또는 큰 리팩터 후 | ✅ `runs/<DATE>-<COMMIT>-release.md` commit |

#### Smoke 5개 핵심 시나리오 (10-15분)

학원 운영자가 \"오늘 이게 안 되면 망함\" 시나리오만:

| # | 시나리오 | 무엇 |
|---|---|---|
| 1 | **S-1.1** | 비로그인 → 익명 진입 (앱 로딩 자체) |
| 2 | **S-2.1** | 학생 추가 (CRUD 핵심) |
| 3 | **S-5.6** | 모달 → 수업 추가 (시간표 핵심) |
| 4 | **S-12.1** | 새로고침 후 데이터 유지 (영속성) |
| 5 | **S-14.1** | 익명→로그인 시 충돌 모달 발동 (데이터 안전) |

회귀 의심 영역만 추가 cherry-pick — 변경 영역 따라.

#### Release UAT 시점 — 전체 (§1~§16 + Edge)

§2.5 Phase 가이드 (1→2→3→4→5→6→7) 따라 진행. 사본 commit + PR 로 시계열 보존.

#### 매 PR 자동 검증 (Smoke 보강)

본 UAT 와 별개로 매 PR 시 자동 진행:

| 도구 | 무엇 | 트리거 |
|---|---|---|
| **자동 e2e** (Playwright Chromium CI) | 코드 회귀 가드 | 매 push (CI) |
| **Claude Playwright MCP** | 변경 영역 자동 클릭/스크린샷 | UI 파일 변경 시 (CLAUDE.md UI Verification Protocol 의무) |
| **Claude computer-use MCP** | 시각적 변경 (모달/드래그/애니메이션) 탐험 | Playwright 로 어려운 시각 |

사용자 직접 검증은 위 자동화가 **못 잡는 시각 직감 + UX 위화감** 영역만.

### 2.5 실행 순서 가이드 (Phase 기반 — 상태 토글 최소화)

> **카테고리(§1~§16) 는 lookup 용, Phase 는 실행 순서.** 두 축으로 사용.
>
> 카테고리대로 위에서 아래 진행하면 state 토글이 잦음. §1은 2026-05-09에 §1.A(비로그인) → §1.B(transition) → §1.C(로그인) 그룹 구조로 재정렬됨. 다른 카테고리(§2~§16)는 7-Phase 흐름으로 묶어 진행하면 **상태 셋업 reset 1회씩**으로 끝남.

#### Phase 1 — 익명 모드 (비로그인, localStorage SSOT)
- **진입**: 콘솔 `uat.clearAll()` → 새로고침 → `uat.isAnonymous() === true`
- **시나리오 묶음**: S-1.1, S-1.4, §2 (학생), §3 (과목), §4 (강사), §5 (시간표 + 뷰 모드), §6 (드래그), §13 (색상), S-16.1, S-16.2, S-16.3, S-12.1
- **핵심 검증**: 서버 호출 0건 (Local-First 정책)
- **끝 상태**: 익명 모드 + 학생/과목/강사/세션 입력된 상태 → Phase 2 충돌 시드로 활용

#### Phase 2 — 익명 → 로그인 전환 (충돌 발생)
- **진입**: Phase 1 끝 상태 그대로 → UAT_TEST_USER 로그인 (`/login` → password) → 사전 시드된 서버 데이터와 충돌
- **사전 셋업**: `npm run uat:seed` (인증 데이터 미리 박아둠 — 충돌 발동 보장)
- **시나리오 묶음**: S-14.1~5 (DataConflictModal Layered Defense), S-14.7 (충돌 직전 자동 백업)
- **끝 상태**: 인증 모드 (한 쪽 데이터 선택 후 머지 완료)

> **신규 user 케이스 (S-1.5)**: 첫 로그인 시 충돌 X (서버 데이터 0) → 학원 자동 생성. 별도 user 또는 `npm run uat:teardown` 후 진행 (Phase 3 끝부분에 배치).

#### Phase 3 — 인증 모드 (서버 sync)
- **진입**: Phase 2 끝 상태 그대로
- **시나리오 묶음**: §7 (템플릿), §8 (PDF), §9 (공유), §10 (다중 Academy), S-12.2, S-12.3, S-14.6, S-14.8~13 (데이터 이력), §15 (출석부), 마지막에 S-1.5 (신규 user 학원 생성 — `uat:teardown` 후)
- **핵심 검증**: API POST/PUT 호출 발사 + 서버 sync 정확

#### Phase 4 — 모바일 뷰포트
- **진입**: 인증 모드 그대로 + DevTools `Cmd+Shift+M` (iPhone SE 375×667)
- **시나리오 묶음**: §11 (모바일 7개), S-5.21 (일별 뷰 좌우 스와이프)

#### Phase 5 — OAuth + 로그아웃/재인증
- **진입**: 인증 모드. OAuth 시나리오는 본인 Google 계정 1회 (Extended/Full 만). Kakao는 미구현이라 제외.
- **시나리오 묶음**: S-1.2 (Google OAuth), S-1.6 (로그인 → /login 접근), S-1.7 (로그아웃 → 재로그인), S-12.5 (API 401). (S-1.3 Kakao OAuth는 미구현 상태라 UAT 미포함)

#### Phase 6 — 오프라인 / Sync 회복
- **진입**: 인증 모드 + DevTools Network → Offline
- **시나리오 묶음**: S-12.4, S-12.6~9 (SyncQueueModal)

#### Phase 7 — Edge Cases
- **진입**: 시나리오마다 Pre 따로 (대부분 reset 필요)
- **시나리오 묶음**: E-1 ~ E-10

#### Phase 8 — Cleanup
- `npm run uat:teardown` (academy/user 보존, scope 데이터만 삭제)
- 결과 commit + push + PR (§0 "매 UAT 사이클" 8~9 단계)

#### 모드별 Phase 매핑

| 모드 | 거치는 Phase | 비고 |
|---|---|---|
| **Core (60분)** | 1 → 2 → 3 → 6 (각 Phase 의 P0 만) | dev → main 머지 전 핵심 path |
| **Extended (110분)** | Core + 4 + 5 (OAuth 본인 계정 1회) | PR 이 모바일/인증 영역 영향 시 |
| **Full (150분)** | 1 → 2 → 3 → 4 → 5 → 6 → 7 (전체 + Edge) | 분기당 1회 + 큰 리팩터 후 |

#### 비유

지하철 노선도 — 한 노선(Phase) 안에서는 같은 방향으로 진행, 환승(상태 토글)은 정해진 지점(Phase 경계)에서만. 시나리오 ID 는 **역 이름** (불변), Phase 는 **노선** (실행 순서).

### 3. 결과 기록 규칙

**Smoke 모드** — 사본/commit X. fail 시 GitHub Issue 등록만 (제목: `[UAT Smoke Fail] S-X.Y 시나리오`).

**Release UAT 모드** — 사본 commit + PR 통해 시계열 누적.

```bash
# (Release UAT 만) 새 실행 인스턴스 생성
bash scripts/uat-new.sh release

# 끝나면 commit + push + PR
git add tests/manual/runs/<file>.md
git commit -m "chore(uat): 2026-05-07 release run — N/N P0 pass"
git push -u origin chore/uat-$(date +%Y-%m-%d)-release
gh -R guswls6212/class_planner pr create --base dev --title "chore(uat): 2026-05-07 release run"

# 추세 확인 (Release UAT 누적만)
bash scripts/uat-summary.sh
```

기록 표기:

- `[ ]` → 실행 전
- `[x]` → Pass
- `[!]` → Fail (note 필수: 어떤 단계에서 어떤 결과가 났는지)
- `[~]` → Skip (skip 사유 필수)

**그린라이트 기준** (Hybrid C):
- main 머지 직전 — Smoke 5개 Pass + 매 PR 자동 e2e + Claude Playwright MCP Pass 조합
- Release (분기/큰 리팩터) — Release UAT P0 33개 모두 Pass

자동 e2e 마이그레이션 후보는 `[auto-friendly]` 라벨 — Hybrid C 모델에선 이 시나리오들이 매 PR **Claude Playwright MCP 자동 검증 대상** 이라 사용자 수동에서 점진 제외.

### 4. 사전 준비 (Core Path 시작 전)

```
1. dev 서버 시작
   cd class-planner && npm run dev → http://localhost:3000

2. localhost 진입 — window.uat 자동 노출
   → layout.tsx가 NODE_ENV=development 분기로 /uat/console-tools.js 자동 inject
   → DevTools 콘솔에서 window.uat 즉시 사용 가능 (paste 0번)
   → console에 "[uat] window.uat 노출됨: [...]" 로그 보이면 OK
```

**Quick Setup** (콘솔에서 한 줄씩):

```js
// 익명 모드 깨끗한 상태 (⚠️ localStorage/세션/쿠키 모두 삭제됨)
uat.clearAll();

// 익명 모드 시드 (학생 3 / 과목 2 / 강사 2 / 세션 3 — 30초)
//   학생: 홍길동 / 김영수 / 박지수
//   과목: 수학 #FF0000 / 영어 #00FF00
//   강사: 김선생 #6366f1 / 이선생 #0891b2
//   세션: 월/수/금 09:00-10:00 — 수학 + 홍길동 + 김선생
uat.seed();
```

> 인증 모드 시나리오 (S-1.5, S-2.1 API, S-7.x 등)는 §5 참조.

### 5. UAT 전용 계정 (인증 시나리오용)

#### 첫 1회 셋업

`.env.local` 에 **두 줄만** 추가:
```bash
UAT_TEST_USER_EMAIL=uat-test@class-planner.test
UAT_TEST_USER_PASSWORD=<강한 password>
```

그리고:
```bash
npm run uat:setup
# → user 만 멱등 생성 (academy 는 매 사이클 fresh-start 위해 셋업 X)
# → 출력의 user_id 는 자동 lookup 되니 .env.local 에 적을 필요 없음
#   (lookup 100ms 줄이려면 선택적으로 UAT_TEST_USER_ID 만 추가)
```

> **2026-05-07 변경** — 이전엔 setup 이 academy 도 만들었지만 매 사이클 academy 보존
> 모델이 S-1.5 (첫 로그인 학원 자동 생성) 시나리오 재현 못 함. 사용자 결정으로
> fresh-start default 로 전환 — setup 은 user 만, academy 는 매 사이클 재생성
> (S-1.5 또는 uat:seed 가 자동 생성).

#### 매 UAT 사이클 (인증 시나리오 진행 시)

```bash
# 1. fresh-start cleanup (이전 사이클 academy/scope 모두 삭제, user 보존)
npm run uat:teardown
# → S-1.5 매 사이클 자연 발동 보장

# 2. 시나리오 진행 두 옵션:

# (a) S-1.5 검증부터 — Phase 1 (익명) → Phase 2 (로그인 → S-1.5 발동 = 학원 자동 생성)
#     → 인증 시나리오 (시드 데이터 없이 직접 입력)
#     브라우저: UAT_TEST_USER_EMAIL 로 password 로그인 → /onboarding → 학원 생성

# (b) S-1.5 skip + 시드로 빠른 진입 — academy + 학생/과목/강사/세션 자동 시드
npm run uat:seed
# → academy 없으면 자동 생성 + 시드 데이터 INSERT (멱등)
#   학생: 홍길동 / 김영수 / 박지수 — 과목: 수학(#FF0000) / 영어(#00FF00)
#   강사: 김선생 / 이선생 — 세션: 월/수/금 09:00-10:00

# 3. 끝나면 fresh-start cleanup (다음 사이클 위해)
npm run uat:teardown
```

> **OAuth 시나리오 (S-1.2)**: UAT user는 password auth로 진입. OAuth 흐름 자체 검증은 본인 Google 계정으로 별도 1회 (Extended/Full 모드만). Kakao OAuth는 미구현이라 UAT 제외.

> **e2e 와 격리**: `UAT_TEST_USER_*` 와 `E2E_TEST_USER_*` 별도. 같은 Supabase 프로젝트지만 user_id 단위로 cleanup이 격리되어 있어 동시 실행 시에도 서로 데이터 안 건드림.

### 6. 사전 준비 — 정리

| 모드 | 정리 명령 |
|---|---|
| 익명 (콘솔) | `uat.clearAll()` |
| 인증 (UAT user) | `npm run uat:teardown` |

---

## 1. Auth & 학원 셋업 (P0: 2 / 6) [40분 Core 포함]

> **순서 정책 (2026-05-09 갱신)** — 비로그인/로그인 state 토글이 잦으면 매번
> `npm run uat:teardown`/재로그인 비효율. **비로그인 그룹 → transition → 로그인
> 그룹** 순으로 진행하면 state 셋업이 1회씩.
>
> - **§1.A 비로그인 그룹**: S-1.1, S-1.4
> - **§1.B Transition (비로그인 → 로그인)**: S-1.5 (첫 로그인 + 학원 생성, anonymous → server 마이그 자연 검증)
> - **§1.C 로그인 그룹**: S-1.2, S-1.6, S-1.7
>
> S-1.3 Kakao OAuth는 **미구현** 상태라 UAT 시나리오에서 제외.

### §1.A 비로그인 그룹

### S-1.1 비로그인 → 로그인 리디렉트 [P0] [auto-friendly]
**Pre:** 비로그인 상태 (localStorage `supabase_user_id` 없음)

**Quick Setup**:
```js
uat.clearAll();              // 깨끗한 상태 보장
// 새로고침 후 콘솔에서 확인:
uat.isAnonymous();           // → true
```

**Steps:**
1. 직접 URL `http://localhost:3000/schedule` 접속
**Expected:**
- 익명 모드 시간표 화면 진입 (로그인 강제 X — 익명 사용 가능 정책)
- 사이드바 메뉴 마지막("강사" 아래) "로그인" 링크 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.4 익명 사용자 모드 [P1] [auto-friendly]
**Pre:** 비로그인 상태

**Quick Setup**:
```js
uat.clearAll();              // 깨끗한 상태
// 시나리오 실행 후 검증:
uat.inspect();               // 학생/과목/세션 카운트 확인
uat.countAPIcalls('/api/sessions') === 0;  // → true (서버 호출 0건)
```

**Steps:**
1. `/schedule`에서 학생/과목/강사/수업 추가 (모달 step 2 인라인 "＋" / "＋ 새 강사")
2. 새로고침
**Expected:**
- 데이터 localStorage `classPlannerData:anonymous`에 유지
- 서버 호출 없음 (Network 탭에 `/api/sessions` POST 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

### §1.B Transition (비로그인 → 로그인)

### S-1.5 첫 로그인 — 학원 자동 생성 [P0]
**Pre:** S-1.4 직후 (anonymous에 데이터 있음) + 신규 사용자 (academy_members row 없음). 재현 방법 — `npm run uat:teardown` 으로 UAT_TEST_USER 의 academy 까지 cleanup → 그 user 로 로그인 시 신규 사용자 상태. 또는 별도 신규 OAuth 계정 사용.
**Steps:**
1. OAuth 로그인 후 `/onboarding` 진입
2. 학원명 입력 (2자 이상)
3. "학원 생성" 클릭
**Expected:**
- **`/students` 라우팅** (학원 생성 직후 학생 등록 안내가 자연스러운 흐름이라는 설계 의도 — `docs/superpowers/plans/2026-04-14-onboarding-flow.md` 참조. 익명/재방문은 `/schedule`로 가지만 신규 학원 생성 직후만 `/students`로 의도적 분기)
- 사이드바 상단에 학원명 + Academy Switcher 표시
- API `/api/academies` POST 성공 (Network 확인)
- **anonymous → server 자동 마이그 (`upload-local` 경로) 트리거** (PR #294 fix). 충돌 모달은 server 비어있어 안 뜨는 게 정상. PR #295 후엔 마이그 직후 "시간표가 새로 갱신되었어요" 토스트 false positive 발화 안 함.

**검증 방법** (DevTools 콘솔 — userId + activeAcademyId 둘 다 set 됐는지):
```js
const userId = localStorage.getItem('supabase_user_id');
console.log('userId:', userId);                                 // UUID
console.log('activeAcademy:', localStorage.getItem(`active_academy:${userId}`));  // academy UUID
// 또는 쿠키 확인
document.cookie.match(/active_academy_id=([^;]+)/)?.[1];        // academy UUID
// anonymous 데이터가 server로 마이그됐는지 (학생 카운트 ≥1)
fetch(`/api/students?userId=${userId}`).then(r => r.json()).then(j => console.log('server students:', j.data?.length));
```
**Result:** [ ] Pass [ ] Fail — note: ___

### §1.C 로그인 그룹

### S-1.2 Google OAuth 로그인 [P1]
**Pre:** 비로그인 상태 (S-1.5 끝나고 로그아웃 후 또는 별도 진입)
**Steps:**
1. `/login` 접속
2. "Google로 로그인" 버튼 클릭
3. Google 계정 선택
**Expected:**
- OAuth 콜백 후 `/schedule` 또는 `/onboarding` 라우팅
- localStorage에 `supabase_user_id` 저장
- 사이드바 하단에 이메일 표시

**검증 방법** (셋 중 아무거나, DevTools 콘솔):
```js
// 1. uat helper (간단)
uat.isAnonymous();                            // → false (로그인됨)

// 2. 직접 키 확인
localStorage.getItem('supabase_user_id');     // → "uuid-string" (null 아님)

// 3. 시각 확인 — F12 → Application 탭 → Local Storage
//    → http://localhost:3000 선택 → supabase_user_id row 에 UUID 값 표시
```
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.6 로그인 상태 → /login 접근 [P2]
**Pre:** 로그인 + active academy 상태
**Steps:**
1. `/login` 직접 URL 입력
**Expected:**
- 자동으로 `/schedule` 리다이렉트 (이미 로그인된 사용자)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.7 로그아웃 → 재로그인 [P2]
**Pre:** 로그인 상태

**Quick Setup** (대안 — 로그아웃 버튼 GUI 대신 토큰 강제 만료로 같은 효과 검증):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
```

**Steps:**
1. 사이드바 하단 이메일 → "로그아웃"
2. 새로고침
3. 다시 OAuth 로그인
**Expected:**
- 로그아웃 후 익명 모드 (localStorage `supabase_user_id` + 3개 쿠키 정리됨)
- 재로그인 시 이전 데이터 복원

**검증 방법** (DevTools 콘솔):
```js
// 로그아웃 직후:
uat.isAnonymous();                            // → true (익명 복귀)
localStorage.getItem('supabase_user_id');     // → null

// 재로그인 후:
uat.isAnonymous();                            // → false
localStorage.getItem('supabase_user_id');     // → 이전과 동일 UUID
```
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 2. 학생 관리 (P0: 1 / 6) [Core 포함]

### S-2.1 학생 추가 [P0] [auto-friendly]
**Pre:** `/students` 진입

**Quick Setup** (인증 모드 API 호출 검증):
```js
const before = uat.countAPIcalls('/api/students');
// 학생 추가 후
const after  = uat.countAPIcalls('/api/students');
console.log('새 호출 수:', after - before);  // ≥1
```

**Steps:**
1. 입력란에 "테스트학생" 입력
2. Enter 또는 "추가" 클릭
**Expected:**
- 좌측 목록에 "테스트학생" 즉시 추가
- 입력란 비워짐
- 인증 사용자: Network에 `/api/students` POST 발사
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.2 학생 검색 [P1] [auto-friendly]
**Pre:** 학생 3명 이상 등록
**Steps:**
1. 검색 입력란에 "홍" 입력
**Expected:**
- "홍길동"만 표시, 나머지 학생 숨김
- 검색 클리어 시 전체 복원
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.3 학생 상세 보기 [P1] [auto-friendly]
**Pre:** 학생 1명 이상
**Steps:**
1. 학생 항목 클릭
**Expected:**
- 우측 패널에 이름/학년/학교/연락처/생년 표시
- 데스크탑: 분할 뷰 / 모바일: 우측 패널 단독 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.4 학생 정보 편집 [P1] [auto-friendly]
**Pre:** 학생 상세 패널 열림
**Steps:**
1. "편집" 버튼
2. 학년 "고1" 입력
3. "저장"
**Expected:**
- 즉시 패널에 반영
- 새로고침 후에도 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.5 학생 삭제 [P1] [auto-friendly]
**Pre:** 학생 상세 패널 열림
**Steps:**
1. "삭제" 버튼
2. 확인 모달에서 "삭제"
**Expected:**
- 좌측 목록에서 즉시 제거
- 해당 학생 enrollment도 함께 정리 (시간표에서 학생 미표시)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.6 학생 0명 시 placeholder [P2]
**Pre:** 모든 학생 삭제 후
**Steps:**
1. `/students` 진입
**Expected:**
- "등록된 학생이 없습니다" 같은 placeholder 텍스트
- 우측 패널 빈 상태 안내
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.7 학생 상세 등록 모달 [P1] (PR #289)
**Pre:** `/students` 진입
**Steps:**
1. 헤더 "+ 상세 등록" 클릭 → StudentAddDetailModal 표시
2. 이름만 입력 → "추가" → 모달 닫힘 + 학생 등록
3. 다시 "+ 상세 등록" → 이름 + 성별(남/여) + 생년월일 입력 → "추가"
**Expected:**
- 이름 비었을 때 "추가" 버튼 disabled
- "권장" 라벨이 성별/생년월일 옆에 인디고 칩
- 안내: "성별/생년월일은 동명이인 식별과 정확한 데이터 동기화에 사용됩니다"
- 4글자 초과 입력 시 잘림, 중복 이름 시 alert role 에러 메시지
- 등록 후 detail panel에 입력한 메타가 정확히 반영
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.8 학생 빈 메타 hint (ⓘ) [P1] (PR #290)
**Pre:** `/students`에 학생 2명 — 1명은 이름만, 1명은 성별+생년월일 모두 채움
**Steps:**
1. 목록 행 비교
**Expected:**
- 이름만 등록한 학생 행 → 이름 옆에 ⓘ 인디고 칩 표시
  - title="성별/생년월일을 추가하면 동명이인 식별과 데이터 동기화가 더 정확해집니다"
  - aria-label="프로필 정보 보강 가능"
- 메타가 모두 채워진 학생 행 → ⓘ 칩 미표시
- detail panel에서 메타 입력 후 목록으로 돌아오면 ⓘ 자연 사라짐
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 3. 과목 관리 (P0: 1 / 6) [Core 포함]

### S-3.1 과목 빠른 추가 (ListFilterBar) [P0] [auto-friendly]
**Pre:** `/subjects` 진입
**Steps:**
1. 좌측 검색창에 이름 "수학" 입력
2. Enter 또는 `+ 추가` 버튼 클릭
**Expected:**
- 목록에 즉시 추가 (`SUBJECT_DEFAULT_COLOR = #3B82F6` 자동)
- 성공 토스트 1개: "'수학' 과목을 추가했습니다."
- 같은 이름 검색어로 재시도 시 첫 매치 select + 안내 토스트 (과목은 동명이인 개념 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.2 과목 상세 등록 — 색상 팔레트 [P1] (PR #340)
**Pre:** `/subjects` 진입
**Steps:**
1. 좌측 헤더 우측 `+ 상세 등록` 클릭 → 모달 표시
2. 이름 "고등영어" 입력
3. 9색 팔레트 중 violet swatch 클릭
4. "추가"
**Expected:**
- 모달 닫힘 + 목록에 violet 색상 dot으로 추가
- 성공 토스트 1개: "'고등영어' 과목을 추가했습니다."
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.3 과목 편집 [P1] [auto-friendly]
**Pre:** 과목 1개 선택
**Steps:**
1. "편집" → 이름/색상 수정 → 저장
**Expected:**
- 시간표 모든 해당 세션의 색상도 즉시 변경 (colorBy=과목 모드)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.4 과목 삭제 [P1] [auto-friendly]
**Pre:** 과목에 연결된 세션 있음
**Steps:**
1. 과목 삭제
**Expected:**
- 해당 세션 처리 정책 확인 (앱이 제거하는지, "미지정"으로 표시하는지)
- 데이터 일관성 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.5 과목 상세 등록 — hex 직접 입력 [P2] (PR #340)
**Pre:** `/subjects` 헤더 `+ 상세 등록` → 모달 표시
**Steps:**
1. 이름 "테스트" 입력
2. hex 입력란에 `#3B82F6` 직접 입력
3. "추가"
**Expected:**
- 유효 hex: 모달 닫힘 + 해당 색상 dot으로 추가
- 잘못된 형식 (예: `not-a-color`): alert role 에러 메시지 ("올바른 색상 형식이 아닙니다.")
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.6 토스트 중복 회귀 가드 [P1] (ADR-014, PR #338/#339)
**Pre:** `/subjects` 진입
**Steps:**
1. 빠른 추가로 새 이름 (예: "회귀체크") + Enter
2. 헤더 `+ 상세 등록`으로 다른 이름 (예: "회귀체크2") + 추가
**Expected:**
- 두 경로 모두 **토스트 1개만** 노출 (이전 회귀: hook + layout 양쪽이 발화해 2개 노출)
- 학생/강사 페이지에서도 같은 가드 적용 (S-2.x, S-4.x 함께 점검)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 4. 강사 관리 + 담당 과목 (P0: 1 / 8)

### S-4.1 강사 추가 [P0]
**Pre:** `/teachers` 진입
**Steps:**
1. "강사 추가" → 이름 "김선생" 입력
2. "추가"
**Expected:**
- 목록에 추가
- 자동 색상 할당 (DEFAULT_TEACHER_COLORS 8색 순환)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.2 색상 자동 할당 순환 [P1]
**Pre:** 강사 0명
**Steps:**
1. 강사 9명 연속 추가
**Expected:**
- 1~8번째: DEFAULT_TEACHER_COLORS 순서대로
- 9번째: 다시 1번 색상으로 wrap
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.3 강사 색상 커스텀 [P2]
**Pre:** 강사 1명 등록
**Steps:**
1. 강사 편집 → 팔레트 또는 hex 직접 입력
**Expected:**
- 시간표에서 colorBy=강사 모드로 보면 색상 변경 즉시 반영
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.4 강사 정보 편집 [P1]
**Pre:** 강사 1명
**Steps:**
1. 이름/연락처/메모 편집 → 저장
**Expected:**
- 시간표 SessionCard 강사명 즉시 갱신
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.5 강사 삭제 [P1]
**Pre:** 강사 1명 + 그 강사 배정 세션 1개
**Steps:**
1. 강사 삭제
**Expected:**
- 세션의 teacherId가 null로 정리됨
- SessionCard에 "강사 미배정" 또는 빈 상태 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.6 담당 과목 M:N 연결 [P1]
**Pre:** 강사 1명 + 과목 2개
**Steps:**
1. 강사 상세 → "담당 과목" 섹션 → 과목 2개 모두 체크
**Expected:**
- TeacherDetailPanel에 칩 형태로 2개 과목 표시
- 시간표 수업 추가 시 강사 선택하면 해당 과목만 후보로 필터링 (정책 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.7 주간 수업 카운트 [P2]
**Pre:** 강사 1명 + 그 강사 주간 3회 배정
**Steps:**
1. 강사 상세 패널
**Expected:**
- "주간 3회" 메타 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.8 TeacherStatusPill 6-state 표시 [P2]
**Pre:** 다양한 상태 강사 (active/invite_pending/invite_expired/share_only/share_expired/inactive)
**Steps:**
1. 강사 목록의 각 상태 칩 확인
**Expected:**
- 색상/아이콘이 상태마다 구분되게 표시
- 마우스 hover tooltip으로 상태 설명
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.9 강사 상세 등록 모달 [P1] (PR #289)
**Pre:** `/teachers` 진입
**Steps:**
1. 헤더 "+ 상세 등록" 클릭 → TeacherAddDetailModal 표시
2. 이름만 입력 → "추가" → 모달 닫힘 + 강사 등록
3. 다시 "+ 상세 등록" → 이름 + 이메일 (`test@academy.com`) + 전화 (`010-1234-5678`) → "추가"
4. 잘못된 이메일 형식 (`not-an-email`) → "추가" 시도
**Expected:**
- 이름 비었을 때 "추가" 버튼 disabled
- "권장" 라벨이 이메일/전화 옆 인디고 칩
- 잘못된 이메일 형식 시 alert role 에러 메시지 ("올바른 이메일 형식이 아닙니다")
- 대소문자 무관 중복 이름 검사 (e.g., "Park"이 있으면 "park"도 막힘)
- 등록 후 detail panel에 입력한 메타가 정확히 반영
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.10 강사 빈 메타 hint (ⓘ) [P1] (PR #290)
**Pre:** `/teachers`에 강사 2명 — 1명은 이름만, 1명은 이메일+전화 모두 채움
**Steps:**
1. 목록 행 비교
**Expected:**
- 이름만 등록한 강사 행 → 이름 옆에 ⓘ 인디고 칩 표시
  - title="이메일/전화번호를 추가하면 운영 정보가 충실해집니다"
  - aria-label="연락처 정보 보강 가능"
- 메타가 모두 채워진 강사 행 → ⓘ 칩 미표시
- detail panel에서 메타 입력 후 목록으로 돌아오면 ⓘ 자연 사라짐
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 5. 시간표 — 수업 추가/편집/삭제 + 뷰 모드 (P0: 10 / 21) [Core 포함]

### S-5.1 FAB 클릭 → 모달 열림 [P0] [auto-friendly]
**Pre:** `/schedule`
**Steps:**
1. 우측 하단 FAB ("+") 클릭
**Expected:**
- GroupSessionModal 3-step Stepper 열림 (Step 1: 학생)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.2 학생 선택 (Step 1) [P0] [auto-friendly]
**Pre:** 모달 Step 1
**Steps:**
1. 학생 이름 검색 입력
2. 후보에서 클릭 → chip 추가
3. 여러 학생 추가 가능
4. "다음" 클릭
**Expected:**
- chip으로 선택 상태 표시
- chip "x" 클릭 시 해제
- "다음" 버튼은 1명 이상 선택 시 활성화
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.3 새 학생 on-the-fly [P0]
**Pre:** Step 1, 미등록 이름 입력
**Steps:**
1. 입력란에 "신규학생" (미등록 이름)
2. CTA "+ '신규학생' 새 학생으로 추가" 표시
3. CTA 클릭
**Expected:**
- 학생 즉시 생성 + 선택된 chip으로 추가
- 학생 목록에도 영구 등록
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.4 과목/강사/시간 선택 (Step 2) [P0] [auto-friendly]
**Pre:** Step 2
**Steps:**
1. 과목 select → "수학"
2. 강사 select → "김선생"
3. 요일 → "월"
4. 시간 → "09:00 ~ 10:00"
5. "다음"
**Expected:**
- 모든 입력 보존 + Step 3 진입
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.5 시간 range 검증 [P1]
**Pre:** Step 2 시간 입력
**Steps:**
1. 시작시간 09:00, 종료 08:00 (역순)
**Expected:**
- 에러 메시지 또는 자동 보정
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.6 확인 + 추가 (Step 3) [P0] [auto-friendly]
**Pre:** Step 3 요약 카드
**Steps:**
1. 요약 확인 (학생/과목/강사/시간)
2. "수업 추가" 클릭
**Expected:**
- 시간표 해당 셀에 SessionCard 즉시 생성
- 모달 닫힘
- 인증 사용자: `/api/sessions` POST + `/api/enrollments` POST
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.7 시간표에 블록 표시 [P0]
**Pre:** S-5.6 직후
**Steps:**
1. 시간표 해당 시간대 확인
**Expected:**
- 색상: colorBy 모드에 맞게 (과목/학생/강사 색상)
- 텍스트: 과목명 + 시간 + 학생 (최대 8명, 초과 시 "외 N명")
- 강사명 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.8 세션 편집 모달 열기 [P1]
**Pre:** 기존 세션 1개
**Steps:**
1. SessionCard 클릭
**Expected:**
- EditSessionModal 열림 (학생/과목/강사/시간 prefill)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.9 세션 수정 저장 [P1]
**Pre:** EditSessionModal 열림
**Steps:**
1. 시간 09:00 → 10:00으로 변경
2. "저장"
**Expected:**
- 시간표 즉시 새 위치로 이동
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.10 세션 삭제 [P1] [auto-friendly]
**Pre:** SessionCard 우측 메뉴
**Steps:**
1. "..." → "삭제"
2. 확인 모달
**Expected:**
- 시간표에서 즉시 제거
- 인증: `/api/sessions/:id` DELETE
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.11 같은 시간대 중복 수업 [P1]
**Pre:** 09:00-10:00에 수학(홍길동)
**Steps:**
1. 같은 09:00-10:00에 영어(김영수) 추가
**Expected:**
- 두 세션이 lane 분할되어 나란히 표시
- 텍스트 잘림 없이 가독성 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.12 다중 선택 → 일괄 삭제 [P2]
**Pre:** 세션 3개
**Steps:**
1. Cmd+클릭 (mac) / Ctrl+클릭 (win)으로 3개 선택
2. "삭제" 키 또는 일괄 삭제 메뉴
**Expected:**
- 선택 표시 (테두리/하이라이트)
- 일괄 삭제 모달 → 확인 → 모두 제거
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.13 모달 Step 2 — 과목 인라인 "＋" 추가 [P0] ⚠️ PR #257
**Pre:** 모달 Step 2 (과목 & 시간) 진입, 과목 select dropdown 빈 상태 또는 임의 상태
**Steps:**
1. 과목 select 옆 dashed amber "＋" 버튼 클릭
2. 인라인 row 표시 — 이름 input + 색상 미리보기
3. "수학" 입력 → Enter 또는 "생성" 클릭
**Expected:**
- 과목 즉시 생성 (자동 색상 — `getNextUnusedColor` 미사용 색 우선 할당, 소진 시 modulo)
- select 자동 갱신 + 새 과목이 선택값으로 set
- 인라인 row 자동 닫힘
- 인증: `/api/subjects` POST 호출 발사
- 익명: localStorage `classPlannerData:anonymous` 갱신, 서버 호출 없음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.14 모달 Step 2 — 강사 "＋ 새 강사" pill 추가 [P0] ⚠️ PR #257
**Pre:** 모달 Step 2, 강사 pill picker 영역
**Steps:**
1. TeacherPillPicker에 "＋ 새 강사" pill 클릭
2. 인라인 row → 이름 입력 → Enter 또는 "생성"
**Expected:**
- 강사 즉시 생성 (DEFAULT_TEACHER_COLORS 8색 중 미사용 우선 할당)
- pill list에 새 강사 pill 추가 + 자동 선택 (aria-pressed=true)
- 인라인 row 자동 닫힘 + 인풋 비워짐
- 인증: `/api/teachers` POST 호출
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.15 모달 Step 2 — member 역할 시 "＋" 숨김 [P1] ⚠️ PR #257 RBAC
**Pre:** member 역할 사용자 + 모달 Step 2
**Steps:**
1. FAB → 모달 진입 → Step 2
**Expected:**
- 과목 select 옆 dashed amber "＋" 버튼 미렌더 (canManage=false)
- "＋ 새 강사" pill 미렌더 — 기존 pill만 표시
- 기존 과목/강사 선택만 가능
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.16 일별 뷰 토글 [P0]
**Pre:** `/schedule` 주간 뷰
**Steps:**
1. SegmentedButton "일별" 클릭
**Expected:**
- ScheduleDailyView 렌더 — 그 날 세션 시간순(`startsAt` localeCompare) 정렬 list
- 상단에 DayChipBar (월~일 7 chip + 그 주 날짜) 표시
- 세션 카드는 SessionCard molecule, colorBy 모드 적용
- 빈 상태 시 적절한 placeholder
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.17 월별 뷰 토글 [P0]
**Pre:** `/schedule`
**Steps:**
1. SegmentedButton "월별" 클릭
**Expected:**
- ScheduleMonthlyView 렌더 — Mon-based 7×N 달력 격자
- 첫 줄: 월/화/수/목/금/토/일 헤더
- 각 날 cell(`MonthDayCell`)에 그 날 세션 미니 표시 (카운트 또는 dot)
- 인접 달 날짜는 muted 표시 (currentMonth 비교)
- 오늘 cell 강조
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.18 DayChipBar — 요일 선택 [P1]
**Pre:** 일별 뷰 진입
**Steps:**
1. DayChipBar에서 다른 요일 chip 클릭
**Expected:**
- selectedWeekday 변경 + 그 요일 세션 표시로 갱신
- 선택된 chip — accent 배경 + 흰 텍스트 (aria-pressed=true)
- 오늘 chip — active 아닐 때도 accent 색상 강조 (구별 가능)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.19 ScheduleDateNavigator — 다음/이전/오늘 [P1]
**Pre:** 주간 또는 일별 뷰
**Steps:**
1. ▶ (다음) 클릭 → 다음 주(또는 일/월)
2. ◀ (이전) 클릭 → 이전 주
3. "오늘" 버튼 클릭
**Expected:**
- 라벨 갱신 ("5월 2주" / "2026-05-08 (목)" / "2026년 5월" 등 뷰 모드별)
- 시간표 데이터 그 주의 세션으로 갱신
- "오늘" 클릭 시 오늘 포함된 주/일/월로 jump
- 모든 navigation에서 lossless (이동 후 돌아와도 데이터 동일)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.20 월별 뷰 → 일별 drill-down [P2]
**Pre:** 월별 뷰
**Steps:**
1. 임의 날짜 cell 클릭 (`onDayClick`)
**Expected:**
- 일별 뷰로 자동 전환 + 그 날짜로 selectedWeekday 설정
- 또는 그 날 세션 popover 표시 (구현 정책에 따라)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.21 일별 뷰 좌우 스와이프 — 모바일 [P2]
*(기존 시나리오 본문 보존 — 갱신 없음)*

### S-5.22 시간 범위 경계 걸침 세션 양쪽 표시 [P1] (PR #284, 2026-05-08)
**전제:** P3 default + UAT_TEST_USER 학원 + 학생/과목 1쌍 시드 (`uat.seed`).

1. FAB → 한 학생 + 11:30 ~ 16:30 + 임의 weekday 수업 1개 추가.
2. 좌하단 ScheduleFloatingToolbar의 `9-23시 ▾` 클릭 → "오전반 (7-13)" 선택.
   - 기대: 11:30 부터 13:00까지 잘린 모습으로 보이고, **블록 하단에 어두운 그라데이션 cap** 보인다 ("이어짐" 시각 단서).
3. 다시 같은 메뉴에서 "오후반 (13-22)" 선택.
   - 기대: 13:00 부터 16:30까지 보이고, **블록 상단에 그라데이션 cap** 보인다.
4. "9-23시" (default) 로 돌리면 11:30-16:30 전체가 cap 없이 표시.
- 검증: cap 시각이 자연스럽게 "범위 밖에도 이어짐"을 인지시키는가.

### S-5.23 학생/과목/강사 AND 필터 dim 통일 [P1] (PR #284, 2026-05-08)
**전제:** 학생 ≥ 2명, 과목 ≥ 2개, 강사 ≥ 2명, 세션 ≥ 4개 시드.

1. 좌하단 `필터 ▾` 클릭 → 학생 1명 chip 선택.
   - 기대: 매칭 세션은 색상 ring glow + 앞 lane, 비매칭 세션은 `opacity 0.25` dim.
2. 같은 popover에서 과목 1개 추가 chip 선택.
   - 기대: 학생 + 과목 둘 다 매칭하는 세션만 ring glow, 한쪽만 매칭은 dim.
3. 강사 1명 chip 추가 선택 (3 entity AND).
   - 기대: 셋 다 매칭하는 세션만 ring glow + 앞 lane. 나머지 모두 dim.
4. 강사 chip만 해제 → 학생 + 과목 매칭 동작으로 돌아가며 dim 패턴 유지.
- 검증: dim된 블록 가독성 (너무 어둡지 않은가). 매칭 ring glow가 시선에 자연스럽게 들어오는가. 강사 필터가 학생/과목과 시각적 일관성을 유지하는가.
**Pre:** 모바일 뷰포트(375×667) + 일별 뷰
**Steps:**
1. 화면 좌측으로 스와이프 (≥50px)
2. 화면 우측으로 스와이프
**Expected:**
- 좌 스와이프 → 다음 요일 (`onSwipeLeft`)
- 우 스와이프 → 이전 요일 (`onSwipeRight`)
- 세로 스와이프와 구분 (Math.abs(dx) > Math.abs(dy))
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 6. 시간표 — 드래그/충돌/멀티선택 (P0: 2 / 10)

### S-6.1 드래그로 시간 이동 [P0]
**Pre:** 세션 1개 (월 09:00-10:00)
**Steps:**
1. SessionCard drag handle을 월 11:00 셀로 드래그
2. drop
**Expected:**
- 세션이 월 11:00-12:00로 즉시 이동
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.2 드래그 후 동기화 [P0]
**Pre:** 인증 모드
**Steps:**
1. S-6.1 실행
**Expected:**
- Network 탭에 `/api/sessions/:id` PUT 호출 발사
- response 200/201
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.3 드래그 중 미리보기 [P1]
**Pre:** 드래그 진행 중
**Steps:**
1. 드래그 시작 → 마우스 이동
**Expected:**
- 드롭 가능 위치에 반투명 preview 표시
- 원본 SessionCard는 살짝 흐려짐(opacity)
- preview는 pointer-events: none (클릭 안 됨)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.4 드래그 취소 (Escape) [P2]
**Pre:** 드래그 중
**Steps:**
1. 드래그 도중 Escape 키
**Expected:**
- 원래 위치로 돌아감
- API 호출 없음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.5 Cmd+드래그 (복사) [P1]
**Pre:** 세션 1개
**Steps:**
1. Cmd 누른 채 SessionCard 드래그 → 다른 시간대 drop
**Expected:**
- 원본 그대로 + 사본 새로 생성 (별도 ID)
- 둘 다 시간표에 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.6 드래그 충돌 처리 [P2]
**Pre:** 09:00-10:00에 A세션, 10:00-11:00에 B세션
**Steps:**
1. A를 드래그해서 10:00 시작으로 이동
**Expected:**
- B와 시간 겹침 → lane 자동 분할 또는 충돌 모달 표시
- 데이터 일관성 유지 (둘 다 사라지지 않음)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.7 다중 선택 (Cmd+클릭) [P1]
**Pre:** 세션 3개
**Steps:**
1. 첫 세션 클릭 → Cmd+다른 세션 클릭
**Expected:**
- 선택된 세션에 시각적 표시 (테두리/하이라이트)
- 동시에 여러 개 선택 상태
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.8 다중 선택 드래그 [P2]
**Pre:** S-6.7 후 (3개 선택 상태)
**Steps:**
1. 선택된 세션 중 하나를 다른 시간대로 드래그
**Expected:**
- 3개 모두 같은 offset으로 함께 이동
- 충돌 발생 시 처리 정책 확인
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.9 다중 선택 취소 [P2]
**Pre:** 세션 다중 선택 상태
**Steps:**
1. 시간표 빈 영역 클릭
**Expected:**
- 모든 선택 해제
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.10 Ghost cleanup [P2]
**Pre:** 드래그 진행 중
**Steps:**
1. 드래그 시작 → 빠르게 다른 시간대 drop
**Expected:**
- drop 후 ghost(임시 placeholder)가 사라지고 정확한 위치에 SessionCard 1개만 표시
- 잔상/중복 카드 없음
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 7. 템플릿 (P0: 4 / 10) [⚠️ PR #211 회귀 집중]

> **자동 회귀 가드:**
> - `src/app/schedule/_utils/__tests__/buildTemplateData.test.ts` (10 unit)
> - `tests/e2e/schedule-templates.spec.ts` (2 e2e)
> - `src/__tests__/fixtures/template.fixture.ts` (Required<Omit<>> 타입 강제)

### S-7.1 템플릿 저장 [P0] ⚠️
**Pre:** 시간표에 강사 포함 수업 13개

**Quick Setup** (POST 호출 횟수 검증):
```js
const before = uat.countAPIcalls('/api/templates');
// 시나리오 후
console.log('새 호출:', uat.countAPIcalls('/api/templates') - before);  // 1
```

**Steps:**
1. ScheduleActionBar "템플릿" 드롭다운
2. "현재 주를 템플릿으로 저장" 클릭
3. 모달에 이름 "주간 기본" 입력
4. "저장"
**Expected:**
- 모달에 "13개 수업이 저장됩니다" 텍스트 표시 (세션 X)
- success 토스트 "템플릿이 저장되었습니다"
- API `/api/templates` POST 200/201
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.2 저장 실패 시 에러 토스트 [P0] ⚠️
**Pre:** POST /api/templates를 500으로 강제 실패

**Quick Setup** (DevTools Network override 대안 — 콘솔 1줄):
```js
// 시나리오 시작 직전 호출 — 매칭되는 fetch에 500 응답
const restore = uat.forceFetch500('/api/templates');
// S-7.1 단계 수행 후 검증 끝나면 복구:
restore();
```

**Steps:**
1. S-7.1 시도
**Expected:**
- error 토스트 "템플릿 저장에 실패했습니다. 잠시 후 다시 시도해주세요."
- 모달은 닫히지 않음 (재시도 가능)
- success 토스트는 절대 뜨지 않음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.3 저장된 템플릿 메뉴 표시 [P1] ⚠️
**Pre:** S-7.1 성공 직후
**Steps:**
1. 페이지 새로고침
2. ScheduleActionBar "템플릿" 드롭다운 열기
**Expected:**
- "이 주에 작업" 섹션의 "템플릿 적용하기"가 활성화 (회색 X)
- "템플릿 자체" 섹션의 "미리보기"가 활성화
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.4 템플릿 적용 [P0] ⚠️
**Pre:** 템플릿 1개 저장 + 다른 주 빈 상태
**Steps:**
1. 다음 주로 이동 (next week 화살표)
2. 템플릿 메뉴 → "템플릿 적용하기"
3. 확인 모달 → "적용"
**Expected:**
- 다음 주에 13개 수업 모두 생성
- success 토스트 "13개 수업이 템플릿으로 교체되었습니다"
- 각 세션에 강사 정보 유지 (강사명 표시)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.5 Round-trip 강사 정보 [P0] ⚠️
**Pre:** S-7.4 직후
**Steps:**
1. 새로고침
2. 적용된 주의 수업들 확인
**Expected:**
- 모든 세션에 강사명 표시 ("강사 미배정" 0개)
- colorBy=강사 모드로 토글하면 강사 색상 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.6 Round-trip room/yPosition [P1] ⚠️
**Pre:** room 정보 있는 세션 포함된 시간표 → 템플릿 저장 → 다른 주에 적용
**Steps:**
1. 적용된 세션의 room 정보 확인
**Expected:**
- room 값 보존됨 (저장 → 적용 round-trip 손실 X)
- yPosition도 동일하게 보존 (lane 위치)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.7 템플릿 미리보기 [P2] ⚠️
**Pre:** 템플릿 저장된 상태
**Steps:**
1. 템플릿 메뉴 → "미리보기"
**Expected:**
- TemplatePreviewModal 열림
- 저장된 13개 수업 시각화 (실제 적용 X)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.8 학생/과목 매칭 실패 시 경고 [P2] ⚠️
**Pre:** 템플릿 저장 → 학생 1명 삭제 → 다른 주에 적용
**Steps:**
1. 템플릿 적용 시도
**Expected:**
- 매칭 실패 학생/과목/강사가 토스트 메시지에 명시 (e.g. "매칭 실패: 학생 '홍길동', 과목 '수학' 외")
- 매칭 성공한 세션만 생성
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.9 슬롯 선택 모달 — save mode (ADR-008 Free 2 슬롯) [P1]
**Pre:** ScheduleActionBar 템플릿 메뉴 → "현재 주를 템플릿으로 저장"
**Steps:**
1. SlotPickerModal 열림
2. 슬롯 1, 2 활성 (FREE_TIER_QUOTA=2)
3. 슬롯 3, 4, 5 disabled + Lock 아이콘 + "추후 업데이트 예정" 라벨
4. 슬롯 1 선택 → 이름 "주간 기본" 입력 → "저장"
**Expected:**
- 슬롯 1에 "주간 기본" 저장 success 토스트
- 다음 진입 시 슬롯 1 채워진 표시 + 슬롯 2 빈 표시
- save mode default 선택: 첫 빈 슬롯 (slotsInfo.find(!filled))
- API `/api/templates` POST 발사 (slotIndex=0 포함)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.10 슬롯 선택 모달 — apply mode [P1]
**Pre:** 슬롯 1에 템플릿 1개 저장됨 + 슬롯 2 비어있음
**Steps:**
1. 템플릿 메뉴 → "템플릿 적용하기" 클릭
**Expected:**
- 슬롯 1 활성 (filled — apply 가능)
- 슬롯 2 disabled (empty — apply 불가)
- 슬롯 3-5 disabled "추후 업데이트 예정"
- apply mode default 선택: 첫 채워진 슬롯
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 8. PDF Export (P0: 1 / 7)

### S-8.1 PDF 다운로드 모달 [P0]
**Pre:** `/schedule` 인증 모드
**Steps:**
1. ScheduleActionBar "주간 시간표 PDF 다운로드" 버튼
**Expected:**
- PdfExportRangeModal 열림 (또는 즉시 다운로드 시작)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.2 뷰 모드별 라벨 [P2]
**Pre:** 일별/주간/월별 각 뷰
**Steps:**
1. 각 뷰에서 PDF 버튼 라벨 확인
**Expected:**
- "일별 시간표 PDF" / "주간 시간표 PDF" / "월별 시간표 PDF" 각각 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.3 PDF 콘텐츠 검증 [P1]
**Pre:** PDF 다운로드 완료
**Steps:**
1. 다운로드된 PDF 열기
**Expected:**
- 학생명 모두 표시 (생략 없이 또는 "외 N명")
- 과목/시간/요일 정확
- 강사명 표시 (Phase 6에서 추가됨)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.4 색상 정확도 [P1]
**Pre:** PDF 열기
**Steps:**
1. 화면 시간표 색상 vs PDF 색상 비교
**Expected:**
- tintFromHex 적용된 색상이 화면과 동일
- 한글 폰트 깨짐 없음 (Pretendard Subset)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.5 인쇄 시 레이아웃 [P1]
**Pre:** PDF 인쇄 (실제 또는 미리보기)
**Steps:**
1. A4 인쇄 미리보기
**Expected:**
- 시간표가 한 페이지에 깔끔히 배치
- 텍스트 잘림 / 겹침 없음
- 여백 적절
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.6 강사별 PDF [P1]
**Pre:** 강사 2명 + 각 세션
**Steps:**
1. PdfExportRangeModal → "강사별 분리"
2. 강사 선택 또는 전체
3. 다운로드
**Expected:**
- 선택한 강사의 세션만 포함된 PDF
- 또는 강사 1인당 1페이지로 분리
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.7 날짜 범위 선택 [P2]
**Pre:** 월별 PDF
**Steps:**
1. PdfExportRangeModal → 시작일/종료일 입력
**Expected:**
- 해당 범위만 포함된 PDF
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 9. 공유 링크 + 접속 코드 (P0: 2 / 6)

### S-9.1 공유 링크 생성 [P0]
**Pre:** `/settings` 진입
**Steps:**
1. "시간표 공유" 섹션 펼치기
2. "공유 링크 생성" 클릭
**Expected:**
- 모달에 토큰 URL `https://.../share/{token}` 표시
- 자동 클립보드 복사 + "복사됨" 피드백
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.2 공개 링크 접근 (비로그인) [P0]
**Pre:** 다른 브라우저 또는 시크릿 창

**Quick Setup** (터미널 — Chrome 시크릿 새 창 자동 열기):
```bash
# {token} 자리에 S-9.1에서 받은 토큰 붙여넣기
open -na "Google Chrome" --args --incognito --new-window "http://localhost:3000/share/{token}"
```

**Steps:**
1. `/share/{token}` 직접 접근
**Expected:**
- 시간표 읽기 전용 표시
- 편집/삭제 버튼 없음
- 학생/과목/강사 데이터 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.3 학부모 접속 코드 생성 [P1]
**Pre:** `/settings`
**Steps:**
1. "학부모 접속 코드" → "코드 생성"
**Expected:**
- 6자리 코드 표시 (혼동 문자 L 제외)
- 복사 버튼
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.4 코드로 접근 [P1]
**Pre:** S-9.3 코드 보유
**Steps:**
1. `/academy/{slug}` 또는 `/academy/{uuid}` 접속
2. 코드 입력
**Expected:**
- 인증 후 share token 반환 → `/share/{token}` 라우팅
- 시간표 읽기 전용 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.5 코드 만료 [P2]
**Pre:** 새 코드 발급
**Steps:**
1. 이전 코드로 접근 시도
**Expected:**
- 401 또는 에러 페이지 ("만료된 코드입니다")
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.6 IP rate limit / lockout [P2]
**Pre:** 코드 입력 화면
**Steps:**
1. 잘못된 코드 5회 연속 입력
**Expected:**
- lockout 트리거 ("잠시 후 다시 시도하세요")
- 일정 시간 후 재시도 가능
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 10. 다중 Academy + 권한 (P0: 0 / 7)

### S-10.1 Academy 전환 [P1]
**Pre:** 사용자가 academy 2개 멤버
**Steps:**
1. 사이드바 상단 학원명 클릭 → Academy Switcher
2. 다른 학원 선택
**Expected:**
- localStorage `active_academy_id_{userId}` 변경
- 시간표/학생/과목 데이터가 해당 academy로 전환
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.2 Active Academy 쿠키 저장 [P1]
**Pre:** S-10.1 후
**Steps:**
1. 새로고침
**Expected:**
- 마지막 선택한 academy로 자동 진입
- Cookie `active_academy_id` 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.3 Owner vs Admin vs Member 권한 [P1]
**Pre:** 각 role별 사용자
**Steps:**
1. 각 role로 로그인 후 `/settings` 멤버 목록 확인
**Expected:**
- Owner/Admin: 멤버 추가/삭제 가능
- Member: 자기 정보만 보기, 수정 권한 없음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.4 Member RBAC 라우트 가드 [P1]
**Pre:** member 역할 사용자
**Steps:**
1. `/students` 직접 URL 접근
**Expected:**
- middleware route guard → `/schedule` 또는 `/teacher-schedule`로 리다이렉트
- "권한 없음" 메시지 또는 silent redirect
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.5 Member UI 필터링 [P2]
**Pre:** member 역할
**Steps:**
1. ScheduleActionBar 확인
**Expected:**
- 공유/PDF/템플릿 버튼 숨김 또는 비활성화
- 사이드바도 학생/과목 메뉴 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.6 초대 토큰 발송 (owner/admin만) [P1]
**Pre:** owner 역할
**Steps:**
1. `/settings` → "강사 초대" → 이메일 입력 + 역할 선택
2. "초대 발송"
**Expected:**
- 초대 토큰 생성 (7일 만료)
- 토큰 URL 생성 + 복사
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.7 초대 수락 4-state [P1]
**Pre:** S-10.6 토큰
**Steps:**
1. `/invite/{token}` 접근 — 4가지 상태별
   - (a) 비로그인 → 로그인 유도
   - (b) 로그인 + 이메일 일치 → 수락
   - (c) 로그인 + 이메일 불일치 → 에러
   - (d) 이미 멤버 → 안내
**Expected:**
- 각 상태 분기 정확
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 11. 모바일 뷰포트 (375×667) (P0: 0 / 7)

> **테스트 방법:** Chrome DevTools → Toggle device toolbar → iPhone SE (375×667) 또는 Playwright `--viewport=375,667`.
> 단축키: DevTools 열린 상태에서 `Cmd+Shift+M` (macOS) / `Ctrl+Shift+M` (Win/Linux) → device toolbar 토글.

### S-11.1 BottomTabBar 표시 [P1]
**Pre:** 모바일 뷰포트
**Steps:**
1. 임의 페이지 진입
**Expected:**
- 하단 고정 BottomTabBar에 5개 탭 (시간표/학생/과목/강사/설정)
- 데스크탑 사이드바 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.2 FAB 위치 [P2]
**Pre:** 모바일 `/schedule`
**Steps:**
1. FAB 위치 확인
**Expected:**
- BottomTabBar 위에 FAB 배치
- BottomTabBar 가리지 않음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.3 모달 → BottomSheet [P1]
**Pre:** 모바일에서 GroupSessionModal 열기
**Steps:**
1. FAB 클릭
**Expected:**
- 풀스크린 또는 슬라이드업 BottomSheet 형태 (데스크탑 floating modal과 다름)
- 제스처로 닫기 가능 (옵션)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.4 시간표 그리드 스크롤 [P2]
**Pre:** 모바일 주간 뷰
**Steps:**
1. 좌우/상하 스크롤
**Expected:**
- 가로/세로 스크롤 부드러움
- 헤더(요일/시간)가 sticky로 고정 (옵션)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.5 터치 타겟 44px [P2]
**Pre:** 모바일
**Steps:**
1. 버튼/입력 요소 시각 확인
**Expected:**
- 모든 인터랙티브 요소 최소 44×44px
- 인접 버튼 사이 8px 이상 여백
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.6 학생 관리 — 탭 전환 [P2]
**Pre:** 모바일 `/students`
**Steps:**
1. 학생 목록 표시 → 항목 탭
**Expected:**
- 데스크탑 분할 뷰 X
- 목록 → 상세 화면 슬라이드 전환
- 뒤로가기 버튼 존재
**Result:** [ ] Pass [ ] Fail — note: ___

### S-11.7 공유 → 드로어 [P2]
**Pre:** 모바일 `/settings` 공유
**Steps:**
1. 공유 링크 생성 화면 진입
**Expected:**
- 모달 X, 슬라이드업 드로어 형태
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 12. 새로고침 / 네트워크 / Sync 회복 (P0: 4 / 9) [Core 포함]

### S-12.1 새로고침 후 데이터 유지 [P0] [auto-friendly]
**Pre:** 시간표 + 학생/과목/세션 입력 완료
**Steps:**
1. F5 새로고침
**Expected:**
- 모든 데이터 유지 (localStorage SSOT)
- 인증: 서버에서 fetch한 데이터와 일치
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.2 새로고침 후 강사 정보 유지 [P0] ⚠️ [auto-friendly]
**Pre:** 강사 배정된 세션
**Steps:**
1. 새로고침 후 SessionCard 강사명 확인
**Expected:**
- 모든 세션에 강사명 정확
- "강사 미배정" 0개 (의도적으로 미배정한 세션 제외)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.3 로그인 후 새로고침 [P1]
**Pre:** 익명 모드에서 데이터 입력 → 로그인
**Steps:**
1. 로그인 직후 새로고침
**Expected:**
- 익명 데이터가 user 키로 마이그레이션 (또는 무중단)
- 서버 데이터 + localStorage 일치
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.4 오프라인 모드 [P2]
**Pre:** DevTools Network → Offline
**Steps:**
1. 시간표 조회/편집/추가 시도
**Expected:**
- localStorage만으로 정상 동작 (Local-First)
- 온라인 복구 시 자동 sync (POST/PUT 큐 발사)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.5 API 401 처리 [P2]
**Pre:** 토큰 만료 (Supabase session expire)

**Quick Setup** (토큰 강제 만료):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
// 새로고침 후 어떤 API 호출이라도 401 또는 라우트 가드 트리거 expected
```

**Steps:**
1. 어떤 API 호출이라도 401
**Expected:**
- 자동 로그아웃 또는 로그인 화면 리다이렉트
- 사용자에게 명확한 안내
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.6 오프라인 변경 → outbox 자동 누적 [P0]
**Pre:** 인증 모드 + DevTools Network → Offline
**Steps:**
1. 학생 추가 또는 세션 추가 등 mutating 작업
2. localStorage `sync_outbox_*` 키 확인
**Expected:**
- 변경은 localStorage(SSOT)에 즉시 반영 (UI 즉시 업데이트)
- 서버 호출은 실패하지만 outbox에 entry 자동 누적 (`flushOutbox` deferred)
- 사용자에게 Sync status 표시 (예: 사이드바 또는 banner — `useSyncStatus`)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.7 온라인 복구 → 자동 flush [P0]
**Pre:** S-12.6 후 outbox에 entry N개 누적
**Steps:**
1. DevTools Network → Online
2. 잠시 대기 (또는 페이지 interaction)
**Expected:**
- outbox entries 자동으로 flush (`flushOutbox` 호출)
- Network에 모든 deferred POST/PUT/DELETE 발사
- 성공 시 entry 제거됨, sync status `idle` 또는 `success`
- localStorage `sync_outbox_*` 키 비워짐
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.8 SyncQueueModal — 수동 열림 + entry 액션 [P1]
**Pre:** outbox에 entry 1개 이상 (sync 실패 또는 진행 중)
**Steps:**
1. SyncQueueModal 열림 (사이드바 또는 sync status indicator 클릭)
2. entry 항목별 [재시도] 또는 [버리기] 클릭
3. 또는 전체 [모두 재시도] / [모두 버리기]
**Expected:**
- 모달 상단에 Recovery 안내 (Info 아이콘 + 텍스트)
- 각 entry 행: context label (`getContextLabel`) + 재시도/버리기 버튼
- [재시도] 클릭 시 `flushOutboxEntry` 호출 — 성공 시 entry 사라짐
- [버리기] 클릭 시 `removeOutboxEntry` 호출 — 즉시 사라짐
- 전체 액션: 모든 entry 일괄 처리
- bulk busy 중 다른 액션 disabled
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.9 sync 실패 — AlertTriangle 표시 [P2]
**Pre:** entry 재시도 시 서버 500 또는 네트워크 에러
**Steps:**
1. SyncQueueModal에서 [재시도] 클릭
2. 응답 fail
**Expected:**
- entry 행에 AlertTriangle 아이콘 + 에러 메시지 표시
- entry는 outbox에 그대로 남아 있음 (재시도 가능)
- toast "동기화 실패" 또는 inline 에러 표시
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 13. 색상 / 시각 (P0: 0 / 5)

### S-13.1 ColorBy = 과목 [P1]
**Pre:** SegmentedButton "색상 기준"
**Steps:**
1. "과목" 선택
**Expected:**
- 모든 SessionCard 배경색 = 해당 과목 색상
- 학생/강사 칩 필터 바 숨김
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.2 ColorBy = 학생 [P1]
**Pre:** "학생" 선택
**Steps:**
1. StudentFilterChipBar 표시 확인
2. 학생 1명 선택
**Expected:**
- 선택한 학생의 세션만 컬러 highlight
- 미선택 세션은 흐리게
- 색상은 학생 이름 해시 기반 (Phase 6 정책)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.3 ColorBy = 강사 [P2]
**Pre:** "강사" 선택
**Steps:**
1. TeacherFilterChipBar 표시
2. 강사 1명 선택
**Expected:**
- 선택한 강사의 세션 색상 = 강사 색상
- 헤더에 "강사 N명" 배지 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.4 현재 시각 타임라인 [P1]
**Pre:** 주간 뷰 + 오늘 컬럼
**Steps:**
1. 현재 시각 위치 확인
**Expected:**
- amber 가로선 현재 시각 위치에 그려짐
- "HH:MM" pill 표시
- 분 경계에 동기화 (1분마다 갱신 또는 폴링)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-13.5 오늘 컬럼 강조 [P2]
**Pre:** 주간 뷰
**Steps:**
1. 오늘 요일 컬럼 시각 확인
**Expected:**
- 컬럼 배경 amber tint
- 요일 헤더에 원형 amber 배지 + 날짜 숫자
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 14. 데이터 보호 — 충돌 모달 + 백업 이력 (P0: 4 / 13) [PR #260 + PR #261/#263 신규]

> **자동 회귀 가드:**
> - `src/lib/conflict/__tests__/computeLossDiff.test.ts` (4 unit — 큰 손실 임계치 검증)
> - `src/components/molecules/__tests__/DataConflictModal.test.tsx` (26 unit — Layered Defense 인터랙션)
> - `src/hooks/__tests__/useGlobalDataInitialization.test.ts` (충돌 감지 + before_conflict 백업 hook)

### S-14.1 데이터 충돌 모달 자동 발동 [P0] ⚠️ PR #260
**Pre:** 익명 모드에서 데이터 입력 (학생 1, 과목 1, 수업 1) → 같은 브라우저로 OAuth 로그인 (서버 user에 학생 5, 과목 3, 수업 50 데이터 있음)

**Quick Setup**:
```js
// 시드: 익명에 작은 데이터, 그 user 서버에 큰 데이터 (관리자 직접 또는 다른 디바이스에서 미리)
uat.clearAll();
uat.seed();                     // 익명 학생 3 / 과목 2 / 세션 3
// 그 후 UAT_TEST_USER 로 OAuth 로그인 (uat:setup 으로 미리 시드된 인증 데이터 있어야 함)
```

**Steps:**
1. 로그인 후 `/schedule` 진입
**Expected:**
- DataConflictModal 자동 발동 (`useGlobalDataInitialization` 충돌 감지 → 모달)
- 백드롭 솔리드 (`bg-black/85 backdrop-blur-sm`) — 시간표 그리드 전혀 안 보임 + blur 효과
- 데스크탑: 카드 2개 side-by-side ("이 기기의 데이터" / "내 계정의 데이터")
- 각 카드에 학생/과목/수업 카운트 + 마지막 수정 시각
- Escape 키로 닫히지 않음 (명시적 선택 강제 — `useModalA11y onClose: () => {}`)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.2 카드 선택 시 "선택 시 N 잃음" 인라인 표시 [P1] ⚠️ PR #260
**Pre:** S-14.1 모달 발동
**Steps:**
1. "이 기기의 데이터" 카드의 라디오 클릭
**Expected:**
- 카드 하단에 "선택 시 학생 N명 · 과목 N개 · 수업 N개 잃음" 텍스트 (`computeLossDiff(local, server)` 결과)
- 큰 손실(수업 ≥5 OR 학생/과목 ≥3) 시 빨간색 + "⚠ " prefix
- 작은 손실 시 회색 일반 텍스트
- 손실 0 시 텍스트 미표시 (`totalLoss > 0` 조건)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.3 큰 손실 — banner + 버튼 빨강 (Layered Defense L1) [P0] ⚠️ PR #260
**Pre:** S-14.1 + 한 쪽이 큰 손실 (예: 익명 1 → 서버 50 선택 시)
**Steps:**
1. 작은 쪽 카드 라디오 선택 (큰 손실 발생)
**Expected:**
- 데스크탑: 모달 하단에 빨간 banner "데이터 손실 위험" + 손실 entity 명시 + "이 작업은 되돌릴 수 없습니다"
- 카드 테두리 빨강 + 박스 그림자 빨강
- 확인 버튼 빨강 + 라벨 "선택한 데이터로 시작 (위험)"
- 모바일(탭 전환): 각 탭 안 banner + 버튼 빨강 + "(위험)" 라벨
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.4 큰 손실 → ConfirmModal 2단계 확인 (Layered Defense L2) [P0] ⚠️ PR #260
**Pre:** S-14.3 상태
**Steps:**
1. 빨간 "선택한 데이터로 시작 (위험)" 버튼 클릭
**Expected:**
- ConfirmModal 발동 — 제목 "정말 이 데이터로 덮어쓸까요?"
- 메시지에 손실 entity (학생 N · 과목 N · 수업 N) 명시 + "이 작업은 되돌릴 수 없습니다"
- 두 버튼 — "취소" / "덮어쓰기" (variant=danger 빨강)
- "취소" 시 ConfirmModal 닫힘, DataConflictModal 그대로 유지 (재선택 가능)
- "덮어쓰기" 시 머지 진행
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.5 작은 손실 — 즉시 진행 (ConfirmModal 미발동) [P1] ⚠️ PR #260
**Pre:** 양쪽 데이터 거의 같음 (예: 학생 1 차이만)
**Steps:**
1. 카드 선택 → 확인 버튼 클릭
**Expected:**
- ConfirmModal 발동하지 않음 (`isLargeLoss=false`)
- 즉시 머지 진행 (loading spinner)
- 완료 후 모달 자동 닫힘
- isMigrating 중 spinner overlay + "데이터를 동기화하는 중..."
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.6 데이터 이력 아코디언 펼침 [P1] ⚠️ PR #263/#265
**Pre:** 인증 모드 owner/admin + `/settings` 진입
**Steps:**
1. "데이터 이력" 아코디언 헤더 클릭 → 펼침 (`expanded=true`)
**Expected:**
- 아코디언 헤더에 백업 카운트 배지 (예: "5개")
- ChevronDown 아이콘 180° 회전
- Master-Detail 레이아웃 — 왼쪽 list (md:w-2/5) + 오른쪽 detail panel
- 상단 안내 — "충돌 직전·템플릿 저장 직후·수동 백업이 자동 저장됩니다..."
- free plan 안내 — amber 텍스트 "(무료: 충돌 백업 무제한 복구 + 일반 자동 백업 최근 N건 복구. 그 외는 미리보기만)"
- 빈 상태: dashed border 박스 "아직 백업이 없습니다. 시간표 변경 시 자동 생성됩니다."
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.7 충돌 직전 백업 자동 생성 [P1] ⚠️ PR #261
**Pre:** S-14.4 또는 S-14.5 완료 (충돌 모달 머지 직후)
**Steps:**
1. `/settings` → "데이터 이력" 펼침
**Expected:**
- 가장 최근 row가 type "충돌 직전" (`before_conflict`, amber 라벨)
- 학생/과목/수업 카운트 = 머지 직전 양쪽 데이터 합본
- 무료 plan 잠금 X (before_conflict는 핵심 안전망 — 무제한 복구)
- API 검증: `data_snapshots` 테이블에 `snapshot_type='before_conflict'` row 1개 신규
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.8 템플릿 저장 직후 자동 백업 [P1] ⚠️ PR #261
**Pre:** S-7.1 (템플릿 저장) 완료
**Steps:**
1. `/settings` → "데이터 이력"
**Expected:**
- type "템플릿 저장" (`auto_template`, indigo 라벨) 백업 row 자동 생성
- 무료 plan: 시간순 최근 3건만 복원 가능, 그 외 미리보기 + Lock 아이콘
- 11번째 auto_template 들어왔을 때 가장 오래된 것 자동 삭제 (retention atomic, max 10)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.9 백업 복원 (chain of safety) [P0] ⚠️ PR #263/#265
**Pre:** 백업 1개 이상 존재 + detail panel 선택됨
**Steps:**
1. detail panel "이 백업으로 복원" 버튼 클릭
2. ConfirmModal "이 백업으로 복원할까요?" → "복원"
**Expected:**
- 복원 직전 자동 백업 생성 (chain of safety — 복원 자체도 되돌릴 수 있게 `before_conflict` type으로 직전 데이터 저장)
- 데이터 덮어쓰기 (학생/과목/수업/enrollment 모두)
- success toast "데이터가 복원됐습니다. 페이지를 새로고침해 주세요."
- list 갱신 (방금 생성된 chain of safety 백업이 최상단)
- 복원 실패 시 error toast (네트워크/API 에러)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.10 잠긴 백업 — 미리보기 정상 + 복원 disabled [P2] ⚠️ PR #263/#265
**Pre:** auto_template 백업 4개 이상 (4번째 이상은 free plan 잠금) 또는 manual 백업 + 무료 plan
**Steps:**
1. 잠긴 백업 카드 클릭 → detail panel 표시
2. detail panel 복원 버튼 클릭
**Expected:**
- 백업 카드 opacity 60% + Lock 아이콘
- detail panel 미리보기 정상 (학생/과목/수업 카운트 표시)
- "프리미엄" 배지 (Lock 아이콘) 표시
- 복원 버튼 disabled + Lock 아이콘 + 라벨 "프리미엄 곧 출시" + cursor-not-allowed
- 클릭 시 info toast "프리미엄 출시 후 복원 가능합니다."
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.11 백업 개별 삭제 [P2] ⚠️ PR #263/#265
**Pre:** detail panel 선택 + 백업 1개 이상
**Steps:**
1. detail panel 휴지통 아이콘 (Trash2) 클릭
2. ConfirmModal "이 백업을 삭제할까요?" → "삭제"
**Expected:**
- 백업 list에서 즉시 제거
- detail panel 비워짐 (`selectedId === confirmDeleteId` 시 setSelectedId(null))
- success toast "백업이 삭제됐습니다."
- API: `DELETE /api/data-snapshots/:id?userId=xxx` 호출
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.12 수동 백업 — 무료 plan disabled [P2] ⚠️ PR #263/#265
**Pre:** 무료 plan 사용자 + 데이터 이력 펼침
**Steps:**
1. "지금 백업" 버튼 시각 확인 + 클릭
**Expected:**
- 버튼 dashed border + Lock 아이콘 (free) — "지금 백업 (프리미엄 곧 출시)"
- 클릭 시 info toast "수동 백업은 프리미엄 출시 후 사용 가능합니다."
- 실제 백업 생성 안 됨 (Network에 POST 없음)
- 프로 plan 시: solid accent border + Save 아이콘 + 정상 동작
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.13 member 역할 — 데이터 이력 섹션 미렌더 [P2] ⚠️ PR #263/#265 RBAC
**Pre:** member 역할 사용자 + `/settings` 진입
**Steps:**
1. 설정 페이지 진입 → 스크롤
**Expected:**
- "데이터 이력" 섹션 자체 미렌더 (`useMyRole.canManage=false` gate, line 67 `if (!canManage) return null`)
- 강사 추가 모달 다음으로 바로 다른 섹션 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.14 익명→첫 로그인 sessions 마이그레이션 [P0] ⚠️ PR #286 (UAT 2026-05-08 회귀 가드)
**Pre:** 익명 모드에서 학생 4명(이름만) + 과목 1개 + 수업 1개 등록 → 로그아웃
**Steps:**
1. UAT 계정으로 로그인
2. omni-radar 로그 또는 DevTools console 관찰
**Expected:**
- `/api/sessions` POST가 `weekStartDate (YYYY-MM-DD) is required`로 거부되지 않음
- `fullDataMigration 마이그레이션 완료 {syncedCounts:{students:4,subjects:1,enrollments:4,sessions:1}, errorCount:0}` 또는 sessions:1 정상 sync
- DataConflictModal 미표시 (false positive 차단)
- localStorage user 키 + server 양쪽 학생/과목/수업 모두 sync 완료
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.15 dedup graceful matching (빈 메타) [P0] ⚠️ PR #288 (UAT 2026-05-08 회귀 가드)
**Pre:** S-14.14 직후 또는 익명 학생 1명 + 동일 이름이 server에 이미 등록 (gender/birthDate 모두 빈 상태)
**Steps:**
1. "이 기기 데이터로 시작" 클릭 (또는 재로그인 시 충돌 모달)
2. 마이그레이션 결과 관찰
**Expected:**
- "ID 매핑 누락" cascade 발생 안 함 (`enrollment: ID 매핑 누락`, `session: 수업에 매핑된 수강 ID가 없음` 메시지 미발생)
- `student: [object Object]` 표기 미발생 (extractErrorMessage helper)
- 1차 dedup에서 이름 매칭으로 즉시 server ID 재사용 → POST round-trip 절약
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.16 upload-local 자동 경로 실패 toast [P1] ⚠️ PR #287 (UAT 2026-05-08 회귀 가드)
**Pre:** 익명 모드에서 학생/과목/수업 입력 → UAT 환경에서 의도적으로 server 5xx 강제 (또는 권한 누락 시뮬레이션)
**Steps:**
1. 로그인 트리거 → upload-local 자동 경로 실행 → throw
**Expected:**
- sonner `toast.error("자동 동기화 실패", { description: ... })` 표시 (bottom-center)
- `setIsInitialized(true)`로 앱 진입 보장 (loading 무한 대기 X)
- anonymous 데이터 보존 (`localStorage.getItem("classPlannerData:anonymous")` 유지)
- 다음 로그인 시 재시도 가능
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 15. 출석부 (P0: 0 / 5)

> **무엇:** `useAttendance` 훅 + `AttendanceSheet` molecule. 한 세션의 학생 출석을 4-state(`present`/`absent`/`late`/`excused`)로 마킹. 학원 daily 운영 핵심.

### S-15.1 출석부 모달 열기 [P1]
**Pre:** 시간표에 세션 1개 이상 + 그 세션에 enrollment된 학생 있음
**Steps:**
1. SessionCard에서 출석 아이콘(또는 메뉴) 클릭
**Expected:**
- AttendanceSheet 열림 — 세션 정보(과목/시간/요일) + 학생 list
- 모바일: bottom sheet 슬라이드업 (`items-end`)
- 데스크탑: 중앙 모달 (`md:items-center`)
- 각 학생 행에 4 status 버튼 (출석/결석/지각/사유) + 메모 영역
- 백드롭 클릭 시 닫힘 (`onClick`이 `e.target === e.currentTarget` 조건)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.2 학생별 4-state 마킹 [P1]
**Pre:** AttendanceSheet 열림
**Steps:**
1. 학생 1명에 "출석" 버튼 클릭
2. 다른 학생에 "지각" 클릭
3. 또 다른 학생에 "사유" 클릭
**Expected:**
- `onMarkAttendance(studentId, status)` 호출
- 시각적 표시 — 선택된 status 버튼 강조 (배경/테두리), 다른 status는 muted
- 새로고침 후 마킹 유지 (localStorage 또는 server 저장)
- 인증: API 호출 발사 (POST /api/attendances 또는 유사)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.3 "전체 출석" 일괄 마킹 [P2]
**Pre:** AttendanceSheet 열림 + 학생 5명 이상
**Steps:**
1. "전체 출석" 버튼 클릭
**Expected:**
- `onMarkAllPresent` 호출 — 모든 학생 status="present" 일괄 set
- 시각적으로 모든 행에 "출석" 표시
- 이미 다른 status였던 학생도 present로 덮어쓰기 (정책 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.4 새로고침 후 출석 유지 [P1]
**Pre:** S-15.2 마킹 후
**Steps:**
1. 페이지 새로고침
2. 다시 AttendanceSheet 열기
**Expected:**
- 마킹된 status 모두 유지
- 인증: 서버 fetch한 attendance와 일치
- 익명: localStorage SSOT 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.5 member 역할 시 read-only [P2]
**Pre:** member 역할 + AttendanceSheet 열림 (canManage=false)
**Steps:**
1. status 버튼 클릭 시도
2. "전체 출석" 버튼 클릭 시도
**Expected:**
- 모든 status 버튼 disabled (cursor-not-allowed)
- "전체 출석" 버튼 disabled
- 기존 마킹 표시는 정상 (read-only 뷰)
- onMarkAttendance 호출 안 됨
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 16. 온보딩 / 도움말 (P0: 1 / 3)

### S-16.1 빈 주 — EmptyWeekState 발동 [P0]
**Pre:** 신규 학원 또는 빈 주 (sessions.length === 0)
**Steps:**
1. `/schedule` 진입
**Expected:**
- 시간표 그리드 위에 absolute overlay 표시 (`pointer-events-none` 컨테이너 + `pointer-events-auto` 카드)
- CalendarX2 아이콘 + "이번 주 수업이 없어요" 헤드라인
- 안내 텍스트 — hasTemplate 분기:
  - `hasTemplate=true`: "지난 시간표를 그대로 적용하거나 수업을 직접 추가해보세요"
  - `hasTemplate=false`: "수업을 추가하고 저장하면 다음 주에 바로 재사용할 수 있어요"
- CTA — hasTemplate=true 시 "템플릿 적용" + "수업 추가" 둘 다 / false 시 "수업 추가"만
- 그리드는 그대로 (overlay) — 테두리/시간 헤더 보임
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.2 EmptyWeekState CTA → 흐름 진입 [P1]
**Pre:** S-16.1 상태
**Steps:**
1. "수업 추가" CTA 클릭
2. (또는) "템플릿 적용" CTA 클릭 (hasTemplate 시)
**Expected:**
- "수업 추가" → GroupSessionModal 열림 (FAB와 동일 흐름)
- "템플릿 적용" → SlotPickerModal apply mode 또는 ApplyTemplateConfirm
- CTA 클릭 후 EmptyWeekState 자체는 유지 (세션 추가되면 자연 사라짐)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.3 HelpDrawer 열기/닫기 [P2]
**Pre:** 임의 페이지
**Steps:**
1. 사이드바(또는 헤더)의 "도움말" 트리거 클릭
2. drawer 열림 확인 → 5개 섹션 스크롤 확인
3. X 버튼 또는 backdrop 클릭으로 닫기
**Expected:**
- 우측에서 슬라이드 drawer (w-80, `right-0 top-0 bottom-0`)
- 백드롭 (z-10000, bg-black/30) 표시 + 클릭 시 close
- 5개 섹션 모두 렌더 — 시간표 시작 / 일별·주간·월별 / 템플릿 저장·적용 / PDF 출력 / 공유 링크
- X 버튼 → close (HelpDrawerContext close 호출)
- 데이터 검증은 정적 콘텐츠라 PASS 위주 (변경 시 회귀 가드)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## Edge Cases (P0: 0 / 10)

### E-1. 학생 0명 + 수업 추가 시도 [P2]
**Pre:** 모든 학생 삭제
**Steps:** GroupSessionModal Step 1
**Expected:** "새 학생 추가" CTA만 활성화, 검색 결과 빈

### E-2. 과목 0개 + 수업 추가 [P2]
**Pre:** 모든 과목 삭제
**Steps:** Step 2 과목 select
**Expected:** disabled 또는 "먼저 과목을 추가하세요" placeholder

### E-3. 같은 시간대 4개+ 겹침 [P1]
**Pre:** 09:00-10:00에 4개 세션
**Steps:** 시간표 확인
**Expected:** 3개 표시 + "+1" pill (클릭 시 popover로 전체 표시)

### E-4. 학원명 2자 미만 온보딩 [P2]
**Pre:** /onboarding
**Steps:** 학원명 "A" (1자) 입력 후 제출
**Expected:** 유효성 에러 → 재입력 유도

### E-5. 강사 미배정 세션 [P2]
**Pre:** GroupSessionModal에서 강사 선택 안 함
**Steps:** 수업 추가
**Expected:** SessionCard에 "강사 미배정" 또는 강사 슬롯 빈 상태 표시

### E-6. 템플릿 적용 후 과목 삭제 [P2]
**Pre:** 템플릿 적용 → 그 안의 과목 삭제
**Steps:** 시간표 확인
**Expected:** 해당 세션은 "미지정" 표시 또는 자동 정리

### E-7. 빠른 다중 API 호출 [P2]
**Pre:** 인증 모드
**Steps:** 빠르게 연속으로 세션 5개 드래그
**Expected:** 모든 PUT 호출 발사 + 응답 처리, 데이터 일관성 유지

### E-8. ColorBy=학생 + 학생 미선택 [P2]
**Pre:** "학생" 모드 + 칩 0개 선택
**Steps:** SessionCard 색상 확인
**Expected:** 폴백으로 과목 색상 사용 (회색 X)

### E-9. 만료 공유 토큰 접근 [P2]
**Pre:** 만료된 share token URL
**Steps:** `/share/{expired-token}` 접근
**Expected:** 403 또는 "만료된 링크입니다" 페이지

### E-10. 멀티탭 동시 편집 [P2]
**Pre:** 같은 사용자, 두 탭에서 /schedule 열기
**Steps:**
1. 탭 A: 수업 추가
2. 탭 B: 새로고침 또는 자동 polling
**Expected:**
- 탭 B에 변경사항 반영 (broadcast 또는 30초 polling 통해)
- 토스트 "다른 탭에서 변경사항 발생" (또는 silent merge)

---

## 회귀 가드 cross-reference (PR #211 — Templates)

**자동 테스트:**
- `src/app/schedule/_utils/__tests__/buildTemplateData.test.ts` — 10 unit tests (teacherId/null/매칭실패/room/yPosition/multi sessions)
- `tests/e2e/schedule-templates.spec.ts` — 2 e2e (POST body 직렬화 + 500 응답 토스트)
- `src/__tests__/fixtures/template.fixture.ts` — Required<Omit<>> 트릭으로 누락 시 컴파일 에러
- `src/hooks/__tests__/useTemplates.test.ts` — 네트워크 오류 시 false/null 리턴 검증

**수동 시나리오:** S-7.1 ~ S-7.8 (8개 모두 ⚠️ 표시)

**Main 머지 조건:** 본 8개 시나리오 + 자동 테스트 모두 Pass.

---

## 발견 이슈 처리

UAT 중 Fail 발생 시:
1. **Critical (P0 Fail):** 즉시 fix 후 새 PR. main 머지 보류.
2. **High (P1 Fail):** GitHub Issue 등록 + 우선순위 검토 + 차기 PR.
3. **Medium (P2 Fail):** Issue 등록만, 일정 여유에 따라 fix.

Issue 등록 형식:
- Title: `[UAT Fail] S-X.Y 시나리오 제목`
- Body: 시나리오 전문 + Actual result + 환경 정보 (build, viewport, browser)

---

## 변경 이력

- 2026-05-04: 초기 작성 (73 시나리오 + 10 edge case). PR #211 회귀 가드 cross-reference 포함.
- 2026-05-05: Quick Setup 콘솔 명령 박스 + `tests/manual/seed-uat.js` / `uat-helpers.js` 신설. `runs/` 디렉터리로 결과 기록 분리 (template은 본 파일 유지). `[auto-friendly]` 라벨로 향후 e2e 마이그레이션 후보 표시.
- 2026-05-05 (2): 자동 inject 도입 — `public/uat/console-tools.js` 신설, layout.tsx가 NODE_ENV=development 분기로 자동 로드. 콘솔 paste 0번. `tests/manual/{uat-helpers,seed-uat}.js` 는 deprecated (legacy 보존). UAT 전용 인증 셋업 추가: `npm run uat:setup` / `uat:seed` / `uat:teardown` (e2e와 격리된 UAT_TEST_USER_*).
- 2026-05-05 (3): §0 "전체 흐름 (Quick Reference)" 추가 — 처음 1회 셋업 + 매 사이클 표. 사본을 위에서부터 따라가면 빠뜨림 없이 완료 가능.
- 2026-05-06: dev 코드 동기화 — §5 인라인 강사·과목 추가 시나리오 (S-5.13~5.15, PR #257), §7 슬롯 선택 모달 (S-7.9~7.10, ADR-008 free 2 슬롯), §14 신설 — 데이터 보호 (충돌 모달 Layered Defense + 백업 이력 / freemium 잠금, PR #260 + PR #261/#263/#265). P0 본문 정확 카운트로 헤더 갱신 (이전 19 표기는 부정확) → 실제 28개. §5 P0: 4→8 (+S-5.13 +S-5.14, 기존 카운트 보정), §7 P0: 3→4 (기존 카운트 보정), §14 신규 P0: 4. Core 모드 카테고리에 14 추가 (40분 → 50분). 회귀 가드: `computeLossDiff.test.ts` 4 unit + `DataConflictModal.test.tsx` 26 unit + `useGlobalDataInitialization.test.ts` 충돌 감지 unit.
- 2026-05-06 (2): UAT 정의 재정렬 — "사용자 입장 전체 검증" 원칙으로 누락 영역 보강. 이전 "out of scope" 분류한 8개 영역 모두 사용자 노출 기능이라 UAT 필수 포함. §5 확장 — 일별/월별 뷰 토글 + DayChipBar + ScheduleDateNavigator (S-5.16~5.21, 6개 추가). §12 확장 — Sync 회복 (S-12.6~12.9, 4개 추가, SyncQueueModal). §15 신설 — 출석부 (`AttendanceSheet`, 5개 시나리오, 학원 daily 운영 핵심). §16 신설 — 온보딩 / 도움말 (`EmptyWeekState` + `HelpDrawer`, 3개 시나리오). 신규 P0: S-5.16/5.17 (뷰 토글), S-12.6/12.7 (sync 자동 회복), S-16.1 (빈 주 발동). 총 P0: 28 → 33. Core 모드: 50분 → 60분, 카테고리에 16 추가. Extended에 15 추가 (110분).
- 2026-05-07: §1 인증 시나리오 4개에 검증 방법 박스 추가 — `localStorage.getItem('supabase_user_id')` / `uat.isAnonymous()` / Application 탭 시각 확인 셋. S-1.2/1.3/1.5/1.7 모두 적용 (PR #269).
- 2026-05-07 (2): §0 "전체 흐름" 보강 — branch 관리 + push/PR 단계 명시. dev/main 직접 commit 금지 원칙 + branch 케이스 표 (dev 누적 / 특정 PR / pre-main) + 임시 spot-check 가이드 + 이전 cycle 사본 late commit 패턴 추가. 표를 0~10번 단계로 재번호 (이전 5단계).
- 2026-05-07 (3): cwd 가정 명시 fix — 이전 (2) 의 `git -C class-planner ...` 패턴이 cwd=dev-pack 부모 가정을 안 박아 사용자가 다른 cwd 에서 실행 시 `cannot change to 'class-planner'` 에러. 사전 단계 `cd ~/lee_file/entrepreneur/project/dev-pack/class-planner` 추가 + 이후 명령은 단순 `git switch ...` 형식. 다른 cwd 사용 시 fallback (절대경로 `git -C ~/...`) 박스도 명시.
- 2026-05-07 (4): §2.5 "실행 순서 가이드 (Phase 기반)" 신설 — 카테고리별 위→아래 진행 시 비로그인↔로그인↔로그아웃 상태 토글 빈번 (S-1.2 로그인 → S-1.4 다시 비로그인 → S-1.5 다시 로그인) → 비효율. 7-Phase 흐름 (익명 → 충돌 전환 → 인증 → 모바일 → OAuth/로그아웃 → 오프라인 → Edge) 으로 묶어 상태 셋업 1회씩으로 끝남. 카테고리는 lookup 용, Phase 는 실행 순서. 모드별 Phase 매핑 표 (Core 1→2→3→6 / Extended +4+5 / Full 전체) 추가.
- 2026-05-07 (5): **Hybrid C 모델 채택** — 매 PR 60분 UAT 가 1인 환경 부담 + 무용지물 → 자동 e2e + Claude AI 검증 (Playwright MCP / computer-use) 으로 분산. 사용자 직접 검증은 두 모드만: **Smoke** (10-15분, 매 PR 직전, 사본 X, 핵심 5 시나리오) + **Release UAT** (150분, 분기 1회, 사본 commit). Core/Extended/Full 3-모드 → Smoke/Release 2-모드. 그린라이트 기준 분리 (main 머지: Smoke + 자동 검증 / Release: P0 33 전체). §0 매 사이클 흐름 두 모드 분기 + §3 결과 기록 두 모드 분기. 사용자 결정 사유: \"AI 가 더 빠른데 사용자가 직접 하는 의미?\" 에 대한 답 — 자동화 가능 영역은 모두 자동, 사용자 직접은 시각/UX 직감 영역만.
- 2026-05-07 (6): `bash scripts/uat-new.sh release` 모드 지원 — Hybrid C 채택 시 스크립트가 legacy `core|extended|full` 만 받아 `release` 입력 시 ERROR 발생. 사용자 지적: \"release 랑 full 같은 거면 하나만 두는게 좋지않아?\" → 정확. `release` 하나로 통일 (의미상 시점 기준이 더 정확). legacy `core|extended|full` 입력 시 deprecated WARN 출력 후 `release` 자동 alias. md 의 `bash scripts/uat-new.sh core (또는 extended / full)` → `release` 단일로 갱신, branch 이름 예시 `chore/uat-...-core` → `-release` 갱신.
- 2026-05-07 (7): **UAT fresh-start default** — 사용자 비판: "옵션으로 한 이유? 옵션없이 전부 신규사용자로 만들게 하면 되지않나?" → 정확. `naming-consolidation` 메모리 또 위반할 뻔. 매 UAT 사이클 fresh-start 가 default — `uat:teardown` 자체가 academy 까지 cleanup (이전엔 academy 보존). `cleanupUatUserData` 신규 함수 (fresh-start) + 기존 `cleanupAcademyScopedDataForUser` (scope only — seed 멱등 재시드용) 책임 분리. `setup-uat-test-user.ts` 단순화 — user 만 생성 (academy 부분 제거). `uat-seed.ts` 강화 — academy 없으면 자동 생성. UAT 문서 §0 매 사이클 (`uat:teardown` 단계 추가) / §5 인증 셋업 (setup user 만 + 매 사이클 흐름 옵션 a/b) / S-1.5 Pre (재현 방법 명시) 갱신. 신규/기존 user 분기는 매 사이클 단일 user reset 으로 자연 진행 (사이클 안에 신규→기존 전환). invite 시나리오 (S-10.6/10.7) 검증 시점에 별도 user (`UAT_TEST_INVITEE_EMAIL`) 추가 future work.
