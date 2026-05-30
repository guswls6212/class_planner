# Notification History — Spec (Phase 1)

> 토스트 메시지의 히스토리를 사용자가 추적·재확인할 수 있는 알림 센터. 4초 뒤 사라지는 토스트가 운영자(원장)의 워크플로우 안에서 놓치기 쉬운 문제를 해결한다.
>
> **Status:** Approved (2026-05-12, 사용자 결정 완료) — 디자인 탐색 라우트 `src/app/design-explorations/notifications/page.tsx`에서 의사 결정.
>
> **Scope:** Phase 1만. Phase 2 (server-side logs), Phase 3 (Supabase 양방향 sync)는 트리거 충족 시 별도 spec.

## 1. Motivation

### 1.1 사용자 시나리오 (Why now?)
오늘 사용자(원장)가 schedule 페이지 진입 직후 `"10건의 변경이 서버 거부로 동기화 실패했습니다. 관리자에게 문의해주세요."` 에러 토스트를 봤다. 토스트가 4초 후 자동 사라지면서 다음 정보가 손실:
- 정확한 메시지 텍스트 (시간 지나면 기억 부정확)
- 발생 시각
- 어떤 작업 도중 발생했는지 맥락
- 다른 동시 발생 알림과의 관계

이 정보를 운영자가 재조회할 방법이 없음. 토스트 자체의 transient 특성과 사용자 추적 욕구 사이의 gap.

### 1.2 트리거가 된 사고
`useOutboxFlush.ts:44-49`의 메시지가 4초 후 사라져 사용자가 원인 분석을 할 수 없었다 — outbox 누적 항목 10건이 4xx로 영구 실패했는데 어떤 항목이었는지 알 수 없다. (구체적 outbox dump 분석은 별도 task.)

### 1.3 Why not Supabase (Phase 1 한정)
- 운영 분석 → `omni-radar`가 이미 로컬 dev에서 토스트 원천(http/exception/console) 캡처. 별도 row 적재 redundant.
- 디바이스 간 sync → 현재 원장 1명 시나리오. YAGNI.
- academy member 알림 공유 → user story 명확하지 않음. Phase 3 deferred.
- PII 우려 → 토스트 메시지에 학생/강사 이름 포함 가능. server 적재 시 별도 가드 필요.

## 2. Acceptance Criteria

| # | 요구사항 |
|---|---|
| AC-1 | 헤더 우상단에 종 아이콘 + unread 배지가 표시된다. unread 카운트 = `error` + `warning` level 중 read=false 항목 수. |
| AC-2 | 종 클릭 시 헤더 아래에 드롭다운 패널(width 420px, max-height 480px)이 펼쳐진다. 다시 클릭 또는 outside click 또는 ESC로 닫힌다. |
| AC-3 | 토스트가 `lib/toast.ts`의 wrapper(showToast/showError/showSuccess/showWarning/showInfo/showUndoToast/showActionToast)를 거치면 자동으로 알림 센터 ring buffer에 push된다 (read=false). |
| AC-4 | 항목 클릭 시 해당 항목만 read=true. 패널 우상단 "모두 읽음" 클릭 시 전체 read=true. |
| AC-5 | NEW 라벨/시각 강조는 **error/warning level + unread**일 때만 나타난다. success/info는 unread여도 NEW 표시 X (배지 카운트도 제외). |
| AC-6 | 항목 hover 시 우측에 X 버튼이 노출되어 개별 dismiss 가능. dismissed 항목은 ring buffer에서 제거되어 다시 보이지 않는다. |
| AC-7 | 패널 헤더에 "에러 N · 경고 N" 요약, 풋터에 "총 N건 · 24시간 이내 · 최대 50개 보관" 표시 (`headerSummary` 옵션 default ON). |
| AC-8 | 항목은 "오늘 / 어제 / 이전" 시간 그룹으로 묶여 표시된다. (`groupByTime` 옵션 default ON) |
| AC-9 | 각 항목은 level별 lucide 아이콘으로 표시 (error=AlertCircle, warning=AlertTriangle, success=CheckCircle2, info=Info). |
| AC-10 | unread + trackable 항목은 좌측 amber 세로 bar로 강조. |
| AC-11 | unread 배지는 `motion-safe:animate-ping` pulse 애니메이션. `prefers-reduced-motion` 환경에서는 정적. |
| AC-12 | 24시간 초과 항목은 자동 prune. 최대 50개 초과 시 FIFO drop. |
| AC-13 | localStorage 키: `class_planner_${userId}_notification_history`. 익명 사용자는 `class_planner_anonymous_notification_history`. |
| AC-14 | 헤더 i 아이콘(InfoTrigger)의 동심원 2겹 → 1겹 단순화 (button border 제거, lucide Info SVG 자체 원만). |

## 3. Data Model

### 3.1 `NotificationEntry`
```ts
export type NotificationLevel = "error" | "warning" | "success" | "info";

export interface NotificationEntry {
  /** ULID 또는 crypto.randomUUID() */
  id: string;
  /** 토스트 level */
  level: NotificationLevel;
  /** 토스트 메시지 텍스트 (소비자가 본 그대로) */
  message: string;
  /** epoch ms */
  createdAt: number;
  /** 사용자가 읽었는지 — error/warning만 의미 있음 */
  read: boolean;
  /** (optional) 발생 시 라우트 URL — 디버깅 보조용 */
  contextUrl?: string;
}
```

### 3.2 Storage
- 키: `class_planner_${userId}_notification_history` (익명은 `anonymous` 고정)
- 값: `NotificationEntry[]` JSON, 최신순(unshift) 정렬
- 최대 50개. 초과 시 oldest pop.
- 24h(`24 * 60 * 60 * 1000` ms) TTL. push/read 시 expired prune.
- `localStorageCrud.ts`의 키 컨벤션을 따른다 (`ANONYMOUS_STORAGE_KEY` 등은 그대로).

## 4. Architecture

### 4.1 Layer mapping (Clean Architecture)
- **Domain:** `NotificationEntry` 타입, `isTrackable(level)` 헬퍼만. 외부 의존 없음.
- **Application:** 없음 (Phase 1은 server 호출 X).
- **Infrastructure:** `lib/notificationCenter.ts` — localStorage I/O + ring buffer 관리.
- **Presentation:**
  - `atoms/NotificationBell.tsx` — 종 아이콘 + 배지 + pulse
  - `molecules/NotificationItem.tsx` — 한 항목 row (level 아이콘 + 메시지 + chip + dismiss)
  - `molecules/NotificationDropdown.tsx` — 패널 wrapper (헤더/필터/그룹/풋터)
  - `hooks/useNotificationCenter.ts` — state + 액션 (push/read/markAllRead/dismiss/prune)

### 4.2 capture layer 통합
`lib/toast.ts`의 모든 wrapper 내부에서 `notificationCenter.push()` 호출:
```ts
// Pseudocode
function showVariant(variant: ToastVariant, message: string) {
  toast.custom(/* ... */);
  notificationCenter.push({ level: variant, message }); // ⬅ NEW
}
```
`showUndoToast`, `showActionToast`, `showBulkUndoToast` 등도 동일하게 push. Undo가 발생하면 그 항목은 ring buffer에서도 retract (혹은 메시지 prefix `[취소됨]`로 마킹 — 선택, 단순함 우선 retract).

### 4.3 component 트리 — layout-level 배치
종 아이콘은 모든 페이지 (`/schedule`, `/students`, `/subjects`, `/teachers`, `/settings`)에서 동일 위치에 보여야 함 (사용자 결정 2026-05-12). 실제 layout 구조 파악 결과:
- `app/layout.tsx`는 minimal (`RootProviders` 만) — 공통 헤더 없음
- `AppShell` (organism)이 `<Sidebar />` (데스크톱 md+) / `<TopBar />` (모바일 md-) 분기
- 데스크톱엔 우상단 헤더 영역 자체가 없음 → 각 페이지가 자기 헤더 따로 그림

→ **Sidebar academy 영역과 TopBar에 NotificationDropdown 배치** (layout-level). schedule 페이지의 ScheduleActionBar는 i 버튼·share 버튼만.

```
AppShell (organism)
├─ Sidebar (데스크톱 md+ block)
│   └─ Academy area wrapper:
│       ├─ Expanded (w-52): [학원 박스 flex-1] [NotificationDropdown size="md"]
│       └─ Collapsed (w-14): [학원 이니셜] / [NotificationDropdown size="nav"] (stack)
│   └─ nav items (시간표/학생/과목/강사/설정)
└─ TopBar (모바일 md- block)
    └─ [NotificationDropdown compact] [도움말 ?] [로그인/아바타]

NotificationDropdown (molecule)
├─ trigger: NotificationBell (atom)
│   size="sm" (TopBar compact) / "md" (Sidebar expanded) / "nav" (Sidebar collapsed)
│   sm: w-8 h-8 icon 16 / md: w-9 h-9 icon 18 / nav: w-10 h-10 icon 22 strokeWidth 1.5
└─ panel: 헤더(제목+요약+"모두 읽음"+X) + filter chips + 오늘/어제/이전 groups + 풋터
   compact=false (Sidebar): panel anchor = `left-full top-0 ml-2` (sidebar 오른쪽으로 펼침)
   compact=true (TopBar): panel anchor = `right-0 top-full mt-2` (topbar 아래로 펼침)
```

#### 익명 사용자 처리
Anonymous-First 정책상 학원 박스는 익명에 미렌더. NotificationDropdown은 익명도 토스트 받을 수 있으므로 렌더 유지. Expanded 시 학원 박스 부재 → wrapper `justify-end`로 종을 우측 정렬해 어색한 좌측 단독 배치 회피.

#### 검토 사항
- 로그인 페이지(`/login`)는 `AppShell` `SHELL_EXCLUDED`에 포함되어 Sidebar/TopBar 둘 다 미렌더 — 종 자동 노출 X. 추가 처리 불필요.
- `app/admin/layout.tsx`는 별도 layout — 운영자 admin 도구 컨텍스트에선 종 미노출이 정합 (관리자 logs 별도 spec).

### 4.4 i 아이콘 수정
`atoms/InfoTrigger.tsx` 의 button className에서 `rounded-full border border-[var(--color-text-muted)]`를 제거. lucide `<Info>` SVG가 자체 원을 가지므로 button은 padding + hover만 담당. icon size 11→16 (한 겹이면 더 작게 보임).

## 5. Edge cases

| # | 케이스 | 처리 |
|---|---|---|
| EC-1 | 사용자가 anon → login 마이그레이션 | login 직후 anonymous notification_history는 그대로 유지(개인 디바이스 한정). userId 키로 새 ring buffer 시작. (※ 비대칭 — Phase 1은 안전을 위해 마이그레이션 X) |
| EC-2 | localStorage quota 초과 | push 실패 시 silent (notification 자체는 best-effort). logger.error만. |
| EC-3 | 24h 경계 prune 타이밍 | `useNotificationCenter` 마운트 + `push` 시 매번 prune (lazy). |
| EC-4 | 같은 메시지 연속 발생 | 별개 entry로 push (dedup X — 발생 시각 다름이 정보). |
| EC-5 | undo 토스트 클릭 | 해당 entry 제거 + log message에 prefix `[취소됨]`까지 갈 필요 없음. 단순 제거. |
| EC-6 | dismissed 항목 다시 보고 싶음 | Phase 1은 복구 X. Phase 2에서 server-side logs로 옵션 제공. |
| EC-7 | 50개 초과 시 oldest drop | unread 항목도 drop (사용자가 확인 안 했어도 24h 지났거나 50개 넘으면 어쩔 수 없음). |
| EC-8 | 필터로 매치 0건 | 빈 상태 일러스트 표시 ("알림이 없습니다" + 안내 텍스트). |
| EC-9 | `prefers-reduced-motion` | pulse 애니메이션 `motion-safe:` prefix 필수. |
| EC-10 | 키보드 navigation | Tab으로 종 → Enter로 패널 open → 항목 Tab 순환 → ESC로 close. |
| EC-11 | 익명 사용자 | `anonymous` 키로 동일 동작. 로그아웃 시에도 유지(개인 디바이스). |
| EC-12 | 같은 worktree 다른 dev 서버 PORT | localStorage origin 별 — :3000과 :3001은 별개 ring buffer. 의도된 동작. |

## 6. Accessibility

- 종 button: `aria-label="알림 N개"` (N=unreadCount). unread=0 시 `aria-label="알림"`.
- 배지: `aria-hidden="true"` (aria-label에 이미 카운트 포함).
- 패널: `role="region"` + `aria-label="알림 히스토리"` + `aria-live="polite"` (새 push 시 스크린리더 안내).
- 항목 row: `<button>` 요소 + `aria-pressed`(read 상태). X 버튼은 별도 `<button>` + `aria-label="이 알림 제거"`.
- ESC 키로 패널 닫기.
- pulse 애니메이션 `motion-safe:` prefix.

## 7. 변경 파일 목록 (예상)

### 신규
- `src/lib/notificationCenter.ts` — ring buffer I/O
- `src/hooks/useNotificationCenter.ts` — React state hook
- `src/components/atoms/NotificationBell.tsx`
- `src/components/molecules/NotificationItem.tsx`
- `src/components/molecules/NotificationDropdown.tsx`
- `src/lib/notificationCenter.test.ts` — unit test (push/prune/dismiss/read)
- `src/components/molecules/__tests__/NotificationDropdown.test.tsx` — RTL test (필터/그룹/dismiss)

### 수정
- `src/lib/toast.ts` — 모든 wrapper에서 `notificationCenter.push()` 호출
- `src/components/atoms/InfoTrigger.tsx` — border 제거 + size 조정 (동심원 2겹 → 1겹)
- `src/app/layout.tsx` (또는 그 안에서 사용하는 공통 헤더 component) — `<NotificationBell />` 배치. 로그인/admin layout 분기 시 해당 layout만 제외.
- 참고: `src/app/schedule/_components/ScheduleActionBar.tsx`는 i 버튼/share 버튼만 유지. 종은 layout-level이라 ScheduleActionBar 손대지 않음.
- `tree.txt` — 신규 파일 반영

### 영향 없는 영역
- `domain/` — 알림은 domain 객체 아니라 UI 행동 보조 데이터
- `application/`, `infrastructure/` — Phase 1 server 호출 X
- 기존 `useOutboxFlush.ts` — 호출하는 `showToast`가 자동 push되므로 수정 없이 통합됨

## 8. Tests

- Unit (Vitest):
  - `notificationCenter.push` — 50개 초과 시 oldest drop
  - `notificationCenter.push` — 24h 초과 시 prune
  - `notificationCenter.markRead(id)` — 특정 항목만 read
  - `notificationCenter.markAllRead()` — 전체 read
  - `notificationCenter.dismiss(id)` — 항목 제거
  - `isTrackable(level)` — error/warning만 true
  - userId scope — anonymous 키와 userId 키 격리

- Component (Vitest + RTL):
  - `NotificationBell` — unread > 0 시 배지 + count 표시
  - `NotificationDropdown` — 필터 toggle, 그룹화 헤더, dismiss 동작
  - capture 통합 — `showError` 호출 후 ring buffer에 entry 1개

- E2E (Playwright — 가벼운 시나리오):
  - schedule 페이지 진입 → 종 클릭 → 패널 open → ESC로 close

## 9. Devil's Advocate

### 9.1 Weaknesses
1. **localStorage 손실 시 사용자 디바이스 변경 후 추적 불가** — Phase 3까지 가지 않으면 영구 한계. 다만 현재 단일 원장 시나리오에선 디바이스 변경 빈도 낮음.
2. **lib/toast.ts wrapper를 거치지 않는 호출이 누락됨** — 직접 `sonner` import해서 `toast.error(...)` 호출하면 ring buffer 우회. ESLint custom rule 또는 `lib/toast.ts` 내부에서만 sonner import 허용하는 규칙 가드 필요 (이미 주석에 명시되어 있음 — `lib/toast.ts:1`).

### 9.2 Rejected alternatives
- **Supabase 단일 테이블 (toast_logs)** — Why not: PII 적재 우려 + sync 복잡도 + Phase 1 시점 user story 없음.
- **/api/logs/client 확장** — Why not: 운영 분석은 Phase 2 트리거 충족 시. 지금은 사용자 본인 추적만으로 충분.
- **별도 `/notifications` 라우트 (full page)** — Why not: 사용자 작업 흐름 끊김. 드롭다운이 빠르고 가벼움.
- **session memory only (페이지 새로고침 시 사라짐)** — Why not: 사용자가 자기 페이지를 다시 새로고침한 경우에도 추적 가능해야 함 (오늘 사용자 시나리오의 핵심).

### 9.3 Uncertainties (needs verification)
- `useOutboxFlush`가 호출하는 `showToast`가 어떤 시점에 발생하는지 — `useEffect` 안 page mount 시 → ring buffer가 비어있는 첫 mount에서 entries push되는 순서가 정상인지 검증 필요 (RTL test로 보강).
- `prefers-reduced-motion`에서 `animate-ping` 정확히 동작 안 하는지 — Tailwind 4 docs 확인 필요.

### 9.4 Resolved (사용자 결정 2026-05-12)
- ~~ScheduleHeader 외 다른 페이지에도 종 아이콘 일관 표시 여부~~ → **layout-level 결정**: 모든 페이지에서 같은 위치 (§ 4.3 참조).
- ~~Supabase 저장 여부~~ → **Phase 1은 localStorage only**. Phase 3 sketch는 [`docs/future-work/notification-history.md`](./future-work/notification-history.md) 참조.
- ~~배지 카운트 범위~~ → **에러+경고 unread만** (success/info 제외).
- ~~unread → read 트리거~~ → **항목 클릭 + "모두 읽음" 버튼 + dismiss(X)**. 패널 open 자체로는 read 처리 X.
- ~~Sidebar 안 정확한 종 위치~~ → **Variant A (학원 박스 옆 inline)** 채택. Expanded는 학원 박스 옆, Collapsed는 학원 이니셜 아래 stack(nav size). 초기 PR #372에서 nav 안 (강사 ↔ 설정 사이)에 배치했던 것을 본 PR에서 academy 영역으로 이동.

## 10. Out of Scope (Phase 2/3 후보)

| 기능 | Phase | 트리거 | 참조 |
|---|---|---|---|
| 서버측 toast_logs 적재 | Phase 2 | 운영 분석 user story 명확화 | TBD |
| 운영자 대시보드 `/admin/logs` | Phase 2 | 운영 분석 user story 명확화 | TBD |
| Supabase 양방향 sync (academy member 공유) | Phase 3 | academy member 알림 공유 user story 명확화 | [`future-work/notification-history.md`](./future-work/notification-history.md) (DB 스키마/retention cron sketch) |
| dismissed 복구 | Phase 2 | 사용자 요청 | — |
| 토스트 inline action 재현 (예: undo 재실행) | TBD | 사용자 요청 | — |
| 모바일 (375px) 패널 전체 width swap | Phase 1.1 | 모바일 사용자 등장 | — |
| design-explorations 라우트 production 가드 | 별도 PR (선행 권장) | production 배포 전 또는 SEO/번들 사이즈 우려 | [`future-work/design-explorations-production-guard.md`](./future-work/design-explorations-production-guard.md) |

## 11. Rollout

1. design-explorations 페이지로 동작 확정 (완료, 2026-05-12)
2. spec doc 승인 (이 문서)
3. dev branch에서 작업 branch 생성 (`feat/notification-history`)
4. `notificationCenter.ts` + 테스트부터 (bottom-up)
5. `lib/toast.ts` 통합 + 기존 toast 호출들 회귀 테스트 (`npm run check:quick`)
6. UI 컴포넌트 3개 + 통합
7. PR → dev 머지 → UAT (`uat-checklist.md`에 시나리오 추가)
8. dev → main (사용자 명시 요청 시)

## 12. References

- 디자인 탐색 라우트: `src/app/design-explorations/notifications/page.tsx`
- 토스트 wrapper: `src/lib/toast.ts`
- outbox 정책: `src/lib/syncOutbox.ts`, `src/hooks/useOutboxFlush.ts`
- 디자인 시스템: `class-planner/UI_SPEC.md` (chip atomic + Surface Q Pastel)
- ADR-012 (fire-and-forget vs await) — Phase 1은 server 호출 없으므로 무관
- 메모리: `feedback-visual-companion-html-not-png` (mockup은 라이브 HTML로)
