#!/usr/bin/env bash
# UAT 실행 인스턴스 markdown 생성기 (Hybrid C 모델)
#
# 사용:
#   bash scripts/uat-new.sh                # 기본 release
#   bash scripts/uat-new.sh release        # 분기 1회 또는 큰 리팩터 후 — 사본 commit
#   bash scripts/uat-new.sh smoke          # 매 PR 직전 — 사본 X (안내만 출력)
#   bash scripts/uat-new.sh phase1-prod    # 친구 선공개 전 1회 — 사본 commit, 240분
#
# 동작:
#   - tests/manual/uat-checklist.md 를 tests/manual/runs/<DATE>-<COMMIT>-release.md 로 복사
#   - 메타 (Build, 실행 일시) 자동 채움
#   - 이후 사용자는 사본에서 [ ] → [x]/[!]/[~]로 결과 기록 후 git commit
#
# Legacy: core / extended / full 입력은 deprecated 경고 후 release 로 자동 alias
set -euo pipefail

# class-planner repo 루트에서 실행되는지 확인
if [[ ! -f tests/manual/uat-checklist.md ]]; then
  echo "ERROR: class-planner repo 루트에서 실행하세요." >&2
  echo "  cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner" >&2
  exit 1
fi

MODE="${1:-release}"
case "$MODE" in
  release) ;;
  phase1-prod)
    echo "Phase 1 Production Readiness 모드 — 친구 선공개 전 1회 (240분)." >&2
    echo "  사전: npm run uat:setup && npm run uat:seed && npm run test:release" >&2
    echo "  본문: uat-checklist.md §22 Phase 1 Production Readiness Mode 참조" >&2
    ;;
  smoke)
    echo "Smoke 모드는 사본 X — 즉석 spot-check 만 진행." >&2
    echo "  1. PORT=3000 npm run dev   (다른 터미널)" >&2
    echo "  2. 브라우저 콘솔: uat.clearAll()" >&2
    echo "  3. uat-checklist.md §2 의 Smoke 5 시나리오 즉석 진행" >&2
    echo "     (S-1.1, S-2.1, S-5.6, S-12.1, S-14.1)" >&2
    echo "  4. fail 시 GitHub Issue 등록만 (사본/commit 없음)" >&2
    exit 0
    ;;
  core|extended|full)
    echo "WARN: '${MODE}' 는 deprecated. release 로 자동 alias 진행." >&2
    echo "      다음 사이클부터 'release' 사용 권장." >&2
    MODE="release"
    ;;
  *) echo "ERROR: 모드는 release|smoke|phase1-prod 중 하나 (legacy: core|extended|full)" >&2; exit 1 ;;
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
