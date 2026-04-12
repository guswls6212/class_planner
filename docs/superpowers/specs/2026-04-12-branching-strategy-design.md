# Git 브랜칭 전략 + CI/CD 정비 설계

**Date:** 2026-04-12  
**Scope:** class-planner  
**Approach:** main → dev → feature 브랜치 모델 도입 + 세션 중단 감지 자동화

---

## Context

Phase 2A/2B 작업이 모두 로컬에서만 진행되어 프로덕션 반영이 안 된 상태.
main에 6개 커밋이 미push, phase2b/code-quality에 14개 커밋이 리모트 브랜치 없이 존재.
현재 CI/CD는 main-only 트리거로, 작업 브랜치에서 main으로 직접 머지하면 검증 없이 프로덕션에 배포될 위험이 있다.

### 해결 목표
1. **안전한 배포 경로**: 작업→dev→main 2단계 검증 후 프로덕션 배포
2. **세션 중단 감지**: 로컬 브랜치 존재 = 미완료 작업 신호
3. **로컬 작업 정리**: 모든 미push 작업을 PR 경로로 프로덕션에 반영
4. **문서화**: 맥락 유지를 위한 워크플로우 문서 갱신

---

## 1. 브랜치 모델

```
main (프로덕션 — Lightsail 자동 배포)
  ↑ PR only (CI 통과 필수, --no-ff merge)
dev (통합/검증 — CI 실행, 배포 없음)
  ↑ PR only (CI 통과 필수, --no-ff merge)
feature/xxx, phaseN/xxx, fix/xxx (작업 브랜치)
```

### 규칙
- `main`에 직접 push/commit 금지 — dev→main PR만 허용
- `dev`에 직접 push/commit 금지 — 작업 브랜치→dev PR만 허용
- 작업 브랜치는 항상 `dev`에서 분기
- 정상 완료된 세션: PR 생성 + 로컬 브랜치 삭제 + worktree 제거
- **로컬에 남아있는 작업 브랜치 = 중단된 세션** (이것이 감지 메커니즘)
- hotfix 예외: main에서 직접 분기 → main + dev 양쪽에 PR

---

## 2. CI/CD 변경

### ci.yml 변경

```yaml
# Before
on:
  push:
    branches: [main]
  pull_request:

# After
on:
  push:
    branches: [main, dev]
  pull_request:
```

- dev에 머지(push) 시에도 CI 전체 파이프라인(check→build→e2e) 실행
- PR은 기존과 동일 (모든 PR에 CI 실행)

### deploy.yml 변경 없음

- deploy는 main-only 유지 (`workflow_run` on CI success on main)
- dev 브랜치에서는 CI 통과 확인만, 배포 없음
- 별도 스테이징 서버 불필요 (사용자 1명 규모)

### 결과 플로우

```
feature → PR to dev → CI 실행(PR 이벤트) → 머지 → CI on dev(push 이벤트)
dev → PR to main → CI 실행(PR 이벤트) → 머지 → CI on main → deploy 자동
```

---

## 3. 세션 중단 감지 자동화

### scripts/check-stale-branches.sh

미merge 브랜치를 탐지하는 스크립트:

```bash
#!/bin/bash
# 미완료 작업 브랜치 감지
# dev에 머지되지 않은 로컬 브랜치를 찾아 경고

MAIN="main"
DEV="dev"

stale=$(git branch --no-merged "$DEV" 2>/dev/null | grep -v "^\*" | grep -vE "^\s*(main|dev)$" | sed 's/^[ *]*//')

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

### Claude Code Hook 등록

SessionStart hook으로 등록하여 세션 시작 시 자동 실행:

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

### CLAUDE.md Session Start Protocol 추가

기존 Session Start Protocol에 stale branch 체크 단계 추가:
- 세션 시작 시 `scripts/check-stale-branches.sh` 결과를 확인
- 미merge 브랜치 발견 시 사용자에게 보고
- 사용자 지시에 따라 이어가기 또는 정리

---

## 4. 현재 로컬 작업 정리 순서

### Step 1: main 미push 커밋 push

```bash
git push origin main
```

- 6개 커밋 (S4 온보딩, S5 레거시 정리, Phase 2B 설계문서)
- push 후 CI→Deploy 자동 실행
- 이 시점에 이미 main에 커밋되어 있으므로 PR은 불가 (history 조작 필요)

### Step 2: dev 브랜치 생성

```bash
git branch dev main
git push -u origin dev
```

- main의 현재 HEAD에서 dev 분기
- 앞으로 모든 작업 브랜치는 dev에서 분기

### Step 3: phase2b/code-quality → dev PR

```bash
# worktree에서 dev를 base로 rebase (main = dev이므로 conflict 없음)
cd .worktrees/phase2b-code-quality
git push -u origin phase2b/code-quality
gh pr create --base dev --title "refactor: Phase 2B 코드 품질 개선" --body "..."
```

- CI 자동 실행 → 통과 확인 → 머지

### Step 4: dev → main PR

```bash
gh pr create --base main --head dev --title "release: Phase 2B 코드 품질 개선" --body "..."
```

- CI 통과 → 머지 → Deploy 자동 실행

### Step 5: 로컬 정리

```bash
# worktree 제거
git worktree remove .worktrees/phase2b-code-quality

# 머지 완료된 브랜치 삭제
git branch -d phase2b/code-quality

# stale worktree 디렉토리 삭제
rm -rf .worktrees/phase2a-1

# 오래된 stash 정리
git stash clear  # 또는 개별 확인 후 drop
```

### Step 6: CI/CD 파일 수정 + 문서 갱신

- ci.yml 수정 (dev 추가)
- 문서 3개 갱신 (아래 섹션 참조)
- 이 작업 자체도 feature 브랜치 → dev → main 경로로 진행

---

## 5. 문서 갱신 대상

### docs/VERSION_MANAGEMENT.md

- 기존 Git Flow 문서를 실제 운용에 맞게 갱신
- `develop` → `dev` 변경
- CI/CD 트리거 조건 반영
- 세션 완료 시 브랜치 삭제 규칙 추가

### CLAUDE.md

- 코딩 규칙에 브랜치 규칙 추가:
  - main/dev 직접 push 금지
  - 작업 브랜치→dev PR→main PR 필수
- Session Start Protocol에 stale branch 체크 추가
- 개발 워크플로우 섹션 갱신

### docs/DEVELOPMENT_WORKFLOW.md

- 작업→PR→CI→머지 플로우 갱신
- 세션 완료 체크리스트 (PR 생성, 로컬 브랜치 삭제, worktree 정리)

---

## 6. 리모트 오래된 브랜치 정리

리모트에 남아있는 오래된 브랜치들 (develop, feature/*, fix/*, test/* 등):
- main으로 이미 머지된 브랜치: 삭제
- 머지 안 된 브랜치: 확인 후 판단

---

## 주요 파일 목록

| 파일 | 액션 |
|------|------|
| `.github/workflows/ci.yml` | 수정 (push branches에 dev 추가) |
| `scripts/check-stale-branches.sh` | 신규 (stale branch 감지) |
| `docs/VERSION_MANAGEMENT.md` | 수정 (브랜칭 전략 갱신) |
| `CLAUDE.md` | 수정 (브랜치 규칙, Session Start Protocol) |
| `docs/DEVELOPMENT_WORKFLOW.md` | 수정 (워크플로우 갱신) |

---

## 검증 계획

```bash
# CI 변경 검증
# 1. feature → dev PR 생성 시 CI 실행 확인
# 2. dev 머지 후 push 트리거로 CI 재실행 확인
# 3. dev → main PR 머지 후 deploy 자동 실행 확인

# stale branch 감지 검증
bash scripts/check-stale-branches.sh
# 미merge 브랜치 없으면 출력 없음
# 테스트: 임시 브랜치 생성 후 스크립트 실행 → 경고 출력 확인

# 문서 확인
# VERSION_MANAGEMENT.md, CLAUDE.md, DEVELOPMENT_WORKFLOW.md 일관성 확인
```
