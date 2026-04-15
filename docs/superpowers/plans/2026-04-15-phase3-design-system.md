# Phase 3 Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Dual-Mode design system — Admin (Amber Confident) and Surface (Q Pastel) — via Tailwind v4 `@theme` token SSOT, `[data-surface="surface"]` CSS scope, and Pretendard font loading.

**Architecture:** New Phase 3 design tokens are added to `globals.css` as a `@theme` block (additive — no existing classes break). `[data-surface="surface"]` scope overrides inherited dark-mode vars for the schedule grid, locking it to light. Existing `tailwind.config.ts` `extend.colors` entries are preserved (old components still reference them); they will be removed progressively during per-component redesign phases.

**Tech Stack:** Tailwind CSS v4, Next.js 15 App Router, TypeScript 5, CSS Custom Properties, Pretendard (CDN)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/app/layout.tsx` | Modify | Add Pretendard CDN `<link>` in `<head>` |
| `src/app/globals.css` | Modify | Add `@theme` block (new tokens); add subject palette in `:root`; add `[data-surface="surface"]` scope |
| `tailwind.config.ts` | No change | Old classes still used by existing components — preserved until per-component redesign |
| `src/app/schedule/_components/ScheduleGridSection.tsx` | Modify | Add `data-surface="surface"` to wrapper `<div>` |
| `UI_SPEC.md` | Modify | §6 Dual-Mode architecture, §7 Typography tokens |

---

## Task 1: Load Pretendard Font

**Files:**
- Modify: `src/app/layout.tsx` (line 188–196, `<head>` block)

- [ ] **Step 1: Add Pretendard CDN links to `<head>`**

  Replace the existing `<head>` block in `src/app/layout.tsx`:

  ```tsx
  <head>
    <title>Class Planner</title>
    <meta
      name="description"
      content="클래스 플래너 - 학생과 과목을 관리하고 시간표를 만드는 도구"
    />
    <meta
      name="copyright"
      content="© 2024 클래스 플래너. 모든 권리 보유."
    />
    <meta name="author" content="클래스 플래너 개발팀" />
    <meta name="robots" content="index, follow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
  </head>
  ```

- [ ] **Step 2: Verify font loads in browser**

  ```bash
  cd class-planner && npm run dev
  ```

  Open `http://localhost:3000`, open DevTools → Network → filter "pretendard" → confirm 200 response.

- [ ] **Step 3: Commit**

  ```bash
  git checkout -b feat/phase3-design-system
  git add src/app/layout.tsx
  git commit -m "feat(design): load Pretendard variable font via CDN"
  ```

---

## Task 2: Add `@theme` Admin Tokens to `globals.css`

**Files:**
- Modify: `src/app/globals.css` (after line 2 `@import "tailwindcss";`, before line 4 `@custom-variant`)

This block introduces NEW Tailwind utility classes: `bg-accent`, `text-accent`, `border-accent`, `font-sans` (Pretendard), `text-hero`, `text-page`, `text-section`, `rounded-admin-sm/md/lg` etc. No existing classes are changed.

- [ ] **Step 1: Insert `@theme` block after `@import "tailwindcss";`**

  Insert after line 2 (`@import "tailwindcss";`), before line 4 (`@custom-variant dark ...`):

  ```css
  /* ===================================================
     Phase 3 Design System — @theme SSOT
     New tokens for Admin (A) and Surface (C) modes.
     Existing :root vars preserved for backward compat.
     Remove legacy entries when components are redesigned.
  =================================================== */
  @theme {
    /* --- Admin Mode: Accent (Amber Confident) --- */
    --color-accent:         #FBBF24;
    --color-accent-hover:   #F59E0B;
    --color-accent-pressed: #D97706;

    /* --- Semantic (shared by Admin + Surface) --- */
    /* Note: --color-success/warning/danger already exist in :root.
       These @theme entries create new Tailwind classes: bg-success etc.
       The :root values remain for CSS var usage (var(--color-success)). */
    --color-semantic-success: #10B981;
    --color-semantic-warning: #F59E0B;
    --color-semantic-danger:  #EF4444;
    --color-semantic-info:    #3B82F6;

    /* --- Typography --- */
    /* Creates font-sans class using Pretendard */
    --font-sans: 'Pretendard Variable', 'Pretendard', -apple-system,
                 'SF Pro Display', 'Segoe UI', sans-serif;

    /* Custom text scale for Phase 3 components.
       Usage: class="text-hero" (48px/800), "text-page" (32px/800) etc.
       Existing Tailwind text-* utilities (text-xl etc.) are unaffected. */
    --text-hero:    3rem;    /* 48px */
    --text-page:    2rem;    /* 32px */
    --text-section: 1.375rem; /* 22px */
    --text-label:   0.8125rem; /* 13px */
    --text-caption: 0.6875rem; /* 11px */

    /* --- Admin Radius (sharp) --- */
    /* Creates rounded-admin-sm / rounded-admin-md / rounded-admin-lg */
    --radius-admin-sm: 4px;
    --radius-admin-md: 6px;
    --radius-admin-lg: 8px;

    /* --- Shadow --- */
    --shadow-admin-sm: 0 1px 2px rgba(0,0,0,.06);
    --shadow-admin-md: 0 4px 12px rgba(0,0,0,.08);
    --shadow-admin-lg: 0 12px 32px rgba(0,0,0,.12);
  }
  ```

- [ ] **Step 2: Run build to confirm `@theme` compiles without error**

  ```bash
  cd class-planner && npm run build 2>&1 | tail -20
  ```

  Expected: `✓ Compiled successfully` (or equivalent). No "Invalid @theme" errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "feat(design): add @theme admin tokens (accent, typography, radius)"
  ```

---

## Task 3: Add Subject Palette + Surface Scope to `globals.css`

**Files:**
- Modify: `src/app/globals.css`
  - Add subject palette CSS vars to `:root` (dynamic, not `@theme` — assigned at runtime per subject colorKey)
  - Add `[data-surface="surface"]` scope (locks Surface area to light regardless of dark mode)

- [ ] **Step 1: Append subject palette to `:root` block**

  Add inside the existing `:root { ... }` block in `globals.css`, after the `--shadow-*` variables (around line 74), before the closing `}`:

  ```css
    /* --- Surface Mode: Subject Palette (Q Pastel Soft) ---
       8 colors × 3 tones (bg / fg / accent).
       Used by SessionBlock via colorKey lookup.
       Keep as CSS vars (not @theme) — assigned dynamically at runtime. */
    --color-subject-blue-bg:      #DBEAFE;
    --color-subject-blue-fg:      #1E40AF;
    --color-subject-blue-accent:  #3B82F6;

    --color-subject-red-bg:       #FEE2E2;
    --color-subject-red-fg:       #991B1B;
    --color-subject-red-accent:   #EF4444;

    --color-subject-violet-bg:    #EDE9FE;
    --color-subject-violet-fg:    #5B21B6;
    --color-subject-violet-accent:#8B5CF6;

    --color-subject-emerald-bg:   #D1FAE5;
    --color-subject-emerald-fg:   #065F46;
    --color-subject-emerald-accent:#10B981;

    --color-subject-amber-bg:     #FEF3C7;
    --color-subject-amber-fg:     #92400E;
    --color-subject-amber-accent: #F59E0B;

    --color-subject-pink-bg:      #FCE7F3;
    --color-subject-pink-fg:      #9D174D;
    --color-subject-pink-accent:  #EC4899;

    --color-subject-teal-bg:      #CCFBF1;
    --color-subject-teal-fg:      #115E59;
    --color-subject-teal-accent:  #14B8A6;

    --color-subject-orange-bg:    #FFEDD5;
    --color-subject-orange-fg:    #9A3412;
    --color-subject-orange-accent:#F97316;

    /* --- Surface Grid Tokens --- */
    --color-grid-canvas:       #FAFAFA;
    --color-grid-line-major:   #E4E4E7;
    --color-grid-line-minor:   #F4F4F5;
    --color-grid-header-text:  #71717A;
    --color-grid-time-text:    #A1A1AA;
  ```

- [ ] **Step 2: Add `[data-surface="surface"]` scope after the `[data-theme="dark"]` block**

  Append after the closing `}` of `[data-theme="dark"]` (around line 114):

  ```css
  /* Surface Mode — schedule grid + PDF output.
     Overrides inherited dark-mode vars.
     Always light regardless of body[data-theme]. */
  [data-surface="surface"] {
    --color-bg-primary:   #FAFAFA;
    --color-bg-secondary: #FFFFFF;
    --color-bg-tertiary:  #F4F4F5;
    --color-text-primary:    #18181B;
    --color-text-secondary:  #3F3F46;
    --color-text-muted:      #71717A;
    --color-border:          #E4E4E7;
    --color-border-light:    #F4F4F5;
    --color-border-grid:     #E4E4E7;
    --color-border-grid-light:  #EFEFEF;
    --color-border-grid-lighter: #F8F8F8;
  }
  ```

- [ ] **Step 3: Run build**

  ```bash
  cd class-planner && npm run build 2>&1 | tail -10
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "feat(design): add subject palette CSS vars + [data-surface] scope"
  ```

---

## Task 4: Apply `data-surface="surface"` to Schedule Grid Container

**Files:**
- Modify: `src/app/schedule/_components/ScheduleGridSection.tsx`

- [ ] **Step 1: Add `data-surface="surface"` to wrapper div**

  Replace the `return` block in `ScheduleGridSection.tsx`:

  ```tsx
  return (
    <div ref={containerRef} data-surface="surface">
      <TimeTableGrid
        key={gridVersion}
        sessions={sessions}
        subjects={subjects}
        enrollments={enrollments}
        students={students}
        onSessionClick={onSessionClick}
        onDrop={onDrop}
        onSessionDrop={onSessionDrop}
        onEmptySpaceClick={onEmptySpaceClick}
        selectedStudentId={selectedStudentId}
        isStudentDragging={isStudentDragging}
      />
    </div>
  );
  ```

- [ ] **Step 2: Start dev server and verify dark mode isolation**

  ```bash
  cd class-planner && npm run dev
  ```

  1. Open `http://localhost:3000/schedule`
  2. Toggle dark mode (ThemeToggle in nav)
  3. **Expected:** Nav/header turns dark. Grid area stays light (`#FAFAFA` background).
  4. **Verify in DevTools:** Select any element inside the grid → Computed tab → `--color-bg-primary` should show `#FAFAFA` (not `#1f2937`).

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/schedule/_components/ScheduleGridSection.tsx
  git commit -m "feat(design): apply data-surface=surface to schedule grid container"
  ```

---

## Task 5: Full Build + Lint Verification

- [ ] **Step 1: Run full check**

  ```bash
  cd class-planner && npm run check 2>&1
  ```

  Expected output pattern:
  ```
  > tsc --noEmit     → no output (= pass)
  > next lint        → No ESLint warnings or errors
  > next build       → ✓ Compiled successfully
  ```

- [ ] **Step 2: Run unit tests**

  ```bash
  cd class-planner && npx vitest run 2>&1 | tail -10
  ```

  Expected: all tests pass (CSS changes don't touch TS logic).

- [ ] **Step 3: Fix any lint/type errors before proceeding**

  If `@theme` causes TypeScript or lint issues (unlikely — it's CSS only), investigate the error message and fix in `globals.css`.

---

## Task 6: Update UI_SPEC.md

**Files:**
- Modify: `UI_SPEC.md`

- [ ] **Step 1: Update §6 Theme System section**

  Find the `## 6.` section in `UI_SPEC.md` and replace its content:

  ```markdown
  ## 6. 테마 시스템 (Dual-Mode)

  ### 아키텍처
  두 개의 시각 언어가 하나의 토큰 체계 위에서 공존한다. 페이지 단위가 아닌 **표면(surface) 단위**로 모드가 결정된다.

  | 모드 | 적용 영역 | 다크모드 |
  |---|---|---|
  | **Admin (A)** | 랜딩·관리 페이지·`/schedule` chrome | 라이트/다크 전환 지원 |
  | **Surface (C)** | `/schedule` 그리드, SessionBlock, PDF 출력물 | **라이트 고정** |

  ### 구현
  - `ThemeProvider`: `document.body.setAttribute("data-theme", theme)` — dark/light 전환
  - `[data-surface="surface"]` 속성: Surface 컨테이너에 적용. CSS 커스텀 프로퍼티를 라이트 값으로 고정하여 다크모드 상속을 차단.
  - 현재 적용된 컴포넌트: `ScheduleGridSection` (`data-surface="surface"`)

  ### 토큰 SSOT
  `src/app/globals.css`의 `@theme` 블록이 Phase 3 신규 토큰의 단일 소스.
  - **Admin 토큰**: `--color-accent (#FBBF24)`, `--font-sans (Pretendard)`, `--text-hero/page/section/label/caption`, `--radius-admin-sm/md/lg`, `--shadow-admin-sm/md/lg`
  - **Surface 과목 팔레트**: `:root`의 `--color-subject-{color}-{bg|fg|accent}` (8색 × 3 tone)
  - **Surface 그리드 토큰**: `--color-grid-canvas/line-major/line-minor/header-text/time-text`
  - **레거시 토큰** (`:root` + `[data-theme]`): 기존 컴포넌트가 참조 중. 컴포넌트별 리뉴얼 시 점진 교체.

  ### 다크모드 동작
  - `body[data-theme="dark"]` → Admin 영역 전체 다크 적용 (`@custom-variant dark` in globals.css)
  - `[data-surface="surface"]` 하위 요소 → 라이트 고정 (`[data-surface="surface"]` 블록이 상속된 다크 CSS 변수를 오버라이드)
  ```

- [ ] **Step 2: Add/update §7 Typography Tokens section**

  Add after §6 (or update if §7 exists):

  ```markdown
  ## 7. 타이포그래피 시스템

  ### 폰트
  - **Primary**: Pretendard Variable (CDN: jsdelivr.net/gh/orioncactus/pretendard)
  - **Fallback**: `-apple-system`, `SF Pro Display`, `Segoe UI`, `sans-serif`
  - **적용**: `font-sans` Tailwind 클래스 (Phase 3 신규 컴포넌트부터). 레거시 컴포넌트는 기존 system font 유지.

  ### 스케일 (`@theme` 정의)

  | 클래스 | 크기 | 굵기 | Letter-spacing | 용도 |
  |---|---|---|---|---|
  | `text-hero` | 48px (3rem) | 800 | −3.5% | 랜딩 Hero 헤드라인 |
  | `text-page` | 32px (2rem) | 800 | −3.5% | 페이지 타이틀 |
  | `text-section` | 22px (1.375rem) | 700 | −2% | 섹션 헤더 |
  | `text-label` | 13px (0.8125rem) | 500 | −2% | 라벨·메타 |
  | `text-caption` | 11px (0.6875rem) | 600 | −2% | 오버라인·캡션 |
  | (Tailwind 기본 `text-base`) | 16px | 400 | −2% | 본문 (기본 유지) |

  > **Note:** `font-weight`와 `letter-spacing`은 `@theme`으로 자동 생성되지 않으므로 컴포넌트에서 직접 지정. 예: `className="text-hero font-[800] tracking-[-0.035em]"`

  ### 카피 보이스 가이드 (Admin 영역)
  - 헤드라인: 따뜻한 2인칭, 구체적 가치 — "원장님의 1시간을 아껴드립니다"
  - 버튼: 동사 중심, 간결 — "무료로 시작", "시간표 만들기"
  - 에러: 비난하지 않는 톤 — "충돌이 있어요. 한 번 확인해주세요"
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add UI_SPEC.md
  git commit -m "docs(ui-spec): update §6 dual-mode theme + add §7 typography system"
  ```

---

## Task 7: PR → dev

- [ ] **Step 1: Push branch**

  ```bash
  git push -u origin feat/phase3-design-system
  ```

- [ ] **Step 2: Create PR**

  ```bash
  gh pr create \
    --base dev \
    --title "feat(design): Phase 3 design system token SSOT + dual-mode scope" \
    --body "$(cat <<'EOF'
  ## Summary
  - Loads Pretendard Variable font via CDN
  - Adds `@theme` block to `globals.css` with Phase 3 Admin tokens (accent #FBBF24, typography scale, radius, shadow)
  - Adds subject palette CSS vars (8 colors × 3 tones) and Surface grid tokens to `:root`
  - Adds `[data-surface="surface"]` CSS scope that locks Surface area to light regardless of dark mode
  - Applies `data-surface="surface"` to `ScheduleGridSection` wrapper div
  - Updates `UI_SPEC.md` §6 (dual-mode architecture) + §7 (typography system)
  - No existing classes broken: `tailwind.config.ts extend.colors` preserved for backward compat

  ## Test plan
  - [ ] `npm run check` passes (tsc + lint + build)
  - [ ] Vitest unit tests all pass
  - [ ] `/schedule` in dark mode: grid stays light, nav/chrome turns dark
  - [ ] DevTools Computed: `--color-bg-primary` inside `[data-surface="surface"]` = `#FAFAFA`
  - [ ] DevTools Computed: `--color-accent` = `#FBBF24` on any element
  - [ ] `font-sans` class applies Pretendard (Network tab shows CDN load)

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```

- [ ] **Step 3: Confirm CI passes**

  ```bash
  gh pr checks
  ```

  Expected: all checks green.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ `@theme` SSOT — Task 2
- ✅ Subject palette — Task 3
- ✅ `[data-surface="surface"]` scope — Task 3 + 4
- ✅ Pretendard font — Task 1
- ✅ UI_SPEC.md §6/§7 update — Task 6
- ✅ `tailwind.config.ts extend.colors` not removed (backward compat — existing `bg-primary` etc. still needed by 4 component files confirmed by grep)
- ⏭ PDF output `data-surface` — deferred to PDF redesign spec (PDF is rendered via separate jspdf path, not React tree)

**Backward compat verified:**
- `bg-primary`, `text-primary` etc. still work (config unchanged)
- `:root` CSS vars still intact (`var(--color-bg-primary)` references in layout.tsx nav/footer still valid)
- New `@theme` vars (`--color-accent` etc.) are purely additive

**Naming consistency:**
- `--color-subject-blue-bg` / `-fg` / `-accent` used consistently across all 8 color entries
- `--radius-admin-*` prefixed to avoid collision with Tailwind's default `rounded-sm/md/lg`
- `--shadow-admin-*` prefixed for same reason
