# Token SSOT 완성 — Design Spec

**Date:** 2026-04-16
**Status:** Approved
**Scope:** tailwind.config.ts 정리 + @theme 토큰 통합 + CSS Modules → Tailwind 전환 + TSX inline hex 제거 + globals.css 스크롤바 정리

## 1. Problem

세 곳에 토큰이 분산되어 있어 유지보수 비용이 높다:

1. `globals.css @theme` — Phase 3에서 추가한 accent, semantic, typography, radius, shadow
2. `tailwind.config.ts theme.extend` — colors, spacing, radius, shadow, transition, zIndex 하드코딩
3. 컴포넌트 레벨 — 14개 CSS Module 파일 + TSX inline style에 ~100개 hex 하드코딩

Tailwind CSS 4.0에서 `@theme` 블록이 `tailwind.config.ts`를 대체하므로, 모든 토큰을 `@theme`으로 통합하고 하드코딩을 제거한다.

## 2. Target State

### Token SSOT: `globals.css @theme`

모든 디자인 토큰의 단일 정의 장소. Tailwind가 이 블록을 읽어 유틸리티 클래스를 자동 생성한다.

```
@theme {
  /* Admin Accent */
  --color-accent: #FBBF24;
  --color-accent-hover: #F59E0B;
  --color-accent-pressed: #D97706;

  /* Semantic */
  --color-semantic-success: #10B981;
  --color-semantic-warning: #F59E0B;
  --color-semantic-danger: #EF4444;
  --color-semantic-info: #3B82F6;

  /* Core Admin (NEW — config에서 이동) */
  --color-primary: #3b82f6;
  --color-primary-light: #dbeafe;
  --color-primary-dark: #2563eb;
  --color-secondary: #6b7280;
  --color-secondary-light: #9ca3af;
  --color-secondary-dark: #4b5563;

  /* Brand (NEW — 로그인 버튼용) */
  --color-brand-google: #4285F4;
  --color-brand-kakao: #FEE500;
  --color-brand-kakao-text: #191919;

  /* Typography */
  --font-sans: 'Pretendard Variable', ...;
  --text-hero: 3rem;
  --text-page: 2rem;
  --text-section: 1.375rem;
  --text-label: 0.8125rem;
  --text-caption: 0.6875rem;

  /* Spacing (NEW — config에서 이동) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Radius */
  --radius-admin-sm: 4px;
  --radius-admin-md: 6px;
  --radius-admin-lg: 8px;

  /* Shadow */
  --shadow-admin-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-admin-md: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-admin-lg: 0 4px 8px rgba(0,0,0,0.15);

  /* Transition (NEW — config에서 이동) */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;

  /* Z-Index (NEW — config에서 이동) */
  --z-dropdown: 10;
  --z-sticky: 50;
  --z-modal: 1000;
  --z-toast: 20000;
  --z-tooltip: 20001;
  --z-overlay: 20002;
}
```

### `:root` (런타임 전용)

`@theme`에 넣지 않는 것들 — 런타임에 동적으로 할당되는 값:

- Subject palette (8색 x 3톤) — `[data-surface]` 스코프에서 동적 할당
- Surface grid 토큰 — `[data-surface="surface"]`에서 오버라이드
- Theme 오버라이드 — `[data-theme="light"]`, `[data-theme="dark"]`

### `tailwind.config.ts` 최종 상태

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
};

export default config;
```

`theme.extend` 블록 전체 제거. `@theme`이 모든 토큰을 담당.

## 3. CSS Modules → Tailwind 전환

### 대상 파일 (14개)

| Module 파일 | 연관 TSX | 주요 변경 |
|---|---|---|
| `Login.module.css` | `login/page.tsx` | purple gradient → accent 기반, hex → Tailwind |
| `LoginButton.module.css` | `LoginButton.tsx` | brand color CSS var 사용, gradient → Tailwind |
| `Button.module.css` | `Button.tsx` | fallback hex 제거, CSS var → Tailwind |
| `StudentInputSection.module.css` | `StudentInputSection.tsx` | danger hex → `text-semantic-danger` |
| 나머지 10개 | 각각 | hex → CSS var 참조 or Tailwind 클래스 |

### 전환 규칙

1. Module의 스타일을 Tailwind 유틸리티 클래스로 인라인 변환
2. 복잡한 스타일 (gradient, animation)은 `globals.css`의 유틸리티 클래스로 추출
3. Module 파일 삭제, TSX에서 `styles.xxx` import 제거
4. Google/Kakao 브랜드 색상은 `--color-brand-*` CSS var 참조

## 4. TSX Inline Hex 정리

| 파일 | 현재 | 변경 |
|---|---|---|
| `page.tsx` (landing) | `text-[#1a1a1a]`, `bg-[#1a1a1a]` | `text-gray-900` or semantic 토큰 |
| `onboarding/page.tsx` | inline gradient hex | accent 토큰 기반 gradient |
| `global-error.tsx` | `background: "#2563eb"` | `bg-primary` |
| `AuthGuard.tsx` | `color: "#6b7280"` | `text-secondary` |
| `AboutPageLayout.tsx` | purple gradient hex | accent 토큰 기반 |
| `TimeTableGrid.tsx` | `backgroundColor: "#f0f0f0"` | Tailwind bg 클래스 |
| `SubjectInputSection.tsx` | `"#f59e0b"` default | `--color-semantic-warning` |
| `settings/page.tsx` | `amber-50/200/800` | accent 토큰 클래스 |
| `invite/[token]/page.tsx` | `amber-50/200/800` | accent 토큰 클래스 |

## 5. globals.css 스크롤바 정리

`.time-table-grid` 스크롤바 pseudo-element 내 ~50개 hex → CSS var 참조.

스크롤바 전용 토큰을 `:root`에 추가:
```css
:root {
  --scrollbar-thumb: #6b7280;
  --scrollbar-thumb-hover: #4b5563;
  --scrollbar-track: #f0f0f0;
}
[data-theme="dark"] {
  --scrollbar-thumb: #9ca3af;
  --scrollbar-thumb-hover: #d1d5db;
  --scrollbar-track: #1f2937;
}
```

## 6. Scope Out (건드리지 않음)

- `src/domain/value-objects/Color.ts` 프리셋 팔레트 — 비즈니스 도메인 데이터
- `useGlobalDataInitialization.ts`, `useSubjectManagementLocal.ts` 기본 과목 색상 — 데이터 초기값
- 테스트 fixture hex 값 — 테스트 데이터
- Subject palette CSS vars — 런타임 동적 할당 (`:root` 유지)

## 7. Verification

1. `npm run build` 성공
2. `npm run check:quick` (tsc + vitest) 통과
3. Playwright MCP: `/login`, `/schedule`, `/students`, `/subjects`, `/settings` 시각 확인
4. Dark mode 토글 시 스크롤바/배경 정상 전환 확인
