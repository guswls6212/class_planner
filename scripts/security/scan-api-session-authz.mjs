#!/usr/bin/env node
/**
 * 회귀 게이트 — API 라우트가 클라이언트가 보낸 userId 를 인가 근거로 쓰지 못하게 막는다.
 *
 * 배경: 2026-07-26 P0. 라우트 40개가 acting user 를 `?userId=` 에서 받아 세션 검증
 * 없이 requireRole / resolveAcademyMembership 에 넘겼다 → 비인증 BOLA + BFLA.
 * 수정은 `lib/auth/apiAuth.ts` 의 `requireSessionUser` 로 통일됐고, 이 스크립트는
 * **새로 추가되는 라우트가 같은 실수를 반복하지 못하게** 한다.
 *
 * 규칙:
 *   1. `searchParams.get("userId")` 는 `requireSessionUser(...)` 의 인자일 때만 허용.
 *      (= 검증 대상으로만 쓰이고, 인가 주체로는 쓰이지 않음)
 *   2. `requireRole` / `resolveAcademyMembership` / `resolveAcademyId` 를 호출하는
 *      라우트는 같은 파일에서 `requireSessionUser` 도 호출해야 한다.
 *      단, ANONYMOUS_ALLOWLIST 의 라우트는 예외 (토큰/공개 접근 경로).
 *
 * 사용: node scripts/security/scan-api-session-authz.mjs
 * exit 0 = 위반 없음 / exit 1 = 위반 (CI 차단)
 */
import fs from "node:fs";
import path from "node:path";

const API_DIR = path.join(process.cwd(), "src/app/api");

/**
 * 익명(비로그인) 접근이 **의도된** 라우트.
 * 공유 토큰 / 초대 코드 / 공개 학원 정보 / 텔레메트리 — 여기에 세션을 요구하면
 * 기능이 죽는다. 새 항목 추가는 "정말 익명이어야 하는가" 를 리뷰에서 따질 것.
 */
const ANONYMOUS_ALLOWLIST = new Set([
  "academies/check-slug/route.ts", // 슬러그 중복 확인 (온보딩 중, 학원 생성 전)
  "academy/[identifier]/public/route.ts", // 공개 학원 정보
  "invites/check/route.ts", // 초대 링크 유효성 — 로그인 전에 확인
  "logs/client/route.ts", // 클라이언트 로그 싱크 (비인증 텔레메트리)
  "share/[token]/route.ts", // 공유 링크 열람
  "share/code/route.ts", // 6자리 접근 코드 열람
  "share-tokens/from-invite/route.ts", // 초대 토큰 → 공유 토큰 교환
  "auth/set-role-cookie/route.ts", // UX 편의 쿠키 (보안 경계 아님 — 라우트 주석 참조)
]);

/**
 * 익명이 **아니고**, requireSessionUser 가 아닌 **다른 가드**를 쓰는 라우트.
 * 익명 목록과 섞으면 "인증 없는 엔드포인트" 로 오독된다 — 별도 목록으로 둔다.
 * 값 = 그 파일에 반드시 존재해야 하는 가드 심볼.
 */
const ALTERNATE_GUARD = new Map([
  // 이메일 화이트리스트(ADMIN_EMAILS) 기반 개발자 전용. 세션 대신 Bearer +
  // isDeveloperEmail 로 판정하므로 requireSessionUser 를 요구하지 않는다.
  ["admin/logs/route.ts", "requireDeveloper"],
]);

const AUTHZ_SINKS = [
  "requireRole",
  "resolveAcademyMembership",
  "resolveAcademyId",
];

const USERID_READ = /searchParams\.get\((["'])userId\1\)/;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

if (!fs.existsSync(API_DIR)) {
  console.error(`✗ ${API_DIR} 없음 — repo 루트에서 실행하세요.`);
  process.exit(1);
}

const violations = [];
let guarded = 0;
let allowlisted = 0;
let altGuarded = 0;

for (const file of walk(API_DIR)) {
  const rel = path.relative(API_DIR, file);
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const hasGuard = src.includes("requireSessionUser");

  if (ANONYMOUS_ALLOWLIST.has(rel)) {
    allowlisted++;
    continue;
  }

  // 다른 가드를 쓰는 라우트 — 그 가드가 **실제로 남아 있는지** 확인한다.
  // 면제만 하고 넘어가면 가드가 삭제돼도 조용히 통과한다.
  const altSymbol = ALTERNATE_GUARD.get(rel);
  if (altSymbol) {
    if (!src.includes(altSymbol)) {
      violations.push({
        file: rel,
        line: 0,
        rule: `${altSymbol}() 가 사라졌다 — 다른 가드로 면제된 라우트인데 가드가 없다`,
        text: "",
      });
    } else {
      altGuarded++;
    }
    continue;
  }

  // 규칙 1 — userId read 는 가드 인자일 때만.
  lines.forEach((line, i) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    if (!USERID_READ.test(line)) return;
    if (line.includes("requireSessionUser")) return;
    violations.push({
      file: rel,
      line: i + 1,
      rule: "쿼리 userId 가 requireSessionUser 를 거치지 않고 사용됨",
      text: line.trim(),
    });
  });

  // 규칙 2 — 인가 sink 를 쓰면 세션 가드가 있어야 한다.
  const sink = AUTHZ_SINKS.find((s) => src.includes(`${s}(`));
  if (sink && !hasGuard) {
    violations.push({
      file: rel,
      line: 0,
      rule: `${sink}() 를 호출하는데 requireSessionUser 가 없음 (신원 미검증)`,
      text: "",
    });
  }

  if (hasGuard) guarded++;
}

console.log(
  `스캔: 세션 가드 ${guarded} · 다른 가드 ${altGuarded} · 익명 허용 ${allowlisted} · 위반 ${violations.length}`
);

if (violations.length === 0) {
  console.log("✓ 모든 API 라우트가 세션 검증된 신원을 사용합니다.");
  process.exit(0);
}

console.error("\n✗ 인가 위반 발견 — 클라이언트가 보낸 userId 를 신뢰하고 있습니다:\n");
for (const v of violations) {
  console.error(`  ${v.file}${v.line ? `:${v.line}` : ""}`);
  console.error(`    ${v.rule}`);
  if (v.text) console.error(`    > ${v.text}`);
}
console.error(
  "\n수정: `const auth = await requireSessionUser(request, searchParams.get(\"userId\"));`" +
    "\n      `if (!auth.ok) return auth.response;` 후 `auth.userId` 사용." +
    "\n익명이 의도된 라우트면 이 스크립트의 ANONYMOUS_ALLOWLIST 에 근거와 함께 추가."
);
process.exit(1);
