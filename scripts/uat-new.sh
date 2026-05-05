#!/usr/bin/env bash
# UAT 실행 인스턴스 markdown 생성기
#
# 사용:
#   bash scripts/uat-new.sh [core|extended|full]   (기본 core)
#
# 동작:
#   - tests/manual/uat-checklist.md 를 tests/manual/runs/<DATE>-<COMMIT>-<MODE>.md 로 복사
#   - 메타 (Build, 실행 일시) 자동 채움
#   - 이후 사용자는 사본에서 [ ] → [x]/[!]/[~]로 결과 기록 후 git commit
set -euo pipefail

# class-planner repo 루트에서 실행되는지 확인
if [[ ! -f tests/manual/uat-checklist.md ]]; then
  echo "ERROR: class-planner repo 루트에서 실행하세요." >&2
  echo "  cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner" >&2
  exit 1
fi

MODE="${1:-core}"
case "$MODE" in
  core|extended|full) ;;
  *) echo "ERROR: 모드는 core|extended|full 중 하나" >&2; exit 1 ;;
esac

DATE=$(date +%Y-%m-%d-%H%M)
NOW=$(date +"%Y-%m-%d %H:%M")
COMMIT=$(git rev-parse --short HEAD)
DIR="tests/manual/runs"
OUT="${DIR}/${DATE}-${COMMIT}-${MODE}.md"

mkdir -p "$DIR"

# 메타 두 라인을 sed로 치환 (template은 그대로 보존)
sed \
  -e "s|YYYY-MM-DD HH:MM|${NOW}|" \
  -e "s|\\\`git rev-parse --short HEAD\\\`|${COMMIT}|" \
  tests/manual/uat-checklist.md > "$OUT"

echo "Created: $OUT"
echo "다음 단계:"
echo "  1. $OUT 열고 모드(${MODE}) 시나리오 실행"
echo "  2. [ ] → [x] (Pass) / [!] (Fail) / [~] (Skip) 기록"
echo "  3. git add $OUT && git commit -m \"chore(uat): ${DATE} ${MODE} run\""
