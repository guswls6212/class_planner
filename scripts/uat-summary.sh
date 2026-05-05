#!/usr/bin/env bash
# 최근 N회 UAT 실행 결과 요약 + 자주 fail하는 시나리오 추출
#
# 사용:
#   bash scripts/uat-summary.sh [개수=10]
set -euo pipefail

if [[ ! -d tests/manual/runs ]]; then
  echo "ERROR: tests/manual/runs 디렉터리 없음. uat-new.sh 먼저 실행하세요." >&2
  exit 1
fi

N="${1:-10}"

echo "## 최근 ${N}회 UAT 실행"
files=$(ls -1t tests/manual/runs/*.md 2>/dev/null | grep -v 'README.md' | head -n "$N")
if [[ -z "$files" ]]; then
  echo "  (실행 기록 없음)"
  exit 0
fi

while IFS= read -r f; do
  read pass fail skip pending <<< "$(awk '
    /^\*\*Result:\*\* \[x\]/ { p++ }
    /^\*\*Result:\*\* \[!\]/ { fl++ }
    /^\*\*Result:\*\* \[~\]/ { s++ }
    /^\*\*Result:\*\* \[ \]/ { pe++ }
    END { printf "%d %d %d %d", p+0, fl+0, s+0, pe+0 }
  ' "$f")"
  printf "  %s  Pass=%s Fail=%s Skip=%s Pending=%s\n" \
    "$(basename "$f")" "$pass" "$fail" "$skip" "$pending"
done <<< "$files"

echo
echo "## 최근 Fail 시나리오 (시나리오 ID + 파일)"
fail_files=$(echo "$files" | xargs grep -lE '^\*\*Result:\*\* \[!\]' 2>/dev/null || true)
if [[ -z "$fail_files" ]]; then
  echo "  (Fail 없음)"
else
  while IFS= read -r f; do
    echo "### $(basename "$f")"
    awk '/^### S-/ { last=$0 } /^\*\*Result:\*\* \[!\]/ { print "  " last }' "$f"
  done <<< "$fail_files"
fi

echo
echo "## Fail 빈도 ranking (시나리오 ID 기준)"
echo "$files" | xargs awk '/^### (S-|E-)/ { last=$0 } /^\*\*Result:\*\* \[!\]/ { print last }' 2>/dev/null \
  | sort | uniq -c | sort -rn | head -10
