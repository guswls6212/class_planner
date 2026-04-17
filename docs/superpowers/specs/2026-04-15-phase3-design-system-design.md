# class-planner Phase 3 — 디자인 시스템 정의 + UI/UX 감사

**작성일:** 2026-04-15
**스코프:** Phase 3 앞 두 항목만 (UI/UX 감사 + 디자인 시스템 정의). 랜딩/그리드/학생·과목/반응형/PDF 리디자인은 각각 후속 스펙으로 분리.
**상태:** 승인됨 — 구현 진행 중

---

## Context

class-planner는 Phase 2B(성능 최적화 + 접근성)까지 완료되어 기능적으로 안정 상태이나, **시각적으로 "구식/아마추어"해 보임**이 Phase 3의 근본 동기. 현재 랜딩은 보라색 그라디언트 + 이모지 아이콘, 토큰은 `globals.css`와 `tailwind.config.ts`에 중복 정의, 타이포그래피 토큰 전무, CSS Modules 14개와 인라인 스타일이 혼재.

이번 스펙의 산출물: **토큰 SSOT (`@theme`) + Dual-Mode 아키텍처 설계 + 감사 문제 인벤토리**. 실제 페이지/컴포넌트 리뉴얼은 이 시스템 위에서 후속 스펙으로 각각 진행.

---

## 핵심 결정 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 리디자인 동기 | 시각적으로 구식/아마추어해 보임 | 사용자 확정 |
| 비주얼 방향 | C 기반(Fantastical 계열) + A 치우침(Linear 계열) | 도메인별 사용자 분리 |
| 경계 모델 | **표면(surface) 단위** 이분법 | 원장이 작업 중 공유 결과물 미리보기 |
| Admin 모드 톤 | **Z 비주얼(Amber Confident) + Y 카피(Emerald Warm)** | 샤프함 + 따뜻한 카피의 이중성 |
| Surface 모드 팔레트 | **Q (Pastel Soft)** | 가변 길이 세션에서 색이 지속시간을 전달, 따뜻함 |
| 공개 페이지 톤 | Admin 모드(다크 히어로) | "프로답다" 첫인상 |
| Color-by 차원 | 과목 고정 (스코프 1). 토글 타입은 스펙에만 정의 | Teacher 데이터 모델 미구축 |
| Teacher 뷰 | 스코프 2 이월 | Phase 4 후보 |

---

## 1. 아키텍처 — Dual-Mode System

**두 개의 시각 언어가 하나의 토큰 체계 위에서 공존한다.**

### 모드 매핑

| 모드 | 적용 영역 | 철학 | 다크모드 | 사용자 |
|---|---|---|---|---|
| **Admin (A)** | `/`, `/about`, `/login`, `/students`, `/subjects`, `/settings`, `/admin`, `/onboarding`, `/schedule`의 헤더·툴바·학생 패널·PDF 버튼 영역 | 샤프·진지·앰버 액센트 | 라이트/다크 전환 지원 | 원장·강사 |
| **Surface (C)** | `/schedule`의 **그리드 영역 자체**, SessionBlock, PDF 출력물, (향후) 공유 링크 페이지 | 밝음·파스텔·인쇄 친화 | **라이트 고정** | 학생·학부모 |

### 경계 구현
- `data-surface="surface"` 속성으로 Surface 컨테이너 지정
- 다크 모드: `<html data-theme="dark">` → Admin 영역만 오버라이드
- `[data-surface="surface"]` CSS 스코프에서 라이트 토큰 고정 (다크 오버라이드 무효화)
- React Context 없이 CSS만으로 격리 가능 (JS 감지가 필요한 경우 별도 Context 추가)

**효과:** 원장이 작업 중에도 "공유될 결과물"을 항상 라이트로 미리보기. 인쇄/PDF와 스크린이 동일.

---

## 2. 토큰 SSOT — Tailwind v4 `@theme`

### 현 상태 (문제)
| 위치 | 내용 | 문제 |
|---|---|---|
| `globals.css :root` | CSS 변수 정의 | 중복 소스 1 |
| `tailwind.config.ts extend.colors` | 동일 색상 하드코드 | 중복 소스 2 |
| 없음 | 타이포그래피 토큰 | 모든 font-size 컴포넌트 산재 |

### 목표 구조

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* === Admin 색상 === */
  --color-accent:         #FBBF24;   /* amber-400 */
  --color-accent-hover:   #F59E0B;   /* amber-500 */
  --color-accent-pressed: #D97706;   /* amber-600 */

  --color-bg:             #FFFFFF;
  --color-bg-elevated:    #FAFAFA;
  --color-border:         #E4E4E7;
  --color-text:           #18181B;
  --color-text-muted:     #71717A;

  /* 시맨틱 (Admin + Surface 공용) */
  --color-success:  #10B981;
  --color-warning:  #F59E0B;
  --color-danger:   #EF4444;
  --color-info:     #3B82F6;

  /* === Surface 과목 팔레트 (8색 × 3 tone) === */
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

  /* === 타이포그래피 === */
  --font-sans: 'Pretendard', -apple-system, 'SF Pro Display', sans-serif;

  --text-hero:    48px;
  --text-page:    32px;
  --text-section: 22px;
  --text-base:    15px;
  --text-sm:      13px;
  --text-xs:      11px;

  --font-weight-hero:    800;
  --font-weight-page:    800;
  --font-weight-section: 700;
  --font-weight-base:    400;
  --font-weight-sm:      500;
  --font-weight-xs:      600;

  --tracking-headline: -0.035em;
  --tracking-body:     -0.02em;

  /* === 형태 === */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.12);
}

/* Admin 다크 모드 */
[data-theme="dark"] {
  --color-bg:          #0C0C0D;
  --color-bg-elevated: #18181B;
  --color-border:      #27272A;
  --color-text:        #FAFAFA;
  --color-text-muted:  #A1A1AA;
}

/* Surface 영역 — 다크 모드 무관, 항상 라이트 고정 */
[data-surface="surface"] {
  --color-bg:          #FAFAFA;
  --color-bg-elevated: #FFFFFF;
  --color-border:      #E4E4E7;
  --color-text:        #18181B;
  --color-text-muted:  #71717A;
}
```

### 이관 규칙
1. `tailwind.config.ts`의 `extend.colors` 하드코드 **전부 제거** (`@theme` 참조로 대체)
2. 기존 `--color-primary` → `--color-accent`로 의미 명확화
3. `.time-table-grid`, `.grid-cols-timetable` 등 유틸 클래스는 유지 (내부 토큰만 참조 교체)
4. CSS Modules 14개는 즉시 제거하지 않음 — 컴포넌트별 리뉴얼 시 점진적 교체

---

## 3. Admin 모드 (A) 상세

### 색상
- **Accent primary:** `#FBBF24` (amber-400)
- **Accent hover:** `#F59E0B`, **pressed:** `#D97706`
- **BG dark:** `#0C0C0D` / **light:** `#FFFFFF`
- **Elevated dark:** `#18181B` / **light:** `#FAFAFA`
- **Border dark:** `#27272A` / **light:** `#E4E4E7`
- **Text dark:** `#FAFAFA` / **light:** `#18181B`
- **Muted dark:** `#A1A1AA` / **light:** `#71717A`
- **Semantic (공용):** success `#10B981` · warning `#F59E0B` · danger `#EF4444` · info `#3B82F6`

### 타이포그래피 스케일

| 이름 | 크기 | 굵기 | Letter | 용도 |
|---|---|---|---|---|
| `text-hero` | 48px | 800 | −3.5% | 랜딩 Hero |
| `text-page` | 32px | 800 | −3.5% | 페이지 타이틀 |
| `text-section` | 22px | 700 | −2% | 섹션 헤더 |
| `text-base` | 15px | 400 | −2% | 본문 |
| `text-sm` | 13px | 500 | −2% | 라벨·메타 |
| `text-xs` | 11px | 600 | −2% | 오버라인·캡션 |

**Font:** `'Pretendard', -apple-system, 'SF Pro Display', sans-serif`

### 카피 보이스 가이드 (Emerald Warm 계열)
- 헤드라인: 따뜻한 2인칭, 구체적 가치 — "원장님의 1시간을 아껴드립니다"
- 버튼: 동사 중심, 간결 — "무료로 시작", "시간표 만들기"
- 에러: 비난하지 않는 톤 — "충돌이 있어요. 한 번 확인해주세요"

### 형태 토큰
- **Radius:** sm `4px` / md `6px` / lg `8px` (샤프 기조)
- **Spacing:** Tailwind 기본 (4/8/12/16/24/32/48/64px)
- **Shadow:** sm · md · lg (위 `@theme` 정의 참조)

---

## 4. Surface 모드 (C) 상세 — Q Pastel Soft

### 그리드 기본
- **Canvas:** `#FAFAFA`
- **Grid line major:** `#E4E4E7` / **minor:** `#F4F4F5`
- **Grid header text:** `#71717A` · 11px · 600
- **Time column:** `#A1A1AA` · 10px

### 과목 팔레트 (8색 기본 → 향후 확장 가능)

| 이름 | 배경 (`-bg`) | 텍스트 (`-fg`) | 액센트 (`-accent`) |
|---|---|---|---|
| `blue` | `#DBEAFE` | `#1E40AF` | `#3B82F6` |
| `red` | `#FEE2E2` | `#991B1B` | `#EF4444` |
| `violet` | `#EDE9FE` | `#5B21B6` | `#8B5CF6` |
| `emerald` | `#D1FAE5` | `#065F46` | `#10B981` |
| `amber` | `#FEF3C7` | `#92400E` | `#F59E0B` |
| `pink` | `#FCE7F3` | `#9D174D` | `#EC4899` |
| `teal` | `#CCFBF1` | `#115E59` | `#14B8A6` |
| `orange` | `#FFEDD5` | `#9A3412` | `#F97316` |

> 8과목 초과 시 순환 할당. 과목 색 할당 로직은 `SessionBlock.utils.ts` 참조.

### SessionBlock 상태 레이어

| 상태 | 스타일 |
|---|---|
| **기본** | 파스텔 bg + 진한 fg + `radius 4px` + `padding 6px 8px` |
| **진행 중** (현재 시각이 start~end 사이) | 좌측 `3px solid accent` 바 추가 |
| **완료** (종료 시각 경과) | `opacity: 0.55` |
| **호버** | `translateY(-1px)` + `shadow-md` |
| **드래그 중** | `shadow-lg` + `cursor-grabbing` + 50% 스케일 고스트 |
| **충돌/경고** | 좌측 `3px solid #EF4444` 바 + ⚠️ 아이콘 좌상단 |
| **포커스(키보드)** | `outline: 2px solid #FBBF24` (Admin 액센트와 연결) |

### Color-by 확장 훅 (스코프 2용 타입 사전 정의)
```typescript
// 현재는 'subject' 고정. Teacher 데이터 모델 구축 후 토글 UI 추가.
type ColorBy = 'subject' | 'student' | 'teacher';
```

---

## 5. 감사 결과 (Audit Findings)

| # | 항목 | 심각도 | 조치 | 처리 시점 |
|---|---|---|---|---|
| 1 | `UI_SPEC.md §2.1` `/`→`/schedule` 리다이렉트 기술 ≠ 실제 풀 랜딩 | 문서 불일치 | spec 업데이트 | 랜딩 리디자인 스펙 |
| 2 | 토큰 `globals.css` + `tailwind.config.ts` 중복 | 유지보수성 | `@theme` 통합 | **본 스펙** |
| 3 | CSS Modules 14개 잔존 | 스타일 일관성 | 컴포넌트별 리뉴얼 시 교체 | 후속 스펙 (점진) |
| 4 | `src/app/page.tsx` 인라인 스타일 (CLAUDE.md 위반) | 규칙 위반 | 랜딩 리디자인 시 해결 | 랜딩 리디자인 스펙 |
| 5 | 타이포그래피 토큰 전무 | 유지보수성 | `@theme` 통합 시 신규 추가 | **본 스펙** |
| 6 | 랜딩 보라색 그라디언트 + 이모지 아이콘 | 시각적 구식 | Amber 다크 히어로로 교체 | 랜딩 리디자인 스펙 |
| 7 | `/schedule` chrome(헤더·툴바) 디자인 부재 | 시각적 미완성 | Admin 모드 적용 | 그리드 리디자인 스펙 |

---

## 6. Deferred — 스코프 2 이월 (Phase 4 후보)

> TASKS.md Phase 4에 기록됨. 이 항목들은 **Teacher 데이터 모델** 추가 후 순차 진행.

1. **강사(Teacher) 뷰** — Teacher 엔티티, 강사별 로그인, 강사 뷰 페이지, SessionBlock `colorBy='student'` 전환
2. **공유 링크 페이지** (`/share/{token}`) — 학생/학부모용 읽기 전용 Surface 모드 페이지 (현재는 PDF만)
3. **Color-by 토글 UI** — 원장 뷰에서 과목/학생/강사 색상 기준 전환 버튼
4. **CSS Modules → Tailwind 전면 이관** — 컴포넌트별 점진적 전환 (본 스펙 이후)

---

## 7. 구현 계획

### 파일 변경 목록

| 파일 | 변경 내용 |
|---|---|
| `src/app/globals.css` | `@theme` 블록 신설, `:root` CSS 변수 이관, `[data-theme="dark"]` + `[data-surface="surface"]` 오버라이드 |
| `tailwind.config.ts` | `extend.colors` 하드코드 전부 제거 |
| `src/contexts/ThemeContext.tsx` | 다크/라이트 담당 유지, surface 모드는 CSS 속성으로 분리 확인 |
| `UI_SPEC.md` | §6 "테마 시스템" dual-mode 구조 반영, §7 타이포그래피 토큰 추가 |

### 구현 순서
1. `@theme` 블록 작성 + Admin 토큰 `:root`에서 이관
2. Surface 팔레트 추가 + `[data-surface="surface"]` 스코프 구현
3. `tailwind.config.ts` 하드코드 제거 → `npm run build`로 검증
4. `UI_SPEC.md` 갱신
5. PR → dev 머지

### 검증
```bash
cd class-planner
npm run build      # @theme 통합 후 빌드 성공
npm run lint       # ESLint 통과
npm run type-check # TS strict 통과
```
- Playwright: `/schedule` 로드 → 그리드 영역 라이트 고정 확인, 다크 모드 토글 → chrome만 전환 확인
- DevTools Computed Styles: `--color-accent`, `--color-subject-blue-bg` 올바른 스코프 확인

---

## ⚠️ Known Risks

1. **Tailwind v4 `@theme` 안정화 단계** — `:root` 방식과 혼용 시 우선순위 충돌 가능. 마이그레이션 중 중복 정의 주의.
2. **`[data-surface]` CSS 스코프 vs JS 컨텍스트 분리** — JS에서 Surface 감지 필요 시 별도 Context 필요.
3. **8색 고정 팔레트** — 8과목 초과 시 색 충돌. `SessionBlock.utils.ts`의 색 할당 로직 재검토 필요.

**Rejected:**
- R (Left Border): 구조적 장점 있으나 사용자가 가변 길이 비교 후 Q의 따뜻함 선호로 확정
- 경계안 2 (페이지 단위): `/schedule` 원장용 고밀도 UI를 C 톤으로 만들어야 해 Admin 장점 소멸

---

## 후속 스펙 (별도 세션)

| 스펙 파일 | 내용 |
|---|---|
| `2026-MM-DD-landing-redesign-design.md` | 랜딩 페이지 리디자인 |
| `2026-MM-DD-schedule-grid-redesign-design.md` | 시간표 그리드 UI 개선 |
| `2026-MM-DD-mgmt-pages-redesign-design.md` | 학생·과목 관리 페이지 |
| `2026-MM-DD-responsive-mobile-design.md` | 모바일 반응형 강화 |
| `2026-MM-DD-pdf-layout-design.md` | PDF 출력 레이아웃 개선 |
