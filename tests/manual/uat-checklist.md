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

1. `.env.local` 에 3 계정 + Supabase 키 추가:
   ```bash
   # Supabase admin (기존)
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...

   # UAT 3 계정 — 다중 역할 검증용 (2026-05-20 도입, ADR-019 Academy Singularity 기준)
   UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
   UAT_TEST_OWNER_PASSWORD=<강한-password>
   UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
   UAT_TEST_ADMIN_PASSWORD=<강한-password>
   UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
   UAT_TEST_MEMBER_PASSWORD=<강한-password>
   ```
   > 학생/학부모 view 는 **계정 X** — incognito 창 + share-token / 6자리 access-code 로 검증 (§6 참조).
   > legacy `UAT_TEST_USER_*` 도 인식 (owner 로 fallback, 1주일 alias 후 deprecated).
2. `npm run uat:setup` — 3 계정 user 멱등 생성 (academy 는 매 사이클 fresh-start).
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

§2 의 **Smoke 5개 시나리오** (S-1.1, S-2.1, S-5.6, S-12.1, S-14.1) 즉석 진행 — owner 1 계정만으로 충분. fail 발견 시 GitHub Issue 등록 — 사본/commit 없음. Pass 면 main 머지 진행.

#### Release UAT 모드 매 사이클 (180분, 분기 1회 — 사본 commit + PR)

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

# 4. UAT 3 계정 fresh-start cleanup (이전 사이클 잔재 academy/member/invite 모두 삭제)
#    → S-1.5 (첫 로그인 학원 자동 생성) + Phase 4/5 (admin/member 초대) 매 사이클 자연 발동 보장
npm run uat:teardown                            # default: all 3 계정
# (선택) npm run uat:teardown -- --user owner   # 특정 역할만 (admin|member|owner)
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
| 4. 사전 준비 (Phase 1 익명) | 브라우저 콘솔 | `uat.seed()` (익명 시드) 또는 `uat.clearAll()` (깨끗한 상태) |
| 5. owner 진입 (Phase 2/3) | 터미널 + 브라우저 | `npm run uat:seed` → 브라우저에서 `UAT_TEST_OWNER_EMAIL` 로 password 로그인 |
| 5a. admin/member 진입 (Phase 4/5) | 터미널 + 브라우저 | UI 로 직접 초대 (S-19/S-20) **또는** `npm run uat:invite` 후 브라우저 로그인 |
| 6. §1~§21 + Edge | 브라우저 | 시나리오 진행, `[ ]` → `[x]` (Pass) / `[!]` (Fail + note) / `[~]` (Skip + 사유) 기록 |
| 7. cleanup | 터미널 | `npm run uat:teardown` (3 계정 모두 academy/member/invite 정리, user 보존) |
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
| **Phase 1 Production Readiness** | 240분 | **친구 선공개 전 1회** (production main 머지 직전) — Stage C of `/design-explorations/phase1-release-readiness` | ✅ `runs/<DATE>-<COMMIT>-phase1-prod.md` commit |

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

### 2.5 실행 순서 가이드 (Variant D — 계정/세션 전환 최소화 + 동작 sub-그룹, 2026-05-29 개선)

> **카테고리(§1~§21) 는 lookup 용, Phase 는 실행 순서.** 두 축으로 사용.
>
> 단일 owner 만으로는 admin/member RBAC + invite 흐름 자체 검증 불가. 2026-05-20부터 **3 계정 (owner/admin/member) + 학생·학부모 incognito view** 모델로 전환. 카테고리대로 위에서 아래 진행하면 역할 토글이 잦음 → 10-Phase 흐름으로 묶으면 **계정/상태 셋업 1회씩**으로 끝남. 시나리오는 한 번씩만 등장 (이전 사이클에서 중복 setup 반복 회피).
>
> **Variant D 개선 (2026-05-29)**: 큰 Phase (Phase 1 = 60분, Phase 3 = 35분) 내부에 **동작 sub-그룹** 명시. 같은 동작 패턴 (예: "추가 모달" / "검색 input") 의 일관성 한 번 학습 → 다음 페이지에서 빠른 인지. mockup SSOT: `dev-pack/internal-dashboard/.../design-explorations/class-planner/uat-grouping-refactor/` (Variant D 채택). 사용자 본 요청 (2026-05-29) "UAT 빨리 할 수 있도록 그룹별로 움직임끼리 묶어서 보여줄 수 있도록 개선".

#### Phase 1 — 익명 모드 (비로그인, localStorage SSOT) — 계정 X
- **진입**: 콘솔 `uat.clearAll()` → 새로고침 → `uat.isAnonymous() === true`
- **핵심 검증**: 서버 호출 0건 (Local-First 정책). 이 Phase 끝 상태 = "학생 3 / 과목 2 / 강사 2 / 세션 다수 입력된 익명 데이터" → Phase 2 충돌 시드.
- **소요**: 60분 (가장 큰 묶음)

**Sub-그룹 1A — 입력 패턴 (추가 모달 일관성, 15분)**

같은 "+ 추가" 모달 패턴 한 번 학습 → 다음 페이지에서 빠른 인지 (Cohesion sweep PR #536-#545 후 모달 통일성 ↑):
- 학생 추가: S-1.1 (로그인 리디렉트) / S-1.4 (익명 모드) / S-2.1 (학생 추가) / S-2.7 (상세 등록 모달 PR #289) / S-2.8 (빈 메타 hint ⓘ PR #290)
- 과목 추가: S-3.1 (빠른 추가 ListFilterBar) / S-3.2 (색상 팔레트 PR #340) / S-3.5 (hex 직접 입력 PR #340)
- 강사 추가: S-4.1 / S-4.2 (색상 자동 할당 순환) / S-4.3 (강사 색상 커스텀)
- **회귀 가드 (PR #517-#521)**: ScheduleToolbarFilters / ScheduleHeaderActions / ScheduleSecondaryModals / ScheduleEditModalWrapper / ScheduleWeeklyGrid 5 components 분할 후 추가 모달 동작 변화 없음 확인

**Sub-그룹 1B — 검색 + 편집 + 삭제 (cascade) 라이프사이클 (15분)**

같은 "검색 input" + "+ 새로 추가 CTA" 패턴 (다른 페이지에서도 동일):
- 학생: S-2.2 (검색) / S-2.3 (상세 보기) / S-2.4 (편집) / S-2.5 (삭제) / S-2.6 (0명 placeholder)
- 과목: S-3.3 (편집) / S-3.4 (삭제 cascade — 세션 색상 갱신) / S-3.6 (토스트 중복 가드 ADR-014 PR #338-#339)
- 강사: S-4.4-4.10 (편집 + 삭제 + 담당 과목 연결)
- **회귀 가드 (Cohesion sweep PR #524-#532)**: useStudentManagementLocal / useSubjectManagementLocal / useTeacherManagementLocal hook 추출 후 동작 변화 없음 — fire-and-forget sync 의 retry + outbox 정상

**Sub-그룹 1C — 시간표 구성 + 드래그앤드롭 (25분)**

가장 visible UX. PR #521 ScheduleWeeklyGrid component 분할 후 첫 회귀 가드 의무:
- S-5.1~5.25 시간표 입력 (세션 추가 / 그룹 세션 모달 / 일별/주간/월별 뷰)
- §6 드래그 / lane insert (ADR-017 v2 PR #388 — 정수 yPosition 모호 해소)
- §13 색상 (colorBy=subject / colorBy=teacher 토글)
- **회귀 가드 (PR #521)**: weekly grid view 에서 sessionsForRender + lane layout 계산 정확. drag 후 yPosition 정상

**Sub-그룹 1D — 빈 주 / 도움말 / 새로고침 (5분)**

- S-16.1~16.3 빈 주 placeholder / 도움말
- S-12.1 새로고침 시 익명 데이터 유지

#### Phase 2 — 익명 → 원장 로그인 전환 (충돌 발생 + 학원 생성, 15분)
- **진입**: Phase 1 끝 상태 그대로 → `UAT_TEST_OWNER_EMAIL` 로 password 로그인
- **사전 셋업 (인증 데이터 미리 박아둠)**: `npm run uat:seed` (충돌 발동 보장)
- **시나리오 묶음**:
  - **S-1.5 + S-1.5b 신규 user 케이스 (uat:teardown all 직후)**: owner 가 신규 상태일 때 첫 로그인 → /onboarding → 학원 자동 생성 (ADR-019 owner-강제). teardown 직후 시드 데이터 없이 진행.
  - **S-14.1~5 DataConflictModal** (uat:seed 후 다시 시도): 익명 데이터 + 서버 시드 데이터 충돌 → Layered Defense 검증.
  - **S-14.7 충돌 직전 자동 백업**: 머지 직후 백업 row 자동 생성.
  - **회귀 가드 (PR #534 commitEntityDeleteOnServer)**: server commit 동작 동일 확인 (extracted utility 의 contract)
- **끝 상태**: owner 인증 모드 (academy 1 개, 시드 데이터 머지 완료)

#### Phase 3 — 원장 (owner) 권한 시나리오 (35분)
- **진입**: Phase 2 끝 상태 그대로 (owner 로그인 + academy)
- **핵심 검증**: API POST/PUT 발사 + 서버 sync 정확. owner = canManage=true.

**Sub-그룹 3A — 템플릿 (12분)**

§7 템플릿 (S-7.1~7.10) — 시간표 템플릿 저장/적용/삭제. PR #545 design-explorations docstring 영향 0.

**Sub-그룹 3B — PDF + 공유 (12분)**

- §8 PDF (S-8.1~8.7) — PR #542 PdfExportRangeModal docstring 후 회귀 가드 (옵션 모달 동작 동일)
- §9 공유링크 + 학부모 코드 발급 (S-9.1, S-9.3) — 비로그인 접근 검증은 Phase 6
- §10.1/10.2 Academy 전환

**Sub-그룹 3C — 출석 + 알림 + 이력 (11분)**

- §15 출석부 owner 마킹
- §17 알림 히스토리 (PR #372 notificationCenter SSOT)
- S-14.6 데이터 이력 아코디언 / S-14.8~14.16 백업/마이그레이션 검증
- §18 EditSessionModal (PR #538 docstring 영향 0, PR #520 ScheduleEditModalWrapper 분할 후 회귀 가드)
- S-12.2~12.3 새로고침 강사 정보 유지

#### Phase 4 — 관리자 (admin) 권한 시나리오 — §19
- **사전 셋업**: owner 가 admin 초대 — **UI 흐름 (S-19.1~19.4)** 직접 검증 의무. 빠른 진입은 `npm run uat:invite -- --role admin` 으로 가능 (단 invite UI 자체 검증은 별도).
- **진입**: 로그아웃 → `UAT_TEST_ADMIN_EMAIL` 로 로그인 → owner 학원 자동 active
- **시나리오 묶음**: §19 전체 (S-19.1~19.7 — invite 4-state + admin CUD + owner 강등 차단 + 멤버 추가/삭제)
- **핵심 검증**: admin = canManage=true 이지만 owner 권한 (강등/삭제) 차단. invite_tokens INSERT 권한 + 이메일 mismatch 분기.
- **소요**: 15분

#### Phase 5 — 멤버=강사 (member) 권한 시나리오 — §20
- **사전 셋업**: owner 가 teacher 생성 후 member 초대 (UI 또는 `npm run uat:invite -- --role member`). teacher.user_id 가 member 와 link 되는 흐름이 핵심.
- **진입**: 로그아웃 → `UAT_TEST_MEMBER_EMAIL` 로 로그인 → middleware 가 admin-only 라우트 차단 → `/schedule` 로 redirect (member 는 /schedule role-branch read-only view — 2026-05-29 통합, /teacher-schedule 페이지 삭제)
- **시나리오 묶음**: §20 전체 (S-20.1~20.8 — invite 수락 + teacher link + /schedule role-branch view(본인 강사 세션만) + RBAC 차단 + 본인수업 출결 마킹(attendanceOnly 모달) + 세션 메타 PUT 전면 403)
- **핵심 검증**: middleware route guard (user_role 쿠키), useMyRole.canManage=false, FAB/+ 새 강사/+ 새 학생 버튼 미렌더 (S-5.15), 데이터 이력 섹션 미렌더 (S-14.13).
- **소요**: 15분

#### Phase 6 — 학생 / 학부모 view (incognito + access-code) — §21
- **사전 셋업**: owner 로 다시 로그인 (또는 Phase 3 끝 상태 유지) → `/settings` 에서 share-link 1 개 + 학부모 6자리 access-code 발급 (S-9.1/9.3 에서 이미 발급된 코드 재사용)
- **진입**: 같은 머신에서 **incognito 창** 열기 — 계정 사용 X
- **시나리오 묶음**: §21 전체 (S-21.1~21.5 — share-link 직접 접근 + 학부모 코드 입력 + 5회 실패 lockout + 만료 코드 + 학생 본인 view)
- **핵심 검증**: 학생/학부모 = 비로그인 → share-token 만으로 읽기 전용 view, IP rate limit + academy+IP lockout (5/1h)
- **소요**: 10분

#### Phase 7 — 모바일 뷰포트 (375×667)
- **진입**: 임의 역할 로그인 (owner 권장) + DevTools `Cmd+Shift+M` (iPhone SE)
- **시나리오 묶음**: §11 모바일 7개 (S-11.1~11.7), S-5.21 일별 뷰 좌우 스와이프, S-17.7 모바일 TopBar 종 패널, S-18.6 BottomSheet
- **소요**: 10분

#### Phase 8 — OAuth + 로그아웃/재인증
- **진입**: 임의 역할 로그아웃 상태. OAuth 시나리오는 본인 Google 계정 1회 (Release UAT 만). Kakao는 미구현 제외.
- **시나리오 묶음**: S-1.2 (Google OAuth), S-1.6 (로그인 상태 + /login 접근), S-1.7 (로그아웃 → 재로그인), S-12.5 (API 401)
- **소요**: 10분

#### Phase 9 — 오프라인 / Sync 회복
- **진입**: owner 인증 모드 + DevTools Network → Offline
- **시나리오 묶음**: S-12.4 오프라인 모드, S-12.6~12.9 SyncQueueModal + outbox flush
- **소요**: 10분

#### Phase 10 — Edge Cases
- **진입**: 시나리오마다 Pre 따로 (대부분 reset 필요)
- **시나리오 묶음**: E-1 ~ E-10
- **소요**: 10분

#### Phase 11 — Cleanup
- `npm run uat:teardown` (3 계정 모두 fresh-start, user 보존)
- 결과 commit + push + PR (§0 "매 UAT 사이클" 8~9 단계)

#### 모드별 Phase 매핑

| 모드 | 거치는 Phase | 시간 | 비고 |
|---|---|---|---|
| **Smoke** | 1 → 2 (Phase별 핵심 5 시나리오만) | 10-15분 | dev→main 머지 직전, owner 1 계정만 |
| **Release** | 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 | 180분 | 분기당 1회 + 큰 리팩터 후, 3 계정 전체 |

#### 비유

지하철 환승 — 한 노선(Phase) 안에서는 같은 역할/같은 방향으로 진행. 환승(역할 토글)은 정해진 환승역(Phase 경계)에서만. 시나리오 ID 는 역 이름 (불변), Phase 는 노선 (실행 순서), 역할은 진행 방향.

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

### 5. UAT 전용 계정 (3 계정 모델, 2026-05-20 도입)

#### 5.1 첫 1회 셋업

`.env.local` 에 3 계정 + Supabase 키 추가:
```bash
# Supabase admin (이미 있으면 skip)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# UAT 3 계정 — role 별 명시 (env 이름이 role 인지 의미 명확화)
UAT_TEST_OWNER_EMAIL=uat-owner@class-planner.test
UAT_TEST_OWNER_PASSWORD=<강한-password>
UAT_TEST_ADMIN_EMAIL=uat-admin@class-planner.test
UAT_TEST_ADMIN_PASSWORD=<강한-password>
UAT_TEST_MEMBER_EMAIL=uat-member@class-planner.test
UAT_TEST_MEMBER_PASSWORD=<강한-password>
```

| 계정 | 역할 (academy_members.role) | 검증 시나리오 |
|---|---|---|
| OWNER | owner (학원장) | S-1.5 첫 학원 생성, Phase 3 owner 권한 전체 |
| ADMIN | admin (관리자) | Phase 4 §19 — invite 4-state + admin CUD + owner 강등 차단 |
| MEMBER | member (멤버=강사 본인) | Phase 5 §20 — invite + teacher link + /schedule role-branch + RBAC 차단 |

> **학생/학부모 view = 계정 X.** 별도 incognito 창 + share-link / 6자리 access-code 로 검증 (Phase 6 §21).

그리고:
```bash
npm run uat:setup
# → 3 계정 user 멱등 생성 (이미 있으면 password 갱신)
# → academy 는 매 사이클 fresh-start (S-1.5 매 사이클 발동 보장)
# → 출력의 user_id 는 자동 lookup 되니 .env.local 에 적을 필요 없음 (선택적 UAT_TEST_{ROLE}_ID 가능)
```

> **2026-05-20 변경 — 단일 계정 → 3 계정 전환** — 단일 owner 만으론 RBAC 분기 + invite 4-state + member 가 보는 view 자체를 자연스럽게 검증 불가. ADR-019 Academy Singularity (owner 1+1) 하에 owner→admin/member 초대 흐름 자체가 핵심 회귀 path. legacy `UAT_TEST_USER_*` 환경변수는 OWNER 로 자동 fallback (1주일 alias 후 deprecated).

#### 5.2 매 UAT 사이클 (Phase 별 진입)

```bash
# 0. fresh-start cleanup — 3 계정 모두 (academy/member/invite 정리, user 보존)
npm run uat:teardown                            # default: all
# (선택 — 특정 역할만 reset 필요할 때)
npm run uat:teardown -- --user owner            # owner | admin | member

# Phase 2 진입 — owner academy + 시드 데이터 자동 생성 (S-1.5 skip 옵션)
npm run uat:seed
# → owner academy 없으면 자동 생성 + 시드 INSERT (멱등)
#   학생: 홍길동 / 김영수 / 박지수 — 과목: 수학(#FF0000) / 영어(#00FF00)
#   강사: 김선생 / 이선생 — 세션: 월/수/금 09:00-10:00, 김선생 배정
# → S-1.5 매 사이클 직접 검증하고 싶으면 uat:seed 스킵 후 브라우저에서 owner 로 첫 로그인

# Phase 4/5 진입 — admin/member 자동 초대 + 수락 (UI 흐름 자체 검증은 §19/§20 시나리오 직접)
npm run uat:invite                              # default: admin + member 두 역할
npm run uat:invite -- --role admin              # admin 만
npm run uat:invite -- --role member             # member 만 (teacher "강사_uat" 자동 생성 + link)

# 끝나면 정리
npm run uat:teardown                            # 3 계정 모두 reset
```

> **uat:invite vs UI 초대 — 둘 다 필요한 이유:**
> - **UI 초대 (S-19.1, S-20.1)**: 초대 발급 + 4-state 페이지 + accept 자체의 회귀 가드. **이 흐름은 매 Release UAT 직접 검증 의무.**
> - **uat:invite 스크립트**: 그 외 시나리오 (admin RBAC 권한 / member /schedule role-branch view) 빠른 진입용 alt path. invite UI 흐름과 독립.

> **OAuth 시나리오 (S-1.2)**: UAT 3 계정은 모두 password auth 로 진입. OAuth 흐름 자체 검증은 본인 Google 계정으로 별도 1회 (Release UAT 만). Kakao OAuth 는 미구현이라 UAT 제외.

> **e2e 와 격리**: `UAT_TEST_*_EMAIL` 과 `E2E_TEST_USER_*` 별도. 같은 Supabase 프로젝트지만 user_id 단위로 cleanup 격리 → 동시 실행 시에도 서로 데이터 안 건드림.

### 6. 사전 준비 — 정리

| 상황 | 정리 명령 |
|---|---|
| 익명 모드 (Phase 1) | 브라우저 콘솔 `uat.clearAll()` |
| 인증 모드 / 사이클 끝 | `npm run uat:teardown` (3 계정 fresh-start) |
| 특정 역할만 | `npm run uat:teardown -- --user owner\|admin\|member` |
| 학부모 view (incognito) | incognito 창 닫기 — 별도 정리 X (server side 는 owner cleanup 시 share-token 같이 삭제) |

---

## 1. Auth & 학원 셋업 (P0: 2 / 7) [40분 Core 포함]

> **순서 정책 (2026-05-09 갱신)** — 비로그인/로그인 state 토글이 잦으면 매번
> `npm run uat:teardown`/재로그인 비효율. **비로그인 그룹 → transition → 로그인
> 그룹** 순으로 진행하면 state 셋업이 1회씩.
>
> - **§1.A 비로그인 그룹**: S-1.1, S-1.1b, S-1.4
> - **§1.B Transition (비로그인 → 로그인)**: S-1.5 (첫 로그인 + 학원 생성, anonymous → server 마이그 자연 검증), S-1.5b, S-1.5c
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

### S-1.1b 온보딩 미완료 보호경로 가드 [P1]
**Pre:** 로그인 세션 있으나 학원 생성 전 (onboarded 쿠키 없음). 재현 — `npm run uat:teardown` 으로 owner academy 까지 cleanup → owner 로 로그인 → `/onboarding` 진입한 상태에서 학원명 입력/제출하지 **않고** 멈춤 (onboarded 쿠키 미설정).
**Steps:**
1. 위 상태에서 직접 URL `http://localhost:3000/schedule` 접속
2. 동일하게 `/students`, `/subjects`, `/teachers` 도 직접 URL 접속 시도
**Expected:**
- `/schedule` 접근 시 middleware 가 `/onboarding` 으로 자동 redirect (middleware.ts:66-69 — 로그인 세션 + onboarded 쿠키 ≠ '1' 이면 4 보호경로 모두 차단). matcher 가 `/students,/subjects,/teachers,/schedule` 커버.
- `/students,/subjects,/teachers` 도 동일하게 `/onboarding` 으로 튕김.
- **대조 확인** — 로그아웃 후 비로그인(익명) 상태에서 같은 경로 접근하면 통과 (middleware.ts:61-63 Anonymous-First — 비로그인은 가드 대상 아님). 온보딩 미완료 가드는 "로그인했지만 학원 없는" 상태에만 적용됨.
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

### S-1.5 첫 로그인 — 학원 자동 생성 (원장 강제) [P0] ⚠️ ADR-019
**Pre:** S-1.4 직후 (anonymous에 데이터 있음) + 신규 사용자 (academy_members row 없음). 재현 방법 — `npm run uat:teardown` 으로 UAT_TEST_USER 의 academy 까지 cleanup → 그 user 로 로그인 시 신규 사용자 상태. 또는 별도 신규 OAuth 계정 사용.
**Steps:**
1. OAuth 로그인 후 `/onboarding` 진입
2. **역할 라디오가 표시되지 않는 것 확인** (ADR-019 — 원장 자동, 이전 owner/admin/member 라디오 제거)
3. **amber Crown 안내 박스 확인** ("원장으로 등록됩니다" + "직접 생성한 학원의 owner 권한을 받습니다")
4. 학원명 입력 (2자 이상)
5. "원장으로 학원 만들기" 클릭 (이전 "시작하기" → 변경)
**Expected:**
- **`/students` 라우팅** (학원 생성 직후 학생 등록 안내가 자연스러운 흐름이라는 설계 의도 — `docs/superpowers/plans/2026-04-14-onboarding-flow.md` 참조. 익명/재방문은 `/schedule`로 가지만 신규 학원 생성 직후만 `/students`로 의도적 분기)
- 사이드바 상단에 학원명 + Academy Switcher 표시 + 본인 role = **owner** (Settings 멤버 목록에서 확인 가능)
- API `POST /api/onboarding` 호출 — body에 `role` 필드 없음 (client 측). server-side는 무조건 owner.
- **anonymous → server 자동 마이그 (`upload-local` 경로) 트리거** (PR #294 fix). 충돌 모달은 server 비어있어 안 뜨는 게 정상.
- **마이그 직후 "시간표가 새로 갱신되었어요. 새로고침할까요?" 토스트가 뜨면 안 됨** — 신규 원장 학원은 adminCount=1 이라 schedule/page.tsx 가드(`adminCount <= 1` → return, :361)가 발화 차단. adminCount=0(useMyRole fetch 중 race)도 동일하게 막음. admin 2명 이상 학원에서 **다른 admin 이 변경**한 경우에만 이 토스트가 정상 발화 (S-19 Phase 4 에서 검증). PR #295 가 아니라 adminCount 가드가 실제 억제 메커니즘.

**회귀 가드 — 첫 로그인 직후 /schedule 권한 race (PR #415, S-1.5 사고):**
학원명 정한 직후 자동 라우팅된 `/students` → 사이드바에서 `/schedule` 이동 시 FAB(+) + 모달 + 빈칸 클릭 + 수업 클릭 모두 정상 동작 확인. 새로고침 없이도 즉시 사용 가능. 새로고침 시에만 해결되던 증상은 MemberContext 가 `class-planner:academy-changed` 이벤트를 listen 안 해서 me=null (read-after-write race) 가 cache에 영속화된 결과. 본 PR 에서 academy-changed listener 추가 + me=null cache write skip 으로 차단.

**회귀 가드 — body.role 강제 owner (server-side 안전망):**
DevTools Network 탭에서 `/api/onboarding` 요청 직접 수정해 `role: "admin"` 보내도 server-side에서 무시 → academy_members.role = "owner" 확인.
```js
// /api/members 응답에서 본인 role 확인
const userId = localStorage.getItem('supabase_user_id');
fetch(`/api/members?userId=${userId}`).then(r=>r.json()).then(j=>{
  const me = j.data?.find(m=>m.userId===userId);
  console.log('my role:', me?.role); // → "owner"
});
```
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.5b 첫 로그인 — "초대 받았어요" escape hatch [P1] ⚠️ ADR-019
**Pre:** S-1.5와 동일 (신규 사용자, 학원 없음)
**Steps:**
1. OAuth 로그인 후 `/onboarding` 진입
2. 하단 "초대 받았어요 — 코드 입력하기 →" 클릭 (`data-testid="invite-toggle"`)
3. 초대 코드 input 표시 확인 (`data-testid="invite-section"`)
4. 임의 초대 코드 입력 (예: `test-token-123`) → "초대 확인" 클릭
**Expected:**
- `/invite/test-token-123` 로 router.push
- 유효 초대 코드면 4-state 페이지 (state-a/b/c/d) 표시
- 잘못된 코드면 invalid 페이지 표시
- "닫기" 클릭 시 onboarding 메인 폼으로 복귀
- 학원 URL 전체 입력 시 (예: `https://example.com/invite/abc`) token 추출(`abc`) 후 redirect
- **query/hash 가 붙은 공유 링크도 token 정확 추출** — 예: `https://example.com/invite/abc?utm=x` 또는 `https://example.com/invite/abc#frag` 입력 시 token 은 모두 `"abc"` 로 추출됨 (onboarding/page.tsx:115 — `split('/invite/').pop().split(/[/?#]/)[0]` 로 `/`, `?`, `#` 모두 delimiter 처리). 추출 후 `encodeURIComponent` 거쳐 `/invite/abc` 로 push.
**Result:** [ ] Pass [ ] Fail — note: ___

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

### S-1.5c 첫 로그인 — 마이그레이션 부분 실패 toast [P1]
**Pre:** anonymous 모드에서 **강사 미배정 세션 1개를 포함**한 데이터 생성 (강사 없이 수업 추가 — 강사 필드 비움). 그 외 학생/과목/정상 세션도 함께. 이후 신규 owner 로 첫 로그인 (S-1.5 재현 방법 동일 — teardown 후 owner).
**Steps:**
1. 위 상태에서 OAuth 로그인 → `/onboarding` → 학원 생성 (마이그 트리거)
2. 마이그 직후 토스트 관찰
**Expected:**
- 정상 레코드(학생/과목/강사 배정된 세션)는 서버 반영됨.
- **강사 미배정 세션 등 정책 위반 레코드가 있으면 warning 토스트(duration 8000ms) 발화** — 제목 "일부 데이터 동기화 안 됨", 설명 "N개 항목이 동기화되지 않았습니다 (강사 미배정 수업 등). 강사 지정 후 다시 추가해주세요." (useGlobalDataInitialization.ts — `applyLocalDataChoice` 의 `failed.length > 0` 분기). 이 토스트는 정상 동작이며 fail 아님.
- **anonymous 키는 삭제됨** — 성공분이 1개라도 있으면(`totalSynced > 0`) `classPlannerData:anonymous` 제거되어 재flood loop 차단 (handleLoginDataMigration.ts:164-167). 검증: `uat.inspect()` 또는 Application 탭에서 `classPlannerData:anonymous` 키가 사라졌는지 확인.
- **전부 실패(transient infra) 케이스 note** — 단 하나도 동기화 안 됐으면(`totalSynced === 0` 이고 anonymous 에 데이터 있음) anonymous 키는 **보존**되어 다음 로그인 때 재시도됨 (handleLoginDataMigration.ts:168-172). 이 전체 실패 회복 경로(네트워크 강제 차단으로 모든 sync 실패 강제)는 타이밍·서버응답 강제 영역 — **자동 테스트로 검증 (test branch)**. 수동 UAT 는 위 부분 실패 toast + anonymous 삭제까지만 확인.
**Result:** [ ] Pass [ ] Fail — note: ___

### §1.C 로그인 그룹

### S-1.2 Google OAuth 로그인 [P1]
**Pre:** 비로그인 상태 (S-1.5 끝나고 로그아웃 후 또는 별도 진입). localStorage `redirectAfterLogin` 비어있음 확인 후 진행 (값 남아있으면 라우팅 분기 달라짐 — 아래 Expected 참조).
**Steps:**
1. `/login` 접속
2. "Google로 계속하기" 버튼 클릭 (loading 시 "로그인 중..." 표시 확인). 그 아래 카카오 버튼은 "준비 중" 으로 비활성(disabled) — 클릭 불가 확인.
3. Google 계정 선택
**Expected:**
- OAuth 콜백 → **root(`/`) 도착 후 2-hop 라우팅** (login/page.tsx:18-24 는 직접 `/schedule` push 아님). 4갈래 분기:
  - (a) localStorage `redirectAfterLogin` 값 있으면 그 경로로 push (직전 deep-link 접근 후 로그인 케이스)
  - (b) `pending_invite_token` 있으면 `/invite/*` 우선 (page.tsx:40-44)
  - (c) onboarded 쿠키 없으면 middleware 가 `/onboarding` 으로 redirect
  - (d) onboarded 있으면 root page(page.tsx:46-51) 가 `/schedule` 로 replace
- **root(`/`) 랜딩 화면이 잠깐 보였다 사라지는 건 정상** (checked 전 null 렌더) — fail 로 오판 금지.
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
**Pre:** 로그인 + active academy 상태. localStorage `redirectAfterLogin` 비어있음 확인 후 진행.
**Steps:**
1. `/login` 직접 URL 입력
**Expected:**
- 자동으로 **root(`/`) 경유** → onboarded 상태면 root page 가 `/schedule` 로 replace (login/page.tsx:15-28 은 `/schedule` 직접 push 아님 — 항상 root 경유).
- 단 localStorage `redirectAfterLogin` 값이 남아있으면 그 경로 우선 push (이전 deep-link 후 로그인 케이스). 검증 시 `redirectAfterLogin` 비어있음 확인 후 진행해야 `/schedule` 결과 재현됨.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-1.7 로그아웃 → 재로그인 [P2]
**Pre:** 로그인 상태

**Quick Setup** (대안 — 로그아웃 버튼 GUI 대신 토큰 강제 만료로 같은 효과 검증):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
```

**Steps:**
1. 사이드바 하단 이메일 → "로그아웃"
2. 다시 OAuth 로그인
**Expected:**
- 로그아웃 클릭 시 **signOut() 이 자동 reload** (signOut.ts:17 `window.location.reload()`) — 수동 새로고침 불필요.
- signOut() 이 `onboarded` / `user_role` / `active_academy_id` **3 쿠키 + `supabase_user_id` + scoped `classPlannerData`** 제거 후 익명 모드 복귀 (signOut.ts:10-16).
- **`sb-*-auth-token` 쿠키는 document.cookie 로 직접 안 지우고 `supabase.auth.signOut()` SDK(signOut.ts:6)에 위임** — Application 탭에서 `sb-*` 쿠키가 사라졌는지 확인 (검증 포인트).
- 재로그인 시 이전 데이터 복원.

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
1. 입력란에 기존 학생과 겹치지 않는 새 이름(예: "테스트학생") 입력
2. Enter 또는 "추가" 클릭
**Expected:**
- 기존 학생과 매칭되는 이름이 없을 때(0건)만 좌측 목록에 즉시 추가 + `'테스트학생' 학생을 추가했습니다.` 성공 토스트
- 입력란 비워짐
- 인증 사용자: Network에 `/api/students` POST 발사
- (입력 이름이 기존 학생과 부분 매칭되면 즉시 추가 대신 상세 모달이 열린다 → S-2.1b 참조)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.1b 동명이인 매칭 시 상세 모달 분기 [P1]
**Pre:** "홍길동" 학생이 이미 등록된 상태, `/students` 진입
**Steps:**
1. 검색/입력란에 "홍" 입력
2. Enter (또는 "추가") 클릭
**Expected:**
- 즉시 추가되지 않음 (`StudentsPageLayout.handleAdd`: 부분 매칭 includes ≥1 분기)
- 상세 등록 모달(StudentAddDetailModal)이 이름 prefill("홍")로 열림
- `'홍' 이름의 학생이 N명 있습니다. 성별/생년월일로 동명이인을 구분해주세요.` info 토스트 노출
- 입력란은 비워짐(setQuery(''))
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

### S-2.5 학생 삭제 (즉시 삭제 + 되돌리기 토스트) [P1] [auto-friendly]
**Pre:** 학생 상세 패널 열림 (확인 모달 없음 — 타이핑 확인 모달은 강사 보관에만 존재)
**Steps:**
1. 상세 패널 우상단 "삭제"(Trash2 아이콘, aria-label="삭제") 클릭
**Expected:**
- 확인 모달 없이 좌측 목록에서 즉시 제거 + `<이름> 삭제됨` 되돌리기(undo) 토스트(5초) 노출
- cascade: 해당 학생 enrollment + 그로 인해 비게 된 session 정리 (시간표에서 학생 미표시)
- 5초 내 "되돌리기" 미클릭 시 5초 후 server DELETE commit (await — race window 0)
- (5초 내 "되돌리기" 클릭 복원 케이스는 S-2.5b 참조)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-2.5b 삭제 되돌리기(undo) 복원 [P1] [auto-friendly]
**Pre:** 수업에 배정된 학생 1명 이상, 상세 패널 열림
**Steps:**
1. "삭제" 클릭 → `<이름> 삭제됨` 토스트 확인
2. 토스트의 "되돌리기" 버튼을 5초 안에 클릭
**Expected:**
- 학생 + enrollment + 영향받은 session 모두 복원 (deleteStudent snapshot restore)
- `<이름> 복원됨` 성공 토스트 노출
- server DELETE commit 이 일어나지 않음 (deferred commit 취소)
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
1. 헤더 "+ 상세 등록" 클릭 → StudentAddDetailModal(제목 "학생 추가") 표시
2. 이름만 입력 → "추가" → 모달 닫힘 + 학생 등록
3. 다시 "+ 상세 등록" → 이름 + 성별(남/여) + 생년월일 + 학년(select, GRADE_OPTIONS) 입력 → "추가"
**Expected:**
- 이름 비었을 때 "추가" 버튼 disabled
- "권장" 라벨이 성별/생년월일 옆에 인디고 칩
- 안내: "성별/생년월일은 동명이인 식별과 정확한 데이터 동기화에 사용됩니다"
- 이름 6글자 초과 입력 시 잘림 (maxLength=6, NAME_MAX_LENGTH — 7번째 글자부터 입력 안 됨)
- 중복 이름 차단 없음 — 동명이인(같은 이름, 다른 성별/생년월일) 등록 허용 (client 중복 check 의도적 제거; 성별·생년월일로 식별)
- 생년월일이 만 4~25세 범위 밖이면 `학생 생년월일은 만 4~25세 범위여야 합니다.` alert role 에러 메시지
- 학년은 amber chip 으로 학생 목록 카드 앞에 노출
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

### S-2.9 멀티탭 / 같은 탭 학생 목록 동기화 [P2] [race]
**Pre:** 같은 브라우저에서 `/students` 를 탭A·탭B 두 개로 연다 (같은 academy)
**Steps:**
1. 탭A에서 학생 1명 추가 (S-2.1 또는 S-2.7)
2. 탭B로 전환 (새로고침 없이)
3. 같은 탭(탭A) 내에서 다른 페이지(예: `/schedule`)로 이동 후 다시 `/students` 진입 — 또는 같은 탭에서 추가/삭제 직후 목록 즉시 반영 관찰
**Expected:**
- 탭B `/students` 목록이 새로고침 없이 즉시 탭A 변경분 반영 (다른 탭 → window 'storage' 이벤트, useStudentManagementLocal 리스너)
- 같은 탭 내 변경은 'classPlannerDataChanged' CustomEvent 로 갱신 (same-tab setItem 은 storage 이벤트가 안 뜨므로 CustomEvent 가 SSOT)
- 동명이인 추가 후 양 탭의 ⓘ hint 상태가 일치
**Result:** [ ] Pass [ ] Fail — note: ___

> **(자동 테스트로 검증 — test branch)** optimistic temp-id → server-id reconcile race: 학생 추가 직후(reconcile 완료 전) 그 학생을 즉시 수업에 배정/편집/삭제 시 stale temp-id 가 server 로 가 500 + outbox 무한 retry 가 터지는지(PR #385 동류)는 reconcile 타이밍·서버응답 강제가 필요하므로 수동 시나리오가 아니라 자동 테스트(replaceStudentId 동작 + outbox 검증) branch 에서 다룬다. 강사/과목도 동형(§3/§4).
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

### S-3.4 과목 삭제 — cascade 동작 [P1] [auto-friendly]
**Pre:** 과목 1개 + 그 과목에 연결된 enrollment(들) + 그 enrollment 를 가진 session 1개 이상
**Steps:**
1. 과목 우측 메뉴 → "삭제" → 토스트의 "되돌리기" 5초 카운트다운 확인
2. 5초 대기 (commit 진행)
**Expected:**
- **의도:** 과목이 사라져도 시간표가 깨지지 않게 데이터 일관성 유지.
- **실제 동작 (`useSubjectManagementLocal.deleteSubject`):**
  - 즉시 localStorage 에서 **cascade 삭제** — subject + 그 subject 의 enrollments + 그 enrollments 만 가진 session 의 enrollmentIds 에서 제거 → enrollmentIds 비어진 session 자체 삭제
  - 5초 deferred-commit (ADR-012) — toast 의 "되돌리기" 클릭 안 하면 5초 후 `DELETE /api/subjects/:id` 호출 (await), 성공 시 pendingDeletes 정리
  - 되돌리기 클릭 → timer cancel + snapshot 복원 (subject/enrollment/session 모두 복원, server 호출 X)
  - 실패 시 pendingDeletes 유지 → recovery hook 자동 재시도
- "미지정" placeholder 로 남기는 동작 없음 — 항상 cascade 삭제.
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

### S-3.7 과목 추가 직후 즉시 사용 — temp-id reconcile race [P1] [race]
**Pre:** `/subjects` 진입 + DevTools Application > Local Storage 열어둠 (`class_planner_<userId>_subjects` 관찰). 가능하면 omni-radar 관제탑(`/observability`) 띄워둠 (PR #385 회귀: stale temp-id POST → FK 위반 500 → outbox 무한 retry).
**Steps:**
1. 과목 빠른 추가로 새 이름 (예: "릴레이수학") 추가 — `addSubjectToLocal` 이 temp id 로 localStorage 에 즉시 박고 `syncSubjectCreateAsync` 로 서버 응답 id 와 reconcile (`replaceSubjectId`).
2. 서버 응답을 기다리지 말고 **곧바로** (1~2초 내) 그 과목을 사용 — 시간표(`/schedule`)에서 수업 추가 모달을 열어 방금 만든 "릴레이수학"을 선택해 세션 1개 생성, 또는 그 과목으로 enrollment 배정.
3. 새로고침 (`Cmd+R`).
**Expected:**
- 새로고침 후에도 세션/배정에 그 과목이 정상 연결됨 — 깨진 색상/"미지정" 으로 빠지지 않음.
- localStorage `subjects` 의 해당 항목 id 가 server id 로 교체됨 (`replaceSubjectId` 동작), 세션의 `subjectId`/enrollment 의 `subjectId` 가 같은 server id 를 가리킴 (temp id 잔존 X).
- omni-radar 에 stale subjectId 로 인한 `exception`/4xx·5xx (FK 위반 500) 또는 outbox 무한 retry 가 **없음**.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-3.8 멀티탭 / 같은 탭 데이터 변경 동기화 (storage + classPlannerDataChanged) [P2] [race]
**Pre:** 같은 학원 로그인 상태로 탭A·탭B 두 개 `/subjects` 열어둠. (세 entity hook 모두 `storage`(다른 탭) + `classPlannerDataChanged`(같은 탭 CustomEvent) 두 경로로 목록 reload — 학생/강사 동형.)
**Steps:**
1. 탭A `/subjects` 에서 과목 1개 추가 (예: "동기화테스트").
2. 탭B `/subjects` 로 전환 — **새로고침 없이** 목록 관찰 (`storage` 이벤트로 자동 reload).
3. 같은 탭(탭A) 내에서 다른 페이지(예: `/schedule`)로 이동했다가 다시 `/subjects` 로 돌아옴 — 같은 탭 변경은 setItem 만으로 `storage` 이벤트가 안 뜨므로 `classPlannerDataChanged` CustomEvent dispatch 가 SSOT.
**Expected:**
- 탭B 목록에 "동기화테스트" 가 새로고침 없이 즉시 반영 (`storage` 이벤트 경로).
- 같은 탭 내 페이지 왕복 후에도 추가/변경분이 일관되게 보임 (`classPlannerDataChanged` 경로) — 누락/유령 항목 없음.
- 양 탭의 목록 상태(개수/이름)가 일치.
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

### S-4.5 강사 보관(아카이브) [P1]
**Pre:** 강사 1명 + 그 강사 배정 세션 1개 (owner/admin 계정)
**Steps:**
1. 강사 상세 패널 → "보관" 아이콘 (Trash2, aria-label="보관") 클릭
2. TypedConfirmationModal (`'<이름>' 강사를 보관하시겠습니까?`) 에서 강사명을 정확히 타이핑 → "보관" 버튼 클릭
3. 헤더의 "보관된 강사 보기" 토글 펼침
**Expected:**
- `<이름> 강사가 보관되었습니다` 토스트 + 목록에서 즉시 숨김
- 모달 description 에 영향 안내: `담당 수업 N개의 강사 정보는 그대로 보존됩니다.` (배정 세션 없으면 `담당 중인 수업이 없습니다.`)
- 서버 archive 이므로 SessionCard 의 강사 정보는 보존됨 ("강사 미배정" 표기 X — 그건 hard-delete 시에만 발생, 현재 흐름엔 없음)
- "보관된 강사 보기" 토글에 보관 강사가 표시되고 복구 버튼으로 되돌릴 수 있음 (복구 후 새로고침 시 목록 재노출)
- (참고: localStorage layer 의 `deleteTeacherFromLocal` 만 세션 teacherId 를 비우지만, server archive 흐름이 SSOT 이며 강사 정보 보존이 사용자 노출 동작)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.6 담당 과목 M:N 연결 — 강사-과목 그룹화 [P1]
**Pre:** 강사 2명 (김선생, 이선생) + 과목 2개 (수학, 영어). 김선생 "수학" 담당, 이선생은 담당 없음.
**Steps:**
1. 강사 상세 → "담당 과목" 섹션 → 김선생 row 에서 "수학" 체크
2. 시간표 FAB → 모달 Step 2 진입
3. 과목 select → "수학" 선택
4. 강사 pill picker 의 그룹 라벨 + 표시 순서 확인
**Expected:**
- **의도:** 사용자가 과목을 먼저 선택하면 담당 강사를 우선 시각 인지 → 잘못된 강사 배정 사고 감소.
- **실제 동작 (`TeacherPillPicker`, ADR-015):**
  - TeacherDetailPanel 에 칩 형태로 담당 과목 표시 (M:N teacher_subjects 테이블)
  - 모달 picker 에서 `subjectId` prop 전달 시 강사를 **"수학 담당" / "기타 강사" 두 그룹으로 분리 정렬** (필터링 아님 — 제한 없이 둘 다 선택 가능)
  - 담당 0명 그룹이어도 라벨 유지 (사용자가 "이 과목 담당 강사 미설정" 인지 → 강사 페이지에서 등록 유도)
  - owner/admin 강사도 picker 에 노출됨 — 제외하지 않음 (ADR-015 의도 정정, `teacherPickerFilter.filterTeachersForPicker` 는 전체 teachers 반환). 진짜 원장 vs 일반 강사는 Crown + "원장" badge (또는 role 칩) 로 시각 구분만 함
  - 동명이인은 TeacherChip hover 툴팁의 이메일/전화로 식별
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.7 주간 수업 카운트 [P2]
**Pre:** 강사 1명 + 그 강사 주간 3회 배정
**Steps:**
1. 강사 상세 패널
**Expected:**
- "주간 3회" 메타 정확
**Result:** [ ] Pass [ ] Fail — note: ___

### S-4.8 TeacherStatusPill 상태 표시 (설정/멤버 관리) [P2]
**Pre:** 다양한 상태의 멤버/강사가 있는 학원 (owner 본인 + admin 초대 대기 + 가입 완료 멤버 등). owner/admin 계정.
**Steps:**
1. `/settings` (멤버/강사 관리) 페이지 진입 — TeacherStatusPill 은 `/teachers` 목록이 아니라 **설정 페이지에만** 렌더됨
2. 멤버 카드/행의 각 상태 칩 확인
**Expected:**
- 실제 `TeacherStatus` enum 은 6종: `owner`("원장") / `active`("가입됨") / `invite_pending`("초대 대기 · D-N") / `invite_expired`("초대 만료") / `share_only`("시간표 공유 중") / `none`("미초대"). (`share_expired`, `inactive` 는 존재하지 않음)
- 색·아이콘은 **role** 기준 (status 와 무관하게 유지): owner → Crown amber, admin → Shield blue, member → GraduationCap emerald
- pending 계열 (`invite_pending` / `invite_expired` / `none`) 은 chip opacity-50 으로 dimmed
- `invite_pending` 은 `expiresAt` 기반 "D-N" 카운트다운 라벨 표시
- (참고: `/teachers` 목록 item 자체엔 status 칩이 없음 — 색 dot + ⓘ hint + "주간 N회" 부제만 표시. 상태 칩 검증은 `/settings` 에서만)
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
- 잘못된 전화 형식 시 alert role 에러 메시지 ("유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678, 02-123-4567)")
- 이름은 최대 6자 (NAME_MAX_LENGTH=6) — 초과 입력은 입력 단계에서 자동 truncate
- **동명이인 등록 허용** — 클라이언트 이름 중복 차단 없음 (같은 이름, 다른 이메일/전화 OK). 강사는 이메일/전화로 식별하며 진짜 중복(이름+이메일+전화 모두 일치)은 server idempotent 처리. (이전 "대소문자 무관 중복 이름 검사"는 UAT 2026-05-10 에 의도적으로 제거됨)
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

## 5. 시간표 — 수업 추가/편집/삭제 + 뷰 모드 (P0: 12 / 25) [Core 포함]

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

### S-5.5 시간 range 검증 [P1] ⚠️ PR #416
**Pre:** GroupSessionModal Step 1 (학생 선택 완료) → Step 2 (과목 & 시간) 진입
**Steps:**
1. Step 2 "수업 일정" 섹션의 **시간 chip** 클릭 → 시간 popover 열기
2. 시작시간 09:00, 종료 08:00 (역순 — `종료 < 시작`)
3. "종료 시간은 시작 시간보다 늦어야 합니다." 인라인 에러 + 다음 버튼 disabled 확인
4. 시작 11:00, 종료 22:00 (11시간 — **8시간 초과**)
5. "세션 시간은 최대 8시간까지 설정할 수 있습니다." 인라인 에러 + 다음 버튼 disabled 확인
6. 시작 14:00, 종료 16:00 (2시간 — 정상) → 에러 사라짐 + 다음 버튼 활성
**Expected:**
- picker 변경 시점에 즉시 에러 메시지 표시 (Step 2 (과목 & 시간)의 시간 chip popover 내부 — 또는 popover 닫힌 상태에서 시간 chip 하단 inline 에러)
- 8시간 초과·역순 모두 다음 버튼 disabled → Step 3 (확인) 진행 차단 (`canProceedStep1`)
- ⚠️ PR #416 이전 버그: 8시간 초과해도 다음 버튼 활성 → Step 3 진행 → 수업 추가 클릭 무반응 → 이전 버튼으로 돌아가야 에러 보임 (silent fail). picker 변경 시점에서 막혀야 정상.
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
**Pre:** 기존 세션 1개 (데스크탑: 세션 블록 long-press 또는 편집 모달; 모바일: 블록 long-press 300ms)
**Steps:**
1. 세션 블록을 long-press → context menu 열림 → "삭제" 클릭 (또는 편집 모달 내 삭제 진입점)
**Expected:**
- 시간표에서 **즉시 제거** (확인 모달 없음 — 학생/과목/강사 삭제와 동일 흐름, PR γ undo 토스트 일관성)
- 하단에 "삭제됨 · 되돌리기" undo 토스트 5초 표시
- 인증: `/api/sessions/:id` DELETE
- edge: undo 토스트 클릭 시 세션 복구 (시간표에 다시 표시, DELETE 취소)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.11 같은 시간대 중복 수업 [P1]
**Pre:** 09:00-10:00에 수학(홍길동)
**Steps:**
1. 같은 09:00-10:00에 영어(김영수) 추가 (2개 겹침)
2. 같은 시간대에 1개 더 추가 (3개 겹침 — equal-split 한계)
3. 같은 시간대에 4개째 추가 (overflow 임계)
**Expected:**
- 2~3개: lane 분할되어 나란히 side-by-side 표시 (≤3 lanes equal-split), 텍스트 잘림 없이 가독성 유지
- 4개째: 3 inline lane + "+1" overflow chip으로 전환 (TimeTableRow Phase 4 임계) — S-5.25 row-level expand로 연결
- 3→4 전환 시 기존 3개 가독성 유지, 잘린 블록 없이 chip만 추가
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.12 다중 선택 → 일괄 삭제 [P2]
**Pre:** 세션 3개
**Steps:**
1. Shift/Ctrl/Cmd+클릭으로 3개 선택 (선택 toolbar에 "N개 선택됨" 표시)
2. 선택 toolbar의 일괄 삭제 버튼 클릭
**Expected:**
- 선택 표시 (테두리/하이라이트)
- **즉시 모두 제거** (확인 모달 없음) + 일괄 undo 토스트 표시 (되돌리기 가능)
- 참고: Delete 키 핸들러는 없음 — 선택 toolbar 버튼으로만 삭제 진입
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
- ScheduleDailyView 렌더 — **좌측 time-axis timeline (겹침 side-by-side lane, absolute top 좌표 배치) + 우측 detail panel (선택 세션 상세, 다음 수업 카운트다운, 편집 버튼) 2-pane 레이아웃** (데스크탑 기준; 모바일은 timeline full width)
- colorBy 모드 색상 적용 (`resolveSessionColor`)
- 현재 시각 위치에 amber line + "지금 HH:MM" pill 표시
- 첫 진입 시 현재 진행 중(없으면 다음) 세션 자동 선택
- 빈 상태 시 "수업이 없습니다" placeholder
- (상단 요일 chip 바 DayChipBar는 toolbar에서 daily 뷰일 때 노출 — S-5.18에서 검증)
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

### S-5.24 수업 추가 모달 — V3 chip+popover (요일/날짜 + 시간) [P0] (PR #396)
**Pre:** 현재 주 (5/18~5/24) 시간표, 빈 셀 클릭 또는 FAB → GroupSessionModal open
**Steps:**
1. Step 1에서 학생 1명 추가 → "다음" 클릭 (Step 2 "과목 & 시간" 진입)
2. Step 2 본문 **"수업 일정" 섹션**에 **날짜(요일) chip** + **시간 chip** 표시 확인 (편집 모달 V3 패턴 미러 — 모달 헤더는 "수업 추가" 타이틀만, chip은 헤더 아닌 Step 2 본문에 위치)
3. 날짜 chip 클릭 → 월별 캘린더 popover open
4. 다른 주의 날짜 클릭 (예: 5/27 화요일) → chip label 즉시 갱신 (`5월 27일 (화)`)
5. 시간 chip 클릭 → 시간 popover에서 14:00 선택
6. 과목/강사 선택 → "다음" → Step 3 "확인" → "수업 추가" 클릭
**Expected:**
- 저장 후 시간표가 선택한 주(5/25~5/31)로 자동 navigate
- 새 세션이 그 주의 5/27 화요일 14:00에 표시
- API: `POST /api/sessions` body에 `weekStartDate: "2026-05-25"` 포함
- 주(週)-grid weekday select + time input 두 섹션이 chip+popover 1줄로 통합 (Step 2 본문 — 별도 select 없음)
- **새로고침(F5) 후에도 세션이 5/27(선택 주)에 그대로 유지 — 현재 주(5/18)로 새어 나오지 않음** (weekStartDate 정합 검증)
- *(자동 테스트로 검증 — test branch)* 저장 직후 1초 내 새로고침 시 POST race / ghost-cleanup grace(30s)로 세션 유실 0 — fire-and-forget POST→PUT 순서 강제는 자동 테스트 영역
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.25 시간표 row-level overflow expand — +N/− chip [P0] (PR #392/#399)
**Pre:** 같은 weekday 같은 시간대에 4개 이상 겹치는 세션 (예: 월 14:00 4건)
**Steps:**
1. 14:00 행에서 "+1" chip 클릭
2. 그 row 전체(같은 weekday의 모든 cluster)가 동시에 expand 확인
3. "−" chip 클릭으로 다시 접기
**Expected:**
- 단일 시간대 expand가 아니라 그 weekday의 **모든 cluster 일괄 expand**
- 다른 weekday의 cluster는 영향 없음
- 같은 weekday 안에서 동일 시간대만 따로 expand 되는 잔재 0
**Result:** [ ] Pass [ ] Fail — note: ___

### S-5.26 수업 추가 double-submit 가드 [P1] [race]
**Pre:** GroupSessionModal Step 3 요약 카드 (학생/과목/강사/시간 모두 입력 완료)
**Steps:**
1. "수업 추가" 버튼을 빠르게 2번 연속 클릭 (또는 DevTools Network throttle "Slow 3G" 상태에서 1회 클릭)
**Expected:**
- 세션이 정확히 **1개만** 생성 (중복 0)
- 첫 클릭 후 버튼 비활성/모달 즉시 닫힘 — 두 번째 클릭이 추가 세션을 만들지 않음
- omni-radar: `POST /api/sessions` 1회만 (enrollment+session 2벌 생성 0)
- ⚠️ 구현 측 권장: "수업 추가" 버튼에 submitting in-flight 가드 추가 (현재 disabled 가드 없음 — `addGroupSession`이 async라 await 동안 더블클릭 시 중복 생성 위험)
**Result:** [ ] Pass [ ] Fail — note: ___

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

## 6. 시간표 — 드래그/충돌/멀티선택 (P0: 2 / 12)

### S-6.1 드래그로 시간 이동 [P0]
**Pre:** 세션 1개 (월 09:00-10:00)
**Steps:**
1. SessionCard 본체(좌상단 grab handle 영역, `cursor-grab`)를 잡고 5px 이상 이동해 PointerSensor 활성 → 월 11:00 셀로 드래그
2. drop
**Expected:**
- 세션이 월 11:00-12:00로 즉시 이동
- 새로고침 후 유지
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.1b 드래그로 요일 이동 시 출결 따라감 [P0]
**Pre:** 인증 모드. 월 09:00 세션에 오늘 occurrence 출결 '출석' 체크됨 (출결 모달에서 확인)
**Steps:**
1. 월 09:00 세션을 화요일 09:00 셀로 drag → drop
**Expected:**
- ① 세션이 화요일로 이동
- ② 출결 모달을 다시 열면 화요일 occurrence 에 '출석' 그대로 보존 (월요일 occurrence 에서는 사라짐) — `migrateAttendanceForSessionMove` 가 occurrence date 재계산해 따라 이동
- ③ '출결 1건 함께 이동' 토스트 표시
- ④ 새로고침 후 출결/위치 모두 유지 (데이터 유실 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.2 드래그 후 동기화 [P0]
**Pre:** 인증 모드
**Steps:**
1. S-6.1 실행
**Expected:**
- Network 탭에 `PUT /api/sessions/:id/position?userId=<uuid>` 호출 발사 (전용 위치 엔드포인트 — 일반 PUT `/api/sessions/:id` 아님. 일반 PUT 은 EditSessionModal full PUT 경로)
- request body = `{ weekday, time, endTime, yPosition }` (partial)
- response 200, 새로고침 후 위치 유지
- `?userId` 쿼리 누락 시 400 회귀(PR #194) — 쿼리스트링 포함 여부 확인
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.3 드래그 중 미리보기 [P1]
**Pre:** 드래그 진행 중
**Steps:**
1. SessionCard 본체(좌상단 grab handle 영역, 5px 이동 시 PointerSensor 활성) 잡고 드래그 시작 → 마우스 이동
**Expected:**
- 드롭 가능 위치에 반투명 DragOverlay preview 표시
- 원본 SessionCard는 살짝 흐려짐(isDraggedSession dim, opacity)
- preview는 pointer-events: none (클릭 안 됨)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.4 드래그 취소 (Escape) [P2]
**Pre:** 드래그 중
**Steps:**
1. dnd-kit PointerSensor 기반 — drag 시작 후 마우스 버튼을 누른 채 Escape 키
**Expected:**
- DragOverlay preview 가 사라지고 원본 SessionCard 가 원위치로 복귀
- `/position` PUT 호출 0건 (Network 탭 확인) — API 호출 없음
- Escape 취소는 dnd-kit PointerSensor 내장 keydown 동작 (별도 cancel 핸들러 코드 없음, KeyboardSensor 미사용)이므로 dnd-kit 라이브러리 버전 의존 — dnd-kit 버전 bump PR 후 회귀 우선 검증 대상
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.5 Cmd+드래그 (복사) [P1]
**Pre:** 세션 1개
**Steps:**
1. Cmd 누른 채 SessionCard 드래그 → 다른 시간대 drop
**Expected:**
- 원본 그대로 + 사본 새로 생성 (새 enrollment 필요 시 + 별도 sessionId)
- 둘 다 시간표에 표시, 새로고침 후 둘 다 유지
- (회귀 가드) Cmd 누른 채 시작해 drag 도중 window blur 가 발생해도 drop 결과는 이동이 아닌 복사 — drag-start 시점 modifier 를 latch (TimeTableGrid `dragStartCopyModeRef`) 하기 때문. macOS 에서 Cmd+native drag 시작 시 짧은 blur 로 복사가 이동으로 잘못 라우팅되던 회귀 가드
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.5b 다중선택 Cmd+드래그 = 묶음 복사 [P2]
**Pre:** 세션 3개 다중선택 상태 (S-6.7 후)
**Steps:**
1. 선택된 묶음 중 하나를 Cmd 누른 채 다른 시간대로 drag → drop
**Expected:**
- 선택 3개 전부 사본 생성 (`planBulkSessionCopy` 분기)
- `N개 복사` 토스트 표시
- 일부 사본이 자정 이전으로 밀리면 그 항목만 건너뛰고 outOfRange warning 토스트
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.6 드래그 충돌 — lane 자동 분할 (modal 없음) [P2]
**Pre:** 09:00-10:00에 A세션, 10:00-11:00에 B세션 (같은 weekday)
**Steps:**
1. A 의 SessionCard 본체(grab handle 영역) 잡고 10:00 시작 셀로 이동 → drop
**Expected:**
- **의도:** 같은 시간대 충돌 시 데이터 손실 없이 시각적으로 둘 다 표시.
- **실제 동작 (`buildHandleSessionDrop` → `updateSessionPosition`):**
  - **충돌 모달/차단 없음** — 그대로 위치 PUT 발사 (`PUT /api/sessions/:id/position`)
  - sessionClusters 렌더링이 같은 시간대를 yPosition 기준으로 lane 0, 1, 2... 자동 분할 → A 와 B 가 나란히 표시
  - 같은 yPosition 으로 떨어지면 compaction 이 lane 재배분 (PR #388 lane insert edge slot 별도)
  - 둘 다 살아남고 시간표에 가시 — 사용자가 의도치 않은 겹침을 즉시 인지하고 본인이 다시 드래그로 분리하는 모델
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.7 다중 선택 (Shift/Ctrl/Cmd+클릭) [P1]
**Pre:** 세션 3개
**Steps:**
1. 첫 세션 클릭 → Shift(또는 Cmd/Ctrl)+다른 세션 클릭
**Expected:**
- 선택된 세션에 시각적 표시 (테두리/하이라이트), 동시에 여러 개 선택 상태
- modifier+클릭은 Edit 모달을 열지 않고 선택 toggle 만 (early return)
- Shift / Ctrl / Cmd 어느 키든 동일하게 toggle 동작
- 최대 50개까지 선택 (DEFAULT_MAX=50), 초과 시 추가 toggle 무시 + 알림 콜백(onLimitExceeded)
- Esc 키로 전체 선택 해제 (빈 영역 클릭 대안, S-6.9 와 별개 경로)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.8 다중 선택 드래그 [P2]
**Pre:** S-6.7 후 (3개 선택 상태)
**Steps:**
1. 선택된 세션 중 하나를 다른 시간대로 드래그
2. (엣지) group 중 1개를 00:30 에 가깝게 드래그해 일부만 자정 이전(outOfRange)으로 밀리게 시도
**Expected:**
- 선택된 3개가 anchor delta 만큼 함께 이동, group-shift contiguous yPosition 유지 (ADR 017 v2)
- 일부가 자정 이전으로 밀리면 그 항목만 건너뛰고 부분 이동 — `N개 중 M개 이동 — K개는 시간 범위(자정 이전) 초과로 건너뜀` warning 토스트 ('N개만 옮겨짐'은 버그가 아닌 의도된 outOfRange 정책)
- 이동 완료 후 다중선택 자동 해제 (`sessionSelection.clear()` — 빈 영역 클릭 불필요)
- 요일 변경이 포함되면 출결도 함께 이동 — '출결 N건 함께 이동' 토스트
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

### S-6.11 Lane insert — edge hover slot (Variant E) [P1] (PR #388)
**Pre:** 같은 시간대 2개 lane (월 14:00 lane 0 = A, lane 1 = B)
**Steps:**
1. C 세션을 잡고 lane 0과 lane 1 사이 boundary로 hover
2. 좌/우 edge dashed overlay + "여기 삽입" 텍스트 확인
3. drop
**Expected:**
- A와 B 사이에 lane 새로 끼워짐 (C가 lane 1, 기존 B는 lane 2로 밀림)
- compaction 후 yPosition contiguous 유지
- 빈 시간대 hover 시에는 overlay 표시 안 됨 (cell unique id 보호)
- Cmd-drag (복사 모드) + multi-select drag 시 lane insert slot 비활성
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.12 드래그 3 시각 피드백 SSOT 통일 [P1] (PR #389/#390)
**Pre:** 세션 1개 드래그 시작
**Steps:**
1. 드래그 중 lane-highlight(현재 lane row) 확인
2. drop target overlay (이동 모드 dashed / insert 모드 dashed + "여기 삽입") 확인
3. drop preview (이동 후 SessionCard 위치) 확인
**Expected:**
- 3가지 시각 피드백이 mode (move / insert / cmd-copy) 별로 일관된 색/형태
- compactYPositions artifact 없음 (lane 사이 빈 공간 0)
- mode-aware lane-highlight — insert 모드에서는 lane row가 아닌 boundary 강조
**Result:** [ ] Pass [ ] Fail — note: ___

### S-6.13 연속 빠른 재드래그 (double-submit) 정합성 [P0]
> (자동 테스트로 검증 — test branch) drop 직후 서버 PUT `/position` 응답 전 같은 세션 재드래그 시 두 PUT 의 순서역전 / 404→ghost cleanup race 는 Network throttle·서버응답 타이밍 강제가 필요해 UAT 수동 재현이 불안정 — 자동 테스트 branch 에서 검증.

### S-6.14 멀티탭 동시 편집 중 drag 정합성 [P1]
**Pre:** 같은 계정으로 탭 2개에서 `/schedule` 열기. 세션 A / B 존재
**Steps:**
1. 탭1 에서 A 를 drag 시작 (drop 전 hold 유지)
2. 탭2 에서 B 를 다른 lane 으로 이동
3. 탭1 에서 A drop
**Expected:**
- ① 탭1 drop 후에도 B 의 탭2 변경이 사라지지 않음 (A, B 둘 다 보존)
- ② 새로고침 시 두 탭이 동일 상태로 수렴
- ③ yPosition 중복 없음 (같은 시각·같은 lane stack 충돌 없음)
- ⚠️ 알려진 위험: drag 진행 중에는 closure 의 `sessions` snapshot 이 storage 이벤트로 갱신되지 않음 → 마지막 drop 이 stale snapshot 기준 reposition 으로 다른 탭 변경을 덮어쓸 수 있음. 데이터 유실 관측 시 note 에 trace_id 기록
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 7. 템플릿 (P0: 4 / 10) [⚠️ PR #211 회귀 집중]

> **자동 회귀 가드:**
> - `src/app/schedule/_utils/__tests__/buildTemplateData.test.ts` (10 unit)
> - `src/app/schedule/_utils/__tests__/buildApplyTemplate.test.ts` (13 unit — 적용 매칭/missingEntities/yPosition default/enrollment 재사용)
> - `src/components/molecules/__tests__/SlotPickerModal.test.tsx` (슬롯 default 선택/disabled/title)
> - `src/components/molecules/__tests__/ApplyTemplateConfirm.test.tsx`, `TemplateMenuV2.test.tsx` (모달·메뉴 라벨)
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
2. "현재 주를 템플릿으로 저장" 클릭 → SlotPickerModal 열림 (title "어느 슬롯에 저장할까요?")
3. 슬롯 1 선택 → "슬롯 이름 (선택)" input 에 "주간 기본" 입력 (이름은 optional — 비우면 "슬롯 1")
4. "저장"
**Expected:**
- 활성 슬롯 1, 2 (FREE_TIER_QUOTA=2) + 비활성 슬롯 3-5 ("추후 업데이트 예정" 라벨 + Lock)이 보임
- success 토스트 `"주간 기본" 슬롯에 저장되었습니다.` (신규 = create / 기존 슬롯 덮어쓰면 `... 슬롯이 갱신되었습니다.`)
- API `/api/templates` POST 200/201
- (주의) "13개 수업이 저장됩니다" 미리보기 텍스트는 현재 코드에 없음 — design-explorations mock 에만 존재. Expected 아님.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.2 저장 실패 시 에러 토스트 [P0] ⚠️
**Pre:** POST /api/templates를 500으로 강제 실패 (빈 슬롯 신규 저장 경로)

**Quick Setup** (DevTools Network override 대안 — 콘솔 1줄):
```js
// 시나리오 시작 직전 호출 — 매칭되는 fetch에 500 응답
const restore = uat.forceFetch500('/api/templates');
// S-7.1 단계 수행 후 검증 끝나면 복구:
restore();
```

**Steps:**
1. S-7.1 시도 (빈 슬롯 신규 저장 → POST 500)
**Expected:**
- error 토스트 `템플릿 처리에 실패했습니다. 잠시 후 다시 시도해주세요.` — 빈 슬롯 신규 저장(POST) 실패는 reason='error' 매핑(`templateHelpers.ts` saveTemplateSlotUtil). "저장에 실패" 문구는 quota 등 다른 분기에서만 노출
- SlotPickerModal 닫히지 않음 (재시도 가능 — handleSaveSlot early return 으로 setShowSavePickerModal(false) 미호출)
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
**Pre:** 템플릿 1개 저장 + **대상 주에 기존 수업 1개 이상 존재** (교체 확인 모달 발동 조건). 빈 주 적용은 S-7.4b 참조
**Steps:**
1. 기존 수업이 있는 주로 이동
2. 템플릿 메뉴 → "템플릿 적용하기" → SlotPickerModal(apply, title "어느 슬롯을 적용할까요?") 에서 슬롯 1 선택 → "적용"
3. 대상 주에 기존 수업이 있으므로 ApplyTemplateConfirm (title "템플릿을 적용할까요?") → "기존 삭제하고 적용" (빨강 버튼) 클릭
**Expected:**
- 대상 주에 13개 수업 모두 생성 (기존 수업은 삭제 후 교체)
- success 토스트 "13개 수업이 템플릿으로 교체되었습니다"
- 각 세션에 강사 정보 유지 (강사명 표시)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.4b 빈 주 적용 — 확인 모달 없이 즉시 적용 [P1] ⚠️
**Pre:** 템플릿 1개 저장 + 대상 주가 빈 상태 (수업 0개)
**Steps:**
1. 빈 주로 이동 (next week 화살표 등)
2. 템플릿 메뉴 → "템플릿 적용하기" → SlotPickerModal(apply) 에서 슬롯 1 선택 → "적용"
**Expected:**
- 대상 주가 비어있으면 ApplyTemplateConfirm("템플릿을 적용할까요?")가 **뜨지 않고** 즉시 적용됨 (handleApplyTemplate: weekFilteredSessions.length===0 → doApplyTemplate 직행)
- 13개 수업 생성 + success 토스트 "13개 수업이 템플릿으로 교체되었습니다"
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
**Pre:** room 정보 있는 세션 포함된 시간표 → 템플릿 저장 → **적용 대상 주가 비어있어 충돌 없음** (보존 검증을 결정적으로) → 적용
**Steps:**
1. 적용된 세션의 room 정보 + lane 위치 확인
**Expected:**
- room 값 보존됨 (저장 → 적용 round-trip 손실 X — `buildApplyTemplate.ts` `room: tplSession.room ?? ""`)
- yPosition 은 충돌 없으면 동일 보존. **충돌 시(동일 weekday·time 다수 또는 대상 주에 기존 수업)** `repositionSessionsUtil` 규칙으로 재배치되므로 lane 위치가 바뀔 수 있음 — "동일 보존"은 collision-free 전제에서만 성립
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
1. SlotPickerModal 열림 (title "어느 슬롯에 저장할까요?")
2. 슬롯 1, 2 활성 (FREE_TIER_QUOTA=2)
3. 슬롯 3, 4, 5 disabled + Lock 아이콘 + "추후 업데이트 예정" 라벨
4. 슬롯 1 선택 → "슬롯 이름 (선택)"에 "주간 기본" 입력 → "저장"
**Expected:**
- 슬롯 1에 "주간 기본" 저장 success 토스트 (`"주간 기본" 슬롯에 저장되었습니다.`)
- 다음 진입 시 슬롯 1 채워진 표시 + 슬롯 2 빈 표시
- save mode default 선택: 첫 빈 슬롯 (slotsInfo.find(!filled))
- API `/api/templates` POST 발사 (body = name/description/templateData — **slotIndex 는 body 에 미포함**. 서버 `route.ts` 가 first-empty 로 자동 결정: usedSlots.has(0) ? 1 : 0). Network 탭에서 slotIndex 필드 찾지 말 것
- (UX gap 검증) 빈 슬롯 2개 중 사용자가 슬롯 2 를 골라도 신규 POST 면 서버가 slot_index=0 부여 → **선택 slotIndex 와 실제 저장 슬롯이 어긋날 수 있음**. 슬롯 2 선택 → 저장 후 슬롯 1에 들어가는지 별도 확인
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

### S-7.11 템플릿 적용 직후 서버 동기화 reconcile [P0]
**Pre:** 템플릿 1개 저장 + 빈 주 (충돌 없음)
**Steps:**
1. DevTools Network 를 Offline (또는 강한 throttle) 로 전환 후 템플릿 적용 (N개 세션)
2. 즉시 페이지 새로고침
3. Network 를 Online 복귀 → outbox flush 대기
**Expected:**
- 적용 N개 세션이 서버 GET 응답에 모두 존재 (누락 0), enrollment 도 동반 생성
- ghost/중복 세션 0 (client UUID 포함으로 ghost 방지 — `templateHelpers.ts` fire-and-forget syncSessionCreate/syncEnrollmentCreate)
- 오프라인 적용 시 온라인 복귀 후 outbox flush 로 서버 반영 완료 (radar /api/sessions POST N건 확인)
- (배경) 적용은 await updateData(local) 후 session/enrollment 를 fire-and-forget 동기화(ADR-012). in-flight 중 새로고침 → useGlobalDataInitialization 재실행과 race 가능 영역
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.12 적용 더블-서브밋 방어 [P1]
**Pre:** 템플릿 1개 저장 + 대상 주에 기존 수업 존재 (ApplyTemplateConfirm 발동)
**Steps:**
1. ApplyTemplateConfirm 에서 "기존 삭제하고 적용" 을 빠르게 2회 클릭 (또는 SlotPicker apply 버튼 연타)
**Expected:**
- 두 번째 클릭 무시 — 버튼이 "적용 중..." 으로 disabled (ApplyTemplateConfirm: isApplying=isApplyingTemplate, SlotPickerModal: isSubmitting=isApplyingTemplate)
- 생성 세션 수 = 템플릿 세션 수 (중복 0)
- POST /api/sessions 호출이 N건만 (2N 아님)
- (배경) 적용은 기존 주 세션 전체 삭제 후 교체이므로 더블 트리거 시 중복 생성/이중 삭제 위험 큼 — in-flight 가드 회귀 시 즉시 데이터 손상
**Result:** [ ] Pass [ ] Fail — note: ___

### S-7.13 빈 주 저장 차단 [P2]
**Pre:** 현재 주 수업 0개
**Steps:**
1. 템플릿 메뉴 → "현재 주를 템플릿으로 저장" → SlotPickerModal 에서 슬롯 선택 → "저장"
**Expected:**
- error 토스트 "저장할 수업이 없습니다." (`templateHelpers.ts` templateData.sessions.length===0 → reason='empty')
- POST `/api/templates` 미발사
- 슬롯 점유 안 됨 (quota 2 중 소진 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 8. PDF Export (P0: 1 / 7)

### S-8.1 PDF 다운로드 모달 [P0]
**Pre:** `/schedule` 인증 모드 (주간 뷰)
**Steps:**
1. ScheduleActionBar 의 PDF 버튼 (Download 아이콘 + "PDF" 텍스트, aria-label "시간표 PDF") 클릭
**Expected:**
- PdfExportRangeModal 열림 (모달 제목 "PDF 출력 범위") — 항상 모달이 먼저 열린다 (UAT 2026-05-22 dropdown 제거 후에도 모달 단계 유지)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.2 PDF 버튼 노출 조건 [P2]
**Pre:** `/schedule`
**Steps:**
1. 주간 뷰에서 PDF 버튼 존재 확인
2. 일별/월별 뷰로 전환 후 PDF 버튼 확인
**Expected:**
- 주간 뷰에서만 PDF 버튼 표시 (ScheduleActionBar `showPdf = viewMode === "weekly"`)
- 일별/월별 뷰에서는 PDF 버튼 미노출 (전용 layout 미구현 — 의도된 동작)
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
**Pre:** 강사 2명 + 각 세션 (주간 뷰)
**Steps:**
1. PDF 버튼 → 모달 → "강사별로 1장씩" 라디오 선택
2. 출력할 강사 chip 에서 일부/전체 선택 (+ 필요시 "학생 이름 포함" 체크)
3. "출력" 클릭
**Expected:**
- 선택한 강사 각각에 대해 별도 PDF 파일 다운로드 (`강사명_시간표_날짜.pdf`, 강사 수만큼 N개 파일 — 한 PDF 의 페이지 분리가 아님)
- 강사 미배정 세션이 있는 강사는 skip (`teacherSessions.length === 0 continue`)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.7 날짜 범위 선택 [P2]
**Pre:** 월별 PDF
**Steps:**
1. PdfExportRangeModal → 시작일/종료일 입력
**Expected:**
- 해당 범위만 포함된 PDF
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.8 학생별 PDF 대량 다운로드 가드 [P1]
**Pre:** 학생 31명 이상 + 주간 뷰
**Steps:**
1. PDF 버튼 → 모달 → "학생별로 1장씩" → 전체 선택
2. inline 경고 (⚠ N명 → N개 파일) 확인
3. "출력" 클릭
**Expected:**
- `window.confirm` "N명의 학생 각각 1페이지로 출력합니다. 계속할까요?" 표시 (`STUDENT_PAGE_GUARD_THRESHOLD = 30` 초과 시)
- 취소 시 다운로드 안 함 (early return), 확인 시 학생 수만큼 `학생명_시간표_날짜.pdf` 파일 다운로드
**Result:** [ ] Pass [ ] Fail — note: ___

### S-8.9 필터 적용 상태 PDF 인쇄 대상 [P2]
**Pre:** `/schedule` 에서 과목/학생 필터 1개 활성 (주간 뷰)
**Steps:**
1. PDF 버튼 → 모달
2. 상단 amber 필터 chip (filterChipLabel + filteredCount/totalCount) 확인
3. "인쇄 대상": "필터 적용 수업만" / "전체 수업" 토글
**Expected:**
- "필터 적용 수업만" 선택 시 화면 필터된 수업만 PDF (`applyFilter = printTarget === "filtered"`)
- "전체 수업" 선택 시 필터 무시 전체 출력
- "필터 적용 수업만" 선택 중에는 강사별/학생별 분할 라디오 disable (`splitDisabledByFilter = hasAnyFilter && printTarget === "filtered"` — "전체 수업" 선택 시 활용)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 9. 공유 링크 + 접속 코드 (P0: 2 / 6)

### S-9.1 공유 링크 생성 [P0]
**Pre:** `/settings` 진입 (owner/admin)
**Steps:**
1. "고급 공유 옵션" 아코디언 펼치기 (`data-tour="share-link"`)
2. "링크 만들기" 클릭 (`data-testid="share-create-trigger"`) → 모달에서 label / 만료일 / 학생 필터 입력
3. "생성"
**Expected:**
- 생성 즉시 share URL 이 클립보드에 자동 복사 + 토스트 "시간표 공유 링크가 복사됐습니다"
- 모달 닫힘 + 목록에 새 링크(만료일 표시) 추가
- (주의: 모달 자체에는 URL 텍스트가 표시되지 않음 — 재복사는 목록 행의 복사 버튼으로)
- (참고: 일반 학부모 공유는 `/students` 의 "학부모 접속 코드" 사용 → S-9.3)
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

### S-9.3 학부모 접속 코드 일괄 생성 [P1]
**Pre:** `/students` (owner/admin) + 학생 N명
**Steps:**
1. 하단 "학부모 접속" sticky bar 의 ⋮ 메뉴
2. "누락 학생 일괄 생성" → confirm "생성"
**Expected:**
- 코드 없는 학생에게만 코드 생성 (토스트 "N명의 접속 코드가 생성됐습니다")
- 코드 형식 = 학생 이름 앞 2자 + 영숫자 4자 (예 `이현3K7P`), 혼동 문자 0/1/I/L/O 제외
- 학생 행/패널에서 개별 코드 확인 + 재발급/만료 가능
- (참고: "전체 갱신 (위험)" 메뉴는 기존 코드 전부 무효화 — confirm 필수)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.4 코드로 접근 (한글 prefix paste 포함) [P1]
**Pre:** S-9.3 코드 보유 (한글 이름 prefix 포함, 예 `이현3K7P`)
**Steps:**
1. `/academy/{slug}` 또는 `/academy/{uuid}` 접속
2. 한글 prefix 포함 코드를 클립보드로 복사 후 입력란에 **붙여넣기** (직접 타이핑 아님)
3. 제출
**Expected:**
- 인증 후 share token 반환 → `/share/{token}` 라우팅
- 시간표 읽기 전용 표시
- macOS 클립보드 NFD 변환에도 인증 성공 (client + server 모두 NFC normalize)
- 소문자로 입력해도 `toUpperCase` 로 매칭 성공
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.5 코드 만료 [P2]
**Pre:** 새 코드 발급
**Steps:**
1. 이전 코드로 접근 시도
**Expected:**
- 401 또는 에러 페이지 ("만료된 코드입니다")
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.6 IP rate limit / lockout [P2]
**Pre:** 코드 입력 화면 (`/academy/{slug}`)
**Steps:**
1. 잘못된 코드를 5회 연속 입력
**Expected:**
- 5회째에 429 + 메시지 "너무 많이 실패했습니다. 잠시 후 다시 시도해주세요." (academy+IP 조합 기준 1시간 lockout)
- 클라이언트 일반 실패 표시는 "코드가 올바르지 않습니다" → 429 응답 시 별도 처리 확인
- lockout 은 academy+IP scoped, 1시간 후 자동 해제
- (참고: 별개 가드로 동일 IP 분당 10회 초과 시엔 "요청이 너무 많습니다." 429 — 위 실패 lockout 과 다른 트리거)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.7 단일 링크 원클릭 접속 (auto-submit) [P1]
**Pre:** 학생 접속 코드 보유 (S-9.3), 시크릿 창
**Steps:**
1. `/academy/{slug}?code={코드}` 로 직접 접근 (코드 입력란에 타이핑 없이)
**Expected:**
- 코드 입력 없이 자동 제출 → 성공 시 `/share/{token}` 로 라우팅
- 읽기 전용 시간표 표시
- 잘못된 코드면 입력 화면 + 에러 표시 (autoSubmittedRef 로 무한 재시도 안 함 — 1회만 자동 시도)
- (참고: ParentCodeStickyBar / 학생 행에서 복사하는 URL 이 `?code=` 포함 단일 링크 — 학부모 실사용 핵심 경로)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-9.8 공유 시간표 실시간 갱신 + 변경 배너 [P2]
**Pre:** `/share/{token}` 열어둔 시크릿 창 + 원장 창 (편집 권한)
**Steps:**
1. 원장 창에서 세션 추가 또는 이동
2. 공유 창을 ~60초 대기, 또는 공유 창 tab 을 비활성→활성 전환 후 관찰
**Expected:**
- 60초 폴링으로 silent 갱신 (새로고침 아이콘 회전)
- 변경 발생 + 이전 열람 기록(lastViewedAt) 있으면 ScheduleChangeBanner 표시
- tab 비활성(document.hidden) 시 폴링 정지, 복귀 시 즉시 fetch + 폴링 재개 (중복 인터벌 없음)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 10. 다중 Academy 전환 (P0: 0 / 2)

> 이전의 §10.3~§10.7 (역할별 권한 + 초대 시나리오) 은 2026-05-20 부터 **§19 관리자**, **§20 멤버=강사** 로 분리 — 각 Phase 의 실제 진입 흐름과 함께 검증되도록 재배치. ADR-019 Academy Singularity (owner 1+1) 정책 하에 owner 본인 학원 1개 + invited 학원 1개 = 최대 2 학원.

### S-10.1 Academy 전환 [P1]
**Pre:** owner 가 admin/member 로 다른 academy 에 invited 상태 (즉, academy 2 개 멤버). Phase 4/5 진행 후에 자연 발생 또는 별도 owner 계정으로 sub-academy 만들고 본인 owner academy 에 invited.
**Steps:**
1. 사이드바 상단 학원명 클릭 → Academy Switcher 펼침
2. 다른 학원 선택
**Expected:**
- localStorage `active_academy:{userId}` 키 변경 (이전 `active_academy_id_{userId}` 가 아닌 현재 키 — `localStorageCrud.ts` 의 `ACTIVE_ACADEMY_KEY_PREFIX` 참조)
- 시간표/학생/과목 데이터가 해당 academy 로 전환 (`useGlobalDataInitialization` 의 `[academyVersion]` deps 재실행, PR #294)
- Sidebar 가 `window.location.reload()` 로 우회 (cleaner state)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-10.2 Active Academy 쿠키 저장 + 새로고침 복원 [P1]
**Pre:** S-10.1 후
**Steps:**
1. F5 새로고침
**Expected:**
- 마지막 선택한 academy 로 자동 진입 (server-side `active_academy_id` 쿠키 + localStorage 양쪽 확인)
- Cookie `active_academy_id` 값이 선택한 academy UUID 와 일치 (`document.cookie.match(/active_academy_id=([^;]+)/)?.[1]`)
- middleware 가 쿠키 기반으로 routing 결정 (없으면 /onboarding redirect)
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
- 온라인 복구 시 sync (POST/PUT 큐 발사) — 단, **자동 재발사는 online 이벤트가 아니라 /schedule 재mount 시점**에 발생 (상세 S-12.7)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.5 API 401 처리 [P2]
**Pre:** 토큰 만료 (Supabase session expire)

**Quick Setup** (토큰 강제 만료):
```js
uat.expireToken();           // sb-*-auth-token 키 + 쿠키 모두 삭제 + 새로고침
```

**Steps:**
1. `uat.expireToken()` 실행 → 자동 새로고침
**Expected:**
- 새로고침 후 AuthGuard(`src/components/atoms/AuthGuard.tsx`)가 mount 시점에 session 부재 감지 → `/login`으로 리다이렉트 (`redirectAfterLogin`에 이전 경로 저장)
- 사용자에게 로그인 화면 노출
**한계 (테스터 인지 필수):**
- **글로벌 401 fetch 인터셉터 없음.** 리다이렉트 트리거는 "API 401 응답"이 아니라 "mount 시점 세션 부재(route-guard)"다. 토큰이 만료됐지만 새로고침 전이면, 진행 중인 API 호출이 401을 받아도 그 응답만으로는 로그아웃/리다이렉트가 발생하지 않는다 (데이터 sync는 outbox로 빠지거나 silent fail). 따라서 "API 호출 후 401 받았는데 리다이렉트 안 됨"은 Fail이 아니라 현재 설계상 정상.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.6 오프라인 변경 → outbox 자동 누적 [P0]
**Pre:** 인증 모드 + DevTools Network → Offline
**Steps:**
1. 학생 추가 또는 세션 추가 등 mutating 작업
2. DevTools Application 탭에서 localStorage `class_planner_<userId>_sync_outbox` 키 확인 (`<userId>`는 supabase_user_id 값 — 단일 키, academyId 미포함)
**Expected:**
- 변경은 localStorage(SSOT)에 즉시 반영 (UI 즉시 업데이트)
- 서버 호출은 실패하지만 outbox에 entry 자동 누적 (`flushOutbox` deferred)
- /schedule 헤더의 SyncStatusDot pill(`data-testid=sync-status-dot`)에 sync status 표시 — 노란 "재시도 중" 또는 빨간 "동기화 실패" (`useSyncStatus`). status가 idle이면 pill은 렌더되지 않음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.7 온라인 복구 → 자동 flush [P0]
**Pre:** S-12.6 후 outbox(`class_planner_<userId>_sync_outbox`)에 entry N개 누적
**Steps:**
1. DevTools Network → Online
2. /schedule 페이지를 새로고침(F5) 하거나, 다른 페이지로 갔다가 /schedule로 재진입
**Expected:**
- `useOutboxFlush`가 /schedule mount 시 1회 flush 시도 (`flushOutbox` 호출) — Network 탭에 deferred POST/PUT/DELETE 발사
- 성공 N건이면 success 토스트 "오프라인 동안 변경한 N건이 자동 동기화됐습니다."
- 성공한 entry는 제거됨, sync status `idle` 복귀
- localStorage `class_planner_<userId>_sync_outbox` 키가 비워짐 (또는 5xx 잔여 entry만 남음)
**Note (테스터 인지 필수):**
- **온라인 복귀만으로(같은 /schedule 페이지에 머문 채)는 flush 안 됨** — 현재 `online` 이벤트 리스너 미구현(src 전체에 `addEventListener('online')` 없음). flush는 오직 /schedule 재mount(F5 또는 재진입) 시 발화하며, mount당 `flushedRef` 가드로 1회만 — 같은 mount 내 클릭/입력 같은 interaction으로는 재flush 안 됨. 따라서 "온라인 됐는데 자동 sync 안 됨"은 같은 페이지에 머문 경우 Fail이 아니라 정상. 반드시 새로고침/재진입으로 검증할 것.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.8 SyncQueueModal — 수동 열림 + entry 액션 [P1]
**Pre:** outbox에 entry 1개 이상 (sync 실패 또는 진행 중) → SyncStatusDot이 idle이 아닌 상태(노란/빨간 pill 표시)
**Steps:**
1. /schedule 헤더의 sync status indicator(노란 "재시도 중" 또는 빨간 "동기화 실패" pill, `data-testid=sync-status-dot`) 클릭 → SyncQueueModal 열림
2. entry 항목별 [재시도] 또는 [버리기] 클릭
3. 또는 전체 [모두 재시도] / [모두 버리기]
**Expected:**
- 모달 상단에 Recovery 안내 (Info 아이콘 + 텍스트)
- 각 entry 행: context label (`getContextLabel`) + 재시도/버리기 버튼
- [재시도] 클릭 시 `flushOutboxEntry` 호출 — 성공 시 entry 사라짐
- [버리기] 클릭 시 `removeOutboxEntry` 호출 — 즉시 사라짐
- 전체 액션: 모든 entry 일괄 처리
- bulk busy 중 다른 액션 disabled
**Note (진입점 한계):**
- 동기화 큐 진입점은 **사이드바가 아니라 /schedule 헤더의 SyncStatusDot pill 단 한 곳뿐**(`ScheduleHeader.tsx`). 다른 페이지나 사이드바에서 큐를 여는 경로 없음.
**엣지 케이스 — 강사 담당 과목 라벨 (현재 버그 노출용):**
1. 오프라인 상태에서 강사 담당 과목 추가 또는 제거 → SyncQueueModal entry label / SyncStatusDot pill 확인
2. **기대:** label이 "강사 담당 과목 추가/제거"로 표시. **현재 버그:** 일반 fallback "변경"으로 표시되면 Fail (apiSync.ts의 context "teacher:subject:add"가 CONTEXT_LABELS 키 "teacher-subject:add"와 불일치 → getContextLabel 미매칭 → "변경" fallback). 코드 fix 전까지 known issue.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.8b SyncStatusDot 사각지대 — idle 복귀 시 큐 모달 접근 불가 [P2]
**Pre:** 인증 모드, outbox에 5xx로 보관된 entry 1개 이상이 남아 있는 상태
**Steps:**
1. 큐에 entry가 남은 상태에서 다른 mutating 작업(예: 다른 세션 추가)이 **성공**하도록 유도 → sync status가 `idle`로 복귀
2. /schedule 헤더에서 SyncStatusDot pill을 다시 찾아본다
**Expected (현재 code 한계 노출):**
- status가 `idle`이면 SyncStatusDot은 `null` 렌더(`if (status === "idle") return null`) → pill이 사라져 **SyncQueueModal을 열 진입점이 없어진다**
- outbox에 여전히 잔여 entry가 있어도 사용자가 큐를 열어 수동 재시도/버리기를 할 UI 경로가 사라지는 사각지대
- (Pass 판정: 이 한계가 재현되면 "현재 동작대로 = Pass + known limitation". 별도 진입점이 추가됐다면 그것으로 큐 접근 가능한지 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.9 sync 실패 (5xx / 네트워크) — AlertTriangle + entry 잔존 [P2]
**Pre:** entry 재시도 시 서버 **5xx 또는 네트워크 에러** (4xx 아님)
**Steps:**
1. SyncQueueModal에서 [재시도] 클릭
2. 응답 5xx 또는 네트워크 fail
**Expected:**
- entry 행에 AlertTriangle 아이콘 + 에러 메시지(lastError) 표시
- **entry는 outbox에 그대로 남아 있음** (5xx/network는 일시적 → 재시도 가능)
- toast "동기화 실패" 또는 inline 에러 표시
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.9b sync 거부 (4xx) — entry 즉시 drop (데이터 영구 손실) [P1]
**Pre:** outbox entry가 서버에서 **4xx(400/403/409 등 — 검증 실패/권한)** 받는 상태 (예: 오프라인 중 서버가 거부할 값으로 mutating 작업 후 outbox 누적)
**Steps:**
1. SyncQueueModal에서 해당 entry [재시도] 클릭 → 응답 4xx
2. 또는 [모두 재시도] 클릭 → 일부 entry 4xx
**Expected (S-12.9와 정반대 — 손실 경로):**
- 개별 [재시도] 시: entry가 **outbox에서 즉시 제거됨**(`flushOutboxEntry` 4xx → writeOutbox로 entry drop + return false) — AlertTriangle 잔존이 아니라 drop + warning 토스트만. 재시도가 무의미하다고 판단해 버린다
- [모두 재시도] 시: failed N건 → error 토스트 "N건의 변경이 서버 거부로 동기화 실패했습니다. 관리자에게 문의해주세요."
- **데이터 영구 손실** — drop된 변경은 outbox에 안 남으므로 사용자가 다시 입력해야 함. 테스터는 4xx 시 "entry 잔존" 기대(S-12.9)와 다르게 entry가 사라지는 것이 정상임을 인지할 것
**Result:** [ ] Pass [ ] Fail — note: ___

### S-12.12 멀티 academy + offline + 전환 → cross-academy 오반영 확인 [P2] [race]
**Pre:** 멀티 academy 보유 사용자, academy A 선택 + DevTools Network → Offline
**Steps:**
1. academy A에서 세션 추가 (outbox `class_planner_<userId>_sync_outbox`에 누적 — academyId 미포함 단일 키)
2. academy B로 전환
3. DevTools Network → Online + /schedule 진입 (useOutboxFlush 발화)
**Expected:**
- A에서 만든 변경이 B academy에 잘못 기록되지 **않아야** 함 — 서버 `resolveAcademyId(userId)`가 replay 시점의 active academy(B)로 해석하면 A 변경이 B에 새거나 권한 오류가 날 수 있음
- 변경이 A academy에 정확히 반영되거나, 불일치 시 권한 오류로 차단되는지 확인
**Note (현재 code 한계):**
- outbox 키는 **userId 단일 스코프(academyId 미포함)**, entry URL에도 academyId 없음(`apiSync.ts`의 `/api/sessions?userId=...`). 서버는 replay 시점 active academy 기준으로 결정(`route.ts`의 `resolveAcademyId(userId)`). multi-academy + offline + 전환 조합은 데이터 오염 가능 경로. 오염 재현 시 outbox entry에 academyId baking 또는 active academy 불일치 시 flush 보류하는 code 보강을 follow-up으로 검토.
**Result:** [ ] Pass [ ] Fail — note: ___

<!-- 아래 race 케이스는 타이밍·서버응답 강제가 필요해 자동 테스트로 검증 — test branch -->
<!-- S-12.10 (race): temp-id reconcile 실패 → stale studentId POST → FK 위반 500 → outbox 무한 retry (PR #385, sanitizeTempEnrollments) — (자동 테스트로 검증 — test branch) -->
<!-- S-12.11 (race): useOutboxFlush 1회-per-mount 가드 + 동시 SyncQueueModal [모두 재시도]의 flush 중복/순서·idempotency — (자동 테스트로 검증 — test branch) -->

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

## 14. 데이터 보호 — 충돌 모달 + 백업 이력 (P0: 7 / 18) [PR #260 + PR #261/#263 신규]

> **자동 회귀 가드:**
> - `src/lib/conflict/__tests__/computeLossDiff.test.ts` (4 unit — 큰 손실 임계치 검증)
> - `src/components/molecules/__tests__/DataConflictModal.test.tsx` (26 unit — Layered Defense 인터랙션)
> - `src/hooks/__tests__/useGlobalDataInitialization.test.ts` (충돌 감지 + before_conflict 백업 hook)
> - `src/lib/snapshots/__tests__/restoreSnapshot.test.ts` (신규 — chain-of-safety 백업 실패 시 복원 중단 / {local,server} payload 복원 거부 / 평면 payload setClassPlannerData 덮어쓰기. **현재 0개 — S-14.9b 로 작성 필요**)

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
1. 로그인 후 첫 진입 페이지로 이동 (라우트 무관 — 예: `/schedule` 또는 `/students`)
**Expected:**
- DataConflictModal 자동 발동 (`useGlobalDataInitialization` 충돌 감지 → 모달)
- **모달은 RootProviders 전역 발동 — 특정 라우트(`/schedule`) 전용 아님.** `RootProviders.tsx`에서 `conflictState` 가 있으면 AppShell 전역 래퍼 레벨에서 렌더되므로, 로그인 직후 첫 mount되는 어느 페이지에서든 표시됨 (`useGlobalDataInitialization`은 mount 시 1회 실행 + 라우트 비의존)
- 백드롭 솔리드 (`bg-black/85 backdrop-blur-sm`) — 시간표 그리드 전혀 안 보임 + blur 효과
- 데스크탑: 카드 2개 side-by-side ("이 기기의 데이터" / "내 계정의 데이터")
- 각 카드에 학생/과목/수업 카운트 + 마지막 수정 시각
- Escape 키로 닫히지 않음 (명시적 선택 강제 — `useModalA11y onClose: () => {}`)
- **엣지 케이스: 로그인 후 `/settings`로 직행해도 동일하게 발동** (라우트 무관 전역 발동 검증)
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

### S-14.4 큰 손실 → ConfirmModal 2단계 확인 (Layered Defense L2) + 부분 실패 warning [P0] ⚠️ PR #260
**Pre:** S-14.3 상태
**Steps:**
1. 빨간 "선택한 데이터로 시작 (위험)" 버튼 클릭
2. (부분 실패 분기) 로컬에 강사 미배정 수업 등 정책상 거부될 레코드를 포함한 상태로 "덮어쓰기"(로컬 선택) 머지
**Expected:**
- ConfirmModal 발동 — 제목 "정말 이 데이터로 덮어쓸까요?"
- 메시지에 손실 entity (학생 N · 과목 N · 수업 N) 명시 + "이 작업은 되돌릴 수 없습니다"
- 두 버튼 — "취소" / "덮어쓰기" (variant=danger 빨강)
- "취소" 시 ConfirmModal 닫힘, DataConflictModal 그대로 유지 (재선택 가능)
- "덮어쓰기" 시 머지 진행
- **부분 실패 분기 (Step 2):** 강사 미배정 수업 등 일부 레코드가 영구 실패해도 성공분만 server 반영 (`handleLoginDataMigration`이 throw 안 함, 성공분만 반영). `applyLocalDataChoice`의 `failed.length > 0` 시 sonner `toast.warning("일부 데이터 동기화 안 됨", { description: "N개 항목이 동기화되지 않았습니다 (강사 미배정 수업 등). 강사 지정 후 다시 추가해주세요.", duration: 8000 })` 표시
- 무한 spinner / 재flood 없이 `setIsInitialized(true)`로 앱 진입 (`useGlobalDataInitialization.ts:195-201`)
- anonymous 키는 `totalSynced > 0`이면 삭제됨
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
- 학생/과목/수업 카운트 = **머지 직전 server(내 계정) 측 데이터 기준** (`route.ts:36-47`의 `countsFromPayload`가 `{local, server}` payload에서 `payload.server`만 집계 — "UI 표시용은 server 우선"). **local(이 기기) 측 카운트는 미반영 — '양쪽 합본'이 아님.** 검증 시 server 측 entity 수만 기대할 것
- 무료 plan 잠금 X (before_conflict는 핵심 안전망 — 무제한 복구)
- API 검증: `data_snapshots` 테이블에 `snapshot_type='before_conflict'` row 1개 신규
- **⚠️ 주의: 이 백업은 현재 detail panel "이 백업으로 복원" 버튼으로 되돌릴 수 없음.** 충돌 해결 직전 생성된 before_conflict 백업은 `payload: {local, server}` 형태라 `restoreSnapshot` 가드(`restoreSnapshot.ts:49-54`)가 차단함 — 상세는 S-14.9 분기 참조
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
**Expected (복원 대상이 chain-of-safety / auto_template / manual 백업 — 평면 `ClassPlannerData` payload 인 경우):**
- 복원 직전 자동 백업 생성 (chain of safety — 복원 자체도 되돌릴 수 있게 `before_conflict` type으로 직전 데이터 저장)
- 데이터 덮어쓰기 (`setClassPlannerData` 호출 — 학생/과목/수업/enrollment 모두)
- success toast "데이터가 복원됐습니다. 페이지를 새로고침해 주세요."
- list 갱신 (방금 생성된 chain of safety 백업이 최상단)
- 복원 실패 시 error toast (네트워크/API 에러)

**Steps 1b (분기 — 충돌 직전 백업 복원 시도):**
1b. 복원 대상이 충돌 해결 직전 백업(amber "충돌 직전", `payload: {local, server}` 형태)인 row를 선택 → "이 백업으로 복원" → "복원"
**Expected (현재 알려진 제약):**
- error toast "충돌 직전 백업은 양쪽 데이터를 가진 형식이라 단순 복원 불가 — 향후 별도 UI로 분기 복원 지원 예정." 표시
- `setClassPlannerData` 도달 전 `restoreSnapshot.ts:49-54`의 `("local" in payload \|\| "server" in payload)` 가드에서 `success:false` 반환 → **localStorage 미변경**
- 즉 가장 위험한 사고(충돌 모달 오선택)는 현재 이 백업으로 정확히 되돌릴 수 없음 (chain-of-safety/auto_template/manual 백업만 복원 가능)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-14.9b 백업 복원 안전 로직 회귀 가드 [P0] ⚠️ 신규 (자동 회귀 가드 부재 — friend 사전배포 직전 데이터 영구손실 방지)
**Pre:** `src/lib/snapshots/` 단위 테스트 (`restoreSnapshot.test.ts`) 존재 여부 확인 — **현재 0개 (디렉터리에 `__tests__` 없음)**
**Steps:**
1. `src/lib/snapshots/__tests__/restoreSnapshot.test.ts` 작성 후 vitest 실행
**Expected:**
- (1) chain-of-safety `createSnapshot` 실패(`success:false`) 시 → fetch restore **미호출** + `restoreSnapshot`이 `success:false` + "복원 직전 안전 백업 생성 실패. 다시 시도해 주세요." 반환 (`restoreSnapshot.ts:23-29`, 복원 중단 = 안전 우선)
- (2) `{local, server}` payload는 `setClassPlannerData` **미호출** + "충돌 직전 백업은 양쪽 데이터를 가진 형식이라 단순 복원 불가" 안내 에러 (`restoreSnapshot.ts:49-54`)
- (3) 평면(`ClassPlannerData`) payload는 `setClassPlannerData` **호출** + `success:true`
- P0인 S-14.9 복원의 핵심 안전 로직이 silent break 되지 않도록 위 3 분기 자동 커버. 작성 전 테스트 0개 → 작성 필요
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

### S-14.17 충돌 모달 중 다른 탭 학원 전환 race [P1] ⚠️ 멀티탭 동시성 (수동)
**Pre:** 탭A에 DataConflictModal 발동(미선택 상태로 유지). 같은 계정으로 탭B 열어둠 (학원 2개 이상 보유)
**Steps:**
1. 탭B에서 다른 학원으로 전환 (`active_academy:{userId}` 키 변경 → storage 이벤트 발생)
2. 탭A 관찰 (DevTools + omni-radar 로그)
**Expected:**
- 탭A의 `useGlobalDataInitialization`이 `active_academy:` storage 이벤트로 `academyVersion` bump → mig effect 재실행 (`useGlobalDataInitialization.ts:225-238`)
- 탭A 모달이 **stale academy 데이터로 잘못 머지하지 않음** — conflictState가 새 academy 기준으로 재계산되거나 모달이 닫힘
- `resolveConflict`가 이전 academy의 `pendingServerData`로 진행되지 않음 (localStorage가 두 학원 데이터로 오염되지 않음)
- omni-radar로 "academy 변화 감지" 로그 + 실제 머지 대상 academyId가 전환 후 academy와 일치하는지 확인
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 15. 출석부 (P0: 0 / 5)

> **무엇:** `useAttendance` 훅 + 두 진입점 — (1) 시간표/주간 view 의 세션 블록 클릭 → `EditSessionModal` 출결 섹션(cycle pill + buffer 저장, 일상 진입), (2) `AttendanceSheet` molecule(4-state 즉시 마킹) + 전용 `/attendance` 포커스 페이지. 출결은 **세션 occurrence 날짜**(weekStart+weekday) 기준으로 2-dim(`sessionId → date → studentId`) 저장 (PR #571 통합). 학원 daily 운영 핵심.
>
> **진입 경로 주의 (2026-05-29):** 사이드바 출결 nav 항목은 제거됨. 출결은 시간표(일/주) 블록 클릭으로 진입하거나 `/attendance` URL 직접 접속.

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

### S-15.2 학생별 4-state 마킹 (AttendanceSheet 즉시 마킹) [P1]
**Pre:** AttendanceSheet 열림 (S-15.1 경로)
**Steps:**
1. 학생 1명에 "출석" 버튼 클릭
2. 다른 학생에 "지각" 클릭
3. 또 다른 학생에 "사유" 클릭
**Expected:**
- `onMarkAttendance(studentId, status)` 호출 — AttendanceSheet 는 클릭마다 즉시 마킹
- 시각적 표시 — 선택된 status 버튼 강조 (배경/테두리), 다른 status는 muted
- 새로고침 후 마킹 유지 (localStorage 또는 server 저장)
- 인증: API 호출 발사 (POST /api/attendance 또는 유사)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.2b 편집 모달 출결 cycle pill + buffer 저장 (일상 진입) [P1]
**Pre:** 주간/일간 view + enrollment 학생 있는 세션 (owner/admin)
**Steps:**
1. 세션 블록 클릭 → `EditSessionModal` 오픈 → 하단 출결 섹션
2. 한 학생 pill 반복 클릭 → 미체크 → 출석 → 결석 → 지각 → 미체크 cycle 확인 (`edit-attendance-pill-{id}`)
3. 학생 ≥2명이면 batch 버튼 확인 — "전원 출석"(`edit-attendance-batch-present`) / "전원 결석"(`edit-attendance-batch-absent`) / "전원 미체크"(`edit-attendance-batch-reset`)
4. "저장" 클릭 → buffer flush
5. (취소 흐름) buffer 변경 후 저장 안 하고 닫기 시도
**Expected:**
- pill cycle 순서는 **none → present(출석) → absent(결석) → late(지각) → none** (사유=excused 는 cycle 에 **없음**)
- pill 클릭은 **즉시 API 호출 안 됨** — 로컬 `attendanceBuffer` 에만 누적, 미저장 배너 "출결 N명 바꿨어요" 표시
- "저장" 시에만 markAttendance batch 발사 (buffer flush)
- 저장 안 하고 닫기 시도 시 confirm "미저장 출결 변경 N건이 있습니다. 그대로 닫으시겠습니까?"
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.3 "전체 출석" 일괄 마킹 — 기존 status 덮어쓰기 [P2]
**Pre:** AttendanceSheet 열림 + 학생 5명 이상 — 일부는 이미 "지각" 또는 "결석" 마킹 상태
**Steps:**
1. "전체 출석" 버튼 클릭 (확인 모달 없음)
**Expected:**
- **의도:** 한 번에 정상 출석 처리 — 매 학생 개별 클릭 부담 제거.
- **실제 동작 (`useAttendance.markAllPresent` → `POST /api/attendance/bulk` upsert):**
  - 모든 학생 status="present" 로 **일괄 덮어쓰기** (이미 "지각"/"결석"/"사유" 였어도 모두 "present" 로 변환)
  - 확인 모달 / undo 모달 없음 — 클릭 즉시 server upsert
  - 시각적으로 모든 행에 "출석" highlight
  - 덮어쓴 status 회복 방법: 해당 학생 row 의 status 버튼으로 다시 마킹 (UI 에서 직접)
  - canManage=false (member 역할) 일 때 버튼 미렌더 (S-15.5)
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

### S-15.5 member(강사) 출결 role-branch [P0]
**Pre:** member 계정 + 본인 teacher 연결(`linkedTeacherId`) + 본인 강사 세션 1개 + 다른 강사 세션 1개 (PR #571 — member 도 `/schedule` 사용, teacher-schedule 분기 제거)
**Steps:**
1. `/schedule` 진입 → 화면에 보이는 세션 확인 (본인 수업만 보이는지)
2. 본인 강사 세션 클릭 → 편집 모달 형태 확인 (`attendanceOnly`)
3. 출결 pill 마킹 → 저장
4. 다른 강사 세션 클릭 / 출결 시도
**Expected:**
- 본인 강사(`teacherId === linkedTeacherId`) 세션만 표시 — 다른 강사 세션 / `teacher_id` NULL 세션은 **미표시**
- 본인 세션 클릭 시 **출결-전용 모달**(`attendanceOnly`) — 수업 메타(요일/시간/학생) 필드는 disabled, 출결 pill 은 활성 (member 는 세션 PUT 없음, buffer flush 만 — `onSave` 미호출)
- 본인 세션 출결 마킹/저장 **성공** (member 도 본인 수업 출결은 기록 가능 — read-only 아님)
- 다른 강사·NULL teacher_id 세션은 진입 차단 (`handleOpenAttendance` return) + 서버 403 FORBIDDEN (`assertAttendancePermission`)
- FAB(수업 추가) 숨김 (`isMemberView`)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.6 출결 전용 페이지 (/attendance) 진입 + 날짜 네비게이션 [P1]
**Pre:** 시간표에 오늘 세션 1개 이상
**Steps:**
1. `/attendance` 직접 접속
2. "이전 날짜"(`attendance-prev-date`) / "다음 날짜"(`attendance-next-date`) 버튼으로 날짜 이동
3. "오늘"(`attendance-today`) 버튼 클릭
4. 세션 카드(`attendance-session-{id}`) 클릭
**Expected:**
- 페이지 렌더 (`data-testid=attendance-page`)
- 날짜 라벨(`attendance-date-label`) 이 "YYYY-MM-DD (요일)" 형식
- 날짜 이동 시 daySessions 가 weekday + weekStartDate 로 재필터
- 세션 없는 날 empty-state(`attendance-empty`) — owner: "이 날짜에 등록된 수업이 없어요", member: "이 날짜에 본인 수업이 없어요"
- 세션 카드 클릭 시 AttendanceSheet 모달 오픈
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.7 출결 날짜 = 세션 occurrence (저장 후 dot 갱신) [P0]
**Pre:** 주간 view + 오늘이 아닌 요일(예: 수요일) 세션 + enrollment 학생 (PR #571 — 저장 날짜 = dot 조회 날짜 일치 회귀 가드, 2026-05-29 "저장해도 dot red" 사고 fix)
**Steps:**
1. 그 비-오늘 요일 세션 클릭 → 편집 모달
2. 학생 전원 출석 pill → 저장
3. 모달 닫고 그 세션 cell 우하단 dot 확인 (`session-attendance-dot-{id}`)
4. 페이지 새로고침 후 재확인
**Expected:**
- dot 이 **emerald**(전원출석)로 변함 — **red 아님** (저장 날짜 = 조회 날짜 occurrence 일치 확인. 과거 사고: selectedDate(보고 있는 날) 기준으로 저장 → dot red 잔존)
- 새로고침 후에도 emerald 유지
- 다른 요일/주의 같은 세션 출결과 섞이지 않음 (2-dim `sessionId → date → studentId` key)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.8 세션 이동 시 출결 함께 이동 (migrateAttendance) [P0]
**Pre:** 세션에 출결 마킹됨(저장 완료) — `migrateAttendanceForSessionMove` 가 old/new occurrence 날짜 계산해 fire-and-forget 이동
**Steps:**
1. 세션을 다른 요일로 드래그 이동 (또는 편집 모달에서 요일 변경 후 저장)
2. 이동한 위치/날짜에서 출결 확인 (편집 모달 또는 dot)
3. 원래 날짜/요일 cell 의 출결도 확인
**Expected:**
- success toast "출결 N건 함께 이동 (oldDate → newDate)"
- 새 occurrence 날짜에 출결 보존
- 원래 날짜에는 출결 없음
- (출결 없던 세션 이동 시) info toast "oldDate 에 저장된 출결 없음 — 이동할 데이터 없음"
**Result:** [ ] Pass [ ] Fail — note: ___

> **S-15.8 race/server 강제 케이스 (자동 테스트로 검증 — test branch):** 이동 대상 날짜에 이미 출결이 있는 충돌(DUPLICATE_DATE 409 → warning toast "newDate 에 이미 출결 있음 — 이동 안 됨", 원본 출결 유지) 및 서버 오류(error toast "출결 이동 실패 (서버 오류)")는 서버 응답 강제가 필요해 수동 UAT 비대상.

### S-15.9 시간표 출결 dot 시각 (시간대별 alert) [P1]
**Pre:** 과거 날짜 세션 + 미래(upcoming) 세션 + enrollment 학생 (`computeAttendanceDot` 규칙: 3 time state × 체크 완성도)
**Steps:**
1. 과거 날짜로 이동 → 출결 전부 미체크 세션 cell 확인
2. 과거 날짜 전원 출석 마킹한 세션 확인
3. 과거 날짜 일부만 결석/지각인(전원 체크) 세션 확인
4. 미래(upcoming) 세션 확인
5. (선택) 진행 중 세션의 부분체크 상태 확인
**Expected:**
- 종료 + 미체크/부분체크 → **red dot + pulse** (`data-attendance-pulse=true`, title "출결 체크 누락 (수업 종료)" 또는 "출결 부분 체크 — N명 미체크")
- 종료 + 전원 출석 → **emerald** (pulse 없음, title "전원 출석 완료")
- 종료 + 전원 체크(결석/지각 포함) → **amber** (pulse 없음, title "전원 체크 (결석/지각 포함)")
- upcoming → dot 없음 (`null`)
- 진행 중 부분체크 → dot 없음 (alert X — 진행 중 미체크는 자연)
- share / filtered-share view 에선 dot 숨김 (운영자 전용)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-15.10 온보딩 투어 출결 step 정합성 [P2]
**Pre:** 새 계정/투어 시작 가능 상태 (사이드바 출결 nav 제거됨 — 2026-05-29)
**Steps:**
1. 온보딩 투어 시작 → "출결 관리" step 까지 진행
**Expected:**
- tooltip 이 실제 존재하는 anchor(`[data-tour="attendance"]`) 에 위치 — anchor 가 없으면 FAIL
- description 문구가 실제 진입 경로와 일치 — 현재 "사이드바 출결 메뉴" 는 stale(nav 제거됨), "시간표(일/주) 블록 클릭으로 출결 진입" 으로 수정 필요
- **코드 fix 동반:** `src/lib/tour-steps.ts` 의 `attendance` step description + targetSelector 를 schedule 블록 기준으로 갱신
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 16. 온보딩 / 도움말 (P0: 2 / 7)

### S-16.1 빈 주 — EmptyWeekState 발동 [P0]
**Pre:** 신규 학원 또는 현재 주에 수업 0개 (`weekFilteredSessionsCount === 0`). 전체 세션이 50개여도 현재 주(`currentWeekStart`)가 비면 발동됨 — 전체 데이터를 비우지 말고 "수업이 등록된 주가 아닌 빈 주"로 이동해 확인.
**Steps:**
1. `/schedule` 진입 후 **주간(weekly) 뷰** 선택
2. 수업이 등록된 주가 아닌 빈 주로 이동
**Expected:**
- 시간표 그리드 위에 absolute overlay 표시 (`pointer-events-none` 컨테이너 + `pointer-events-auto` 카드)
- CalendarX2 아이콘 + "이번 주 수업이 없어요" 헤드라인
- 안내 텍스트 — hasTemplate 분기:
  - `hasTemplate=true`: "지난 시간표를 그대로 적용하거나 수업을 직접 추가해보세요"
  - `hasTemplate=false`: "수업을 추가하고 저장하면 다음 주에 바로 재사용할 수 있어요"
- CTA — hasTemplate=true 시 "템플릿 적용" + "수업 추가" 둘 다 / false 시 "수업 추가"만
- 그리드는 그대로 (overlay) — 테두리/시간 헤더 보임
- **weekly 전용** — daily/monthly 뷰로 전환하면 overlay 사라짐 (`ScheduleWeeklyGrid` 내부에만 렌더)
- 회귀 가드: 필터(학생/과목/강사) 적용으로 현재 주 매칭 0개여도 발동됨 — 이때 cross-week-filter-banner 와 동시 표출 가능
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.2 EmptyWeekState CTA → 흐름 진입 [P1]
**Pre:** S-16.1 상태 (owner/admin, canManage=true)
**Steps:**
1. "수업 추가" CTA 클릭
2. (또는) "템플릿 적용" CTA 클릭 (hasTemplate 시)
**Expected:**
- "수업 추가" → GroupSessionModal 열림 (FAB와 동일 흐름)
- "템플릿 적용" → SlotPickerModal apply mode 또는 ApplyTemplateConfirm
- CTA 클릭 후 EmptyWeekState 자체는 유지 (세션 추가되면 자연 사라짐)
- member(canManage=false)는 CTA no-op — 별도 S-16.7 참조
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

### S-16.4 신규 사용자 자동 투어 시작 (InlineTour) [P0]
**Pre:** `onboarding_completed_<userId>` localStorage 키 삭제 (브라우저 DevTools → Application → Local Storage) + owner 로그인. DB(user_settings)에도 완료 기록이 없는 신규 상태여야 함.
**Steps:**
1. `/students` 등 주요 페이지 진입
2. 약 1초 후 InlineTour 자동 시작 관찰 (`useTour` autoStart setTimeout)
3. "다음" 으로 owner step 진행 — 학생→과목→강사→시간표→그리드→PDF(export-admin) 등 (`getTourStepsForRole("owner")` 가 노출하는 step 순서)
4. 마지막 step 에서 "완료" 클릭
**Expected:**
- amber spotlight ring (`data-testid="inline-tour-spotlight"`) + 타깃 요소만 dim 밖으로 강조
- tooltip 표시 (`data-testid="inline-tour-tooltip"`) — 제목/설명
- progress 표시 (`data-testid="inline-tour-progress"`) — `N/M` 형식 + 퍼센트 바 (M = 해당 role 의 visible step 수, owner 는 core 7 + login 6 중 role 필터 통과분)
- "건너뛰기"/"이전"/"다음" 버튼, ESC 키 → skip, focus-trap 동작
- "완료" 클릭 시 "튜토리얼 완료 ✓" 토스트 (`showSuccess`)
- `onboarding_completed_<userId>` localStorage 키 기록 + (로그인 시) DB tour state 영속화
- 페이지 새로고침해도 투어 재발동 안 됨 (완료 기록 존재)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.5 투어 재시작 + role별 step 노출 [P1]
**Pre:** owner 로그인 (이미 투어 완료 상태). 비교 검증용으로 member 계정 별도 준비.
**Steps:**
1. owner: 설정(`/settings`) → "도움말 — 튜토리얼 다시 보기" 카드의 "다시 보기" 클릭
2. `class-planner:start-tour` (`TOUR_START_EVENT`) 발화 → 투어 재시작 관찰
3. step 진행하며 노출 step 확인
4. member 계정으로 같은 재시작을 실행해 노출 step 비교
**Expected:**
- owner: students/subjects/teachers/schedule/schedule-grid/export-admin (CORE owner·admin step) + academy-info(owner 전용)/teacher-invite/share-link/attendance/data-history(LOGIN) 노출
- member: owner 전용 step(students/subjects/teachers/export-admin/academy-info/teacher-invite/share-link/data-history) **미노출**, member 전용 `export-teacher` + roles 미지정 공통 step(attendance / academy-switch)만 노출 (`getTourStepsForRole(role="member")` 필터)
- 재시작은 완료 기록과 무관하게 즉시 시작 (이벤트 기반)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.6 role/DB sync 전 투어 미발동 (content-mismatch race) [P1]
**Pre:** member 계정. `onboarding_completed_<userId>` localStorage 비움. DB user_settings 에는 core 완료 기록이 있는 상태 (cross-device 영속 케이스). 참고: 2026-05-27 tour-content-mismatch 사고 회귀 가드.
**Steps:**
1. 로그인 후 `/schedule` 진입 **즉시(1초 이내)** 화면 관찰
2. 1초 경과 후 다시 관찰
**Expected:**
- 로그인 직후(1초 이내)에는 투어가 뜨지 않음 — `useTour` 가 `role === null`(useMyRole fetch 미완) 또는 `!dbSyncDone`(DB tour state fetch 미완) 시 autoStart 대기
- owner용 step(students/subjects/teachers 등)이 member 에게 잘못 노출되지 않음 (role 기본값으로 인한 오노출 가드)
- DB 에 완료 기록이 있으면 `fetchTourState` 가 localStorage 를 채운 뒤 자동 시작 skip — 이미 완료한 사용자에게 재발동 안 됨
- role 해결 후에는 member 전용 step(export-teacher 등)만, owner step 미노출
**Result:** [ ] Pass [ ] Fail — note: ___

### S-16.7 member read-only 시 EmptyWeekState CTA 동작 [P2]
**Pre:** member(강사) 계정 + 본인 수업이 없는 주 (canManage=false, `weekFilteredSessionsCount === 0`)
**Steps:**
1. `/schedule` weekly 뷰 진입 — EmptyWeekState 표시 확인
2. EmptyWeekState 의 "수업 추가" CTA 클릭
3. (hasTemplate 시) "템플릿 적용" CTA 클릭
**Expected:**
- (현 구현) CTA 는 그대로 렌더되지만 클릭해도 모달이 열리지 않음 — `ScheduleWeeklyGrid` 의 `onAddSession`/`onApplyTemplate` 가 `canManage` 가드로 silent no-op
- **사용자 판정 필드**: 이 무반응이 의도인지 vs member 에게는 CTA 미렌더/비활성/"read-only 안내" 메시지로 분기해야 하는지 판단 (권장: member 에게 CTA 미렌더 또는 read-only 안내). 친구 pre-release 에서 강사가 클릭→무반응 혼란 우려.
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 17. 알림 히스토리 + InfoTrigger fix (P0: 3 / 7) [PR #372]

> SSOT: [`docs/notification-history-spec.md`](../../docs/notification-history-spec.md) (14 AC + Edge cases).
> 영향 컴포넌트: `lib/notificationCenter.ts` / `useNotificationCenter` / `NotificationBell` / `NotificationItem` / `NotificationDropdown` / `lib/toast.ts` capture / `Sidebar` + `TopBar` layout-level wire.
> localStorage 키: `class_planner_${userId}_notification_history` (anon은 `anonymous` 고정).
> 참고: `InfoTrigger` atom (`src/components/atoms/InfoTrigger.tsx`)은 PR #372 후 production 어디에도 wire 되지 않은 dead code. 실제 PDF 가이드 진입 트리거는 `PdfExportRangeModal` 풋터의 텍스트 버튼이므로 S-17.6 은 그 경로로 현행화함 (2026-05-30 audit).

### S-17.1 토스트 발생 → 사이드바 종 배지 unread 카운트 증가 [P0]
**Pre:** `/schedule` 진입 + 알림 history 비어있음
**Steps:**
1. 브라우저 콘솔에서 토스트 강제 발생:
   ```js
   const t = await import('/_next/static/chunks/app/_components/RootProviders.js').catch(() => null);
   // 또는 직접 storage 주입 (검증 목적):
   localStorage.setItem(
     `class_planner_${localStorage.getItem('supabase_user_id') || 'anonymous'}_notification_history`,
     JSON.stringify([
       { id: 'e1', level: 'error', message: '테스트 에러', createdAt: Date.now(), read: false },
       { id: 'w1', level: 'warning', message: '테스트 경고', createdAt: Date.now(), read: false },
       { id: 's1', level: 'success', message: '테스트 성공', createdAt: Date.now(), read: false },
     ])
   );
   window.dispatchEvent(new CustomEvent('class-planner:notification-center:change'));
   ```
2. 사이드바 종 아이콘 관찰
**Expected:**
- 종 우상단 빨간 배지에 **"2"** (에러+경고만, success 제외)
- 배지 `motion-safe:animate-ping` pulse 애니메이션 (감속 모드 OS 설정 시엔 정적)
- `aria-label="알림 2개"` (DevTools → Accessibility 탭에서 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.2 종 클릭 → 패널 open + 필터/그룹 표시 [P0]
**Pre:** S-17.1 상태 (mock 데이터 있음)
**Steps:**
1. 사이드바 종 클릭
2. 패널이 사이드바 오른쪽 옆으로 펼쳐지는지 확인
3. 필터 chip [전체 / 에러 / 경고 / 성공 / 정보] 클릭
4. "에러" chip 클릭 → 에러 항목만 표시
**Expected:**
- 패널 width 420px, max-height 480px, 사이드바 오른쪽 + top 정렬로 펼침
- 패널 헤더: 좌측 "알림" + "에러 1 · 경고 1" 요약 / 우측 "모두 읽음" + X
- 필터 chip bar — "전체"가 default active (amber border)
- 시간 그룹 헤더 "오늘" (uppercase, tracking-wide)
- 항목 row: level 아이콘(`AlertCircle`/`AlertTriangle`/`CheckCircle2`/`Info`) + 메시지 + chip + relative time
- 에러/경고 항목: 좌측 amber 세로 bar + bold + "NEW" 라벨
- success/info 항목: muted gray + NEW 없음
- 풋터: "총 N건 · 24시간 이내 · 최대 50개 보관"
- 필터 "에러" 클릭 시 에러 항목만 + 빈 그룹 안 보임
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.3 항목 클릭 read → 배지 카운트 감소 [P0]
**Pre:** S-17.2 상태 (패널 열려있음, error/warning 2건 NEW)
**Steps:**
1. 에러 항목 row 클릭
2. 사이드바 종 배지 관찰
3. 패널 헤더 요약 관찰
**Expected:**
- 클릭한 항목: amber bar 사라짐, "NEW" 라벨 사라짐, 본문 색 muted gray로 변환, bold 풀림
- 사이드바 종 배지: 2 → **1**
- 패널 헤더 요약: "에러 1 · 경고 1" → **"경고 1"** (에러 사라짐)
- `aria-label="알림 1개"`로 변경
- localStorage 검증: `JSON.parse(localStorage.getItem('class_planner_..._notification_history'))[0].read === true`
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.4 "모두 읽음" 클릭 → 전체 read [P1]
**Pre:** S-17.1 상태 (mock 2건+ unread)
**Steps:**
1. 종 클릭 → 패널 open
2. 헤더 우측 "모두 읽음" 클릭
**Expected:**
- 모든 NEW 라벨 + amber bar 사라짐
- 배지 자체 사라짐 (unread=0)
- 패널은 그대로 열려있음
- 헤더 요약 영역 사라짐 (에러+경고 unread 0이므로)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.5 항목 hover → X 클릭 dismiss [P1]
**Pre:** S-17.1 상태
**Steps:**
1. 종 클릭 → 패널 open
2. 임의 항목 row에 마우스 hover
3. 우측에 노출되는 X 버튼 클릭
4. dismiss된 항목이 사라지는지 확인
**Expected:**
- hover 전: X 버튼 opacity 0 (보이지 않음)
- hover 시: X 버튼 opacity 100 (즉시 노출)
- X 클릭 시:
  - 해당 row 패널에서 즉시 제거
  - 해당 항목이 error/warning이었으면 배지 카운트 -1
  - localStorage에서도 entry 제거 (`getNotifications()` 호출 시 1건 감소)
- 패널은 그대로 열려있음
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.6 PDF 가이드 진입 트리거 (PdfExportRangeModal 풋터 버튼) [P1]
**Pre:** `/schedule` 진입 + weekly view (PDF 다운로드 버튼은 주간 보기에서만 노출)
**Steps:**
1. 시간표 우측 액션 영역의 PDF 다운로드 버튼(`aria-label="...시간표 PDF"`) 클릭 → PdfExportRangeModal 열림
2. 모달 풋터 좌측의 "인쇄 가이드 보기" 텍스트 버튼 관찰
3. (옵션) DevTools Inspector로 버튼 마크업 확인
4. "인쇄 가이드 보기" 클릭 → PdfGuideModal 열림 확인
**Expected:**
- 트리거는 우상단 헤더 'i' 아이콘이 아니라 **PdfExportRangeModal 풋터 내부의 텍스트 버튼**
- 버튼 = `HelpCircle` 아이콘 (lucide, `size={13}`) + "인쇄 가이드 보기" 텍스트 라벨 (외곽 원/border 없음, rounded-full 아님)
- 색: `text-secondary`, hover 시 `text-primary` + `hover:underline` (underline-offset-2)
- 클릭 → PdfGuideModal 표시 (기존 인쇄 가이드 동작 회귀 없음)
- 참고: `InfoTrigger` atom 은 현재 production 미사용(dead code)이라 우상단 헤더에 'i' 아이콘은 존재하지 않음 — 찾으려 하지 말 것
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.7 모바일 viewport (375×667) TopBar 종 + 패널 [P2]
**Pre:** DevTools Device Mode 375×667, `/schedule` 진입 + S-17.1 mock 주입
**Steps:**
1. TopBar 우측 종 아이콘 표시 확인
2. 종 클릭 → 패널 열림
3. 패널 위치 + width 확인
**Expected:**
- TopBar 종이 도움말 "?" 앞에 위치 (compact mode = w-8 h-8)
- 종 클릭 → 패널이 TopBar 아래 (`top-full mt-2 right-0`)로 펼침
- 패널 width = `calc(100vw - 32px)` 최대 420px → 모바일에서 거의 전체 너비
- 사이드바는 안 보임 (md:hidden)
- 항목 클릭/필터/dismiss 모두 데스크톱과 동일 동작
**Result:** [ ] Pass [ ] Fail — note: ___

### S-17.8 알림 cross-tab 동기화 (StorageEvent) [P2]
**Pre:** 같은 사용자(같은 `supabase_user_id` 또는 둘 다 anonymous)로 두 개의 탭에서 `/schedule` 진입. 두 탭 모두에서 S-17.1 의 storage 주입(error 1건 + warning 1건 = unread 2건)을 한 탭에서 실행 후 양 탭 새로고침해 동일 상태로 맞춤. (cross-tab은 `subscribeNotifications`의 `storage` listener 경로 — setItem 한 탭 자신에는 StorageEvent가 안 오는 특성이 회귀 위험)
**Steps:**
1. 탭 A 종 클릭 → 패널 open → 에러 항목 row 클릭(read)
2. 탭 B로 전환 (클릭/새로고침 없이) → 종 배지 관찰
3. 탭 B 종 클릭 → 패널 open → 해당 에러 항목 상태 관찰
4. 탭 A에서 "모두 읽음" 클릭 → 탭 B 종 배지 다시 관찰
**Expected:**
- Step 2: 탭 B 배지 2 → **1** 자동 갱신 (StorageEvent 수신, 사용자 조작 없이)
- Step 3: 탭 B에서 그 에러 항목이 read 상태(amber bar/NEW 사라짐)로 동기화
- Step 4: 탭 A "모두 읽음" 후 탭 B 배지 **사라짐** (unread=0)
- 회귀 가드: `notificationCenter.ts` `subscribeNotifications`의 `storage` listener + `useNotificationCenter` re-sync
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 18. EditSessionModal 재설계 + V1 validation (P0: 8 / 13) [후속 PR]

> SSOT: [`docs/edit-session-modal-redesign-spec.md`](../../docs/edit-session-modal-redesign-spec.md).
> 영향: `EditSessionModal.tsx` 헤더 chip + body flex column + V1-disabled validation + handleSave 학생 0명 가드 + owner/admin 통합 출결 섹션.

### S-18.1 학생 0명 + 저장 → 세션 삭제 사고 방지 [P0]
**Pre:** 시간표 진입, 임의 세션 클릭 → 모달 open
**Steps:**
1. 모달의 학생 chip 영역에서 모든 학생 chip의 X 클릭으로 선택 0명 만들기
2. 저장 버튼 시각 상태 확인
3. (불가능해도 강제 click 시도)
**Expected:**
- 저장 버튼 disabled 상태 (회색, cursor-not-allowed)
- 좌측 helper text "⚠ 학생 1명 이상 선택 필요" (amber)
- 강제 클릭 시도해도 `onSave` 호출되지 않음 + 세션 그대로 (사고 방지)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.2 헤더 날짜 chip 클릭 → 캘린더 popover로 요일 변경 [P0]
**Pre:** 임의 세션 모달 open (schedule page가 `weekStartDate` prop 전달 → 실서비스 경로)
**Steps:**
1. 헤더의 날짜 chip (`5월 15일 (목)` 같은 라벨 + 캘린더 아이콘) 클릭
2. 월별 캘린더 popover open (`weekStartDate` prop 전달 시 month grid, 미전달 legacy caller 에서만 7-grid fallback — `EditSessionModal.tsx:699-834`)
3. **같은 주 내 다른 요일** 날짜 클릭 (예: 이번 주 금요일)
**Expected:**
- popover open (amber border + 약간 진한 bg)
- 선택된 날짜 cell 이 진한 amber, 오늘은 amber ring (`EditSessionModal.tsx:775-779`)
- 같은 주 다른 요일 클릭 → weekday 만 변경 (weekStartDate 동일) + chip 라벨 즉시 갱신 + popover 자동 닫힘
- 저장 시 새 weekday로 같은 주 안에서 세션 이동 (다른 주 이동은 S-18.9)
- (참고) `weekStartObj` 없는 legacy 진입에서만 7-grid weekday 버튼 fallback — 실서비스는 항상 month calendar
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.3 헤더 시간 chip 클릭 → popover로 시간 변경 [P0]
**Pre:** 임의 세션 모달 open
**Steps:**
1. 헤더의 시간 chip (`11:00 – 12:00 · 1시간` 같은 라벨) 클릭
2. popover에 시작/종료 time input 노출
3. 시작 시간을 10:00으로 변경
4. (선택) 시작이 종료보다 늦은 경우 시뮬 — 종료 = 09:00
**Expected:**
- popover open
- 시작 input 변경 즉시 chip 라벨 갱신 (`10:00 – 12:00`)
- 시작 > 종료 시 popover 내부에 빨간 timeError 메시지
- popover 외부 클릭 시 닫힘
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.4 body 요일/시간 select 제거 확인 [P1]
**Pre:** 임의 세션 모달 open
**Steps:**
1. body 스크롤 — 학생/과목/강사 영역만 보임
2. 기존 "요일", "수업 시간" select가 body에 없는지 확인
**Expected:**
- 헤더 chip이 SSOT — body에 weekday select 없음
- 시간 input도 body에 없음 (헤더 popover에만)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.5 강사 그룹화 + 학생 검색 회귀 0 [P1]
**Pre:** 임의 세션 모달 open
**Steps:**
1. 강사 영역에 "{과목명} 담당" / "기타 강사" 두 그룹 표시 확인 (TeacherDropdownPicker 펼침 안에서)
2. 학생 picker 가 접혀 있으면 "학생 추가 / 변경" 토글 클릭으로 펼친다 (`EditSessionModal.tsx:1165-1185`)
3. 학생 검색 input에 "김" 입력
4. 검색 결과 list에서 학생 클릭 → chip으로 이동
**Expected:**
- TeacherDropdownPicker 동작 (담당/기타 그룹화 + 색 dot 은 dropdown 펼침 안에서, `EditSessionModal.tsx:911`. 옛 TeacherPillPicker 명칭은 stale — src 에 없음)
- 과목도 native select 가 아니라 SubjectDropdownPicker (`EditSessionModal.tsx:903`)
- 학생 검색 + filtered list + 선택 chip 패턴 그대로
- 동명이인 부제(ADR-015) 그대로
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.7 body 순서: 과목 → 강사 → 학생 picker [P1]
**Pre:** owner/admin 으로 임의 세션 모달 open (attendanceMap + onMarkAttendance 제공 경로)
**Steps:**
1. body 영역에서 위→아래로 필드 순서 확인
**Expected:**
- 1) 과목 (SubjectDropdownPicker, 맨 위, `*` 필수)
- 2) 강사 (TeacherDropdownPicker — 담당/기타 그룹)
- 3) 출결 섹션이 메인 (학생별 pill, 학생 picker 위), 그 아래 collapsible 학생 picker (default 접힘, "학생 추가 / 변경" 토글, `EditSessionModal.tsx:1165-1185`)
- (분기) attendanceMap/onMarkAttendance 미제공 legacy caller 에선 출결 섹션 없음 + 학생 picker 가 펼쳐진 채 노출 (`EditSessionModal.tsx:1186-1193`)
- 메타(과목/강사)가 위에 있어 스크롤 시에도 잘 보임
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.8 헤더 chip "X월 Y일 (요일)" + V3 month calendar [P0]
**Pre:** 임의 세션 모달 open. (schedule page가 weekStartDate prop 전달 → 현재 주 기준 날짜 표시)
**Steps:**
1. 헤더 요일 chip의 label이 `5월 15일 (목)` 같은 형식인지 확인
2. chip 클릭 → 월별 캘린더 popover open
3. 캘린더 상단에 `2026년 5월` + 이전/다음 달(`‹` `›`) 버튼
4. 선택된 weekday의 이번 주 날짜 1개만 진한 amber, 오늘은 amber ring
5. 다른 날짜(예: 5월 20일 수) 클릭
**Expected:**
- chip label에 월/일/요일 모두 표시 (weekStartDate prop 전달 시)
- popover에 표준 month grid (7요일 header + 6 weeks × 7 col cells)
- `‹` `›`로 다른 달 navigation
- 5월 20일 클릭 → weekday=2(수)로 변경 + popover 닫힘 + chip label 갱신 (`5월 13일 (수)` — 이번 주의 수요일)
- schedule 저장 시 그 weekday로 세션 이동 (주간 반복 paradigm 유지)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.9 다른 주 날짜로 세션 이동 + 시간표 자동 navigate [P0]
**Pre:** 임의 세션 모달 open. (예: 5/13 수요일 11:00 수업)
**Steps:**
1. 헤더 날짜 chip 클릭 → 월별 캘린더 popover open
2. **다른 주의 날짜 클릭** (예: 5/20 수요일 또는 5/22 금요일)
3. chip label 즉시 갱신 확인 (예: `5월 20일 (수)` 또는 `5월 22일 (금)`)
4. 저장 클릭
**Expected:**
- 저장 후 시간표가 **선택한 주(5/18~5/24)로 자동 navigate** — 그 주의 그 요일/시간에 세션 표시
- 원래 주(5/11~5/17)에서는 그 세션 사라짐
- 캘린더 popover 하단 안내: "다른 날짜 클릭 → 그 날짜로 이동" ("주간 반복" 표현 없음)
- API: `PUT /api/sessions/[id]?userId=...` body에 `weekStartDate: "2026-05-18"` 포함 (`route.ts:55,84,136` — PATCH 가 아니라 PUT. PATCH 는 `/position` yPosition 전용). local-first 저장이라 저장 즉시 발사 아닐 수 있음 — outbox flush 시 전송
- 검증은 저장 후 시간표 navigate + 새 주 표시로 충분, 네트워크 직접 확인(PUT body)은 선택
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.10 EditSessionModal 통합 출결 — pill cycle + buffer + 저장 batch [P0]
**Pre:** owner/admin 으로 학생 2명+ 들어간 세션 블록 클릭 → 모달 open. 출결 섹션이 학생 picker 위 메인으로 렌더됨 (attendanceMap + onMarkAttendance 제공, `EditSessionModal.tsx:937-1160`, schedule/page.tsx:2530-2548 에서 전달)
**Steps:**
1. 학생 A의 출결 pill(default "미체크" / none) 클릭 → "출석"으로 토글
2. 같은 pill을 반복 클릭하며 cycle 확인 (none → 출석 → 결석 → 지각 → none, `EditSessionModal.attendanceCycle.ts:42` CYCLE_ORDER = `["none","present","absent","late"]`)
3. 학생 B의 pill 도 하나 변경
4. 하단 안내 확인: amber dot + "출결 N명 바꿨어요 — 저장 버튼을 눌러야 저장돼요" (`EditSessionModal.tsx:1093-1106`, data-testid 없음 — 텍스트로 확인)
5. 저장 클릭 → buffer flush (batch) 후 모달 닫힘
6. 같은 블록 재진입 → 마킹 status 유지 확인
**Expected:**
- pill 색/라벨이 cycle 순서대로 정확히 변함 (출석/결석/지각/미체크)
- 미저장 변경 N건 안내(amber dot)가 buffer non-empty 동안 노출
- 저장 후 출결 status persist — occurrence date key = 모달의 instanceDate(이번 주 그 요일), 새로 열어도 동일 status
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.11 미저장 출결 닫기 가드 (window.confirm) [P0]
**Pre:** 통합 출결 모달(S-18.10)에서 학생 pill 1개+ 변경 → attendanceBuffer non-empty 상태
**Steps:**
1. 우상단 X 또는 "취소" 클릭
2. window.confirm 표시 시 먼저 "취소"(부정) 선택 → 모달 상태 확인
3. 다시 X/취소 클릭 → 이번엔 "확인"(긍정) 선택
**Expected:**
- `window.confirm("미저장 출결 변경 N건이 있습니다. 그대로 닫으시겠습니까?")` 노출 (`EditSessionModal.tsx:379-390`)
- confirm 취소 → 모달 그대로 유지(닫히지 않음), buffer 보존
- confirm 확인 → buffer 폐기 후 모달 닫힘 (출결 미저장)
- buffer 가 비어있을 땐(변경 없음) confirm 없이 바로 닫힘
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.12 attendanceOnly (member) 모달 UI 가드 [P1]
**Pre:** member(강사/일반) 권한으로 본인 수업 세션 블록 진입 → attendanceOnly 모드 모달 open (S-20.7 의 진입 경로). 권한/진입 검증은 S-20.7, 본 시나리오는 UI 세부 가드만.
**Steps:**
1. 헤더 요일/시간 chip 클릭 시도
2. body 영역 스크롤 — 과목/강사/색상/삭제/학생X 버튼 유무 확인
3. 출결 pill 토글 (S-18.10 과 동일 cycle)
4. 학생 0명 상태에서 저장 버튼 활성 여부 확인
5. 저장 클릭
**Expected:**
- 요일/시간 chip disabled — 클릭 무반응, ChevronDown 아이콘 없음, cursor-default (`EditSessionModal.tsx:633-695`)
- colorPanel/삭제 버튼 미렌더(`872-881`), 과목/강사 grid 숨김(`897-920`), 학생 X(제거) 버튼 숨김(`1077-1087`)
- 저장 버튼 라벨이 "저장"이 아니라 "출결 저장" (`EditSessionModal.tsx:1102,1319`)
- 학생 0명이어도 저장 가능 — `isSaveDisabled = !attendanceOnly && studentCount === 0` (`EditSessionModal.tsx:510-511`), 0명-가드는 메타 저장(onSave) 경로에만 (`397-398`)
- 저장 시 onSave 미호출 (세션 PUT 403 회피) — 출결 buffer flush + close 만 (`EditSessionModal.tsx:396-419`)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.13 다른 주 이동 시 출결 follow + 중복 가드 [P1]
**Pre:** 출결 1건+ 마킹된 세션을 다른 주 날짜로 이동(S-18.9 흐름). owner/admin 경로.
**Steps:**
1. 세션 모달에서 학생 출결 찍기(S-18.10) → 헤더 캘린더로 **다른 주** 날짜 선택 → 저장
2. 자동 navigate 된 새 주에서 그 occurrence의 출결 확인
3. (변형) 이동 대상 날짜에 이미 출결이 있는 경우를 만들어 같은 이동 재시도 (그 날짜 occurrence 에 미리 출결 1건 생성)
**Expected:**
- 새 주로 navigate 후 그 occurrence 에 출결 유지 (migrate, B move 정책 — schedule/page.tsx:286-320 `migrateAttendanceForSessionMove`, old≠new 일 때만 호출 editSaveHandlers.ts:193-210)
- migrate 는 fire-and-forget — 모달은 즉시 닫힘(blocking 아님), 출결 반영은 잠깐 뒤일 수 있음
- (변형) 대상 날짜에 이미 출결 존재 시 `${newDate} 에 이미 출결 있음 — 이동 안 됨` warning toast (schedule/page.tsx:305-306) + 원본 출결 보존
- (참고) FK 500 / outbox 4xx·5xx / DUPLICATE_DATE 409 등 서버응답 강제 race 는 자동 테스트로 검증 — test branch
**Result:** [ ] Pass [ ] Fail — note: ___

### S-18.6 색 선택 + 모바일 BottomSheet 회귀 0 [P2]
**Pre:** 모바일 viewport(375×667), 임의 세션 모달 open
**Steps:**
1. BottomSheet로 wrap된 모달 확인
2. 헤더 우측 색 dot 버튼 → swatch popover 동작
3. 헤더 요일/시간 chip + popover 동작 (모바일에서도)
**Expected:**
- BottomSheet 안에서 헤더/body/footer 자연 layout
- 색 패널 그대로 (12개 swatch + 직접 색상 선택)
- chip popover가 BottomSheet 안에서 정상 위치
**Result:** [ ] Pass [ ] Fail — note: ___

## 19. 관리자 (admin) 권한 — Phase 4 (P0: 4 / 7)

> **사전 셋업 (Phase 4 진입):**
> - Phase 3 끝 상태 = owner 로 academy 1개 + 시드 데이터 보유.
> - owner 로 `/settings` 진입 → "관리자 초대" 흐름 (S-19.1) 직접 검증 의무.
> - 본 Phase 의 나머지 시나리오 (S-19.5~19.7) 진입은 위 흐름 끝나거나 `npm run uat:invite -- --role admin` 으로 빠르게 가능.
> - 진입 후 즉시 admin 로그인 — middleware `user_role` 쿠키가 admin 으로 set 됨 → `/students` `/subjects` `/teachers` `/schedule` 모두 접근 가능 (단 owner 권한 사항 차단).

### S-19.1 owner 가 admin 초대 발급 [P0]
**Pre:** owner 인증 모드 + `/settings` 진입
**Steps:**
1. `/settings` → "+ 멤버 초대" (멤버 추가) 버튼 클릭 → InviteModal 열림 (모달 제목 "멤버 초대")
2. "역할 선택" 카드에서 **"관리자"** 선택
3. "이 사람 별칭 (필수)" 입력 (예: `박원장님`) — admin invite 는 teacher row 없이 발급되므로, 멤버 목록에서 누구에게 보냈는지 식별할 별칭이 필수 (**이메일 입력 필드 없음**)
4. "링크 생성 + 복사" 클릭
**Expected:**
- `/api/invites?userId=...` POST 201 (Network 탭). request body: `{ role: "admin", label: "박원장님" }` — `email`/`teacherId` 없음 (admin 초대는 teacher link 불필요. email 미부착 → S-19.2/S-19.3 참고. 020/033 migration 의 CHECK 제약 `role='admin' OR (role='member' AND teacher_id NOT NULL)` 통과)
- 토큰 URL `${origin}/invite/{token}` 자동 클립보드 복사 + 부모 토스트로 생성 성공 피드백 (clipboard write 실패해도 토스트는 뜸)
- 별칭 미입력 시 "링크 생성 + 복사" 버튼 disabled (`canSubmit` — admin 은 trim 길이 1~50자). 빈 label 강제 전송 시 서버 400 `INVITE_ADMIN_REQUIRES_LABEL: 관리자 초대에는 별칭이 필요합니다`. 50자 초과 시 400 `INVITE_LABEL_TOO_LONG`
- 토큰 만료 = `now + INVITE_EXPIRES_HOURS시간` (env 미설정 시 **default 24h** — '7일' 아님). invite 페이지 footer 의 만료 날짜(`toLocaleDateString`)가 실제 `expires_at` 과 일치하는지 확인
  - 참고: invite 페이지의 invalid-state 안내 문구 "7일이 지난 초대 링크" 는 **고정 문자열**이라 실제 TTL(configurable)을 반영하지 않음 — env=24h 환경이면 copy bug 로 flag
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.2 admin invite 수락 — 이메일 일치 (4-state b) [P0]
**Pre:** S-19.1 토큰 보유
**Steps:**
1. owner 로그아웃 → `UAT_TEST_ADMIN_EMAIL` / password 로 로그인
2. 같은 브라우저에서 `/invite/{token}` 직접 진입
3. "수락" 클릭
**Expected:**
- 4-state 페이지가 **state-b (이메일 일치)** 분기 표시 — 학원명 + owner 이름 + "수락" CTA
- 수락 성공 → `academy_members.role = "admin"` INSERT 확인
- `set-cookie: cp_onboarded=1` 헤더 + `/schedule` 자동 라우팅
- `invite_tokens.used_by = admin_user_id`, `used_at` 마크 (다시 같은 토큰 진입 시 state-d "이미 사용됨" 표시)
- **주의 (admin invite 는 email 미부착):** admin 초대는 별칭(label)만 받고 email 컬럼은 null 로 insert 됨 (member 초대만 teacher.email 부착). 따라서 admin invite 는 어떤 계정으로 수락하든 항상 state-b 로 resolve — state-c(이메일 불일치)는 발생하지 않음. (이메일-불일치 검증은 member invite 경로인 S-19.3 에서 수행.)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.3 member invite 수락 — 이메일 불일치 (4-state c) [P1]
**Pre:** owner 가 **email 이 등록된 강사**로 member invite 발급 (member 초대만 teacher.email 을 invite_tokens.email 에 부착 — admin invite 는 email 없어 항상 state-b. S-19.2 주의 참고)
**Steps:**
1. invite 의 강사 email 과 **다른 이메일 계정**으로 로그인
2. 같은 브라우저에서 `/invite/{token}` 진입 (로그인 email 이 invite.email 과 mismatch)
**Expected:**
- 4-state 페이지가 **state-c (이메일 불일치)** 분기 표시 — "다른 이메일로 로그인됨" 안내 + "계정 전환하기" 버튼 (정확한 분기 UI 는 `/invite/[token]/page.tsx` `computeState` 확인: `invite.inviteEmail && inviteEmail !== email → state-c`)
- 강제로 수락 호출 시 `/api/invites/accept` 응답 `{ success: false, error: "이 초대는 다른 이메일 주소 용입니다.", error_code: "email_mismatch" }` **403**
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.4 admin invite 수락 — 만료 + 사용됨 (4-state a/d) [P1]
**Pre:** S-19.2 후 (used_by 마크된 토큰) **또는** invite_tokens.expires_at 을 admin SQL 로 과거로 set
**Steps:**
1. (a) 비로그인 상태에서 used/expired 토큰 진입 → 4-state 페이지 "로그인 유도" + "이 초대는 만료/사용됨" 안내
2. (d) admin 로그인 후 같은 토큰 재진입 → "이미 멤버" 또는 "사용된 초대" 안내
**Expected:**
- 만료: response error "만료된 초대 링크입니다."
- 이미 사용됨: response error "이미 사용된 초대 링크입니다."
- 각 분기에서 수락 버튼 없음 (재발급 안내만)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.5 admin 권한 — 학생/과목/강사 CUD [P0]
**Pre:** admin 으로 로그인 + academy active
**Steps:**
1. `/students` 진입 → 학생 1명 추가 (예: "관리자추가테스트")
2. `/subjects` → 과목 추가 (예: "관리자과목")
3. `/teachers` → 강사 추가
4. `/schedule` → FAB → 모달에서 수업 추가 + 템플릿 저장
**Expected:**
- 모든 CUD 성공 — `useMyRole.canManage = true` (owner 와 동일)
- `requireRole(userId, ["owner", "admin"])` 통과 (POST /api/students, /api/subjects, /api/teachers, /api/sessions, /api/templates 모두 200/201)
- ScheduleActionBar 의 PDF/공유/템플릿 버튼 모두 활성화
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.6 admin → admin 의 owner 강등 차단 [P0]
**Pre:** admin 으로 `/settings` → 멤버 목록 진입
**Steps:**
1. owner 멤버 row 의 역할 select 클릭 시도
2. 또는 DevTools Network 로 `PATCH /api/members/{ownerId}` body `{ role: "admin" }` 강제 전송
**Expected:**
- UI 에서 owner 의 role select 가 disabled (또는 select 자체 미렌더)
- 직접 API 호출 시 server-side `if (targetRow.role === "owner") return 403 "owner는 강등할 수 없습니다."` (or similar)
- owner role 변경 불가 정책 (ADR-019 Academy Singularity 일관)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-19.7 admin 의 member 삭제 + 역할변경 권한 경계 [P1]
**Pre:** Phase 5 이후 (member 가 academy 에 join 된 상태)
**Steps:**
1. admin 으로 `/settings` 멤버 목록 진입
2. member row → 역할 select → "admin" 으로 promote 시도 (UI 에 role-toggle 노출됨 — `canManage = owner||admin`)
3. member row → 휴지통 → "삭제"
**Expected:**
- **역할 변경은 admin 불가 (owner-only):** `PATCH /api/members/{userId}?userId=...` 는 server-side `if (actorRole !== "owner") return 403 "역할 변경은 원장만 가능합니다."` → admin actor 는 promote/demote 모두 **403** (클라이언트엔 button 이 노출되지만 API 가 거부)
- **삭제는 admin 가능:** `DELETE /api/members/{userId}?userId=...` 는 owner||admin 허용 → **200** → 사이드바의 멤버 목록에서 즉시 제거
- member 였던 사용자가 본인 강사(teachers.user_id) 와 연결돼 있다면 teacher row 는 보존 + user_id 만 null 로 복귀 (정책 — owner 가 다시 다른 사용자에게 같은 강사 invite 가능)
- ⚠️ **follow-up (UI/API 권한 불일치):** settings UI 는 admin 에게 role-toggle 버튼을 노출(`canManage`)하나 PATCH API 는 owner-only 로 403 거부 → admin 이 클릭하면 silent 403. owner-only 로 UI gating 하거나 API 를 admin 허용으로 정렬할지 결정 필요. (full promote/demote 200 검증은 owner-actor 시나리오에서 수행 — S-19.7 은 권한 경계만 확인.)
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 20. 멤버=강사 (member) RBAC — Phase 5 (P0: 4 / 8)

> **사전 셋업 (Phase 5 진입):**
> - owner 또는 admin 으로 `/teachers` 진입 → 강사 "강사_uat" 생성 (또는 uat:invite 가 자동 생성).
> - owner/admin 으로 `/settings` → "강사 초대 (member)" 흐름 — 발급 시 반드시 teacher_id 첨부 (033 migration CHECK 제약).
> - 본 Phase 의 S-20.5~20.8 은 `npm run uat:invite -- --role member` 후 빠르게 진입 가능.

### S-20.1 owner 가 member 초대 발급 — teacher_id 필수, email 은 강사 row 파생 [P0]
**Pre:** owner 인증 모드 + `/teachers` 에 "강사_uat" 라는 미링크 강사 생성 (teachers.user_id IS NULL)
**Steps:**
1. owner 로 `/settings` (또는 강사 row) → "강사 초대" 흐름으로 InviteModal 진입
2. 역할 select → "강사 (member)" (default)
3. "연동할 강사 선택 (필수)" 드롭다운에서 "강사_uat" 선택
   - email 미등록 강사를 고르면 노란 경고 박스("이 강사의 이메일이 등록되지 않았습니다 … 다른 사람이 링크를 사용할 수 있습니다") 표시 확인
4. "링크 생성 + 복사" 클릭
**Expected:**
- 초대 토큰 생성 — `POST /api/invites` body 는 `{ role: "member", teacherId: "<강사_uat의 id>" }` (이메일 입력 필드 없음 — body 에 `email` 필드 없음)
- 응답 201 — `invite_tokens.email` 은 선택한 강사 row 의 `email` 에서 파생 (route.ts:114-136). 강사에 email 미등록이면 토큰 email = null → 누구나 링크 사용 가능 (경고 문구가 이 동작을 안내)
- teacherId 미첨부 강제 시도(DevTools 로 body 에서 teacherId 제거) → 400 `INVITE_MEMBER_REQUIRES_TEACHER: member 초대에는 강사 연동이 필요합니다` (route.ts:86-88)
- 이미 링크된 강사 선택 시 → 400 `TEACHER_ALREADY_LINKED: 이미 다른 계정과 연동된 강사입니다` (route.ts:129-133)
- 토큰 URL 표시 + 자동 클립보드 복사 ("링크 생성 + 복사" 버튼 라벨 확인)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.2 member invite 수락 + teacher link [P0]
**Pre:** S-20.1 토큰 보유
**Steps:**
1. owner 로그아웃 → 강사_uat 에 등록된 이메일 계정으로 로그인 (email 미등록 강사면 임의 계정)
2. `/invite/{token}` 직접 진입 → "수락"
**Expected:**
- state-b (이메일 일치, 또는 email 미등록 강사면 누구나) → 수락 성공
- `academy_members.role = "member"` INSERT
- `teachers.user_id` 가 member user_id 로 UPDATE (이전 NULL → set, `.is("user_id", null)` 가드, accept/route.ts:99-103). UNIQUE INDEX `uniq_teachers_academy_user` 위반 시 409 `TEACHER_ALREADY_LINKED` (S-20.2b 참조)
- 수락 후 middleware 가 member role 인지 → admin-only 페이지(학생/과목/강사) 직접 접근 시 `/schedule` 로 redirect (member 는 /schedule role-branch read-only view 사용)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.2b member invite teacher 중복 link (409) [P1]
**Pre:** 같은 강사("강사_uat")로 발급된 invite 토큰 1개 + 두 개의 인증 세션(탭/계정). 또는 강사가 이미 다른 계정과 link 된 상태에서 같은 강사 대상 새 invite 발급.
**Steps:**
1. 첫 번째 세션에서 `/invite/{token}` 수락 (또는 DevTools 로 `POST /api/invites/accept` body `{ token }`)
2. 거의 동시에/직후 두 번째 세션에서 DevTools 로 `POST /api/invites/accept` 같은(또는 forward 된) 토큰 직접 전송
**Expected:**
- 첫 accept 200 — `teachers.user_id` set (`.is("user_id", null)` 가드 통과)
- 두 번째 accept 409 `{ error: "TEACHER_ALREADY_LINKED" }` (accept/route.ts:104-111) — UNIQUE INDEX `uniq_teachers_academy_user` + 가드로 link 는 단 1개
- 패자(두 번째) 토큰도 `invite_tokens.used_by` / `used_at` 가 마킹됨 (route.ts:107-110) — orphaned reusable token 방지(재사용 불가)
- `academy_members` 는 두 번째도 INSERT 될 수 있으나(멤버십과 teacher link 는 별개) teacher link 는 정확히 1개
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.3 member RBAC — middleware route guard [P0]
**Pre:** member 로 로그인 + active academy (user_role 쿠키 = member 상태)
**Steps:**
1. 주소창에 `/students` 직접 입력
2. 주소창에 `/subjects` 직접 입력
3. 주소창에 `/teachers` 직접 입력
4. `/schedule` 직접 입력 → middleware 동작 확인
**Expected:**
- middleware (`src/middleware.ts:73-81`) 가 `user_role` 쿠키 검사 → member 면 admin-only path (`/students` `/subjects` `/teachers`) 차단 → `/schedule?toast=permission_denied` 로 redirect
- `/schedule` 은 차단 X (member 도 시간표 read-only 접근 가능) — 단 FAB/+ 새 학생/+ 새 강사 등 CUD UI 미렌더
- 주의: middleware 는 UX 가이드일 뿐 보안 경계 X — 실제 API 권한은 `requireRole` 이 책임
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.3b member route-guard 쿠키 미설정 윈도우 (pass-through 정상) [P1]
**Pre:** member 계정 로그인 직후 또는 user_role 쿠키가 아직 안 쓰인 상태. (쿠키는 useMyRole → `POST /api/auth/set-role-cookie` 로 비동기 설정 — 첫 진입 시 미설정 윈도우 존재.)
**Steps:**
1. DevTools Application → Cookies 에서 `user_role` 쿠키 삭제
2. 주소창에 `/students` 직접 진입 (쿠키 미설정 상태)
3. 페이지 내 추가/편집 UI 유무 확인 + DevTools 로 write API(`POST/PUT/DELETE /api/students` 등) 강제 전송
4. 새로고침 또는 탐색으로 useMyRole 이 set-role-cookie 완료시킨 뒤 다시 `/students` 진입
**Expected:**
- Step 2: middleware 는 쿠키 없으면 redirect 안 함 → `/students` **통과** (정상 동작, `userRole === "member"` 일 때만 차단, middleware.ts:75). un-redirected 첫 hit 은 회귀 아님
- Step 3: 페이지는 `canManage=false` 로 렌더 → 추가/편집 UI 미렌더 + 모든 write API 는 `requireRole` 로 403 (middleware 는 보안 경계 아님 — 실제 경계는 API)
- Step 4: 쿠키 설정 완료 후엔 이후 `/students` 진입이 `/schedule?toast=permission_denied` 로 redirect 됨 (정상 steady-state, S-20.3)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.4 member UI — canManage=false 가 차단하는 요소 일괄 [P0]
**Pre:** member 로 `/schedule` 진입
**Steps:**
1. ScheduleActionBar 시각 확인
2. FAB ("+") 시각 확인
3. SessionCard 클릭 → EditSessionModal 진입 시도
4. 모달 Step 2 의 과목 select 옆 "＋" + "＋ 새 강사" pill 시각 확인 (S-5.15 ref)
5. 사이드바 메뉴 시각 확인
**Expected:**
- ScheduleActionBar 의 템플릿/PDF/공유 버튼 disabled 또는 미렌더
- FAB 자체 미렌더 (canManage=false)
- EditSessionModal 진입 가능 — member 는 attendanceOnly 모드(메타 필드 read-only + 출결 pill 활성, S-20.7). 메타 저장 버튼 미렌더
- "＋" 과목 추가 / "＋ 새 강사" pill 모두 미렌더 (S-5.15 동일 동작 검증)
- 사이드바: 시간표 만 노출 / 학생·과목·강사 메뉴 미렌더 (출결 전용 nav 는 2026-05-29 전체 제거 — 출결은 시간표 블록 클릭 진입)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.5 member `/schedule` role-branch view — 본인 강사 세션만 [P0]
**Pre:** member 로 로그인 + owner 가 미리 "강사_uat" 배정한 session 3개 + 다른 강사 ("김선생") 배정한 session 2개 보유
**Steps:**
1. `/schedule` 진입 (member role-branch — `isMemberView`)
2. 시간표 + 세션 블록 시각 확인
**Expected:**
- 본인 (teachers.user_id = member_user_id) 강사 의 세션 3개만 표시
- 다른 강사 세션 2개는 시간표에서 hidden (client filter `s.teacherId === linkedTeacherId`, schedule/page.tsx) — 미연결 member 는 빈 화면
- canManage=false → FAB/추가/드래그/메타 편집 UI 미렌더 (read-only)
- 세션 블록 클릭 → 출결-전용 EditSessionModal(`attendanceOnly`): 과목/시간/학생/강사 read-only + 출결 pill 만 활성 (S-20.7 참조)
- 세션 메타 PUT(`/api/sessions/[id]`)은 owner/admin only → member 는 public_description 포함 모든 필드 403 (route.ts:120-126, 이전 public_description 허용 gap 마감)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.6 member 세션 메타 PUT 전면 차단 (public_description 포함) [P1]
**Pre:** S-20.5 상태. (2026-05-29 보안 강화 — 이전엔 member 가 본인 강사 session 의 public_description 만 PUT 허용했으나, subject/time/teacher 재배정 우회 gap 으로 member 세션 메타 PUT 경로를 전면 차단. route.ts:120-126.)
**Steps:**
1. 본인 강사 session 에 DevTools 로 `PUT /api/sessions/{id}` body `{ public_description: "오늘 진도: 미적분 5단원" }` 강제 전송
2. 다른 강사 session 에도 동일하게 강제 전송
3. body 를 `{ subjectId }` / `{ weekday }` / `{ startsAt }` 등 메타 필드로 바꿔 강제 전송
**Expected:**
- 본인/타 강사 무관 모든 session 메타 PUT → 403 (`requireRole(["owner","admin"])`, route.ts:126)
- public_description 도 더 이상 member 편집 불가 (gap 마감) — public_description 설정은 owner/admin 만
- member 의 정당한 쓰기 경로는 출결(`POST /api/attendance`, 본인 teacher 수업만 `assertAttendancePermission`) 뿐
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.7 member 본인 수업 출결 마킹 (attendanceOnly 모달) [P1]
**Pre:** S-20.5 — member `/schedule` 에 본인 강사 session 표시됨 (PR #571)
**Steps:**
1. 본인 강사 session 블록 클릭 → 출결-전용 EditSessionModal(`attendanceOnly`) 열림
2. 학생 출결 pill 클릭 (출석/결석/지각/사유) → 다른 상태로 토글
3. 과목/시간/학생/강사 필드가 read-only(disabled)인지 시각 확인
4. 모달 닫기 → 블록 우하단 출결 dot 갱신 확인
**Expected:**
- 출결 pill 활성 — 본인 수업 출결 마킹 성공 (`POST /api/attendance`, `assertAttendancePermission` 가 member 본인 teacher 수업만 허용)
- 과목/시간/학생/강사 메타 필드 read-only — 메타 저장 버튼 미렌더 (attendanceOnly 는 출결 flush + close)
- 닫고 재진입 시 방금 마킹한 출결 유지 (occurrence date key = `instanceDateFromWeekStart`)
- 타 강사 수업은 화면에 안 보임(S-20.5 필터) → 출결 진입 불가. 직접 `POST /api/attendance` 로 타 강사 수업 마킹 시도 시 권한 거부
**Result:** [ ] Pass [ ] Fail — note: ___

### S-20.8 member 의 데이터 이력 섹션 미렌더 [P2]
**Pre:** member 로 `/settings` 진입 (member 도 settings 페이지 접근 가능)
**Steps:**
1. 페이지 스크롤
**Expected:**
- "데이터 이력" 섹션 자체 미렌더 — `useMyRole.canManage=false` gate, line 67 `if (!canManage) return null`
- 강사 추가 모달 / 멤버 목록 / 학원 정보 변경 등 admin-only 섹션 미렌더
- 본인 정보 (이메일 + role chip "member") 만 표시
- S-14.13 동일 검증
**Result:** [ ] Pass [ ] Fail — note: ___

---

## 21. 학생 / 학부모 view (계정 X, incognito + access-code) — Phase 6 (P0: 2 / 5)

> **사전 셋업 (Phase 6 진입):**
> - Phase 3 끝부분에서 owner 가 `/settings` → 공유 링크 1개 (S-9.1) + 학부모 6자리 access-code (S-9.3) 미리 발급해둠.
> - 학생/학부모 = **별도 계정 X**. 같은 머신에서 새 incognito 창 (Chrome 단축키: `Cmd+Shift+N`) 열어 계정 격리.
> - owner academy 의 학생 1명 이상 + 그 학생 들어간 세션 1개 이상 필요 (uat:seed 가 자동 생성).

### S-21.1 share-link 직접 접근 (비로그인) [P0]
**Pre:** S-9.1 에서 발급한 share token URL 보유 (`https://localhost:3000/share/{token}`)
**Steps:**
1. **incognito 창** 새로 열기 (Cmd+Shift+N)
2. 주소창에 share URL 붙여넣기
**Expected:**
- 시간표 읽기 전용 view (`/share/[token]/page.tsx` 렌더)
- 학생명/과목명/강사명/시간 모두 정확 표시 (owner academy 의 시드 데이터)
- 편집/삭제/FAB 버튼 모두 없음 — 사이드바 자체 미렌더 또는 단순 헤더만
- 로그인 유도 없음 (anonymous 모드 share view 정책)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-21.2 학부모 6자리 access-code 입력 → share view 진입 [P0]
**Pre:** owner 가 `/settings` → "학부모 접속 코드" 섹션에서 발급한 6자리 코드 보유 (S-9.3). academy slug 또는 UUID 도 알아둠.
**Steps:**
1. incognito 창에서 `/academy/{slug-or-uuid}` 진입 (예: `localhost:3000/academy/uat-test-academy`)
2. 6자리 코드 입력 (혼동 문자 L 제외 — 0,1,L 안 나옴)
3. "확인" 클릭
**Expected:**
- `/api/share/code` POST 200 → response `{ token: "..." }`
- `/share/{token}` 으로 자동 redirect → S-21.1 와 같은 읽기 전용 view
- access-code 자체는 학원 운영자가 입소문 / 카톡 단톡으로 학부모에게 배포하는 흐름 (URL 보호 없이 short code 만)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-21.3 잘못된 코드 5회 → academy+IP lockout 1시간 [P1]
**Pre:** S-21.2 페이지 — `/academy/{slug}` 코드 입력 화면
**Steps:**
1. 잘못된 코드 6자리 입력 → "확인" — 1회
2. 다른 잘못된 코드 4번 더 (총 5회)
3. 6번째 시도 — 정답 코드 입력해도 lockout
**Expected:**
- 1~5번째 (잘못된 코드): 화면에 inline `<p>` 메시지 **"코드가 올바르지 않습니다. 다시 확인해주세요."** 표시 (alert 아님 — `academy/[identifier]/page.tsx` 가 200 외 응답을 모두 이 단일 문자열로 collapse). 내부적으로 API 는 404 `{ error: "유효하지 않은 코드입니다." }` 반환 + `recordFailure(lockoutKey, MAX_FAILURES, LOCKOUT_MS)` 누적.
- 5회 실패 후 lockout 발동 (`MAX_FAILURES=5` — `recordFailure` 가 `failures >= 5` 시 `lockedUntil` set).
- 6번째 시도 (정답 포함): API 가 코드 조회 전에 `checkLockout` true → 429 `{ error: "너무 많이 실패했습니다. 잠시 후 다시 시도해주세요." }` (`LOCKOUT_MS=1h`). 화면엔 동일 inline 메시지 "코드가 올바르지 않습니다. 다시 확인해주세요." 로 표시됨 (non-200 collapse).
- 1시간 후 lockout 자동 해제. `resetFailures` 는 정답으로 코드 조회 성공한 시점에만 호출됨.
- 별도 IP rate limit: 분당 10회 (`RATE_LIMIT` — 429 `{ error: "요청이 너무 많습니다." }`). 5회 안에 lockout 발동되므로 보통 도달 X.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-21.4 만료된 share-token / 만료된 access-code [P2]
**Pre:** S-9.5 와 동일 — owner 가 새 코드 발급하면 이전 코드 만료 (또는 admin SQL 로 `share_tokens.expires_at` 강제 과거)
**Steps:**
1. 이전 (만료된) 6자리 코드 또는 share-token URL 진입
**Expected:**
- **access-code (만료):** POST `/api/share/code` → **404 `{ error: "유효하지 않은 코드입니다." }`** (만료 코드와 오타 코드를 구분하지 않음 — 보안상 의도. `.gt('expires_at', now)` 필터로 만료 row 가 select 에서 제외되어 `!data` → 404). 화면엔 inline `<p>` "코드가 올바르지 않습니다. 다시 확인해주세요." 표시.
- **share-token (만료):** GET `/api/share/[token]` → **410 `{ success: false, error: "만료된 링크입니다." }`**. 취소된 링크면 410 `{ success: false, error: "취소된 링크입니다." }`. 존재하지 않는 token 은 404 `{ success: false, error: "링크를 찾을 수 없습니다." }`.
- `/share/[token]/page.tsx` 가 error state 렌더: 제목 **"시간표를 불러올 수 없습니다"** + `json.error` 본문 (예: "만료된 링크입니다.").
- 학부모에게 "원장에게 새 코드 발급 요청" 안내.
**Result:** [ ] Pass [ ] Fail — note: ___

### S-21.5 student view — 본인 학부모 코드 입력 + 본인 세션만 표시 [P2]
**Pre:** S-21.2 + 학원에 학생 ≥ 2명 (홍길동, 김영수). owner 가 학생별 별도 access-code 발급 옵션 사용 (`StudentDetailPanel` 의 "재발급" / `studentIds` filter).
**Steps:**
1. owner 로 `/students` → "홍길동" 상세 → "이 학생만 보이는 코드 발급"
2. 발급된 코드를 incognito 창에서 입력
**Expected:**
- share-token URL response 의 시간표가 **홍길동이 enroll 된 세션만** 표시 (다른 학생만 등록된 session 은 hidden 또는 카드에서 "외 N명" 표시되더라도 학부모 입장에서 본인 자녀명만 강조)
- 학원 전체 세션이 아니라 본인 자녀 관련 세션만 보이는 학부모용 view (privacy 보호)
- 동작이 학원 전체 share 와 다른지 확인 (academy-wide share 면 모든 학생 표시, student-scoped share 면 본인 자녀 enroll 만)
**Result:** [ ] Pass [ ] Fail — note: ___

### S-21.6 share view live refresh — 폴링·탭 재활성화 시 변경 배너 [P2]
**Pre:** incognito 창에서 share view (`/share/{token}`) 를 열어둔 상태 (최초 1회 fetch 완료 → `last_viewed_at` 기록됨). 다른 창(owner 로그인) 에서 같은 academy 시간표 편집 가능.
**Steps:**
1. owner 창에서 세션 1개의 시간(또는 요일)을 변경 후 저장 → `academies.schedule_updated_at` 갱신.
2. incognito share 탭으로 전환(탭 재활성화) — 또는 탭을 그대로 둔 채 최대 60초 대기.
3. (선택) share 탭을 백그라운드로 두었다가(다른 탭 활성화) 다시 share 탭으로 복귀.
**Expected:**
- 자동 poll (`POLL_INTERVAL_MS=60s`) 또는 탭 재활성화(`visibilitychange` → 즉시 1회 fetch) 시 시간표가 변경 내용으로 갱신됨.
- 상단에 변경 알림 배너 `ScheduleChangeBanner` 표시 (`data.hasChanges && data.lastViewedAt !== null` 조건). hasChanges 는 직전 `last_viewed_at` 이후 `schedule_updated_at` 이 더 최신일 때 true — 즉 **변경 직후 다음 view 시점**에 배너가 뜸.
- 탭을 백그라운드로 두면 polling 정지 (`document.hidden` → `clearInterval`), 다시 활성화 시 즉시 1회 fetch 후 interval 재개 (8시간 방치 시 background 폴링 낭비 차단).
- 각 fetch 마다 서버가 `last_viewed_at` 을 now 로 갱신하므로, 같은 변경이 다음번엔 배너로 다시 뜨지 않음 (변경 확인 1회성).
**Result:** [ ] Pass [ ] Fail — note: ___

## Edge Cases (P0: 0 / 10)

### E-1. 학생 0명 + 수업 추가 시도 [P2]
**Pre:** 모든 학생 삭제 (owner/admin 모드)
**Steps:** GroupSessionModal Step 0(학생) — 빈 입력 상태 확인 후 이름 입력
**Expected:**
- 빈 입력 상태에서는 드롭다운 영역이 **아무것도 렌더하지 않음** (CTA·안내 문구 모두 없음 — empty branch 는 `studentInputValue` 가 truthy 일 때만 표시)
- 이름 입력 시 owner/admin 은 `＋ '{이름}' 새 학생으로 추가` CTA 노출, member 는 "일치하는 학생이 없습니다"
- "선택된 학생 없음" 텍스트는 항상 표시
- (참고: GroupSessionModal.tsx:456,475-503)

### E-2. 과목 0개 + 수업 추가 [P2]
**Pre:** 모든 과목 삭제, 학생 1명 이상 선택된 상태
**Steps:** Step 2 과목 select 확인
**Expected:**
- 과목 select 는 "과목을 선택하세요" placeholder 만 보이고 옵션 목록은 비어 있음 (disabled 아님 — disable 조건은 **학생 0명**일 때이지 과목 0개일 때가 아님)
- owner/admin 은 옆의 `＋` (새 과목 추가) 버튼으로 인라인 생성 후 즉시 자동 선택됨
- member 는 `＋` 버튼 미노출
- (참고: GroupSessionModal.tsx:520-541 — placeholder "과목을 선택하세요", disabled=`studentIds.length===0`)

### E-3. 같은 시간대 4개+ 겹침 [P1]
**Pre:** 09:00-10:00에 4개 세션
**Steps:** 시간표 확인 → 해당 row 의 "+1" 칩 클릭 → 다시 클릭(또는 "-")
**Expected:**
- 4개 겹침 시 3개 lane 표시 + 해당 row 에 "+1" 칩
- 칩 클릭 시 **popover 가 아니라** 그 cluster 의 lane 이 inline 으로 펼쳐져 (해당 weekday column 폭이 넓어지며) 4개 모두 side-by-side 표시
- 다시 클릭(또는 "-")하면 3 lane 으로 접힘
- drag 중에는 "+N" 칩 미표시
- (참고: TimeTableGrid.tsx:224-227 expandedRows / 242-245 cluster expand-collapse / 563-573 collapsed cap 3 lanes)

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

### E-7. 신규 세션 생성 직후 즉시 드래그 (position-before-create race) [P1]
**Pre:** 인증 모드, omni-radar 로 POST /api/sessions ↔ PUT /api/sessions/:id/position 타임라인 관찰
**Steps:**
1. "수업 추가"로 새 세션 1개 생성
2. POST 응답이 오기 전에 곧바로 그 신규 세션 + 기존 4개를 빠르게 연속 드래그
**Expected:**
- PUT /api/sessions/:id/position 5건 모두 발사 (일반 partial PUT 아님 — /position 전용 endpoint, syncSessionUpdateAsync)
- 신규 세션의 PUT 이 POST 보다 먼저 도달해도 그 세션이 localStorage 에서 사라지지(ghost-clean) 않음 — 30s grace 보호
- 5xx / 네트워크 실패 시 해당 변경이 outbox(localStorage `sync_outbox_*`)에 enqueue 되고 다음 진입 시 재시도 토스트 노출
- 새로고침 후 모든 세션이 최종 위치로 1개씩만 존재 ("서버에 없어 정리됨" 토스트 발화 X)
- (참고: apiSync.ts:50,796-817 race guard + 849-900 syncSessionUpdateAsync 404→cleanupGhostSession / 5xx→outbox 분기. POST→PUT 도착 순서를 서버단에서 강제 역전시키는 FK/fire-and-forget 순서 케이스는 자동 테스트로 검증 — test branch)

### E-8. 학생 칩 0개 선택 상태 색상 [P2]
**Pre:** ColorByToggle = "과목" (default). **"학생" 모드는 존재하지 않음** — ADR-020 R5(2026-05-21)에서 제거됨, 저장된 "student" 값은 "subject"로 마이그레이션
**Steps:** 학생 칩을 하나도 선택하지 않은 기본 상태에서 SessionCard 색상 + ColorByToggle 옵션 확인
**Expected:**
- 모든 세션이 과목 색상으로 표시 (dim 없음, 회색 X)
- ColorByToggle 에는 "과목"/"강사" 2개 옵션만 존재하고 "학생" 옵션은 **없어야 함**
- (참고: useColorBy.ts:11,16-19,41-42 student→subject 정규화 / ColorByToggle.tsx:10-13 MODES=과목·강사만)

### E-9. 공유 토큰 접근 — 만료 / 취소 / 부재 3-state [P2]
**Pre:** 만료된 share token, 취소(revoke)된 token, 존재하지 않는 token 각 1개
**Steps:** `/share/{token}` 각각 접근 → 네트워크 status + 에러 페이지 확인
**Expected:**
- 만료 → HTTP **410** + "만료된 링크입니다" 페이지
- 취소(revoke) → HTTP **410** + "취소된 링크입니다"
- 존재하지 않는 토큰 → HTTP **404** + "링크를 찾을 수 없습니다"
- (403 아님 — share-token 은 인증이 아니라 만료/취소/부재 3-state. 참고: api/share/[token]/route.ts:33-43. S-21.4 와 중복되지 않게 여기서는 세 status 분기 자체를 검증)

### E-10a. 같은 탭 본인 변경 → "다른 관리자가 변경" banner suppress [P1]
**Pre:** 인증 모드(owner/admin) 단일 탭에서 /schedule 열기
**Steps:**
1. 수업 추가 또는 세션 드래그 이동
2. 30s polling 1주기 대기(또는 polling 강제 트리거)
**Expected:**
- "다른 관리자가 변경했습니다" banner 가 **발화하지 않음** (self-sync 윈도우가 본인 변경을 자동 ack)
- 본인 변경 직후 SELF_SYNC_STORAGE_KEY(localStorage) 값이 갱신되고, polling serverTs 가 그 값 ±10s(SELF_SYNC_WINDOW_MS) 안이면 lastViewed 자동 set 으로 banner 미발화
- (회귀 가드 — feedback_race_window_patterns. 참고: useScheduleMeta.ts:80-116,142-154 lastSelfSyncAtRef + same-tab EventTarget 경로)

### E-10b. 다른 탭/다른 관리자 변경 → 본 탭 banner 발화 [P1]
**Pre:** 같은 학원을 두 탭(또는 두 관리자 계정)에서 /schedule 열기 — 탭A, 탭B
**Steps:**
1. 탭A 에서 수업 추가/이동
2. 탭B 에서 새로고침 없이 30s 이내 관찰
**Expected:**
- 탭B 에 변경사항이 storage event(다른 탭) 경로로 반영
- 탭B 에 "다른 관리자가 변경했습니다" banner 발화 (본인이 아닌 변경이므로 self-sync ack 대상 아님)
- silent overwrite 없이 마지막 write 가 반영되거나 outbox reconcile 로 병합
- (참고: apiSync.ts:232-241 notifySelfSync — same-tab EventTarget + 다른 탭용 localStorage write / useScheduleMeta.ts:108-116 storage event 경로)

### E-11. 한글 학원명 URL + 코드 복붙 정규화 (percent-decode + NFC) [P1]
**Pre:** 한글 이름 학원(예: "현진학원") — slug 없이 UUID 만, owner 가 6자리 access-code 발급
**Steps:**
1. incognito 에서 `/academy/현진학원` 또는 `/academy/{uuid}` 진입 (브라우저가 URL 을 percent-encoding 함)
2. macOS 에서 access-code 복사 → 입력란에 붙여넣기 → 확인
**Expected:**
- 1) 페이지가 404 아니라 학원명이 정상 표시됨 (raw percent-encoded 값을 decodeURIComponent + .normalize('NFC') 처리)
- 2) macOS 클립보드가 한글을 NFD 로 변환해 paste 해도 코드가 NFC 정규화되어 DB .eq() 매칭 성공 → share view 진입 (404 아님)
- (문서화된 P0 사고 회귀 가드. 참고: academy/[identifier]/page.tsx:13-25 decodeURIComponent+NFC, :50-53 코드 .trim().toUpperCase().normalize('NFC'))

### E-12. 입력 경계 / 특수문자 / 화이트리스트 검증 (4-layer SSOT) [P2]
**Pre:** 학생/과목 추가 모달 + /onboarding
**Steps:**
1. 학생명 7자 입력
2. 과목명 13자 입력
3. 학원명 31자 입력
4. 이름에 이모지 / 공백만 입력
5. (직접 API 호출) grade='고7', gender='남ㅇ'
**Expected:**
- 1-3) maxLength 로 입력 자체가 cap (학생 6 / 과목 12 / 학원 30). 초과를 우회해 보내면 TOO_LONG 에러 코드 메시지
- 4) 공백만 → trim 후 REQUIRED 에러 / 이모지 등 비허용 문자 → 검증 거부
- 5) grade·gender 화이트리스트 밖 값은 INVALID 로 거부 (클라이언트뿐 아니라 서버 layer 도 동일하게 거부)
- (validation 은 실제 UAT 사고(2026-05-08 생년월일 222233 / 성별 "남ㅇㅇㅇ", 2026-05-10 인라인 길이 미적용)에서 굳어진 SSOT. 참고: profileSchemas.ts NAME_MAX_LENGTH=6 / SUBJECT_NAME_MAX_LENGTH=12 / ACADEMY_NAME_MAX_LENGTH=30 / validateNameField / GRADE·GENDER whitelist)

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

## 22. Phase 1 Production Readiness Mode (240분, 친구 선공개 전 1회)

> Stage C of `/design-explorations/phase1-release-readiness`. 친구 학원 운영자(와이프 공동 운영) 선공개 = production main 머지 직전 1회 실행. Smoke (매 PR) / Release (분기 1회) 와 별도 의미 — Phase 1 정의된 13 구현 영역이 **production build** 환경에서 모두 동작하는지 + 권한/데이터 복구/multi-academy 흐름 + 5 production smoke 가 통과하는지 검증.

### 22.1 사용 시점

- Stage A-D (`/design-explorations/phase1-release-readiness` Roadmap) 모두 완료 후
- dev → main PR 작성 직전
- 부족 Top 10 중 rank 1 (피드백 채널) + 4 (analytics) + 8 (Sentry) + 9 (QR 가이드) 구현 후
- 사용자 결정으로 친구 선공개 의사 결정 완료 시

### 22.2 사전 준비

```bash
# cwd
cd ~/lee_file/entrepreneur/project/dev-pack/class-planner

# 1. dev 최신 동기화 + 신규 branch
git switch dev
git pull --ff-only origin dev
git switch -c chore/uat-$(date +%Y-%m-%d)-phase1-prod

# 2. UAT 3 계정 fresh cleanup + seed + invite
npm run uat:teardown                # 3 계정 academy/member/invite cleanup
npm run uat:setup                   # 3 user 멱등 생성
npm run uat:seed                    # owner academy 시드 (학생/과목/강사/세션)
npm run uat:invite                  # admin/member 자동 초대 + 수락 fast-path

# 3. production server 준비 (Stage D)
npm install                         # start-server-and-test devDependency 반영 (1회만)
npm run test:release                # production build + start (localhost:3100) + 5 smoke 자동 통과 검증
                                    # → fail 시 main 머지 차단. fix 후 재실행.

# 4. (test:release 통과 후) production server 분리 유지 — 본 UAT 는 dev 서버 X, production 서버 사용
npm run build
npm run start:prod-test &           # localhost:3100 background
# 또는 다른 터미널: npm run start:prod-test

# 5. 사본 생성
bash scripts/uat-new.sh phase1-prod
# → tests/manual/runs/<DATE>-<COMMIT>-phase1-prod.md 생성
```

> **production server :3100 사용 의무** — dev :3000 와 분리. Service Worker 가 production 에서만 활성 (serwist). 본 UAT 는 production build 의 실제 동작 검증이 목적.

### 22.3 P0 시나리오 (240분 — 6 묶음 × 40분)

#### 묶음 1. Phase 1 코어 13 구현 (owner 시점, 60분)

> 기존 §1~§18 시나리오 link. production server :3100 에서 owner 로그인 후 진행.

- **S-1.5 / S-1.5b** — 첫 로그인 + 학원 자동 생성 (ADR-019)
- **S-2.1 / S-2.7** — 학생 추가 + 상세 등록
- **S-3.1** — 과목 빠른 추가
- **S-4.1** — 강사 추가
- **S-5.6 / S-5.24** — 수업 추가 모달 V3 chip+popover
- **S-6.x** — 드래그앤드롭 + lane insert (대표 2-3개)
- **S-7.x** — PDF 출력 + 학부모 share 생성
- **S-14.1 / S-14.7** — 충돌 모달 + 자동 백업 발동
- **S-15.x** — AttendanceSheet (출결 입력 + 누적)
- **S-12.1** — 새로고침 후 데이터 유지

**P0 Pass 기준**: 13 항목 모두 production server :3100 에서 dev :3000 와 동일 동작 (visual/UX 차이 X).

#### 묶음 2. 권한 흐름 — admin / member (40분)

> **신규 시나리오 P1-PROD-2.1 ~ P1-PROD-2.3** (기존 §19/§20 의 production server 검증판)

- **P1-PROD-2.1**: admin 로그인 → /settings 진입 가능, 멤버 관리 가능 (canManage true). data history 섹션(DataHistorySection) 노출. [P0]
- **P1-PROD-2.2**: member 로그인 → /settings 멤버 관리 차단 (UI 자체 hidden 또는 disabled). data history 섹션 미렌더. 시간표 view + 편집은 가능. [P0]
- **P1-PROD-2.3**: admin 이 invite 새 user → 6자리 token 발급 → 새 incognito 창 + token 입력 → academy 조인 후 admin 권한 부여 확인. [P0]

#### 묶음 3. 데이터 복구 UI 흐름 (40분)

> **신규 시나리오 P1-PROD-3.1 ~ P1-PROD-3.3** (DataHistorySection production 검증)

- **P1-PROD-3.1**: owner 로그인 → /settings 하단 "데이터 이력" 섹션 노출 + 스냅샷 list 1개 이상 표시 (사전 seed 가 자동 백업 생성). [P0]
- **P1-PROD-3.2**: 의도적 학생 10명 일괄 삭제 → /settings 데이터 이력 → 최근 스냅샷 "복원" 클릭 → confirmation 모달 → 복원 → 학생 10명 복귀 확인. [P0]
- **P1-PROD-3.3**: 스냅샷 1개 "삭제" 클릭 → confirmation 모달 → 삭제 → list 에서 제거 확인. [P1]

#### 묶음 4. Multi-Academy switch + isolation (30분)

> **신규 시나리오 P1-PROD-4.1 ~ P1-PROD-4.2** + 기존 §10 활용

- **P1-PROD-4.1**: owner 로그인 → Sidebar "+ 새 학원 만들기" 버튼 enabled (PR #462 무제한) → 학원 B 생성 → academy switch dropdown 에 학원 A/B 양쪽 표시. [P0]
- **P1-PROD-4.2**: 학원 A 에서 학생 10명 생성 → 학원 B 로 switch → 학원 A 의 학생 0명 표시 (data isolation) → 학원 B 에서 학생 5명 생성 → 학원 A switch → 학원 A 학생 10명 그대로. [P0]
- **S-10.1 / S-10.2** — 기존 academy 전환 + 쿠키 저장

#### 묶음 5. Production build 특수성 (30분)

> **신규 시나리오 P1-PROD-5.1 ~ P1-PROD-5.5** (dev mode 와 다른 production-only)

- **P1-PROD-5.1**: `npm run test:release` 통과 (5 smoke + production build success). [P0]
- **P1-PROD-5.2**: production server :3100 에서 DevTools → Application 탭 → Service Workers → "activated and is running" 표시. [P0]
- **P1-PROD-5.3**: production server stop → 브라우저 새로고침 → SW cached page 또는 offline page (`/~offline` route) 표시 — 완전 blank 화면 X. [P1]
- **P1-PROD-5.4**: production server 의 `/robots.txt` + `/sitemap.xml` 노출 (Stage E 이후, rank 7 SEO 구현 후 활성). [P2 — Stage E 의존]
- **P1-PROD-5.5**: production server bundle 확인 — DevTools → Sources → `_next/static/chunks/` → 파일 list 에 `SUPABASE_SERVICE_ROLE_KEY` grep 0건 (RLS 보안). [P0]

#### 묶음 6. 학생/학부모 incognito view (40분)

> 기존 §21 시나리오 production server 환경 그대로 실행. share token + 6자리 access-code 가 production OAuth flow 와 충돌 없는지 검증.

- **S-21.1** — share-link 직접 접근
- **S-21.2** — 6자리 access-code 입력 + 인증
- **S-21.3** — 5회 실패 academy+IP lockout (1h)
- **S-21.4** — 만료된 code 처리
- **S-21.5** — student-scoped share (본인 자녀 세션만)

### 22.4 Pass / Fail 결정

| 결과 | 의미 | 다음 액션 |
|---|---|---|
| **All P0 Pass** (6 묶음 모두) | Phase 1 production release ready | Stage E — dev → main PR 작성 가능 |
| **P0 Fail 1건 이상** | release 차단 | fix → 신규 PR → dev 머지 → 본 UAT 재실행 |
| **P1/P2 Fail** | release 가능, GitHub Issue 등록 | Phase 1 → Phase 2 사이 fix |

### 22.5 결과 기록 + commit

```bash
# 사본에서 [ ] → [x]/[!]/[~] 기록 + 메모

# 완료 시
git add tests/manual/runs/<DATE>-<COMMIT>-phase1-prod.md
git commit -m "chore(uat): <DATE> phase1-prod release readiness run"
git push -u origin chore/uat-<DATE>-phase1-prod
gh pr create --base dev --title "chore(uat): <DATE> phase1-prod run"

# 모든 P0 Pass + PR 머지 시 Stage E 진입 가능
```

### 22.6 cleanup

```bash
# UAT 종료 시 production server 정리
lsof -ti:3100 | xargs kill 2>/dev/null

# 3 계정 academy/member/invite cleanup (user 보존)
npm run uat:teardown
```

---

## 23. 동시성 / Race (수동 검증)

> local-first localStorage SSOT + fire-and-forget sync 아키텍처에서 발생 가능한 동시성/race 경로 중 **사람이 손으로 재현 가능한 것**만 모았다 (멀티탭/오프라인 토글/더블클릭/폴링대기/세션이동). 타이밍·서버응답 강제가 필요한 race(FK 500, outbox 4xx/5xx 분기, POST→PUT 순서, DUPLICATE_DATE 409 raw, 쿠키 타이밍, reconcile 실패)는 자동 테스트(test branch)에서 처리하므로 본 카테고리에 포함하지 않는다.
>
> 공통 합격 기준: **(a) /api 500 0건, (b) outbox(`class_planner_<userId>_sync_outbox`) 무한 retry 누적 0, (c) 새로고침 후 상태 수렴**. 검증은 omni-radar(`radar-query --type client_fetch` / `--type exception`) + DevTools Application(localStorage) 으로 한다.

### S-23.1 멀티탭 동시 편집 — storage event 자동 반영 [P0]
**Pre:** 같은 계정 로그인 상태로 두 탭(또는 폰+PC) — 탭A `/students`, 탭B `/students` (각각 §22 와이프 공동 운영 시나리오 모사)
**Steps:**
1. 탭A 에서 학생 1명 추가
2. 탭B 를 새로고침 없이 관찰
3. 탭A 에서 과목/강사도 1개씩 추가, 탭B 의 `/subjects`·강사 목록 관찰
**Expected:**
- 탭B 목록이 **새로고침 없이** 즉시 반영 (다른 탭 = `storage` 이벤트 / 같은 탭 다른 페이지 = `classPlannerDataChanged` CustomEvent)
- 동명이인 추가 시 양 탭의 ⓘ hint(이름 옆 구분 표시) 상태 일치
- 중복 row 생성 0, 콘솔 에러 0
> 회귀 가드: same-tab `localStorage.setItem` 은 storage 이벤트가 안 뜨므로 CustomEvent dispatch 가 SSOT (feedback_race_window_patterns, 2026-05-27 사고). useStudentManagementLocal/useSubjectManagementLocal/useTeacherManagementLocal 의 dual-event 리스너 회귀 시 이 시나리오가 잡는다.

### S-23.2 멀티탭 동시 편집 중 드래그 정합성 [P1]
**Pre:** 같은 계정 두 탭에서 `/schedule` 열기, 세션 A/B 존재
**Steps:**
1. 탭1 에서 세션 A 를 drag 시작 (drop 전 hold)
2. 그 사이 탭2 에서 세션 B 를 다른 lane 으로 이동
3. 탭1 에서 A 를 drop
**Expected:**
- 탭1 drop 후에도 탭2 가 옮긴 B 변경이 사라지지 않음 (둘 다 보존)
- 새로고침 시 두 탭 동일 상태로 수렴
- 같은 시각·같은 lane stack 의 yPosition 중복 없음
> 알려진 위험: drag 시작~drop 사이 발생한 다른 탭 변경은 drag 중인 탭의 closure `sessions` snapshot 에 반영 안 됨 → 마지막 drop 이 stale 덮어쓰기 가능. 이 경우 실제 동작(어느 쪽이 살아남는지)을 그대로 기록하고, silent data loss 면 Fail 처리.

### S-23.3 연속 빠른 재드래그 (double-submit) 정합성 [P0]
**Pre:** 인증 모드, 세션 1개, DevTools Network throttle Slow 3G
**Steps:**
1. 세션을 11:00 으로 drag-drop
2. 서버 응답(PUT /position) 도착 전 같은 세션을 13:00 으로 다시 drag-drop
**Expected:**
- UI 는 항상 마지막 drop(13:00) 위치 표시
- PUT `/api/sessions/:id/position` 2건 발사, 최종 서버 yPosition/시간이 13:00 으로 수렴 (순서 역전돼도 최종 일치)
- 새로고침 후 13:00 유지, 세션 1개 (중복 0)
- 첫 호출이 404→ghost cleanup 으로 진행 중 세션을 지우지 않음
> radar `radar-query --type client_fetch --keyword position` 으로 PUT 순서/상태 확인. (POST→PUT 도착 순서를 인위적으로 강제하는 position-before-create 404 race 는 자동 테스트로 검증 — test branch.)

### S-23.4 수업 추가 / 인라인 생성 CTA 더블클릭 중복 방지 [P0]
**Pre:** 인증 모드, GroupSessionModal, DevTools 로 응답 1-2초 지연
**Steps:**
1. Step 1 에서 미등록 이름 입력 → `＋ '{이름}' 새 학생으로 추가` CTA 를 빠르게 2회 클릭
2. 과목/요일/시간 채우고 Step 3 "수업 추가" 버튼을 빠르게 2회 클릭
**Expected:**
- 첫 클릭 직후 CTA/버튼 disabled (in-flight flag: `studentCreating`/`teacherCreating`/`subjectCreating`, GroupSessionModal submit 가드)
- 학생 1명·세션 1개만 생성 (목록·시간표에 중복 0)
- POST `/api/students`·`/api/sessions` 각 1건만 발사, 500 응답 0건
- 인라인 과목/강사 CTA 도 동일하게 중복 생성 0
> 구현 권장: GroupSessionModal "수업 추가" 버튼에 submitting 가드가 없으면(현재 미확인) 추가 필요. (인라인 생성 직후 reconcile 전 같은 학생을 다시 선택해 stale temp id 가 POST 되는 reconcile race 는 자동 테스트로 검증 — test branch.)

### S-23.5 템플릿 적용 더블-서브밋 (in-flight 가드) [P1]
**Pre:** 인증 모드, 적용할 템플릿 1개, DevTools 로 응답 지연
**Steps:**
1. ApplyTemplateConfirm 에서 "기존 삭제하고 적용" 버튼을 빠르게 2회 클릭
2. (변형) SlotPickerModal 경유 적용 시 적용 버튼 연타
**Expected:**
- 두 번째 클릭 무시 — 버튼이 "적용 중..." disabled (`isApplyingTemplate`)
- 생성 세션 수 = 템플릿 세션 수 (중복 0, 이중 삭제 0)
- POST `/api/sessions` 호출이 N건만 (2N 아님)
> 적용은 기존 주 세션 전체 삭제 후 교체라 더블 트리거 시 데이터 손상 위험이 큼 — 가드(버튼 disabled) 회귀를 이 시나리오가 잡는다.

### S-23.6 템플릿 적용 직후 오프라인 reconcile [P1]
**Pre:** 인증 모드, `/schedule`, 적용할 템플릿 1개
**Steps:**
1. DevTools Network 를 Offline 으로 전환
2. 템플릿 적용 (local updateData 즉시 반영, 서버 sync 는 fire-and-forget 으로 대기)
3. Online 복귀 → `/schedule` 재진입(outbox flush 발동)
**Expected:**
- 오프라인 중에도 적용 N개 세션이 시간표에 즉시 표시 (local-first)
- Online 복귀 후 outbox flush 로 POST `/api/sessions` N건 발사 → 서버 GET 응답에 N개 모두 존재 (누락 0), enrollment 동반 생성
- ghost/중복 세션 0, 적용 직후 새로고침해도 세션 유실 0
> radar `radar-query --type client_fetch --keyword sessions` 로 복귀 후 POST N건 확인. (적용 직후 in-flight 상태에서 새로고침해 useGlobalDataInitialization 재실행과 겹치는 fire-and-forget 순서 race 는 자동 테스트로 검증 — test branch.)

### S-23.7 공유 페이지 실시간 갱신 + 변경 배너 + visibility 정지 [P2]
**Pre:** 시크릿 창에서 `/share/{token}` 열어둔 상태 + 원장(owner) 창
**Steps:**
1. 원장 창에서 세션 1개 시간 변경 후 저장
2. 공유 창을 ~60초 두거나, 탭을 백그라운드로 보냈다가 다시 활성화
**Expected:**
- 60초 폴링(`POLL_INTERVAL_MS=60_000`) 또는 탭 재활성화 시 시간표 silent 갱신
- 변경 발생 + 직전 열람 기록(lastViewedAt) 있으면 상단 ScheduleChangeBanner "시간표가 변경되었습니다" 표시 (`hasChanges && lastViewedAt!==null`)
- 탭 백그라운드 시 폴링 정지(`visibilitychange` → clearInterval), 다시 활성화 시 즉시 1회 fetch + 폴링 재개 (중복 인터벌 없음)
- 만료/잘못된 token 은 본 시나리오 대상 아님(E-9 참조)

### S-23.8 self-sync 배너 false-positive 억제 (본인 변경) [P1]
**Pre:** 인증 모드 `/schedule`. (E-10a) 단일 탭 / (E-10b) 같은 학원 다른 admin 시뮬용 두 탭
**Steps:**
1. (E-10a) 한 탭에서 수업 추가/이동 후 30초 폴링 대기(또는 폴링 강제)
2. (E-10b) 탭A 에서 변경 → 탭B(다른 user/admin) 에서 30초 내 관찰
**Expected:**
- E-10a: 본인 변경에 대해 "다른 관리자가 변경했습니다" banner 발화 **안 함** (self-sync 자동 ack — polling serverTs 가 `SELF_SYNC_STORAGE_KEY` ±`SELF_SYNC_WINDOW_MS`(10초) 안이면 lastViewed 자동 set)
- E-10b: 다른 탭/사용자 변경에는 본 탭에 banner **발화함**
- 본인 변경 직후 `class_planner_last_self_sync` localStorage 값이 갱신됨 (DevTools Application 확인)
> 핵심: 본인 변경을 30s polling 이 잡아 자기에게 잘못 banner 를 띄우는 false-positive 가 억제돼야 한다. same-tab(EventTarget) vs 다른 탭(storage 이벤트) 경로 모두 점검.

### S-23.9 충돌 모달 재진입 — 멀티탭 학원 전환 race [P1]
**Pre:** 멀티 academy 보유 사용자. 탭A 에서 DataConflictModal 발동된 상태(아직 server/local 미선택)
**Steps:**
1. 탭A 에 충돌 모달 표시 확인
2. 탭B 에서 다른 학원으로 전환 (`active_academy:{userId}` 변경 → storage 이벤트)
3. 탭A 를 관찰. (변형) 모달 떠 있는 채로 5-10초 대기해 MemberContext stale active_academy reconcile 의 자연 academy-changed 발화 유도
**Expected:**
- 탭A 모달이 **stale academy 데이터로 잘못 머지하지 않음** — academyVersion bump 재실행 시 conflictState 가 새 academy 기준으로 재계산되거나 모달이 닫힘
- 충돌 모달이 **중복으로 다시 뜨지 않음**, "사용자 데이터를 불러오는 중" 무한 spinner 진입 X (re-entrancy loop 가드)
- 한 번의 선택(server/local)으로 init gate 해제, localStorage 가 두 학원 데이터로 오염되지 않음
> radar 로 "academy 변화 감지" 로그 + 머지 대상 academyId 확인.

### S-23.10 알림 cross-tab 동기화 [P2]
**Pre:** 같은 사용자 두 탭에서 `/schedule`, S-17.1 mock 알림 주입(error+warning 2건)
**Steps:**
1. 탭A 종 아이콘 클릭 → 패널에서 에러 항목 read
2. 탭B 의 종 배지를 클릭 없이 관찰
3. 탭A 에서 "모두 읽음" 클릭
**Expected:**
- 탭B 배지 2→1 자동 갱신 (cross-tab StorageEvent — `notificationCenter.ts` subscribeNotifications storage listener)
- 탭B 패널이 열려 있었다면 해당 항목도 read 상태로 동기화
- 탭A "모두 읽음" 시 탭B 배지 사라짐
> same-tab 은 CustomEvent, cross-tab 은 StorageEvent (setItem 한 탭 자신에는 안 옴) — 경로가 달라 회귀 위험. 이 시나리오가 cross-tab listener 회귀를 잡는다.

### S-23.11 세션 이동 시 출결 함께 이동 + 중복 가드 [P1]
**Pre:** 인증 모드, 출결이 마킹·저장된 세션 1개 (occurrence date 기준)
**Steps:**
1. 그 세션을 다른 요일/주로 드래그 이동 (또는 편집 모달에서 요일 변경 후 저장)
2. 이동한 위치/날짜에서 출결 확인
3. (변형) 이동 대상 occurrence 날짜에 미리 출결을 만들어 둔 뒤 이동 시도
**Expected:**
- 기본: "출결 N건 함께 이동 (oldDate → newDate)" success toast, 새 occurrence 날짜에 출결 보존, 원래 날짜엔 출결 없음 (migrateAttendance, B move 정책 PR #550)
- 변형(대상 날짜에 이미 출결): "이미 출결 있음 — 이동 안 됨" warning toast(DUPLICATE_DATE) + **원본 출결 그대로 유지(데이터 손실 0)**
- migrate 는 fire-and-forget 이라 편집 모달은 즉시 닫힘(blocking 아님)
> 검증은 사람이 출결을 미리 만들어 둘 수 있어 수동 재현 가능. (서버 23505 unique violation 을 직접 강제해 raw 409 응답 분기를 보는 검증은 자동 테스트로 — test branch.)

### S-23.12 academy 전환 후 outbox flush — cross-academy 오반영 점검 [P2]
**Pre:** 멀티 academy 보유 사용자, academy A 선택 + DevTools Offline
**Steps:**
1. academy A 에서 세션 추가 (오프라인 → outbox 누적)
2. academy B 로 전환
3. Online 복귀 + `/schedule` 진입 (useOutboxFlush 발동)
**Expected:**
- A 에서 만든 변경이 **B academy 에 잘못 기록되지 않음** — 서버 `resolveAcademyId` 가 의도된 academy 로 해석
- 권한 오류(403) 또는 silent cross-academy 오염 0
- A 로 다시 전환 시 그 변경이 A 에 존재
> 현재 outbox 키는 academyId 무관 `class_planner_<userId>_sync_outbox` 단일 스코프 — entry URL 에 academyId 가 없다. 오반영이 관찰되면 outbox entry 에 academyId baking 또는 active academy 불일치 시 flush 보류로 보강 검토. 1인 테스트에선 드물지만 데이터 오염 가능 경로.

> **자동 테스트(test branch) 로 위임된 race** (수동 재현 부적합 — 타이밍/서버응답 강제 필요):
> - temp-id reconcile 실패 → stale id POST → FK 위반 500 → outbox 무한 retry (PR #385 회귀 가드)
> - outbox 4xx 영구실패 drop vs 5xx 보관 분기 (DevTools 로 400/422/500 강제)
> - §2~§4 optimistic local id → server id reconcile (추가 직후 reconcile 전 즉시 사용)
> - position-before-create 404 race + ghost-cleanup grace (POST→PUT 도착 순서 강제)
> - 다른 주 등록 직후 navigate + ghost-cleanup race (weekStartDate propagate)
> - useOutboxFlush 자동 flush + SyncQueueModal [모두 재시도] 동시 flush idempotency
> - member invite teacher double-link 409 / member route-guard 쿠키 타이밍 윈도우
> - 첫 로그인 마이그레이션 전체 실패 시 anonymous 키 보존 + 재시도 / 부분 실패 toast
> - 온보딩 투어 content-mismatch (role null / dbSync 전 자동 시작 가드, 1초 윈도우)

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
- 2026-05-12: **§17 알림 히스토리 + InfoTrigger fix 신설** (PR #372) — 7개 시나리오 (S-17.1~17.7), P0 3개 (배지 카운트 / 패널 open + 필터·그룹 / 항목 클릭 read). 영향: `lib/notificationCenter.ts` ring buffer + `useNotificationCenter` hook + `NotificationBell` (atom) + `NotificationItem` / `NotificationDropdown` (molecules) + `lib/toast.ts` capture 통합 + `Sidebar`/`TopBar` layout-level wire + `InfoTrigger` 동심원 2겹→1겹 fix. localStorage 키: `class_planner_${userId}_notification_history` (anon은 `anonymous`). 회귀 가드: 22 unit + 9 RTL. spec SSOT: [`docs/notification-history-spec.md`](../../docs/notification-history-spec.md) (14 AC). 총 P0: 33 → 36.
- 2026-05-12 (2): **§18 EditSessionModal 재설계 + V1 validation 신설** — 6개 시나리오, P0 3개 (학생 0명 저장 차단 / 요일 chip popover / 시간 chip popover). 영향: `EditSessionModal.tsx` 헤더 read-only 카드 → chip + popover (요일/시간), body weekday/time select 제거, footer V1-disabled validation + helper text, handleSave 학생 0명 가드. 기존 picker(`TeacherPillPicker`/`StudentChip`/colorPanel) 100% 보존. 회귀 가드: 45 RTL passed (10 기존 갱신 + 5 신규 validation). spec SSOT: [`docs/edit-session-modal-redesign-spec.md`](../../docs/edit-session-modal-redesign-spec.md) (14 AC). 총 P0: 36 → 39.
- 2026-05-13: **§18 S-18.9 추가 + S-18.8 V3 month calendar** (PR #375/#378) — `EditSessionModal` 다른 주 날짜 이동 (weekday → weekStartDate + weekday paradigm, memory `feedback_no_paradigm_assumption`) + 헤더 chip "X월 Y일 (요일)" + V3 month calendar popover. 시간표 자동 navigate 검증. 총 P0: 39 → 41.
- 2026-05-19: **§5/§6 누적 dev 변경 동기화** — S-5.24 (수업 추가 모달 V3 chip+popover, PR #396, P0), S-5.25 (row-level overflow expand +N/− chip, PR #392/#399, P0), S-6.11 (Lane insert edge hover slot, PR #388, P1), S-6.12 (드래그 3 시각 피드백 SSOT 통일, PR #389/#390, P1) 추가. §5 P0 10→12 / 21→25, §6 P0 2 / 10→12. 총 P0: 41 → 43. 영향: GroupSessionModal V3 패턴(EditSessionModal V3 미러), `sessionClusters.ts`, `lib/laneInsert.ts`, `useDragController` mode-aware lane-highlight, `LaneInsertSlot` molecule.
- 2026-05-20: **§1 S-1.5 갱신 + S-1.5b 신설** (ADR-019 first-user owner-enforcement + academy singularity 1+1). 영향: `/onboarding/page.tsx` 역할 라디오 3개 제거 (owner/admin/member → owner 자동), amber Crown 안내 박스 추가, "원장으로 학원 만들기" CTA, "초대 받았어요" secondary link → `/invite/[token]` redirect. `/api/onboarding` body.role 무시 + hardcoded owner. Sidebar "+ 새 학원 만들기" tooltip "본인 학원 1개 제한 (ADR-019)". 정책 영구화: owner 1개 + invited 1개 = 최대 2학원, 학원 추가 기능 deferred. 총 §1 P0 2 / 6→7 (S-1.5b 신설).
- 2026-05-12 (3): **§18 보강 — body 순서 fix + V3 month calendar + 날짜 chip label** (사용자 발견: PR #376 후 mockup ↔ 적용 갭). body 순서를 mockup C variant(과목 → 강사 → 학생)로 재정렬 (PR #376 누락 fix). 헤더 weekday chip의 7-grid popover → V3 1달 캘린더(이전/다음 달 navigation + 선택 날짜 amber + 오늘 ring). chip label `목` → `5월 15일 (목)` 형식(`weekStartDate` prop 추가, schedule page에서 `currentWeekStart` 전달). schedule paradigm 보존 — 다른 달 날짜 선택해도 weekday만 추출. S-18.7/18.8 추가, AC-15~19 추가. P0: 39 → 40 (S-18.8 P0). 회귀 가드 45 RTL pass.
- 2026-05-12 (4): **§18 보강 — 다른 주 날짜로 세션 이동 + 시간표 자동 navigate** (사용자 발견: paradigm 재해석). 잘못된 paradigm 가정 fix — schedule은 "매주 반복"이 아니라 **"특정 주(weekStartDate) + 요일(weekday) 조합"**. 데이터 모델(`planner.ts`)이 이미 둘 다 보존. 변경: API/Service/Repo chain 모두 `weekStartDate` forward + EditSessionModal `selectedWeekStart` state + onSave `(weekday, weekStartDate?)` 시그니처 + schedule page `setSelectedDate` navigate. footer 안내 "주간 반복" → "그 날짜로 이동". S-18.9(P0) 추가, AC-20~22 추가. P0: 40 → 41. 회귀 가드 236 tests pass.
- 2026-05-24: **§22 Phase 1 Production Readiness Mode 신설** (Stage C of `/design-explorations/phase1-release-readiness`). 친구 학원 운영자 선공개 = production main 머지 직전 1회 실행. 240분, 6 묶음: Phase 1 코어 13 owner (60분, §1~§18 link) / 권한 admin·member (40분, P1-PROD-2.1~2.3 신규) / 데이터 복구 UI (40분, P1-PROD-3.1~3.3 신규 — DataHistorySection production 검증) / Multi-academy switch+isolation (30분, P1-PROD-4.1~4.2 신규, PR #462 무제한) / Production build 특수성 (30분, P1-PROD-5.1~5.5 신규 — SW 활성, RLS bundle 검증) / 학생·학부모 incognito (40분, §21 link). 사전 준비: `npm run test:release` 통과 의무. `scripts/uat-new.sh phase1-prod` 모드 지원 + §2 모드 표에 신규 mode 추가. dev :3000 와 분리된 production server :3100 사용. P0: 50 → 50 + 신규 9 (P1-PROD-2.1~5.5 중 P0 8 + P1 1). 결과: `runs/<DATE>-<COMMIT>-phase1-prod.md` commit.
- 2026-05-20 (2): **다중 역할 UAT 모델 도입 (3 계정) + 시나리오 전면 재구성** (사용자 발화 — "원장 계정 teardown 처럼 다른 계정들도 같이 초기화, 몇 개 계정 필요한지, 자연스러운 흐름 시나리오, 정책확인 표기 제거"):
  - **3 계정 모델**: `UAT_TEST_OWNER_*` / `UAT_TEST_ADMIN_*` / `UAT_TEST_MEMBER_*`. legacy `UAT_TEST_USER_*` → owner alias (deprecated 1주일 후 제거). 학생/학부모 = 계정 X, incognito + share-token / 6자리 access-code 검증.
  - **scripts 갱신**: `uat-cleanup-helper.ts` — `invites` → `invite_tokens` fix, `attendance` + `data_snapshots` 테이블 cleanup 추가, `cleanupMultipleUatUsers` batch helper 신설. `setup-uat-test-user.ts` 3 계정 멱등 생성. `uat-teardown.ts` `--user owner|admin|member|all` flag (default all). `uat-invite-seed.ts` 신규 — admin/member 자동 초대 + 수락 fast-path (UI 흐름 자체 검증은 §19/§20 직접 의무). `package.json` `uat:invite` 등록.
  - **Phase 모델 7 → 10 phases**: P1 익명 → P2 owner 전환 (충돌) → P3 owner 권한 → P4 admin (§19) → P5 member=강사 (§20) → P6 학생/학부모 incognito (§21) → P7 모바일 → P8 OAuth → P9 오프라인 → P10 Edge.
  - **신규 §19 관리자 권한** (S-19.1~19.7, P0 3): invite 발급 + 4-state 수락 (b 일치 / c 불일치 / a 만료 / d 사용됨) + admin CUD + owner 강등 차단 + member 추가/강등/삭제.
  - **신규 §20 멤버=강사 RBAC** (S-20.1~20.8, P0 4): invite + teacher_id 필수 (033 migration CHECK) + teacher.user_id link + middleware route guard + canManage=false UI 일괄 (FAB 미렌더, "+ 새 강사" pill 미렌더 등) + /teacher-schedule 본인 강사 세션만 + public_description 본인 강사 한정 + AttendanceSheet read-only + 데이터 이력 미렌더.
  - **신규 §21 학생/학부모 view** (S-21.1~21.5, P0 2): incognito share-link 직접 접근 + 6자리 access-code 입력 + 5회 실패 academy+IP lockout (1h) + 만료된 코드 + student-scoped share (본인 자녀 세션만).
  - **§10 다중 Academy 권한 분리**: S-10.3~10.7 → §19/§20 으로 이동 (역할별 Phase 와 자연 결합). §10 은 Academy 전환 / 쿠키 저장 2개로 축소.
  - **정책확인 4건 명시화** (사용자 요청 "어떻게 동작하는게 맞는건지 정확하게 기재"): S-3.4 과목 cascade 삭제 (deferred-commit + enrollment/session 동시 정리), S-4.6 teacher-subject 그룹화 (필터링 아님 — 두 그룹 정렬), S-6.6 드래그 충돌 (lane 자동 분할, modal 없음), S-15.3 "전체 출석" 일괄 덮어쓰기 (확인 모달 X, 기존 status 모두 present 로 upsert). 각 시나리오에 "의도" + "실제 동작 (소스 참조)" 두 줄 형식.
  - **총 P0**: 41 → 50 (§19 +3, §20 +4, §21 +2, §10 −0 — S-10.3~10.7 이동만이라 카운트 무관).
  - **회귀 가드**: scripts/ 11개 파일 type-check pass. cleanup helper invites→invite_tokens fix 가 잠재 사고 차단.
- 2026-05-29: **§20 멤버=강사 시나리오 갱신 — /teacher-schedule → /schedule role-branch 통합 + 출결 writable + 세션 메타 PUT 전면 차단** (PR #571, attendance-ux-redesign Phase A). 위 2026-05-20 (2) 의 §20 기재는 도입 시점 스냅샷으로 보존하고, 현재 동작 기준으로 다음을 갱신:
  - **진입 통합**: `/teacher-schedule` 페이지 삭제 → member 는 `/schedule` role-branch(`isMemberView` — 본인 강사 세션만 `teacherId===linkedTeacherId` 필터, canManage=false read-only) 사용. middleware redirect 대상 `/teacher-schedule` → `/schedule`(차단된 admin-only 접근은 `/schedule?toast=permission_denied`). 출결 전용 nav 도 전체 제거 — 출결은 시간표 블록 클릭 진입.
  - **출결 writable**: member 가 본인 수업 출결을 **마킹 가능**(블록 클릭 → attendanceOnly EditSessionModal, `POST /api/attendance` + `assertAttendancePermission` 본인 teacher 수업만). 이전 "AttendanceSheet read-only" 폐기 → **S-20.7 재작성**. occurrence date key = `instanceDateFromWeekStart`.
  - **세션 메타 PUT 전면 403**: `/api/sessions/[id]` PUT/PATCH 가 owner/admin only(`requireRole`, route.ts:120-126) → member 는 public_description 포함 어떤 메타 필드도 403. 이전 "public_description 본인 강사 한정" 폐기(subject/time/teacher 재배정 우회 gap 마감) → **S-20.6 재작성**.
  - **갱신 위치**: §0 Phase 5 진입(진입 route + 시나리오 묶음), 계정 표, uat:invite 안내, S-20.2/20.3 redirect 대상, S-20.4 모달/사이드바 문구, S-20.5 view route + 권한, S-20.6/S-20.7 재작성. P0/P1 designation·총 P0 카운트 무변(재작성만).
