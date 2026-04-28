#!/usr/bin/env bash
# pre-push.sh — Smart test gate: runs affected tests before push
#
# Triggered by: git push (via core.hooksPath = scripts/hooks)
# Algorithm:
#   1. Detect changed .ts/.tsx source files in this push
#   2. vitest related <files> → import-graph-based test selection
#   3. scripts/get-cross-tests.js → cross-cutting map supplement
#   4. Run union. Fail → block push. Pass → proceed.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ─── 1. Collect changed source files from stdin (pre-push protocol) ─────────
CHANGED_FILES=""
while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    # New branch: compare with dev, fallback to HEAD~1
    BASE=$(git rev-parse origin/dev 2>/dev/null \
        || git rev-parse HEAD~1 2>/dev/null \
        || echo "")
    [ -z "$BASE" ] && { echo "ℹ Pre-push: new repo, running full test suite"; ALL_TESTS=1; break; }
  else
    BASE="$remote_sha"
  fi

  FILES=$(git diff --name-only "$BASE" "$local_sha" -- '*.ts' '*.tsx' \
    | grep -v '\.test\.' \
    | grep -v '\.spec\.' \
    | grep -v '\.d\.ts$' \
    || true)
  CHANGED_FILES="$CHANGED_FILES $FILES"
done

CHANGED_FILES=$(echo "$CHANGED_FILES" | tr ' ' '\n' | sort -u | grep -v '^$' || true)

# ─── 2. Edge case: no TS/TSX source changes (docs, assets, etc.) ────────────
if [ -z "$CHANGED_FILES" ]; then
  echo "ℹ Pre-push: no source changes detected, skipping tests"
  exit 0
fi

CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
echo "📋 Pre-push gate — $CHANGED_COUNT changed source file(s)"

# ─── 3. Cross-cutting test supplement ───────────────────────────────────────
CROSS_TESTS=""
if [ -f "scripts/get-cross-tests.js" ]; then
  CROSS_TESTS=$(node scripts/get-cross-tests.js $CHANGED_FILES 2>/dev/null || true)
fi

# ─── 4. Build vitest related args ────────────────────────────────────────────
RELATED_ARGS=$(echo "$CHANGED_FILES" | tr '\n' ' ')

# ─── 5. Run tests ─────────────────────────────────────────────────────────────
# Count cross-cutting additions for output
CROSS_COUNT=0
if [ -n "$CROSS_TESTS" ]; then
  CROSS_COUNT=$(echo "$CROSS_TESTS" | tr ' ' '\n' | grep -v '^$' | wc -l | tr -d ' ')
fi

echo "🔍 Selecting tests: import-graph + ${CROSS_COUNT} cross-cutting override(s)"

# Run vitest with related files first
VITEST_CMD="npx vitest related --run $RELATED_ARGS"
if [ -n "$CROSS_TESTS" ]; then
  # Append explicit cross-cutting test paths
  VITEST_CMD="$VITEST_CMD $CROSS_TESTS"
fi

echo ""
if eval "$VITEST_CMD"; then
  echo ""
  echo "✅ Pre-push gate PASSED — push proceeding"
  exit 0
else
  echo ""
  echo "❌ Pre-push gate FAILED"
  echo "──────────────────────────────────────────"
  echo "Fix the failing tests above, then run: git push"
  exit 1
fi
