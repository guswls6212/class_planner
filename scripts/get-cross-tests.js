#!/usr/bin/env node
// get-cross-tests.js — returns additional test files from test-impact-map.json
// that vitest's import-graph analysis won't catch automatically.
//
// Usage: node scripts/get-cross-tests.js <file1> <file2> ...
// Output: space-separated list of test file paths (deduped, sorted)
//
// AI maintains test-impact-map.json as part of Documentation Sync Protocol (step 5).

const { readFileSync, existsSync } = require("fs");
const { resolve, relative } = require("path");

const REPO_ROOT = resolve(__dirname, "..");
const MAP_PATH = resolve(__dirname, "test-impact-map.json");

if (!existsSync(MAP_PATH)) process.exit(0);

const map = JSON.parse(readFileSync(MAP_PATH, "utf8"));
const changedFiles = process.argv.slice(2);
if (changedFiles.length === 0) process.exit(0);

const extras = new Set();

for (const changed of changedFiles) {
  const rel = changed.startsWith("/")
    ? relative(REPO_ROOT, changed)
    : changed.replace(/^\.\//, "");

  const mapped = map[rel] || [];
  for (const t of mapped) extras.add(t);
}

if (extras.size > 0) {
  process.stdout.write([...extras].sort().join(" "));
}
