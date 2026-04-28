#!/usr/bin/env bash
# setup-hooks.sh — configure git to use scripts/hooks/ as hooks directory
# Run once after cloning: bash scripts/setup-hooks.sh

set -euo pipefail
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

git config --local core.hooksPath scripts/hooks
chmod +x scripts/hooks/pre-push.sh

echo "✓ Git hooks configured (core.hooksPath = scripts/hooks)"
echo "  pre-push gate: smart test selection on git push"
