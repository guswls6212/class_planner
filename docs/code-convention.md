# class-planner — Project-Specific Code Convention

> Extends `dev-pack/docs/code-convention.md` (global). Rules here override global where they conflict.

## Language Policy (overrides global)

- **Code, variable names, comments:** English only.
- **Commit message description:** English only. (e.g., `fix(schedule): fix duplicate student registration on IME Enter`)
- **Documentation (*.md):** Korean allowed. This is a Korean-language service; Korean docs reduce cognitive load.
- **UI strings:** Korean (end-user facing).

## Cohesion Target (overrides legacy "300 lines" rule)

**라인 수 정책 폐기** (2026-05-27, ADR-002 cross-workspace). 글로벌 컨벤션의 § Cohesion & Responsibility
원칙 적용. 라인 수는 결과지 목표 아님.

### 응집된 큰 파일 OK 예시 (class-planner)

| 파일 | 줄 수 | 평가 |
|---|---|---|
| `schedule/page.tsx` | 2356 | **너무 큼** — UI 렌더 + 모달 state 7+ + handler 50+ + drag/drop coordination + filter 가 한 파일. 분리 진행 중 |
| `localStorageCrud.ts` | 1601 | 평가 보류 — entity CRUD 가 응집도 높으면 OK 가능 |
| `apiSync.ts` | 1103 | 평가 보류 — sync 도메인 한 파일이면 OK 가능 |
| `GroupSessionModal.tsx` | 979 | 평가 보류 — 한 모달 의 응집된 UI 면 OK 가능 |

위 표는 "300줄 위반 17 files" 의 옛 표를 대체한다. Cohesion sniff test (글로벌
§1) 통과하면 라인 수 무관 OK.

### schedule/page.tsx 진행 중 refactor 결정

- 23 PR 누적 3219 → 2356 (−863, 26.8%). 일부 추출은 진짜 책임 분리 (sessionCopy /
  pdfExport / sessionAdd 등), 일부는 thin wrapper 함정 (ScheduleHeaderActions
  같은 thin wrapper 는 의도 표현 가치는 있으나 라인 효과만 기대했다면 함정).
- 다음 phase 는 cohesion 평가 후 진행 (`schedule-page-split-refactor.md` proposal status).

## Styling (overrides global TypeScript rule)

- **Tailwind CSS only** for new components. No inline styles.
  **Exception — dynamic DB colors:** Teacher avatar colors come from the database as arbitrary hex strings and cannot be expressed as build-time Tailwind classes. Use CSS custom property `--tc` with `color-mix()`:
  ```tsx
  style={{ '--tc': teacher.color, backgroundColor: 'color-mix(in srgb, var(--tc) 20%, transparent)', color: 'var(--tc)' } as React.CSSProperties}
  ```
  Do NOT use `style={{ backgroundColor: teacher.color }}` directly.
- **CSS Modules (`*.module.css`):** existing files stay; do not add new ones. Migrate to Tailwind when touching the component.
- `globals.css` for CSS custom properties shared across pages.

## Branch Naming (extends global)

Allowed prefixes: `feature/`, `fix/`, `hotfix/`, `docs/`, `chore/`, `test/`, `phaseN/`

## Keyboard Event Handling

- `onKeyDown` + `!e.nativeEvent.isComposing` guard is mandatory for any Enter-key handler. Omitting the guard causes double-submit with Korean (and other CJK) IME input.
- Do not use `onKeyPress` (deprecated in HTML5, removed from React 19 roadmap). Replace with `onKeyDown`.
- Reference: `src/app/schedule/page.tsx:767`

## Testing

- Vitest for unit/integration. Playwright for E2E.
- All tests must pass before commit (`npm run check:quick`).
- When deleting a file, delete its `__tests__/` counterpart too.
- No orphaned test files (tests for deleted code).

## Local-First Data Pattern

- localStorage is SSOT for all data. Mutations update localStorage first, then server sync via `apiSync.ts`.
- Never call API directly from components. Use `useXxxLocal` hooks.
- Anonymous users: no API calls. Server sync activates only after login.

### Server sync — fire-and-forget vs await (Non-negotiable)

상세 결정 + 사고 사례: **ADR-012** (`docs/adr/012-fire-and-forget-vs-await-for-cud.md`)

| 흐름 | 방식 | 사유 |
|------|------|------|
| 사용자 데이터 CUD commit (학생/강사/과목/세션 등) | **`await fetch(...)` + 응답 OK 후 후속 정리** | race window 0. UAT 2026-05-09 학생 부활 사고 5회 반복 → 분기 fix로 해결 불가, await만 정공 |
| 로그/텔레메트리, 알림, self-sync 신호 | fire-and-forget OK | non-critical, 잃어도 안전 |
| Background prefetch / cache refresh | fire-and-forget OK | UI 의존 X |

**의무 (commit 시점)**:
1. `await` server response → 응답 OK 받은 후에만 `pendingDeletes`에서 entity 제거
2. 실패 시 `pendingDeletes` 그대로 유지 → 다음 mount의 recovery hook이 자동 재시도
3. `apiSync.ts`의 fire-and-forget 함수 (`syncXxxDelete` 등)는 호출자에게 응답 안 돌려줌 — commit 시점에는 직접 `fetch + await` 권장

**금지 (Anti-pattern)**:
- ❌ commit timer 안에서 `syncXxxDelete()` 발사 + 즉시 `removePendingDelete()` 호출 (race window 발생)
- ❌ "5초만 기다리면 server에 도달했을 것" 같은 시간 휴리스틱
- ❌ commit 직후 다른 sync 메커니즘(`useGlobalDataInitialization` 재실행 등) 시점 무시

**점검 체크리스트 (새 sync 흐름 추가 시)**:
1. Critical 여부 (사용자 데이터 CUD)?
2. 다른 sync 메커니즘과 race 가능한가? (useGlobalData / polling / self_sync / storage event)
3. 실패 인지가 중요한가?

위 셋 중 하나라도 yes → **await + pendingDeletes 패턴 의무**.

회귀 가드: `src/hooks/__tests__/useGlobalDataInitialization.test.ts`에 강지원/박태환 시나리오 정확히 재현 — 같은 race 재발 시 CI red.

## PWA / Service Worker

PR Q~S(#235~239) 도입, PR #244에서 timing fix. 변경 시 다음 규칙 의무.

### 변경 시 ADR 필수
다음 옵션을 추가/변경할 때 `docs/adr/` 에 ADR 작성:
- `runtimeCaching` 정책 (matcher / handler 전략)
- `clientsClaim`, `skipWaiting`, `navigationPreload` (lifecycle)
- `cacheOnNavigation`, `reloadOnOnline` (next.config 옵션)
- `defaultCache` 의존성 변경 (Serwist 메이저 업그레이드 시)

이유: SW timing은 production-only 동작 + e2e 환경 차이 가능. ADR 없으면 향후 reviewer가 결정 history 못 추적. 실례: ADR-007 SW timing fix.

### 캐시 전략 가이드 (현재 정책)
- `/api/*` → `NetworkOnly` (defaultCache의 NetworkFirst 우회 — AuthGuard race 방지)
- `_next/static/*` → `CacheFirst` (Next.js hash bust로 안전)
- HTML/RSC → `NetworkFirst` (defaultCache 기본)
- offline fallback → `/~offline` (document request만)

### 빌드 호환성
- `next build --turbopack` ❌ Serwist webpack plugin 비호환 → `next build` (default webpack) 사용
- `next dev --turbopack` ✅ dev에서 SW 자동 disable이라 호환 OK
- `public/sw.js`, `swe-worker-*.js`, `workbox-*.js` 는 빌드 산출물 — `.gitignore`로 제외

### E2E
- 모든 spec은 SW 활성 환경에서 통과해야 함 (PR #244 통합 후). `E2E_DISABLE_SW=1` 우회는 로컬 escape hatch만 — CI 사용 금지.
