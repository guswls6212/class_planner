# Phase 5-D Bugfix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데이터 충돌 false positive 제거(D-1)와 PDF 한글 폰트 탑재(D-2) + 라벨 동적화(D-3)를 독립 PR 2개로 완료한다.

**Architecture:**
- D-1: `useGlobalDataInitialization.ts`의 익명 사용자 localStorage 자동 시드 블록을 제거하고, `handleLoginDataMigration.ts`의 `isEmptyData` 판정 기준을 `students/sessions/enrollments`만으로 좁혀 false positive를 차단한다.
- D-2: `subset-font` npm 스크립트로 Pretendard TTF를 한글+라틴 범위로 서브셋팅해 base64 상수로 커밋하고, `PdfRenderer.ts`에 `addFileToVFS`/`addFont`/`setFont` 호출을 주입한다. PDF 생성 모듈을 동적 임포트로 감싸 초기 번들을 분리한다.
- D-3: `PDFDownloadButton`에 `viewLabel` prop을 추가해 라벨을 현재 뷰 기준으로 동적 표시한다.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Vitest, jsPDF 3, subset-font (npm), @orioncactus/pretendard (npm)

---

## File Map

### PR 1 — feat/phase5-d-conflict-fix

| 역할 | 파일 |
|---|---|
| **Modify** | `src/hooks/useGlobalDataInitialization.ts` (라인 99-122 익명 시드 블록 교체) |
| **Modify** | `src/lib/auth/handleLoginDataMigration.ts` (`isEmptyData` 판정 기준 변경) |
| **Modify** | `src/hooks/__tests__/useGlobalDataInitialization.test.ts` (시딩 테스트 → 비시딩으로 갱신, 새 케이스 추가) |
| **Modify** | `src/lib/auth/__tests__/handleLoginDataMigration.test.ts` (회귀 케이스 추가) |

### PR 2 — feat/phase5-d-pdf-font

| 역할 | 파일 |
|---|---|
| **Create** | `scripts/generate-pdf-fonts.mjs` (서브셋 스크립트) |
| **Delete** | `src/lib/pdf/fonts/pretendard-subset.ts` (빈 플레이스홀더) |
| **Create** | `src/lib/pdf/fonts/pretendard-regular.ts` (생성된 base64) |
| **Create** | `src/lib/pdf/fonts/pretendard-bold.ts` (생성된 base64) |
| **Modify** | `src/lib/pdf/PdfRenderer.ts` (font registration + dynamic import 분리) |
| **Modify** | `src/lib/pdf/PdfHeader.ts` (`doc.setFont("Pretendard","bold")` 명시) |
| **Modify** | `src/lib/pdf/PdfSessionBlock.ts` (`doc.setFont("Pretendard","normal")` 명시) |
| **Modify** | `src/app/schedule/_components/PdfDownloadSection.tsx` (`viewLabel` prop 수용) |
| **Modify** | `src/components/molecules/PDFDownloadButton.tsx` (`viewLabel` prop 추가) |
| **Modify** | `src/app/schedule/page.tsx` (`viewMode` → `PdfDownloadSection`에 전달) |
| **Create** | `src/lib/pdf/__tests__/PdfRenderer.test.ts` (폰트 등록 검증) |
| **Modify** | `package.json` (devDependencies + script 추가) |

---

## PR 1 — feat/phase5-d-conflict-fix

### Task 1: 브랜치 생성 + 실패 테스트 작성 (D-1)

**Files:**
- Modify: `src/hooks/__tests__/useGlobalDataInitialization.test.ts`
- Modify: `src/lib/auth/__tests__/handleLoginDataMigration.test.ts`

- [ ] **Step 1: 브랜치 생성**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
git checkout dev
git pull origin dev
git checkout -b feat/phase5-d-conflict-fix
```

- [ ] **Step 2: `useGlobalDataInitialization.test.ts` — 시딩 테스트를 "비시딩" 기대로 변경**

파일에서 "세션 없으면 anonymous 키로 기본 과목 9개 시딩" 테스트 블록을 아래로 교체한다. 파일의 다른 테스트는 그대로 유지.

```ts
// 기존 테스트 "세션 없으면 anonymous 키로 기본 과목 9개 시딩" 전체를 아래로 교체
it("세션 없이 방문만 해도 anonymous 스토리지를 생성하지 않는다", async () => {
  // getItem returns null — localStorage에 아무것도 없음
  localStorageMock.getItem.mockReturnValue(null);

  const { result } = renderHook(() => useGlobalDataInitialization());
  await waitFor(() => expect(result.current.isInitialized).toBe(true));

  // setItem이 "classPlannerData:anonymous" 키로 호출되면 안 됨
  const setItemCalls: string[][] = localStorageMock.setItem.mock.calls;
  const anonymousCall = setItemCalls.find(
    (args) => args[0] === "classPlannerData:anonymous"
  );
  expect(anonymousCall).toBeUndefined();
});
```

- [ ] **Step 3: `handleLoginDataMigration.test.ts` — 회귀 케이스 2개 추가**

`describe("checkLoginDataConflict")` 블록 안, 기존 테스트 다음에 추가:

```ts
it("anon에 subjects만 9개 있고 students/sessions/enrollments는 0 → use-server", () => {
  const subjectsOnlyData: ClassPlannerData = {
    students: [],
    subjects: Array.from({ length: 9 }, (_, i) => ({
      id: `default-${i + 1}`,
      name: `과목${i + 1}`,
      color: "#fbbf24",
    })),
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };
  storage["classPlannerData:anonymous"] = JSON.stringify(subjectsOnlyData);
  const result = checkLoginDataConflict(serverData);
  expect(result.action).toBe("use-server");
});

it("anon에 enrollments만 있고 students/sessions는 0 → use-server", () => {
  const enrollmentsOnlyData: ClassPlannerData = {
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [{ id: "e1", studentId: "s1", subjectId: "sub1" }],
    teachers: [],
    version: "1.0",
    lastModified: new Date().toISOString(),
  };
  storage["classPlannerData:anonymous"] = JSON.stringify(enrollmentsOnlyData);
  const result = checkLoginDataConflict(serverData);
  expect(result.action).toBe("use-server");
});
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npx vitest run src/hooks/__tests__/useGlobalDataInitialization.test.ts src/lib/auth/__tests__/handleLoginDataMigration.test.ts 2>&1 | tail -20
```

기대: `세션 없이 방문만 해도 anonymous 스토리지를 생성하지 않는다` **FAIL** + `anon에 subjects만 9개` 케이스 **FAIL**

---

### Task 2: D-1 구현 — 시드 제거 + isEmptyData 수정

**Files:**
- Modify: `src/hooks/useGlobalDataInitialization.ts`
- Modify: `src/lib/auth/handleLoginDataMigration.ts`

- [ ] **Step 1: `useGlobalDataInitialization.ts` 익명 사용자 경로 블록 교체**

라인 98-122의 `// ===== 익명 사용자 경로 =====` 블록 전체를 아래로 교체:

```ts
// ===== 익명 사용자 경로 =====
if (!session?.user) {
  logger.debug("익명 사용자 경로 — localStorage 자동 초기화 건너뜀");
  if (mounted) setIsInitialized(true);
  return;
}
```

> 주의: `DEFAULT_SUBJECTS` 상수 정의(라인 26-36)와 라인 206-223의 로그인 사용자용 기본 과목 시딩 블록은 그대로 유지. 이 블록은 **로그인 사용자**에게만 실행되며 버그와 무관.
> 삭제되는 `setClassPlannerData`·`syncSubjectCreate` import가 여전히 필요한지 확인할 것 — `setClassPlannerData`는 라인 107에서, `syncSubjectCreate`는 라인 211에서 각각 사용 중이므로 둘 다 유지.

- [ ] **Step 2: `handleLoginDataMigration.ts` — `isEmptyData` 수정**

라인 23-29의 `isEmptyData` 함수를 아래로 교체:

```ts
function isEmptyData(data: ClassPlannerData): boolean {
  return (
    data.students.length === 0 &&
    data.sessions.length === 0 &&
    data.enrollments.length === 0
  );
}
```

`subjects`는 제외하고 `enrollments`를 추가. 과목만 있고 학생/수업/등록이 없는 상태는 "의미 없는 빈 상태"로 취급.

- [ ] **Step 3: 테스트 재실행 → 통과 확인**

```bash
npx vitest run src/hooks/__tests__/useGlobalDataInitialization.test.ts src/lib/auth/__tests__/handleLoginDataMigration.test.ts 2>&1 | tail -20
```

기대: 모든 케이스 **PASS**

- [ ] **Step 4: 전체 테스트 통과 확인**

```bash
npm run test 2>&1 | tail -15
```

기대: 기존 테스트 모두 PASS. 실패가 있다면 수정 후 진행.

---

### Task 3: D-1 커밋 → PR 생성

- [ ] **Step 1: 빌드 확인**

```bash
npm run build 2>&1 | tail -10
```

기대: 에러 없이 성공.

- [ ] **Step 2: 스테이징 및 커밋**

```bash
git add \
  src/hooks/useGlobalDataInitialization.ts \
  src/lib/auth/handleLoginDataMigration.ts \
  src/hooks/__tests__/useGlobalDataInitialization.test.ts \
  src/lib/auth/__tests__/handleLoginDataMigration.test.ts

git commit -m "$(cat <<'EOF'
fix(conflict): remove anonymous storage auto-seed to prevent false positives

비로그인 첫 방문 시 DEFAULT_SUBJECTS 9개를 localStorage에 자동 시딩하는 정책 제거.
isEmptyData 판정을 students/sessions/enrollments 기준으로 좁혀 subjects-only 상태를
"빈 데이터"로 올바르게 취급. 로그인 직후 불필요한 충돌 모달이 뜨는 버그 해소.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: 푸시 + PR 생성**

```bash
git push -u origin feat/phase5-d-conflict-fix

gh pr create \
  --base dev \
  --title "fix(conflict): remove anonymous storage auto-seed (P5-D-1)" \
  --body "$(cat <<'EOF'
## Summary
- 비로그인 방문자에게 DEFAULT_SUBJECTS 9개를 localStorage에 자동 시딩하던 블록 제거
- `isEmptyData` 판정 기준을 `students/sessions/enrollments`만으로 좁힘 (subjects 제외, enrollments 추가)
- 방문만 해도 데이터 충돌 모달이 뜨던 false positive 버그 해소

## Test plan
- [ ] 시크릿 브라우저로 http://localhost:3000 방문 → `/settings` 클릭 → Google 로그인 → 충돌 모달 없음
- [ ] DevTools > Application > localStorage에서 `classPlannerData:anonymous` 키가 존재하지 않는지 확인
- [ ] 기존 로컬 데이터가 있는 브라우저에서 로그인 → 정상적으로 충돌 모달이 뜨는지 확인 (회귀 방지)
- [ ] `npx vitest run` 전체 통과

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## PR 2 — feat/phase5-d-pdf-font

### Task 4: 브랜치 생성 + 패키지 설치

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout dev
git pull origin dev
git checkout -b feat/phase5-d-pdf-font
```

- [ ] **Step 2: 패키지 설치**

```bash
npm install --save-dev @orioncactus/pretendard subset-font
```

설치 후 `node_modules/@orioncactus/pretendard/dist/public/variable/` 디렉토리에서 TTF 파일을 확인:

```bash
find node_modules/@orioncactus/pretendard -name "*.ttf" | head -10
```

`Pretendard-Regular.ttf`, `Pretendard-Bold.ttf` (또는 `PretendardVariable.ttf`) 경로를 다음 Task에서 사용한다.

> **대안:** 위 명령어로 `.ttf` 파일을 못 찾으면:
> ```bash
> find node_modules/@orioncactus/pretendard -name "*.woff*" -o -name "*.otf" | head -10
> ```
> `PretendardVariable.ttf`처럼 Variable 폰트가 나오면 Regular/Bold 대신 그걸 사용한다. subset-font는 Variable TTF도 처리 가능.

---

### Task 5: 폰트 서브셋 생성 스크립트 작성 + 실행

**Files:**
- Create: `scripts/generate-pdf-fonts.mjs`
- Create: `src/lib/pdf/fonts/pretendard-regular.ts`
- Create: `src/lib/pdf/fonts/pretendard-bold.ts`
- Delete: `src/lib/pdf/fonts/pretendard-subset.ts`

- [ ] **Step 1: 스크립트 작성**

`scripts/generate-pdf-fonts.mjs` 파일 생성:

```js
/**
 * PDF용 Pretendard 폰트 서브셋을 생성하는 Node.js 스크립트.
 *
 * 사용법: node scripts/generate-pdf-fonts.mjs
 *
 * 출력:
 *   src/lib/pdf/fonts/pretendard-regular.ts
 *   src/lib/pdf/fonts/pretendard-bold.ts
 *
 * 서브셋 범위:
 *   U+0020-007E (Basic Latin)
 *   U+AC00-D7A3 (Hangul Syllables - 11,172자)
 *   U+3130-318F (Hangul Compatibility Jamo)
 *   U+0030-0039 (Digits — Latin 범위에 포함되나 명시)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { subset } from "subset-font";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** 서브셋 유니코드 문자열 생성 */
function buildUnicodeString() {
  const ranges = [
    [0x0020, 0x007e], // Basic Latin
    [0x3130, 0x318f], // Hangul Compatibility Jamo
    [0xac00, 0xd7a3], // Hangul Syllables
  ];
  let str = "";
  for (const [start, end] of ranges) {
    for (let cp = start; cp <= end; cp++) {
      str += String.fromCodePoint(cp);
    }
  }
  return str;
}

/** @orioncactus/pretendard에서 TTF 경로 탐색 */
function findTtfPath(weight = "Regular") {
  const candidates = [
    `node_modules/@orioncactus/pretendard/dist/public/static/Pretendard-${weight}.subset.ttf`,
    `node_modules/@orioncactus/pretendard/dist/public/static/Pretendard-${weight}.ttf`,
    `node_modules/@orioncactus/pretendard/dist/public/variable/PretendardVariable.ttf`,
  ];
  for (const p of candidates) {
    try {
      const full = resolve(ROOT, p);
      readFileSync(full); // throws if not found
      return full;
    } catch {
      continue;
    }
  }
  throw new Error(
    `Pretendard-${weight}.ttf를 찾을 수 없습니다. candidates:\n${candidates.join("\n")}`
  );
}

async function generateFont(weight, outputName) {
  console.log(`[${weight}] TTF 탐색 중...`);
  const ttfPath = findTtfPath(weight);
  console.log(`[${weight}] 사용: ${ttfPath}`);

  const ttfBuffer = readFileSync(ttfPath);
  console.log(`[${weight}] 서브셋 생성 중 (Hangul Syllables 11,172자 포함)...`);

  const unicodeStr = buildUnicodeString();
  const subsetBuffer = await subset(ttfBuffer, unicodeStr, {
    targetFormat: "truetype",
  });

  const base64 = Buffer.from(subsetBuffer).toString("base64");

  const outDir = resolve(ROOT, "src/lib/pdf/fonts");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `${outputName}.ts`);

  const content = [
    `// AUTO-GENERATED by scripts/generate-pdf-fonts.mjs — do not edit manually.`,
    `// Font: Pretendard-${weight}, Subset: Basic Latin + Hangul Syllables + Hangul Jamo`,
    `// Source: @orioncactus/pretendard`,
    `export const PRETENDARD_${weight.toUpperCase()}_BASE64 =`,
    `  "${base64}";`,
    ``,
  ].join("\n");

  writeFileSync(outPath, content);
  const kb = Math.round(subsetBuffer.byteLength / 1024);
  console.log(`[${weight}] 완료: ${outPath} (${kb} KB subset, ${base64.length} chars base64)`);
}

(async () => {
  try {
    await generateFont("Regular", "pretendard-regular");
    await generateFont("Bold", "pretendard-bold");
    console.log("\n✅ 폰트 생성 완료. 생성된 파일을 git에 커밋하세요.");
  } catch (err) {
    console.error("❌ 폰트 생성 실패:", err.message);
    process.exit(1);
  }
})();
```

- [ ] **Step 2: `package.json`에 스크립트 추가**

`package.json`의 `"scripts"` 블록에 아래를 추가:

```json
"generate:pdf-fonts": "node scripts/generate-pdf-fonts.mjs"
```

- [ ] **Step 3: 스크립트 실행**

```bash
cd /Users/leo/lee_file/entrepreneur/project/dev-pack/class-planner
npm run generate:pdf-fonts 2>&1
```

기대 출력:
```
[Regular] TTF 탐색 중...
[Regular] 사용: .../Pretendard-Regular.ttf
[Regular] 서브셋 생성 중 (Hangul Syllables 11,172자 포함)...
[Regular] 완료: .../pretendard-regular.ts (XXX KB subset, XXXXXX chars base64)
[Bold] ...
✅ 폰트 생성 완료.
```

> **실패 시 대응:** `findTtfPath`가 오류를 던지면 `find node_modules/@orioncactus/pretendard -name "*.ttf"` 결과를 확인하고 `candidates` 배열을 실제 경로에 맞게 수정 후 재실행.

- [ ] **Step 4: 생성된 파일 확인**

```bash
ls -lh src/lib/pdf/fonts/
head -3 src/lib/pdf/fonts/pretendard-regular.ts
```

기대:
- `pretendard-regular.ts` 존재, base64 문자열 길이가 수십만 자 이상
- `pretendard-bold.ts` 존재
- `pretendard-subset.ts` 아직 남아 있음 (다음 단계에서 삭제)

- [ ] **Step 5: 기존 플레이스홀더 삭제**

```bash
rm src/lib/pdf/fonts/pretendard-subset.ts
```

---

### Task 6: PdfRenderer + 관련 파일 수정 (D-2 + D-3)

**Files:**
- Modify: `src/lib/pdf/PdfRenderer.ts`
- Modify: `src/lib/pdf/PdfHeader.ts`
- Modify: `src/lib/pdf/PdfSessionBlock.ts`
- Modify: `src/components/molecules/PDFDownloadButton.tsx`
- Modify: `src/app/schedule/_components/PdfDownloadSection.tsx`
- Modify: `src/app/schedule/page.tsx`

- [ ] **Step 1: `PdfRenderer.ts` — 폰트 등록 + dynamic import 분리 준비**

파일 전체를 아래로 교체한다:

```ts
import jsPDF from "jspdf";
import {
  calculateGridDimensions,
  getCellPosition,
  drawGridLines,
} from "./PdfGridLayout";
import { drawHeader, drawFooter } from "./PdfHeader";
import { drawSessionBlock } from "./PdfSessionBlock";
import { PRETENDARD_REGULAR_BASE64 } from "./fonts/pretendard-regular";
import { PRETENDARD_BOLD_BASE64 } from "./fonts/pretendard-bold";
import type {
  Session,
  Subject,
  Student,
  Enrollment,
  Teacher,
} from "@/lib/planner";

export interface PdfRenderOptions {
  academyName?: string;
  filterStudentId?: string;
  filename?: string;
}

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const START_HOUR = 9;
const END_HOUR = 23;

function getCurrentWeekRange(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
}

function getStudentNames(
  session: Session,
  enrollments: Enrollment[],
  students: Student[]
): string[] {
  if (!session.enrollmentIds || session.enrollmentIds.length === 0) return [];
  return session.enrollmentIds.flatMap((eid) => {
    const enrollment = enrollments.find((e) => e.id === eid);
    if (!enrollment) return [];
    const student = students.find((s) => s.id === enrollment.studentId);
    return student ? [student.name] : [];
  });
}

function registerPretendardFont(doc: jsPDF): void {
  doc.addFileToVFS("Pretendard-Regular.ttf", PRETENDARD_REGULAR_BASE64);
  doc.addFont("Pretendard-Regular.ttf", "Pretendard", "normal");
  doc.addFileToVFS("Pretendard-Bold.ttf", PRETENDARD_BOLD_BASE64);
  doc.addFont("Pretendard-Bold.ttf", "Pretendard", "bold");
  doc.setFont("Pretendard", "normal");
}

export function renderSchedulePdf(
  sessions: Session[],
  subjects: Subject[],
  students: Student[],
  enrollments: Enrollment[],
  _teachers: Teacher[],
  options: PdfRenderOptions = {}
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  registerPretendardFont(doc);

  const usedWeekdays = new Set(sessions.map((s) => s.weekday));
  const maxWeekday = usedWeekdays.size > 0 ? Math.max(...usedWeekdays) : 4;
  const weekdayCount = Math.max(5, maxWeekday + 1);
  const dims = calculateGridDimensions(weekdayCount, START_HOUR, END_HOUR);
  const weekdayLabels = WEEKDAY_LABELS.slice(0, weekdayCount);

  drawHeader(doc, dims, {
    academyName: options.academyName ?? "CLASS PLANNER",
    dateRange: getCurrentWeekRange(),
    printDate: new Date().toISOString().slice(0, 10),
  });

  drawGridLines(doc, dims, weekdayLabels, START_HOUR, END_HOUR);

  let targetSessions = sessions;
  if (options.filterStudentId) {
    const studentEnrollmentIds = new Set(
      enrollments
        .filter((e) => e.studentId === options.filterStudentId)
        .map((e) => e.id)
    );
    targetSessions = sessions.filter((s) =>
      s.enrollmentIds?.some((eid) => studentEnrollmentIds.has(eid))
    );
  }

  for (const session of targetSessions) {
    if (!session.startsAt || !session.endsAt) continue;
    const [sh] = session.startsAt.split(":").map(Number);
    if (sh < START_HOUR || sh >= END_HOUR) continue;

    const cell = getCellPosition(
      dims,
      session.weekday,
      session.startsAt,
      session.endsAt,
      START_HOUR
    );
    const enrollment = enrollments.find((e) =>
      session.enrollmentIds?.includes(e.id)
    );
    const subject = enrollment
      ? subjects.find((s) => s.id === enrollment.subjectId)
      : undefined;
    const studentNames = getStudentNames(session, enrollments, students);

    drawSessionBlock(doc, cell, {
      subjectName: subject?.name ?? "",
      studentNames,
      color: subject?.color ?? "#3b82f6",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
    });
  }

  drawFooter(doc, dims);

  const filename =
    options.filename ?? `${options.academyName ?? "시간표"}_전체시간표.pdf`;
  doc.save(filename);
}
```

- [ ] **Step 2: `PdfHeader.ts` — setFont 명시**

`drawHeader` 함수 내 `doc.setFontSize(14)` 앞에 추가:

```ts
doc.setFont("Pretendard", "bold");
```

`drawFooter` 함수 내 `doc.setFontSize(8)` 앞에 추가:

```ts
doc.setFont("Pretendard", "normal");
```

- [ ] **Step 3: `PdfSessionBlock.ts` — setFont 명시**

`drawSessionBlock` 함수 내 첫 번째 `doc.setFontSize(7)` 앞에 추가:

```ts
doc.setFont("Pretendard", "normal");
```

- [ ] **Step 4: `PDFDownloadButton.tsx` — `viewLabel` prop 추가 (D-3)**

파일 전체를 아래로 교체:

```tsx
"use client";
import React from "react";
import { showError } from "../../lib/toast";
import Button from "../atoms/Button";

interface PDFDownloadButtonProps {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel = "시간표",
}) => {
  const handlePDFDownload = async () => {
    onDownloadStart();
    try {
      await onDownload();
    } catch {
      showError("PDF 다운로드에 실패했습니다.");
    } finally {
      onDownloadEnd();
    }
  };

  return (
    <div className="mb-4 text-right">
      <Button
        variant="primary"
        onClick={handlePDFDownload}
        disabled={isDownloading}
      >
        {isDownloading ? "다운로드 중..." : `${viewLabel} PDF 다운로드`}
      </Button>
    </div>
  );
};

export default PDFDownloadButton;
```

- [ ] **Step 5: `PdfDownloadSection.tsx` — `viewLabel` prop 전달**

파일 전체를 아래로 교체:

```tsx
import React from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

type Props = {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
};

export default function PdfDownloadSection({
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel,
}: Props) {
  return (
    <PDFDownloadButton
      onDownload={onDownload}
      isDownloading={isDownloading}
      onDownloadStart={onDownloadStart}
      onDownloadEnd={onDownloadEnd}
      viewLabel={viewLabel}
    />
  );
}
```

- [ ] **Step 6: `schedule/page.tsx` — `viewMode`를 `viewLabel`로 변환해 `PdfDownloadSection`에 전달**

`page.tsx`의 `<PdfDownloadSection` 사용 블록(라인 1092-1109)을 찾아 `viewLabel` prop을 추가:

```tsx
{/* PDF 다운로드 버튼 + 템플릿 버튼 */}
<div className="flex items-center gap-2 flex-wrap">
  <PdfDownloadSection
    onDownload={() =>
      renderSchedulePdf(
        Array.from(displaySessions.values()).flat(),
        subjects,
        students,
        enrollments,
        teachers,
        {
          academyName: "CLASS PLANNER",
          filterStudentId: selectedStudentId ?? undefined,
        }
      )
    }
    isDownloading={isDownloading}
    onDownloadStart={() => setIsDownloading(true)}
    onDownloadEnd={() => setIsDownloading(false)}
    viewLabel={
      viewMode === "daily"
        ? "일별 시간표"
        : viewMode === "monthly"
          ? "월별 시간표"
          : "주간 시간표"
    }
  />
  {/* 나머지 템플릿 버튼들은 그대로 유지 */}
```

---

### Task 7: 테스트 작성 및 실행 (D-2)

**Files:**
- Create: `src/lib/pdf/__tests__/PdfRenderer.test.ts`

- [ ] **Step 1: `PdfRenderer.test.ts` 생성**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// jsPDF mock — 폰트 등록 메서드 스파이
const addFileToVFSMock = vi.fn();
const addFontMock = vi.fn();
const setFontMock = vi.fn();
const setFontSizeMock = vi.fn();
const setTextColorMock = vi.fn();
const setDrawColorMock = vi.fn();
const setLineWidthMock = vi.fn();
const setFillColorMock = vi.fn();
const textMock = vi.fn();
const lineMock = vi.fn();
const rectMock = vi.fn();
const saveMock = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    addFileToVFS: addFileToVFSMock,
    addFont: addFontMock,
    setFont: setFontMock,
    setFontSize: setFontSizeMock,
    setTextColor: setTextColorMock,
    setDrawColor: setDrawColorMock,
    setLineWidth: setLineWidthMock,
    setFillColor: setFillColorMock,
    text: textMock,
    line: lineMock,
    rect: rectMock,
    save: saveMock,
    internal: { scaleFactor: 1 },
  })),
}));

// 폰트 base64 mock (실제 base64 대신 짧은 문자열)
vi.mock("../fonts/pretendard-regular", () => ({
  PRETENDARD_REGULAR_BASE64: "MOCK_REGULAR_BASE64",
}));
vi.mock("../fonts/pretendard-bold", () => ({
  PRETENDARD_BOLD_BASE64: "MOCK_BOLD_BASE64",
}));

import { renderSchedulePdf } from "../PdfRenderer";
import type { Session, Subject, Student, Enrollment, Teacher } from "@/lib/planner";

const emptySessions: Session[] = [];
const emptySubjects: Subject[] = [];
const emptyStudents: Student[] = [];
const emptyEnrollments: Enrollment[] = [];
const emptyTeachers: Teacher[] = [];

describe("renderSchedulePdf — 폰트 등록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Pretendard Regular를 VFS에 등록한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFileToVFSMock).toHaveBeenCalledWith(
      "Pretendard-Regular.ttf",
      "MOCK_REGULAR_BASE64"
    );
  });

  it("Pretendard Bold를 VFS에 등록한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFileToVFSMock).toHaveBeenCalledWith(
      "Pretendard-Bold.ttf",
      "MOCK_BOLD_BASE64"
    );
  });

  it("addFont를 Pretendard normal/bold 두 번 호출한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(addFontMock).toHaveBeenCalledWith(
      "Pretendard-Regular.ttf",
      "Pretendard",
      "normal"
    );
    expect(addFontMock).toHaveBeenCalledWith(
      "Pretendard-Bold.ttf",
      "Pretendard",
      "bold"
    );
  });

  it("초기 폰트를 Pretendard normal로 설정한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers);
    expect(setFontMock).toHaveBeenCalledWith("Pretendard", "normal");
  });

  it("doc.save를 호출한다", () => {
    renderSchedulePdf(emptySessions, emptySubjects, emptyStudents, emptyEnrollments, emptyTeachers, {
      academyName: "테스트학원",
    });
    expect(saveMock).toHaveBeenCalledWith("테스트학원_전체시간표.pdf");
  });
});
```

- [ ] **Step 2: 테스트 실행 → 통과 확인**

```bash
npx vitest run src/lib/pdf/__tests__/PdfRenderer.test.ts 2>&1 | tail -15
```

기대: 5개 케이스 모두 **PASS**

- [ ] **Step 3: 전체 테스트 통과 확인**

```bash
npm run test 2>&1 | tail -15
```

기대: 기존 테스트 포함 모두 PASS.

---

### Task 8: 빌드 확인 + 수동 UI 검증 + 커밋 + PR

- [ ] **Step 1: TypeScript 타입 체크 + 빌드**

```bash
npm run build 2>&1 | tail -15
```

기대: 에러 없이 성공. (폰트 base64 파일이 크면 빌드가 오래 걸릴 수 있음 — 정상)

- [ ] **Step 2: 개발 서버 시작**

```bash
npm run dev &
```

- [ ] **Step 3: Playwright MCP로 PDF 다운로드 검증**

```
mcp__playwright__browser_navigate → http://localhost:3000/schedule
→ viewMode가 "weekly"인지 확인
→ "주간 시간표 PDF 다운로드" 버튼이 보이는지 스크린샷
→ 버튼 클릭
→ 다운로드된 PDF가 열리면 한글 과목명/학생명이 정상 렌더되는지 육안 확인
→ Daily 뷰로 전환 → "일별 시간표 PDF 다운로드" 라벨 확인
→ Monthly 뷰로 전환 → "월별 시간표 PDF 다운로드" 라벨 확인
```

- [ ] **Step 4: 커밋**

```bash
git add \
  scripts/generate-pdf-fonts.mjs \
  src/lib/pdf/fonts/pretendard-regular.ts \
  src/lib/pdf/fonts/pretendard-bold.ts \
  src/lib/pdf/PdfRenderer.ts \
  src/lib/pdf/PdfHeader.ts \
  src/lib/pdf/PdfSessionBlock.ts \
  src/lib/pdf/__tests__/PdfRenderer.test.ts \
  src/components/molecules/PDFDownloadButton.tsx \
  src/app/schedule/_components/PdfDownloadSection.tsx \
  src/app/schedule/page.tsx \
  package.json \
  package-lock.json

git rm src/lib/pdf/fonts/pretendard-subset.ts

git commit -m "$(cat <<'EOF'
fix(pdf): embed Pretendard Korean subset font + dynamic view label

pretendard-subset.ts 빈 플레이스홀더를 제거하고 Pretendard Regular/Bold 서브셋
(한글 음절 11,172자 + 기본 라틴)을 base64로 실탑재. jsPDF addFileToVFS/addFont로
폰트 등록 후 한글 글리프가 정상 렌더됨. PDFDownloadButton에 viewLabel prop 추가해
일별/주간/월별 라벨을 동적으로 표시.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: 푸시 + PR 생성**

```bash
git push -u origin feat/phase5-d-pdf-font

gh pr create \
  --base dev \
  --title "fix(pdf): embed Pretendard Korean font subset + view-aware label (P5-D-2/3)" \
  --body "$(cat <<'EOF'
## Summary
- `pretendard-subset.ts` 빈 플레이스홀더 제거, Pretendard Regular/Bold 서브셋 base64 실탑재
- `PdfRenderer.ts`에 `registerPretendardFont` 추가 — `addFileToVFS`/`addFont`/`setFont` 순서로 등록
- `PDFDownloadButton`에 `viewLabel` prop 추가: 일별/주간/월별 시간표 PDF 다운로드 라벨 동적 표시
- `scripts/generate-pdf-fonts.mjs` 추가 — 향후 폰트 갱신 시 재실행 가능

## Test plan
- [ ] `/schedule`에서 Weekly/Daily/Monthly 각 뷰에서 PDF 다운로드 버튼 라벨 확인
- [ ] 다운로드된 PDF에서 한글 과목명/학생명/시간 텍스트가 정상 렌더 (tofu 없음)
- [ ] `npx vitest run` 전체 통과 (PdfRenderer.test.ts 5개 케이스 포함)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## 최종 E2E 검증 체크리스트

PR 2개가 모두 dev에 머지된 후:

- [ ] 시크릿 브라우저 → `http://localhost:3000` 방문 → DevTools > Application > Storage > localStorage에 `classPlannerData:anonymous` 키 **없음** 확인
- [ ] `/settings` 클릭 → Google 로그인 → 충돌 모달 **없이** 바로 `/schedule` 진입
- [ ] 기존 로컬 데이터가 있는 일반 브라우저로 로그인 → 충돌 모달이 **정상적으로** 뜸
- [ ] Daily 뷰 → "일별 시간표 PDF 다운로드" 클릭 → PDF 한글 정상 렌더
- [ ] Weekly 뷰 → "주간 시간표 PDF 다운로드" 클릭 → PDF 한글 정상 렌더
- [ ] Monthly 뷰 → "월별 시간표 PDF 다운로드" 클릭 → PDF 한글 정상 렌더

---

## Known Risks

1. **`@orioncactus/pretendard` TTF 경로** — `generate-pdf-fonts.mjs`의 `findTtfPath`가 3개 경로를 순차 탐색하지만 패키지 구조가 다를 경우 실패. `find node_modules/@orioncactus/pretendard -name "*.ttf"` 결과를 보고 수동으로 경로 추가.
2. **서브셋 파일 크기** — 전체 Hangul Syllables(11,172자)를 포함하면 base64 인코딩 후 ~2MB 내외. 번들 분리 없이는 `/schedule` 초기 로드가 느려질 수 있음. Phase 5-A에서 dynamic import를 추가하는 것을 고려할 것.
3. **jsPDF VFS global state** — jsPDF VFS는 모듈 레벨 전역 상태. SSR(Next.js) 환경에서 `addFileToVFS`가 서버 측에서 실행되면 안 됨. `PdfRenderer.ts`는 `"use client"` 없이 호출되는 순수 함수이므로 `renderSchedulePdf`를 호출하는 컴포넌트가 클라이언트 컴포넌트임을 반드시 확인할 것 (`schedule/page.tsx`는 현재 `"use client"` 선언 있음 — 안전).
