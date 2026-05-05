# ADR-007: SW timing fix (`/api/*` NetworkOnly + AuthGuard 7s + e2e/e2e_pwa 통합)

**Date:** 2026-05-05
**Status:** Accepted
**Related:** ADR-006 (PWA 도입), PR #244 (commit 97adbc6), PR #241 (playwright dep cleanup), PR #246 (Q2 dev port-scoped)

## Context

ADR-006 (PWA 도입)으로 PR Q~S(#235~#239) cycle에서 `@serwist/next` 기반 Service Worker가 도입됐다. PR R(#236) 머지 직후 e2e production build에서 **auth-dependent specs(multi-academy/share-link/teachers/templates 등)가 button visible timeout으로 일관 fail**.

두 번 re-run에도 같은 fail → race-once 가능성 배제. 학습 일지 메타 일지 누적 원칙 "2회+ 같은 fail은 진단 깊이"에 따르면 root cause 진단해야 했으나, 그 시점에는 **`E2E_DISABLE_SW=1` 환경변수로 SW를 빌드에서 disable + offline-network.spec만 별도 `e2e_pwa` job으로 분리**해 우회 (PR R fix + PR S #239).

PR R 머지 직후 사용자가 한계를 직접 짚었음 ("왜 SW 환경 통과가 이상적인지?"). e2e 환경 ≠ production 환경 = 환경 충실도 손실. SW가 production에서만 일으킬 수 있는 회귀 (`/api/*` 가로채기, AuthGuard race, 캐시 invalidation 등)를 잡지 못한다.

본 ADR은 SW timing race의 root cause를 진단하고, 우회 없이 모든 spec이 SW 활성 환경에서 통과하도록 fix한 결정 보존.

### Root cause (Phase A 정찰 + 검증)

두 가지 fact의 결합:

1. **`@serwist/next` `defaultCache`가 `/api/*` GET을 `NetworkFirst(networkTimeoutSeconds: 10)`로 가로챔** (`node_modules/@serwist/next/dist/index.worker.mjs:152-165`). `/api/auth/*`만 이미 `NetworkOnly`로 빼두는 권장 패턴 — class-planner는 Supabase 직접 사용이라 `/api/auth/*` 안 쓰지만, `useGlobalDataInitialization` mount 직후 `/api/students|subjects|sessions|enrollments|teachers` 5개 fetch가 모두 SW에 가로채진다.

2. **`AuthGuard.tsx:54-67` 의 `getSession()` 3초 timeout race**:
   ```typescript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new Error("인증 확인 타임아웃")), 3000)
   );
   const sessionPromise = supabase.auth.getSession();
   const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
   ```
   3초 안에 안 끝나면 catch 분기 → `setIsAuthenticated(false)` → `useEffect L106-115` 의 `router.push("/login")` → spec이 기다리는 button 영구 미표시.

### 메커니즘

```
T0  사용자가 /schedule 접속
T1  React hydration 시작 → AuthGuard mount → setTimeout(3000)
T2  병렬: SW install + precache (1~3초, 첫 방문)
T3  supabase.auth.getSession() 호출
       └─ cross-origin fetch 발생 시 SW가 가로채면 latency 추가
       └─ /api/* 5개 fetch도 SW의 NetworkFirst 처리 (각 50~200ms 추가)
T4  3초 도래
       └─ 누적 latency가 3초 넘으면 AuthGuard timeout → /login
T5  Playwright "button visible" expect 10s 후 fail
```

직접 진단 (Phase A.1): `npm run build && npm run start` 환경에서 `unset E2E_DISABLE_SW; npx playwright test multi-academy/share-link/teachers-crud/templates-apply-delete --project=chromium` 실행 → **11개 fail 재현**. `templates-apply-delete.spec.ts:137` "템플릿" 버튼 15s timeout 정확히 H2 패턴 일치.

## Decision

### 1. `src/app/sw.ts` — `runtimeCaching`에 `/api/*` `NetworkOnly` prepend

```typescript
import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, Serwist } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url: { pathname }, sameOrigin }) =>
        sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,  // 라이브러리 기본 정책 보존 (NetworkFirst /api/*는 위에서 이미 매치돼 안 닿음)
  ],
  fallbacks: { entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }] },
});
```

**의미**: SW가 `/api/*` 요청을 가로채지 않음. 캐시도 안 함. `defaultCache` 자체는 건드리지 않고 위에 우리 정책 한 줄 prepend로 우회 — Serwist 업그레이드 시 `defaultCache` 다른 항목 변경되어도 우리 우회는 보존.

### 2. `src/components/atoms/AuthGuard.tsx:55-57` — timeout 3000 → 7000

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error("인증 확인 타임아웃")), 7000)
);
```

**의미**: SW activate latency(install + precache 1~3s) + supabase auth init(<500ms) + cross-origin fetch(SW intercept latency 50~200ms) 누적이 3s 넘기는 케이스 방어. 정상 케이스(SW idle)는 100ms 이내라 영향 미미. 무한 hang 가드는 유지 (SW 외 다른 latency도 흡수 — defense in depth).

### 3. `.github/workflows/ci.yml` — `e2e` + `e2e_pwa` 통합

- `e2e` job env에서 `E2E_DISABLE_SW: "1"` 제거 → SW 활성 환경
- `e2e_pwa` job 통째 삭제 (offline-network.spec.ts는 `e2e` job 명령에 이미 포함)
- 결과: 13-spec + offline-network 3-spec 모두 SW 활성에서 실행. 환경 충실도 = production. CI 시간 5-10분 절약.

### 4. `next.config.ts:9-15` — `E2E_DISABLE_SW` 분기 유지 (개발자 escape hatch)

```typescript
disable:
  process.env.NODE_ENV === "development" ||
  process.env.E2E_DISABLE_SW === "1",
```

CI에서는 사용 안 하지만 개발자가 로컬에서 임시로 SW 끄고 싶을 때 escape hatch 유지. 주석에 "CI 사용 안 함" 명시.

## Consequences

### Positive

- **환경 충실도 회복**: e2e 환경 = production 환경. SW가 production에서만 일으킬 회귀를 즉시 잡음
- **CI 시간 절약**: e2e_pwa job 사라짐 (5-10분/run)
- **신규 사용자 첫 방문 안정성 ↑**: AuthGuard 7s timeout이 SW activate latency 흡수 → race condition 손실 없음
- **`defaultCache` 정책 변경 robust**: prepend 패턴이라 라이브러리 업그레이드 시 우리 우회 보존
- **Devil's Advocate 원칙 실천**: "2회+ 같은 fail은 진단 깊이" 메타 일지 원칙 검증된 사례

### Negative

- **`defaultCache` silent regression risk**: `@serwist/next` 메이저 업그레이드 시 정책이 바뀌면 우리 prepend가 의도와 다르게 동작 가능. 완화: sw.ts 주석에 본 ADR 링크
- **AuthGuard 7s가 인증 실패 케이스 사용자 경험 저하**: supabase가 진짜 hang하면 사용자 7초 로딩 봐야 함. 정상 케이스 영향 미미. 무한 hang 방지 가드는 유지
- **CI 통합 직후 1-2주 회귀 모니터링 필요**: 본 fix 후 다른 SW 회귀 가능. PR #246 첫 시도에서 multi-academy 11s flaky 발견 (re-run pass) — 추적 필요

### Verification (Phase C)

- 13-spec + offline-network 3-spec **63 pass / 0 failed (1.6분, SW 활성)** ✓
- 4-spec auth-dependent **5회 연속 통과** (race-once 배제) ✓
- Chrome DevTools Application > Service Workers "activated", Network 탭 `/api/*` "Service Worker" 칼럼 비어 있음 (NetworkOnly 적용 입증) ⏳ (사용자 manual 검증 권장)
- CI green (PR #244 commit 97adbc6) ✓

## Alternatives Considered

### A. SW 자체 다시 제거 (rollback ADR-006)
PR Q-S 가치(offline + install + 학생/학부모 PWA UX) 포기. **기각** — PWA는 전제.

### B. `E2E_DISABLE_SW=1` 영구 유지
환경 충실도 영구 손실. 본 ADR 의도와 정면 모순. **기각**.

### C. `clientsClaim: false` (Serwist option)
첫 mount는 SW 영향 X (race surface 사라짐). 단점: PR S(offline-network) 첫 진입 사용자가 "한 번 reload" 필요 → offline 시나리오 UX 저하. **기각** (H3 가설은 H2가 더 강해서 채택 안 됨).

### D. `useGlobalDataInitialization`에 `await navigator.serviceWorker.ready` 추가 (F4)
production code 추가 변경. F1만으로 충분히 통과해서 F4는 필요 없음 (5회 연속 통과로 검증). 미래 다른 race 발견 시 검토. **현재 기각**.

### E. AuthGuard timeout 자체 제거 (timeout race 없앰)
supabase가 무한 hang하면 사용자 영원히 "로딩 중..." — 가드 가치 손실. **기각**.

### F. `navigationPreload: false`
H1 가설 (navigationPreload 2중 fetch race) 대응. H2가 더 강한 가설로 검증돼 채택 안 됨. **기각**.

### G. AuthGuard 5s (7s 대신 더 짧게)
SW activate가 가끔 5s 넘기는 환경(CI ubuntu, 네트워크 약함) 가능 — 7s가 안전 마진. CI 멀티 academy 11s flaky 사례(PR #246 첫 시도)로도 7s가 충분히 짧지 않을 수 있다는 신호 — 향후 데이터 누적 후 재평가. **현재 7s 유지**.

## Future Work

1. **CI multi-academy flaky 추적**: 1-2주 모니터링 후 빈도 분석. 잦으면 AuthGuard 10s로 더 늘리거나 F4 추가
2. **Serwist 메이저 업그레이드 검증 ADR**: 9.x → 10.x 시점에 별도 ADR — `defaultCache` 정책 변경 + 우리 prepend 동작 검증 매트릭스
3. **Lightsail production deploy + manual smoke**: 진짜 사용자 환경에서 PWA install + offline 동작 (사용자 trigger 시)
