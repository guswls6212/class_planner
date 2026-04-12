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
