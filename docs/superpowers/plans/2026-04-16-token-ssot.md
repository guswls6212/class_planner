# Token SSOT 완성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 디자인 토큰을 `@theme` SSOT로 통합하고, tailwind.config.ts 제거, CSS Modules를 Tailwind 클래스로 전환, 컴포넌트 inline hex 제거.

**Architecture:** Tailwind CSS 4.0의 `@theme` 블록이 유일한 토큰 정의 소스. `:root`는 런타임 동적 값(subject palette, theme variants)만 보유. `tailwind.config.ts`는 v4에서 `@config` 없이 로드되지 않아 현재 죽은 코드 — 삭제.

**Tech Stack:** Tailwind CSS 4.0, Next.js 15 App Router, React 19, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-04-16-token-ssot-design.md`

---

## File Structure

### 수정 대상

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/globals.css` | @theme 토큰 확장, :root 정리, `.flex` 유틸리티 제거, 스크롤바 hex → var |
| `tailwind.config.ts` | content-only로 축소 또는 삭제 |
| `src/app/login/page.tsx` | CSS Module → Tailwind, inline hex 제거 |
| `src/app/login/Login.module.css` | 삭제 |
| `src/components/organisms/LoginButton.tsx` | CSS Module → Tailwind |
| `src/components/organisms/LoginButton.module.css` | 삭제 |
| `src/components/molecules/DataConflictModal.tsx` | CSS Module → Tailwind |
| `src/components/molecules/DataConflictModal.module.css` | 삭제 |
| `src/app/schedule/Schedule.module.css` | 삭제 |
| `src/app/schedule/page.tsx` | CSS Module → Tailwind |
| `src/components/molecules/ConfirmModal.tsx` | CSS Module → Tailwind, hex 제거 |
| `src/components/molecules/ConfirmModal.module.css` | 삭제 |
| `src/components/atoms/Button.tsx` | CSS Module → Tailwind |
| `src/components/atoms/Button.module.css` | 삭제 |
| `src/components/atoms/Label.tsx` | CSS Module → Tailwind |
| `src/components/atoms/Label.module.css` | 삭제 |
| `src/components/atoms/Input.tsx` | CSS Module → Tailwind |
| `src/components/atoms/Input.module.css` | 삭제 |
| `src/components/atoms/SubjectListItem.tsx` | CSS Module → Tailwind |
| `src/components/atoms/SubjectListItem.module.css` | 삭제 |
| `src/components/atoms/StudentListItem.tsx` | CSS Module → Tailwind |
| `src/components/atoms/StudentListItem.module.css` | 삭제 |
| `src/components/molecules/StudentInputSection.tsx` | CSS Module → Tailwind |
| `src/components/molecules/StudentInputSection.module.css` | 삭제 |
| `src/components/molecules/SubjectInputSection.tsx` | CSS Module → Tailwind, default hex 제거 |
| `src/components/molecules/SubjectInputSection.module.css` | 삭제 |
| `src/components/molecules/StudentList.tsx` | CSS Module → Tailwind |
| `src/components/molecules/StudentList.module.css` | 삭제 |
| `src/components/molecules/SubjectList.tsx` | CSS Module → Tailwind |
| `src/components/molecules/SubjectList.module.css` | 삭제 |
| `src/app/onboarding/page.tsx` | inline hex → Tailwind |
| `src/app/global-error.tsx` | inline hex → Tailwind |
| `src/components/atoms/AuthGuard.tsx` | inline hex → Tailwind |
| `src/app/page.tsx` | arbitrary hex → 토큰 클래스 |
| `src/components/organisms/TimeTableGrid.tsx` | inline hex → var |
| `src/app/invite/[token]/page.tsx` | inline hex → Tailwind |

### 스코프 외 (건드리지 않음)
- `src/domain/value-objects/Color.ts` — 비즈니스 도메인 데이터
- `src/hooks/useGlobalDataInitialization.ts` — 기본 과목 색상 데이터
- `src/hooks/useSubjectManagementLocal.ts` — 기본 과목 색상 데이터
- 테스트 fixture hex 값

---

## Task 1: Foundation — @theme 확장 + tailwind.config.ts 제거

**Files:**
- Modify: `src/app/globals.css:9-48` (@theme 블록)
- Modify: `src/app/globals.css:58-170` (:root 블록 정리)
- Modify: `src/app/globals.css:239-242` (.flex 유틸리티 제거)
- Delete: `tailwind.config.ts`

### 핵심 원칙

`tailwind.config.ts`는 Tailwind v4에서 `@config` 없이 로드되지 않으므로 현재 **죽은 코드**. 삭제해도 동작 변경 없음.

`:root`의 theme-variant 토큰(`--color-bg-*`, `--color-text-*`, `--color-border-*`)은 `[data-theme]`으로 오버라이드되므로 `@theme`에 넣지 않고 `:root`에 유지. 컴포넌트에서 `bg-[--color-bg-primary]` arbitrary value로 사용.

`@theme`에 추가할 토큰: brand 색상, 스크롤바 토큰 (Task 7에서 사용).

- [ ] **Step 1: @theme 블록 확장**

`src/app/globals.css`의 `@theme` 블록에 추가:

```css
@theme {
  /* 기존 accent, semantic, typography, radius, shadow 유지 */

  /* --- Brand Colors (login buttons) --- */
  --color-brand-google: #4285F4;
  --color-brand-kakao-bg: #FEE500;
  --color-brand-kakao-text: #191919;

  /* --- Legacy Primary/Secondary (기존 컴포넌트 호환) --- */
  --color-primary: #3b82f6;
  --color-primary-light: #dbeafe;
  --color-primary-dark: #2563eb;
  --color-secondary: #6b7280;
  --color-secondary-light: #9ca3af;
  --color-secondary-dark: #4b5563;
}
```

주의: `:root`에 이미 `--color-primary`가 있음. `@theme`에도 같은 이름으로 정의하면 `@theme`이 기본값, `:root`이 런타임 오버라이드 역할. `@theme`의 값이 Tailwind 유틸리티 클래스 `bg-primary`, `text-primary` 등을 생성.

- [ ] **Step 2: globals.css에서 중복 .flex 유틸리티 제거**

Line 239-242의 `.flex { display: flex; }` 제거. Tailwind가 이미 생성.

- [ ] **Step 3: :root 블록 내 잘못 배치된 list-style 리셋 수정**

`:root` 블록 내(line 102-118)에 `ul, ol, li` 셀렉터가 잘못 중첩되어 있음. `:root` 블� 밖으로 이동하거나, 이미 Tailwind preflight가 처리하면 제거.

- [ ] **Step 4: tailwind.config.ts 삭제**

```bash
rm tailwind.config.ts
```

`@source "../"` (globals.css line 53)가 content 스캔을 대체하므로 content 배열도 불필요.

- [ ] **Step 5: 빌드 검증**

```bash
npm run check:quick
```

Expected: tsc + vitest 통과. tailwind.config.ts 삭제가 빌드에 영향 없음을 확인.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(tokens): expand @theme SSOT + remove dead tailwind.config.ts"
```

---

## Task 2: Login 페이지 — CSS Module → Tailwind

**Files:**
- Modify: `src/app/login/page.tsx`
- Delete: `src/app/login/Login.module.css` (178 lines, 21 hex values)
- Modify: `src/components/organisms/LoginButton.tsx`
- Delete: `src/components/organisms/LoginButton.module.css` (312 lines, 6 hex values)

### 전환 패턴

이 컴포넌트들은 현재 purple gradient (`#667eea` → `#764ba2`)를 사용. Phase 3 디자인 시스템에서 accent(Amber)로 전환이 목표지만, 이 Task에서는 **hex 제거와 Module 전환**에 집중. 색상 자체의 디자인 변경은 Schedule Grid UI 개선 때 별도 진행.

전환 전략:
- gradient hex → CSS var 참조 (`bg-gradient-to-br from-[--color-primary-dark] to-[--color-secondary-dark]` 등)
- 또는 gradient를 globals.css에 유틸리티 클래스로 추출
- Google/Kakao brand 색상 → `bg-brand-google`, `bg-brand-kakao-bg`, `text-brand-kakao-text`
- error 색상 → `text-semantic-danger`, `bg-red-50`, `border-red-200`
- gray 계열 → `text-gray-500`, `bg-gray-50` 등 Tailwind 기본 palette 또는 `text-[--color-text-muted]`

- [ ] **Step 1: login/page.tsx 읽기 — 현재 Module 사용 패턴 파악**

`Login.module.css`의 각 클래스가 어떤 요소에 적용되는지 매핑. Module import 구문과 `styles.xxx` 사용처 목록화.

- [ ] **Step 2: Login.module.css의 스타일을 login/page.tsx에 Tailwind 클래스로 인라인 변환**

변환 규칙:
- `color: #1f2937` → `text-gray-800`
- `color: #6b7280` → `text-gray-500`
- `background: linear-gradient(135deg, #667eea, #764ba2)` → `bg-gradient-to-br from-[#667eea] to-[#764ba2]` (gradient는 arbitrary value 유지 — 나중에 accent로 교체 예정)
- `border: 1px solid #d1d5db` → `border border-gray-300`
- `background-color: #f9fafb` → `bg-gray-50`
- `color: #dc2626` → `text-semantic-danger`
- `background-color: #fef2f2` → `bg-red-50`
- Google SVG 내 hex → 유지 (SVG 내부 fill 값은 브랜드 고정)

- [ ] **Step 3: login/page.tsx에서 inline style hex 제거**

inline `style={{ color: "#6b7280" }}` 등을 Tailwind 클래스로 대체.

- [ ] **Step 4: Login.module.css 삭제 + import 제거**

login/page.tsx에서 `import styles from "./Login.module.css"` 제거. 파일 삭제.

- [ ] **Step 5: LoginButton.tsx — Module → Tailwind 전환**

`LoginButton.module.css` 읽기 → Tailwind 클래스로 변환 → Module 삭제.
- purple gradient → arbitrary gradient 또는 `bg-primary-dark`
- Google 파란색 → `bg-brand-google`
- Kakao 노란색 → `bg-brand-kakao-bg text-brand-kakao-text`

- [ ] **Step 6: LoginButton.module.css 삭제 + import 제거**

- [ ] **Step 7: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(login): convert CSS Modules to Tailwind + remove hardcoded hex"
```

---

## Task 3: DataConflictModal — CSS Module → Tailwind

**Files:**
- Modify: `src/components/molecules/DataConflictModal.tsx`
- Delete: `src/components/molecules/DataConflictModal.module.css` (564 lines, 30+ hex values)

이 파일이 **가장 큰 CSS Module** (564 lines). 주의하여 전환.

- [ ] **Step 1: DataConflictModal.module.css 읽기 — 클래스 매핑**

모든 클래스명과 사용하는 hex 값 목록화. 어떤 CSS 속성이 어떤 hex를 사용하는지 파악.

- [ ] **Step 2: DataConflictModal.tsx 읽기 — styles.xxx 사용처 파악**

각 `styles.xxx`가 어떤 JSX 요소에 적용되는지 매핑.

- [ ] **Step 3: Module 스타일을 Tailwind 클래스로 전환**

변환 규칙:
- `#1e293b` (slate-800) → `text-slate-800` 또는 `bg-slate-800`
- `#f1f5f9` (slate-100) → `bg-slate-100`
- `#6366f1` (indigo-500) → `text-indigo-500`
- `#4f46e5` (indigo-600) → `bg-indigo-600`
- `#fbbf24` (amber-400) → `text-accent` (Phase 3 토큰)
- `#f87171` (red-400) → `text-red-400`
- `#fff` → `bg-white`
- `#cbd5e1` (slate-300) → `border-slate-300`
- media queries → Tailwind responsive prefix (`sm:`, `md:`)
- animation/keyframes → globals.css에 유틸리티로 추출하거나 Tailwind animate 사용

- [ ] **Step 4: DataConflictModal.module.css 삭제 + import 제거**

- [ ] **Step 5: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(modal): convert DataConflictModal CSS Module to Tailwind"
```

---

## Task 4: Schedule 영역 — CSS Module → Tailwind

**Files:**
- Modify: `src/app/schedule/page.tsx`
- Delete: `src/app/schedule/Schedule.module.css` (396 lines, 2 hex values)
- Modify: `src/components/molecules/ConfirmModal.tsx`
- Delete: `src/components/molecules/ConfirmModal.module.css` (77 lines, 4 hex values)

- [ ] **Step 1: Schedule.module.css 읽기 + page.tsx styles 매핑**

Schedule.module.css는 hex가 2개뿐(`#fff`, `#ffffff`)이지만 396 lines. 주로 레이아웃/위치 관련 스타일.

- [ ] **Step 2: Schedule page.tsx — Module → Tailwind 전환**

`styles.xxx` → Tailwind 클래스. `#fff`/`#ffffff` → `bg-white`.

- [ ] **Step 3: Schedule.module.css 삭제 + import 제거**

- [ ] **Step 4: ConfirmModal.tsx — Module → Tailwind 전환**

hex 매핑:
- `#1a1a1a` → `text-gray-900`
- `#333` → `text-gray-700`
- `#ffffff` → `bg-white`
- `#cccccc` → `border-gray-300`

- [ ] **Step 5: ConfirmModal.module.css 삭제 + import 제거**

- [ ] **Step 6: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(schedule): convert Schedule + ConfirmModal CSS Modules to Tailwind"
```

---

## Task 5: Atoms — CSS Module → Tailwind

**Files:**
- Modify + Delete Module: `Button.tsx` / `Button.module.css` (88 lines, 4 hex)
- Modify + Delete Module: `Label.tsx` / `Label.module.css` (96 lines, 0 hex)
- Modify + Delete Module: `Input.tsx` / `Input.module.css` (59 lines, 0 hex)
- Modify + Delete Module: `SubjectListItem.tsx` / `SubjectListItem.module.css` (137 lines, 0 hex)
- Modify + Delete Module: `StudentListItem.tsx` / `StudentListItem.module.css` (65 lines, 0 hex)

- [ ] **Step 1: Button — Module → Tailwind**

`Button.module.css` 읽기. hex 매핑:
- `#ef4444` fallback → `text-semantic-danger`
- `#ffffff` → `text-white`
- `#dc2626` fallback → `text-red-700`
- `var()` fallback hex 제거 — CSS var만 사용

Button.tsx에서 `styles.xxx` → Tailwind 클래스. `Button.module.css` 삭제.

- [ ] **Step 2: Label — Module → Tailwind**

hex 없음. 순수 레이아웃/타이포그래피 스타일 → Tailwind. `Label.module.css` 삭제.

- [ ] **Step 3: Input — Module → Tailwind**

hex 없음. 폼 요소 스타일 → Tailwind. `Input.module.css` 삭제.

- [ ] **Step 4: SubjectListItem — Module → Tailwind**

hex 없음. 리스트 아이템 스타일 → Tailwind. `SubjectListItem.module.css` 삭제.

- [ ] **Step 5: StudentListItem — Module → Tailwind**

hex 없음. 리스트 아이템 스타일 → Tailwind. `StudentListItem.module.css` 삭제.

- [ ] **Step 6: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(atoms): convert Button/Label/Input/ListItem CSS Modules to Tailwind"
```

---

## Task 6: Molecules — CSS Module → Tailwind

**Files:**
- Modify + Delete Module: `StudentInputSection.tsx` / `.module.css` (33 lines, 3 hex)
- Modify + Delete Module: `SubjectInputSection.tsx` / `.module.css` (56 lines, 3 hex)
- Modify + Delete Module: `StudentList.tsx` / `.module.css` (66 lines, 0 hex)
- Modify + Delete Module: `SubjectList.tsx` / `.module.css` (119 lines, 0 hex)

- [ ] **Step 1: StudentInputSection — Module → Tailwind**

hex 매핑:
- `#ef4444` → `text-semantic-danger`
- `#fef2f2` → `bg-red-50`
- `#fecaca` → `border-red-200`

`StudentInputSection.module.css` 삭제.

- [ ] **Step 2: SubjectInputSection — Module → Tailwind + default hex 제거**

Module hex 매핑:
- `#ef4444` → `text-semantic-danger`
- `#fef2f2` → `bg-red-50`
- `#fecaca` → `border-red-200`

TSX 내 `#f59e0b` default color → `"var(--color-semantic-warning)"` 또는 CSS var 참조.

`SubjectInputSection.module.css` 삭제.

- [ ] **Step 3: StudentList — Module → Tailwind**

hex 없음. 리스트 레이아웃 → Tailwind. `StudentList.module.css` 삭제.

- [ ] **Step 4: SubjectList — Module → Tailwind**

hex 없음. 리스트 레이아웃 → Tailwind. `SubjectList.module.css` 삭제.

- [ ] **Step 5: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(molecules): convert InputSection/List CSS Modules to Tailwind"
```

---

## Task 7: globals.css 스크롤바 hex → CSS var

**Files:**
- Modify: `src/app/globals.css:266-848` (스크롤바 스타일 섹션)

- [ ] **Step 1: 스크롤바 CSS var 추가**

`:root` 블록에 추가:
```css
/* Scrollbar */
--scrollbar-thumb: #6b7280;
--scrollbar-thumb-hover: #4b5563;
--scrollbar-track: #f0f0f0;
--scrollbar-border: #ddd;
```

`[data-theme="dark"]`에 오버라이드:
```css
--scrollbar-thumb: #9ca3af;
--scrollbar-thumb-hover: #d1d5db;
--scrollbar-track: #1f2937;
--scrollbar-border: #374151;
```

- [ ] **Step 2: .time-table-grid 스크롤바 스타일 내 hex → var() 변환**

모든 스크롤바 관련 hex를 `var(--scrollbar-*)` 참조로 교체.

예:
- `background: #f0f0f0` → `background: var(--scrollbar-track)`
- `background: #6b7280` → `background: var(--scrollbar-thumb)`
- `border-color: #ddd` → `border-color: var(--scrollbar-border)`

- [ ] **Step 3: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css && git commit -m "feat(styles): replace scrollbar hardcoded hex with CSS vars"
```

---

## Task 8: TSX inline hex 정리

**Files:**
- Modify: `src/app/page.tsx` (3 arbitrary hex)
- Modify: `src/app/onboarding/page.tsx` (gradient hex + disabled border)
- Modify: `src/app/global-error.tsx` (3 hex)
- Modify: `src/components/atoms/AuthGuard.tsx` (1 hex)
- Modify: `src/components/organisms/TimeTableGrid.tsx` (3 hex — scrollbar inline)
- Modify: `src/app/invite/[token]/page.tsx` (gradient hex)

- [ ] **Step 1: page.tsx (landing) — arbitrary hex 제거**

- `text-[#1a1a1a]` → `text-gray-900`
- `text-[#999]` → `text-gray-400`
- `bg-[#1a1a1a]` → `bg-gray-900`

- [ ] **Step 2: onboarding/page.tsx — gradient + disabled hex 제거**

- `linear-gradient(135deg, #667eea, #764ba2)` → `bg-gradient-to-br from-[#667eea] to-[#764ba2]` (Tailwind arbitrary, 추후 accent 전환 시 교체)
- `#d1d5db` disabled border → `border-gray-300`

- [ ] **Step 3: global-error.tsx — inline style hex 제거**

- `#666` → `text-gray-500` (className)
- `#2563eb` → `bg-primary-dark` (className)
- `#fff` → `text-white` (className)

inline style → Tailwind className으로 이동.

- [ ] **Step 4: AuthGuard.tsx — inline hex 제거**

- `color: "#6b7280"` → `text-gray-500` (className)

- [ ] **Step 5: TimeTableGrid.tsx — scrollbar inline hex 제거**

- `backgroundColor: "#f0f0f0"` → `backgroundColor: "var(--scrollbar-track)"`
- `border-color: #ddd` → `borderColor: "var(--scrollbar-border)"`
- `background: #666` → `background: "var(--scrollbar-thumb)"`

(이 파일은 inline style로 scrollbar 제어 — CSS var 참조로 전환)

- [ ] **Step 6: invite/[token]/page.tsx — gradient hex 제거**

- `linear-gradient(135deg, #667eea, #764ba2)` → Tailwind gradient 또는 CSS var

- [ ] **Step 7: 빌드 검증**

```bash
npm run check:quick
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(ui): replace inline hex values with Tailwind classes and CSS vars"
```

---

## Task 9: 문서 동기화 + 최종 검증

**Files:**
- Modify: `tree.txt`
- Modify: `TASKS.md`
- Modify: `UI_SPEC.md` (필요 시)

- [ ] **Step 1: tree.txt 업데이트**

삭제된 14개 .module.css 파일 반영. `tailwind.config.ts` 삭제 반영.

- [ ] **Step 2: TASKS.md 업데이트**

"Token SSOT implementation" 항목 체크.

- [ ] **Step 3: 전체 빌드 + 테스트**

```bash
npm run check
```

Expected: tsc + lint + vitest + build 모두 통과.

- [ ] **Step 4: Playwright MCP 시각 검증**

dev 서버 시작 (`npm run dev`) 후:
1. `/login` — 로그인 페이지 렌더링, 버튼 스타일 확인
2. `/schedule` — 시간표 그리드, 모달, 스크롤바 확인
3. `/students` — 학생 목록/입력 확인
4. `/subjects` — 과목 목록/입력 확인
5. `/settings` — 설정 페이지 확인
6. Dark mode 토글 → 각 페이지 다크모드 스타일 정상 확인

스크린샷 캡처하여 UI Verification Report 작성.

- [ ] **Step 5: Commit + PR**

```bash
git add -A && git commit -m "docs: sync tree.txt + TASKS.md for Token SSOT completion"
git push -u origin feat/token-ssot
gh pr create --base dev --title "feat(tokens): Token SSOT completion" --body "..."
```
