# Git 브랜칭 전략 + CI/CD 정비 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** main→dev→feature 브랜치 모델 도입, 로컬 미push 작업 정리, 세션 중단 감지 자동화

**Architecture:** dev 브랜치를 통합/검증 계층으로 추가. CI는 main+dev 양쪽 push에서 실행, deploy는 main-only 유지. 작업 브랜치 잔존 여부로 세션 중단을 감지.

**Tech Stack:** GitHub Actions, bash, git

---

## File Structure

| 파일 | 액션 | 설명 |
|------|------|------|
| `.github/workflows/ci.yml` | 수정 | push branches에 `dev` 추가 |
| `scripts/check-stale-branches.sh` | 신규 | 미merge 브랜치 감지 스크립트 |
| `docs/VERSION_MANAGEMENT.md` | 수정 | develop→dev, CI/CD 연동 반영 |
| `CLAUDE.md` | 수정 | 브랜치 규칙, 세션 완료 체크리스트 |
| `docs/DEVELOPMENT_WORKFLOW.md` | 수정 | 브랜치 워크플로우 섹션 추가 |
| `tree.txt` | 수정 | scripts/ 하위에 check-stale-branches.sh 추가 |

---

## Part A: 로컬 작업 정리 (git 운영)

### Task 1: main 미push 커밋 push + dev 브랜치 생성

**Files:** 없음 (git 운영만)

- [ ] **Step 1: main 미push 커밋 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git log --oneline origin/main..main
```

Expected: 7개 커밋 나열 (S4 온보딩 ~ branching strategy spec)

- [ ] **Step 2: main push**

```bash
git push origin main
```

Expected: 성공. GitHub에서 CI 자동 실행 시작 (check→build→e2e).
CI 성공 후 deploy.yml이 자동 실행되어 Lightsail에 배포됨.

- [ ] **Step 3: dev 브랜치 생성 및 push**

```bash
git branch dev main
git push -u origin dev
```

Expected: `dev` 브랜치가 리모트에 생성됨. main과 동일한 커밋을 가리킴.

- [ ] **Step 4: 확인**

```bash
git branch -a | grep -E "(main|dev)"
```

Expected:
```
* main
  dev
  remotes/origin/dev
  remotes/origin/main
```

---

### Task 2: phase2b/code-quality → dev PR 생성

**Files:** 없음 (git 운영만)

- [ ] **Step 1: phase2b 브랜치를 리모트에 push**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner/.worktrees/phase2b-code-quality
git push -u origin phase2b/code-quality
```

Expected: 14개 커밋이 리모트에 push됨.

- [ ] **Step 2: dev를 base로 PR 생성**

```bash
gh pr create --base dev --title "refactor: Phase 2B 코드 품질 개선" --body "$(cat <<'EOF'
## Summary
- 인프라 단순화: DIContainer/RepositoryInitializer/RepositoryFactory 삭제, RepositoryRegistry에 singleton 로직 흡수 (~400줄 제거)
- Dead code 정리: AuthContext/E2ETestAuthGuard 삭제, `as any` 15→0개, LoginButton atoms→organisms 이동
- 거대 파일 분할: AboutPageLayout 1607→133줄 (HeroSection/FeatureCard/FeatureDetail 추출)
- schedule/page.tsx 데드 코드 삭제 (~370줄 repositionSessions callback 제거)
- pdf-utils.ts 중복 함수 제거 (timeToMinutes/minutesToTime → planner.ts에서 import)

## Test plan
- [x] `npm run check:quick` — 1100 tests passed, 0 failures
- [ ] CI check job (type-check + lint + unit test)
- [ ] CI build job (production build)
- [ ] CI e2e job (Playwright Chromium)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR 생성됨. CI 자동 실행.

- [ ] **Step 3: CI 통과 확인 후 머지**

GitHub에서 CI 3개 job 모두 통과 확인 후 머지 (Merge commit, --no-ff).

```bash
# CI 상태 확인
gh pr checks <PR_NUMBER>

# 머지 (CI 통과 후)
gh pr merge <PR_NUMBER> --merge
```

---

### Task 3: dev → main PR 생성 + 배포

**Files:** 없음 (git 운영만)

- [ ] **Step 1: dev→main PR 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
gh pr create --base main --head dev --title "release: Phase 2B 코드 품질 개선 반영" --body "$(cat <<'EOF'
## Summary
- dev 브랜치에서 검증 완료된 Phase 2B 코드 품질 개선 사항을 main에 반영
- 인프라 단순화, dead code 정리, 거대 파일 분할 포함
- dev에서 CI 전체 통과 확인 완료

## Test plan
- [x] dev 브랜치 CI 통과
- [ ] main PR CI 통과
- [ ] 머지 후 자동 배포 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: CI 통과 후 머지**

```bash
gh pr checks <PR_NUMBER>
gh pr merge <PR_NUMBER> --merge
```

Expected: 머지 후 CI on main → deploy.yml 자동 실행 → Lightsail 배포.

- [ ] **Step 3: 로컬 동기화**

```bash
git checkout main
git pull origin main
git checkout dev
git pull origin dev
```

---

### Task 4: 로컬 정리

**Files:** 없음 (git 운영만)

- [ ] **Step 1: worktree 제거**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git worktree remove .worktrees/phase2b-code-quality
```

- [ ] **Step 2: 머지 완료된 로컬 브랜치 삭제**

```bash
git branch -d phase2b/code-quality
```

Expected: `Deleted branch phase2b/code-quality`

- [ ] **Step 3: stale worktree 디렉토리 삭제**

```bash
rm -rf .worktrees/phase2a-1
```

- [ ] **Step 4: 오래된 stash 확인 및 정리**

```bash
# 먼저 내용 확인
git stash list
# 모든 stash가 오래된 브랜치의 WIP이므로 정리
git stash clear
```

- [ ] **Step 5: 리모트 머지 완료 브랜치 삭제**

```bash
# 먼저 머지 완료된 브랜치 확인
git branch -r --merged main | grep -v "main\|dev\|HEAD"

# 확인 후 삭제 (각 브랜치에 대해)
# 예: git push origin --delete feature/old-branch
```

주의: 각 브랜치가 정말 불필요한지 확인 후 삭제. 하나씩 진행.

- [ ] **Step 6: 확인**

```bash
# 로컬 브랜치는 main, dev만 남아야 함
git branch
# Expected:
#   dev
# * main

# worktree는 메인만 남아야 함
git worktree list
# Expected: 1개만 출력
```

---

## Part B: 브랜칭 전략 인프라 (feature 브랜치 작업)

> Part A 완료 후 진행. 이 작업 자체가 새로운 브랜치 모델의 첫 번째 실전 테스트.

### Task 5: feature 브랜치 생성 + ci.yml 수정

**Files:**
- Modify: `.github/workflows/ci.yml:5-6`

- [ ] **Step 1: feature 브랜치 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev
git pull origin dev
git checkout -b feature/branching-strategy
```

- [ ] **Step 2: ci.yml 수정**

`.github/workflows/ci.yml` 파일의 line 5-6:

Before:
```yaml
  push:
    branches: [main]
```

After:
```yaml
  push:
    branches: [main, dev]
```

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add dev branch to push trigger for CI pipeline"
```

---

### Task 6: check-stale-branches.sh 스크립트 생성

**Files:**
- Create: `scripts/check-stale-branches.sh`

- [ ] **Step 1: 스크립트 생성**

`scripts/check-stale-branches.sh`:

```bash
#!/bin/bash
# check-stale-branches.sh — 미완료 작업 브랜치 감지
# dev에 머지되지 않은 로컬 브랜치를 찾아 경고
# 용도: 세션 시작 시 이전 세션 중단 여부 확인

DEV="dev"

# dev 브랜치가 없으면 종료 (아직 dev 브랜치 미생성 상태)
if ! git rev-parse --verify "$DEV" >/dev/null 2>&1; then
  exit 0
fi

stale=$(git branch --no-merged "$DEV" 2>/dev/null \
  | grep -v "^\*" \
  | grep -vE "^\s*(main|dev)$" \
  | sed 's/^[ *]*//')

if [ -n "$stale" ]; then
  echo "⚠️  미완료 작업 브랜치 발견 (이전 세션 중단 가능):"
  echo ""
  while IFS= read -r branch; do
    last_commit=$(git log -1 --format="%h %ar: %s" "$branch" 2>/dev/null)
    echo "  $branch"
    echo "    └─ $last_commit"
  done <<< "$stale"
  echo ""
  echo "이 브랜치들은 dev에 머지되지 않았습니다."
  echo "중단된 작업이라면 해당 브랜치에서 작업을 이어가세요."
fi
```

- [ ] **Step 2: 실행 권한 부여**

```bash
chmod +x scripts/check-stale-branches.sh
```

- [ ] **Step 3: 동작 확인**

```bash
# 현재 feature/branching-strategy 브랜치가 dev에 미머지 상태이므로 감지되어야 함
bash scripts/check-stale-branches.sh
```

Expected:
```
⚠️  미완료 작업 브랜치 발견 (이전 세션 중단 가능):

  feature/branching-strategy
    └─ <hash> <time>: ci: add dev branch to push trigger for CI pipeline

이 브랜치들은 dev에 머지되지 않았습니다.
중단된 작업이라면 해당 브랜치에서 작업을 이어가세요.
```

- [ ] **Step 4: 커밋**

```bash
git add scripts/check-stale-branches.sh
git commit -m "feat: add stale branch detection script for session interruption awareness"
```

---

### Task 7: CLAUDE.md 업데이트 — 브랜치 규칙 + 세션 완료 체크리스트

**Files:**
- Modify: `CLAUDE.md:46-49` (코딩 규칙 섹션)
- Modify: `CLAUDE.md:60-72` (개발 워크플로우 섹션)

- [ ] **Step 1: 코딩 규칙 섹션에 브랜치 규칙 추가**

`CLAUDE.md`의 `## 코딩 규칙` 섹션 (line 46-49). 기존 내용 뒤에 브랜치 규칙 추가:

Before (line 46-49):
```markdown
## 코딩 규칙
- TypeScript strict mode 준수
- 모든 스타일은 Tailwind CSS 클래스 사용 (인라인 스타일 금지)
- 수정된 코드에 대한 테스트 작성/업데이트 필수
- Clean Architecture 계층 분리 위반 금지
- Merge commit 필수 (`git merge --no-ff`)
```

After:
```markdown
## 코딩 규칙
- TypeScript strict mode 준수
- 모든 스타일은 Tailwind CSS 클래스 사용 (인라인 스타일 금지)
- 수정된 코드에 대한 테스트 작성/업데이트 필수
- Clean Architecture 계층 분리 위반 금지
- Merge commit 필수 (`git merge --no-ff`)

### 브랜치 규칙 (Non-negotiable)
- `main`/`dev` 직접 push/commit 금지
- 모든 작업은 `dev`에서 분기한 작업 브랜치에서 진행
- 작업 브랜치 → `dev` PR → CI 통과 → 머지
- `dev` → `main` PR → CI 통과 → 머지 → 자동 배포
- hotfix 예외: `main`에서 분기 → `main` + `dev` 양쪽에 PR
- 상세: `docs/VERSION_MANAGEMENT.md`
```

- [ ] **Step 2: 개발 워크플로우 섹션 갱신**

`CLAUDE.md`의 `## 개발 워크플로우` 섹션 (line 60-72). 기존 내용을 교체:

Before:
```markdown
## 개발 워크플로우
\```bash
# 작업 중 빠른 피드백 (tsc + unit, 수십 초)
npm run check:quick

# 커밋/푸시 전 1회 (tsc + unit + build, 1분 내외)
npm run check

# PR 올리면 GitHub Actions (ci.yml) 가 자동으로 검증
# — check job: type-check + lint + unit test
# — build job: production build
# — e2e job:  Playwright Chromium golden path
\```
```

After:
```markdown
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
```

### CI/CD (GitHub Actions)
- **ci.yml**: PR 생성 또는 main/dev push 시 자동 실행
  - check job: type-check + lint + unit test
  - build job: production build
  - e2e job: Playwright Chromium golden path
- **deploy.yml**: main CI 성공 시 자동 배포 (ghcr.io → Lightsail)

### 세션 완료 체크리스트
- [ ] `npm run check:quick` 통과
- [ ] 작업 브랜치 → dev PR 생성 (CI 통과 확인)
- [ ] 로컬 작업 브랜치 삭제 (`git branch -d <branch>`)
- [ ] worktree 사용 시 제거 (`git worktree remove <path>`)
- [ ] 로컬에 main, dev 외 브랜치 없음 확인

### 세션 중단 감지
로컬에 남아있는 작업 브랜치 = 이전 세션에서 중단된 작업.
`scripts/check-stale-branches.sh`로 확인 가능.
```

- [ ] **Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add branch rules and session completion checklist"
```

---

### Task 8: docs/VERSION_MANAGEMENT.md 갱신

**Files:**
- Modify: `docs/VERSION_MANAGEMENT.md` (전체 재작성)

- [ ] **Step 1: VERSION_MANAGEMENT.md 갱신**

기존 문서의 `develop`을 `dev`로 변경하고, CI/CD 연동 정보를 추가. 전체 문서를 아래 내용으로 교체:

```markdown
# 버전 관리 전략 (Version Management Strategy)

## 개요

Class Planner 프로젝트의 Git 브랜칭 전략과 CI/CD 연동을 정의한다.
**main → dev → feature** 모델을 채택하여 2단계 검증 후 프로덕션 배포.

## 브랜치 모델

```
main (프로덕션 — Lightsail 자동 배포)
  ↑ PR only (CI 통과 필수, --no-ff merge)
dev (통합/검증 — CI 실행, 배포 없음)
  ↑ PR only (CI 통과 필수, --no-ff merge)
feature/xxx, fix/xxx, phaseN/xxx (작업 브랜치)
```

### main 브랜치
- 프로덕션 코드. 항상 배포 가능한 상태.
- dev→main PR만 허용. 직접 push 금지.
- push 시 CI 실행 → 성공 시 deploy.yml 자동 배포.

### dev 브랜치
- 통합/검증 브랜치. 다음 릴리스 준비.
- 작업 브랜치→dev PR만 허용. 직접 push 금지.
- push 시 CI 실행 (배포 없음).

### 작업 브랜치
- 항상 dev에서 분기. dev로 PR.
- 명명: `feature/기능명`, `fix/버그명`, `phaseN/설명`
- 세션 완료 시 PR 생성 + 로컬 브랜치 삭제.

### hotfix 브랜치
- 예외적으로 main에서 분기.
- main + dev 양쪽에 PR.
- 명명: `hotfix/긴급수정내용`

## CI/CD 연동

### ci.yml (검증)
- **트리거**: PR 생성 / main·dev push
- **파이프라인**: type-check → lint → unit test → production build → E2E test

### deploy.yml (배포)
- **트리거**: main CI 성공 시 자동 실행
- **동작**: Docker image build → ghcr.io push → Lightsail SSH deploy → health check

### 플로우

```
feature → PR to dev → CI(PR) → 머지 → CI(dev push)
                                          ↓
                              dev → PR to main → CI(PR) → 머지
                                                           ↓
                                                    CI(main push) → deploy
```

## 버전 번호 (Semantic Versioning)

형식: `MAJOR.MINOR.PATCH` (예: v1.0.1)

| 구분 | 변경 조건 | 예시 |
|------|----------|------|
| MAJOR | 호환성 깨지는 큰 변경 | v1.1.5 → v2.0.0 |
| MINOR | 호환되는 기능 추가 | v1.0.1 → v1.1.0 |
| PATCH | 버그 수정 | v1.0.0 → v1.0.1 |

## 세션 중단 감지

정상 완료된 세션은 항상 PR 생성 + 로컬 브랜치 삭제.
**로컬에 남아있는 작업 브랜치 = 중단된 세션.**

```bash
# 미완료 브랜치 확인
bash scripts/check-stale-branches.sh
```

## 릴리스 체크리스트

### 작업 완료 시
- [ ] 작업 브랜치 → dev PR 생성
- [ ] CI 통과 확인
- [ ] dev로 머지
- [ ] 로컬 작업 브랜치 삭제

### 배포 시
- [ ] dev → main PR 생성
- [ ] CI 통과 확인
- [ ] main으로 머지 (자동 배포)
- [ ] 배포 성공 확인

---

**마지막 업데이트**: 2026-04-12
```

- [ ] **Step 2: 커밋**

```bash
git add docs/VERSION_MANAGEMENT.md
git commit -m "docs: rewrite VERSION_MANAGEMENT.md for main→dev→feature model"
```

---

### Task 9: docs/DEVELOPMENT_WORKFLOW.md 갱신

**Files:**
- Modify: `docs/DEVELOPMENT_WORKFLOW.md:33-39`

- [ ] **Step 1: 배포 섹션을 브랜치 워크플로우로 교체**

`docs/DEVELOPMENT_WORKFLOW.md`의 `### 4. 배포` 섹션 (line 33-39)을 교체:

Before:
```markdown
### 4. 배포

\```bash
✅ 커밋 및 푸시
✅ GitHub Pages 배포
\```
```

After:
```markdown
### 4. PR 및 배포

```bash
# 작업 브랜치 → dev PR 생성
git push -u origin feature/xxx
gh pr create --base dev --title "feat: ..." --body "..."

# CI 통과 후 머지 (GitHub에서)
# dev → main PR은 릴리스 준비 시 생성

✅ 작업 브랜치 → dev PR 생성
✅ CI 통과 확인
✅ 머지 후 로컬 브랜치 삭제
```

> 브랜치 전략 상세: `docs/VERSION_MANAGEMENT.md`
```

- [ ] **Step 2: 커밋**

```bash
git add docs/DEVELOPMENT_WORKFLOW.md
git commit -m "docs: update DEVELOPMENT_WORKFLOW.md with branch workflow"
```

---

### Task 10: tree.txt 업데이트 + 최종 검증

**Files:**
- Modify: `tree.txt`

- [ ] **Step 1: tree.txt에 check-stale-branches.sh 추가**

`tree.txt`의 `scripts/` 섹션에 추가:

Before:
```
├── scripts/
│   ├── clear-localstorage.js
│   ├── detailed-unused-analysis.sh
```

After:
```
├── scripts/
│   ├── check-stale-branches.sh        # (신규) 미완료 브랜치 감지
│   ├── clear-localstorage.js
│   ├── detailed-unused-analysis.sh
```

- [ ] **Step 2: 커밋**

```bash
git add tree.txt
git commit -m "docs(tree): add check-stale-branches.sh"
```

- [ ] **Step 3: 전체 검증**

```bash
npm run check:quick
```

Expected: 1100+ tests passed, 0 failures.

---

### Task 11: feature → dev → main PR 생성

**Files:** 없음 (git 운영만)

- [ ] **Step 1: feature 브랜치 push + dev PR 생성**

```bash
git push -u origin feature/branching-strategy
gh pr create --base dev --title "feat: add branching strategy infrastructure" --body "$(cat <<'EOF'
## Summary
- ci.yml: dev 브랜치 push 트리거 추가
- scripts/check-stale-branches.sh: 미완료 브랜치 감지 스크립트
- CLAUDE.md: 브랜치 규칙 + 세션 완료 체크리스트 추가
- VERSION_MANAGEMENT.md: main→dev→feature 모델로 전면 재작성
- DEVELOPMENT_WORKFLOW.md: 브랜치 워크플로우 반영

## Test plan
- [ ] CI 통과 (type-check + lint + unit test + build + e2e)
- [ ] `bash scripts/check-stale-branches.sh` 동작 확인
- [ ] dev push 시 CI 트리거 확인 (ci.yml 변경 반영 후)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: CI 통과 후 dev로 머지**

```bash
gh pr checks <PR_NUMBER>
gh pr merge <PR_NUMBER> --merge
```

- [ ] **Step 3: dev → main PR 생성 + 머지**

```bash
gh pr create --base main --head dev --title "release: 브랜칭 전략 인프라 도입" --body "$(cat <<'EOF'
## Summary
- main→dev→feature 브랜치 모델 CI/CD 인프라 도입
- dev push 시 CI 실행, main-only 배포 유지
- 세션 중단 감지 스크립트 + 문서 갱신

## Test plan
- [x] dev 브랜치 CI 통과
- [ ] main PR CI 통과
- [ ] 머지 후 자동 배포 확인

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"

# CI 통과 후 머지
gh pr checks <PR_NUMBER>
gh pr merge <PR_NUMBER> --merge
```

- [ ] **Step 4: 로컬 정리**

```bash
# 로컬 동기화
git checkout main && git pull origin main
git checkout dev && git pull origin dev
git checkout main

# 작업 브랜치 삭제
git branch -d feature/branching-strategy

# 확인: main, dev만 남아야 함
git branch
```

Expected:
```
  dev
* main
```

---

### Task 12: (수동) Claude Code hook 등록

이 작업은 사용자 설정 파일 수정이므로 수동으로 진행.

- [ ] **Step 1: Claude Code 프로젝트 설정에 SessionStart hook 추가**

`/Users/leo/.claude/projects/-Users-leo-lee-file-entrepreneur-project-dev-pack/settings.json`에 추가:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "command": "cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner && bash scripts/check-stale-branches.sh 2>/dev/null || true"
      }
    ]
  }
}
```

주의: 기존 hooks가 있으면 SessionStart 배열에 추가.

---

## 검증

```bash
# 1. 브랜치 상태 확인
git branch          # main, dev만 존재
git branch -r       # origin/main, origin/dev 존재, stale 브랜치 정리됨

# 2. CI 트리거 확인
# dev에 push 시 CI 실행되는지 GitHub Actions 탭에서 확인

# 3. stale branch 감지 확인
git checkout -b test/stale-check dev  # 임시 브랜치
bash scripts/check-stale-branches.sh  # 경고 출력 확인
git checkout dev
git branch -D test/stale-check        # 정리

# 4. 문서 일관성
# CLAUDE.md, VERSION_MANAGEMENT.md, DEVELOPMENT_WORKFLOW.md의
# 브랜치 모델 설명이 일치하는지 확인
```
