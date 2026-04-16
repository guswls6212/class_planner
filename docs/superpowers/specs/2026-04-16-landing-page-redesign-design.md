# Landing Page Redesign — Product-Led Design Spec

**Date:** 2026-04-16
**Phase:** Phase 3 (UI/UX 개선)
**Approach:** C. Product-Led — 시간표 실물 목업 중심

## 1. 목적

현재 랜딩 페이지(`page.tsx`)는 보라-파랑 그라데이션에 인라인 스타일로 작성되어 Phase 3 디자인 토큰을 전혀 활용하지 않고 있다. 이번 리디자인의 목표:

- **전환 중심 (CTA):** 비로그인 사용자를 가입/로그인으로 유도
- **타겟 오디언스:** 학원 운영자뿐 아니라 과외/그룹과외/방과후 등 넓은 교육 종사자
- **가치 제안:** 시간 절약 + 간편함/직관성 + 무료/즉시 시작 (복합)
- **디자인 원칙:** Product-Led — 시간표 목업이 제품을 대변

## 2. 범위

| 대상 | 작업 | 스코프 |
|------|------|--------|
| `src/app/page.tsx` | 전면 재작성 | 이번 스코프 |
| `src/app/layout.tsx` — Navigation | 랜딩 전용 간소 Nav 분기 | 이번 스코프 |
| `src/app/layout.tsx` — Footer | 디자인 토큰으로 inline→Tailwind 전환 | 이번 스코프 |
| `src/app/globals.css` | 랜딩 전용 토큰 추가 (필요 시) | 이번 스코프 |
| `UI_SPEC.md` | 랜딩 페이지 섹션 업데이트 | 이번 스코프 |
| About 페이지 | 변경 없음 | 스코프 밖 |
| LoginButton | 변경 없음 | 스코프 밖 |

## 3. 페이지 구조

### 3.1 Landing Navigation (랜딩 전용)

`pathname === "/"` 일 때 간소화된 Nav를 렌더링한다.

```
┌──────────────────────────────────────────────────────┐
│  🗓 클래스 플래너              로그인  [무료로 시작] │
└──────────────────────────────────────────────────────┘
```

- **왼쪽:** 로고 텍스트 (font-weight: 800, text-lg)
- **오른쪽:** "로그인" 텍스트 링크 + "무료로 시작" Amber CTA 버튼
- 내부 페이지 링크(학생/과목/시간표/설정/소개) 제거
- ThemeToggle 제거 (랜딩에서는 라이트모드 고정 또는 시스템 따름)
- 로그인 상태일 때: 기존 풀 Nav로 폴백 (내부 링크 + ThemeToggle + 아바타)

### 3.2 Hero Section (Split → Stack 반응형)

```
Desktop (md↑):
┌─────────────────────────────────────────────────────┐
│                                                     │
│  무료 시간표 관리 도구          ┌─────────────────┐  │
│                                │  월  화  수  목  │  │
│  수업 시간표,                  │ ┌──┐    ┌──┐    │  │
│  5분이면 충분합니다            │ │수학│   │수학│   │  │
│                                │ └──┘    └──┘    │  │
│  학생 등록부터 시간표 완성,    │    ┌──┐         │  │
│  PDF 출력까지.                 │    │영어│        │  │
│                                │    └──┘         │  │
│  [무료로 시작하기] [자세히↓]   └─────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘

Mobile (sm):
┌─────────────────────┐
│  무료 시간표 관리 도구│
│                      │
│  수업 시간표,        │
│  5분이면 충분합니다  │
│  ...                 │
│  [무료로 시작하기]   │
│                      │
│  ┌────────────────┐  │
│  │  시간표 목업    │  │
│  └────────────────┘  │
└─────────────────────┘
```

**레이아웃:**
- Desktop: `flex-row`, 좌측 flex-1 (텍스트), 우측 flex-[1.2] (목업)
- Mobile: `flex-col`, 텍스트 먼저 → 목업 아래

**텍스트 구성:**
- 오버라인: "무료 시간표 관리 도구" — `text-caption`, `text-accent`, `tracking-widest`, `uppercase`
- 헤드라인: "수업 시간표, 5분이면 충분합니다" — `text-hero`, `font-[800]`, `tracking-[-3.5%]`
- 서브카피: "학생 등록부터 시간표 완성, PDF 출력까지. 복잡한 설정 없이 바로 시작하세요." — `text-label` 또는 `text-[15px]`, `text-[--color-text-muted]`
- Primary CTA: "무료로 시작하기" → `/schedule` — `bg-accent`, `text-[#1a1a1a]`, `font-bold`, `rounded-admin-md`, `shadow-admin-md`
- Secondary CTA: "자세히 보기 ↓" — `border`, `text-muted`, 앵커 스크롤 to 3단계 섹션

**시간표 목업:**
- 정적 HTML/CSS 시간표 그리드 (실제 데이터 아님)
- 과목 팔레트 8색 중 5-6색 사용 (blue, red, violet, emerald, amber, pink)
- `rounded-admin-lg`, `shadow-admin-lg`, `border border-[--color-border-light]`
- 데코레이션 용도이므로 `aria-hidden="true"`

### 3.3 Steps Section ("이렇게 만들어집니다")

```
┌─────────────────────────────────────────────────────┐
│              이렇게 만들어집니다                     │
│              3단계면 시간표 완성                     │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ ① 학생·  │  │ ② 시간표│  │ ③ PDF로 │             │
│  │   과목   │  │   에     │  │   출력  │             │
│  │   등록   │  │   배치   │  │         │             │
│  └─────────┘  └─────────┘  └─────────┘             │
└─────────────────────────────────────────────────────┘
```

- 제목: "이렇게 만들어집니다" — `text-section`, `font-bold`, `text-center`
- 부제: "3단계면 시간표 완성" — `text-label`, `text-muted`, `text-center`
- 3개 카드: `flex gap-8`, 모바일에서 `flex-col`
  - 각 카드: `bg-[--color-bg-secondary]`, `rounded-admin-lg`, `border`, `p-7`
  - 숫자 뱃지: `w-9 h-9`, `bg-accent`, `rounded-full`, `font-[800]`, `text-[#1a1a1a]`
  - 제목: `font-bold`, `text-base`
  - 설명: `text-label`, `text-muted`, `leading-relaxed`

**Step 내용:**
1. **학생·과목 등록** — "이름만 입력하면 끝. 검색으로 빠르게 찾고, 과목별 색상이 자동 배정됩니다."
2. **시간표에 배치** — "요일과 시간을 선택하고 수업을 추가. 한눈에 보이는 주간 시간표가 완성됩니다."
3. **PDF로 출력** — "완성된 시간표를 PDF로 다운로드. 바로 인쇄해서 학원에 게시할 수 있습니다."

### 3.4 Bottom CTA Section

```
┌─────────────────────────────────────────────────────┐
│  ██████████████████████████████████████████████████  │
│  ██                                            ██  │
│  ██       지금 바로 시작하세요                  ██  │
│  ██  회원가입 없이 바로 사용할 수 있습니다. 무료██  │
│  ██       [무료로 시작하기]                     ██  │
│  ██                                            ██  │
│  ██████████████████████████████████████████████████  │
└─────────────────────────────────────────────────────┘
```

- 배경: `bg-[#1a1a1a]` (항상 다크 — Surface와 유사하게 고정)
- 헤드라인: "지금 바로 시작하세요" — `text-page`, `font-[800]`, `text-white`
- 서브카피: "회원가입 없이 바로 사용할 수 있습니다. 무료." — `text-sm`, `text-[#999]`
- CTA: "무료로 시작하기" → `/schedule` — `bg-accent`, `text-[#1a1a1a]`, `font-bold`, `shadow`
- `py-12 text-center`

### 3.5 Footer

기존 Footer를 inline 스타일에서 Tailwind + 디자인 토큰으로 전환한다. 구조는 유지.

```
┌──────────────────────────────────────────────────────┐
│  © 2024 클래스 플래너          교육을 더 쉽게 만들어갑니다 │
└──────────────────────────────────────────────────────┘
```

- `fixed bottom-0` 유지
- `bg-[--color-bg-secondary]`, `border-t border-[--color-border]`
- 텍스트: `text-sm`, `text-[--color-text-primary]`

## 4. 로그인 상태별 동작

| 상태 | Nav | Hero | Steps | Bottom CTA |
|------|-----|------|-------|------------|
| 비로그인 | 간소 Nav (로고 + 로그인 + CTA) | 전체 표시 | 전체 표시 | 전체 표시 |
| 로그인 | 풀 Nav (기존 유지) | `/schedule`로 리디렉트 | - | - |

**로그인 사용자는 랜딩을 볼 필요가 없다.** `router.replace("/schedule")` 처리.

## 5. 색상 전략

### Admin Amber 활용
- CTA 버튼: `bg-accent` (#FBBF24) — 페이지 내 가장 눈에 띄는 요소
- Step 숫자 뱃지: `bg-accent`
- 오버라인 텍스트: `text-accent`

### 기본 톤
- 배경: 화이트 (`bg-[--color-bg-primary]`)
- 텍스트: `--color-text-primary` (light: #111827, dark: #f9fafb)
- 보조 텍스트: `--color-text-muted`
- 카드/목업: `bg-[--color-bg-secondary]`, `shadow-admin-*`

### 시간표 목업
- 과목 팔레트 CSS 변수 직접 사용: `--color-subject-blue-bg` 등

### 다크모드
- 히어로/Steps: Admin 스코프이므로 `data-theme` 에 따라 자연 전환
- Bottom CTA: 항상 다크 (`bg-[#1a1a1a]`)
- 시간표 목업: 다크모드에서도 라이트 유지 (`data-surface="surface"` 적용)

## 6. 기술 구현 방향

### 인라인 스타일 전면 제거
- `page.tsx`의 모든 `style={{}}` 제거, Tailwind 클래스로 교체
- `layout.tsx`의 Navigation/Footer도 동일하게 Tailwind 전환

### 컴포넌트 구조
`page.tsx` 내에서 섹션별 함수 컴포넌트로 분리:

```
page.tsx
├── LandingPage (default export, 로그인 체크 + 리디렉트)
├── HeroSection (헤드라인 + CTA + 목업)
├── StepsSection (3단계 카드)
├── BottomCTA (다크 배경 CTA)
└── ScheduleMockup (정적 시간표 그리드, aria-hidden)
```

별도 파일 분리는 하지 않는다 — 랜딩 페이지 전체가 하나의 라우트 컴포넌트.

### layout.tsx 변경

Navigation 컴포넌트에 `pathname === "/"` 분기 추가:

```tsx
// Navigation 내부
if (pathname === "/" && !isLoggedIn) {
  return <LandingNav />;  // 간소 Nav
}
return <FullNav />;       // 기존 Nav
```

Footer의 inline 스타일을 Tailwind 클래스로 교체.

### 반응형 브레이크포인트
- `md` (768px): Split → Stack 전환
- Hero 목업: `hidden md:block` 또는 모바일에서 축소

## 7. 카피라이팅 (Copy Voice)

UI_SPEC.md §7 Copy Voice Guide 적용:
- **헤드라인:** 따뜻한 2인칭 — "수업 시간표, 5분이면 충분합니다"
- **CTA:** 동사 중심 — "무료로 시작하기"
- **설명:** 구체적 혜택 — "학생 등록부터 시간표 완성, PDF 출력까지"

## 8. 검증 계획

### 자동 검증
- `npm run check:quick` (tsc + unit tests)
- `npm run check` (tsc + unit + build)

### UI 검증 (Non-negotiable)
1. **Playwright MCP:**
   - `localhost:3000/` 비로그인 상태에서 전체 페이지 렌더링 확인
   - CTA 클릭 → `/schedule` 이동 확인
   - 로그인 상태에서 `/` 접속 → `/schedule` 리디렉트 확인
   - 모바일 뷰포트(375×667)에서 수직 스택 확인
2. **computer-use:** 시각적 색상/간격 변경이므로 추가 실행

### 문서 동기화
- `UI_SPEC.md` §2.1 랜딩 페이지 섹션 업데이트
- `tree.txt` 업데이트 (파일 추가/삭제 시)
