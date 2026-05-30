#!/bin/bash
# check-stale-branches.sh — 로컬 브랜치 상태 감지
# 두 가지 케이스를 모두 경고:
#   1) dev에 미머지 브랜치 → 중단된 작업 가능성
#   2) dev에 이미 머지됐으나 아직 남아있는 브랜치 → 삭제 필요

DEV="dev"

# dev 브랜치가 없으면 종료
if ! git rev-parse --verify "$DEV" >/dev/null 2>&1; then
  exit 0
fi

# --- 1) 미머지 브랜치 (중단된 작업) ---
unmerged=$(git branch --no-merged "$DEV" 2>/dev/null \
  | grep -v "^\*" \
  | grep -vE "^\s*(main|dev)$" \
  | sed 's/^[ *]*//')

if [ -n "$unmerged" ]; then
  echo "⚠️  미완료 작업 브랜치 발견 (이전 세션 중단 가능):"
  echo ""
  while IFS= read -r branch; do
    last_commit=$(git log -1 --format="%h %ar: %s" "$branch" 2>/dev/null)
    echo "  $branch"
    echo "    └─ $last_commit"
  done <<< "$unmerged"
  echo ""
  echo "이 브랜치들은 dev에 머지되지 않았습니다."
  echo "중단된 작업이라면 해당 브랜치에서 작업을 이어가세요."
  echo ""
fi

# --- 2) 머지 완료됐으나 로컬에 남은 브랜치 (삭제 필요) ---
merged=$(git branch --merged "$DEV" 2>/dev/null \
  | grep -v "^\*" \
  | grep -vE "^\s*(main|dev)$" \
  | sed 's/^[ *]*//')

if [ -n "$merged" ]; then
  echo "🗑️  dev에 머지됐으나 로컬에 남은 브랜치 (삭제 권장):"
  echo ""
  while IFS= read -r branch; do
    echo "  $branch"
  done <<< "$merged"
  echo ""
  echo "삭제 명령어: git branch -d \$(git branch --merged dev | grep -v 'main\\|dev\\|\\*')"
fi
