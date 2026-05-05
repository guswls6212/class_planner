# ADR-006: PWA 도입 (Serwist 기반)

**Date:** 2026-05-05
**Status:** Accepted

## Context

class-planner는 두 사용자 그룹을 가진다:
- **학원 운영자 (admin)** — 데스크톱에서 시간표 구성, PWA 가치 낮음
- **학생/학부모** — 모바일에서 `/share/[token]` public route로 시간표 확인. 인증 없음. **PWA 가치 가장 큼** (홈 화면 설치, 오프라인에서도 자녀 시간표 확인)

ARCHITECTURE.md §1.4 "PWA & Mobile-First (전제)"에서 이미 PWA 확장을 전제로 설계해왔으나, 다음 인프라가 미구현 상태였다:
- `public/manifest.json` (또는 `app/manifest.ts`)
- Service Worker (offline cache)
- icon 세트 (192/512/apple-touch-icon)
- theme-color, viewport-fit=cover, apple-mobile-web-app-* 메타

또한 `tests/e2e/offline-network.spec.ts:67`이 *"dev server는 offline에서 HTML 응답 못 받음 (Service Worker 없음)"*을 이유로 long-term skip 상태였다.

dev-pack 전체 전략은 **모바일/태블릿은 PWA로 대응, 네이티브 iOS/Android는 native 기능 필수일 때만**.

## Decision

### 라이브러리 선택: Serwist (`@serwist/next`)

- App Router 네이티브 지원
- next-pwa의 활성 fork (next-pwa는 2026 시점 유지보수 정체 + Next.js 15 호환성 이슈 보고)
- Workbox 기반 (검증된 캐시 전략)
- Type-safe SW entry (`src/app/sw.ts`)

### Manifest + Icon: Next.js 15 metadata API

- `src/app/manifest.ts` — `MetadataRoute.Manifest` export (`/manifest.webmanifest`로 노출)
- `src/app/icon1.tsx` (192×192), `icon2.tsx` (512×512), `apple-icon.tsx` (180×180) — `ImageResponse` 동적 생성. amber 배경 + "P" 단순 디자인 (디자이너 자산 도입 시 교체 가능). 파일명은 Next.js 15 metadata convention `icon{n}.tsx` (n은 단일 숫자)을 따른다. URL은 `/icon1`, `/icon2`로 노출되어 manifest에서 참조.
- 기존 `src/app/favicon.ico` 유지 (25KB 디자인 보존)
- `src/app/layout.tsx` server component로 변환하여 `metadata` + `viewport` export 활성화. client 의존(ThemeProvider, AppShell, useGlobalDataInitialization, Toaster, dynamic import)은 `_components/RootProviders.tsx`로 분리.

### SW 캐시 전략

- HTML 문서: `NetworkFirst` — 배포 즉시 신버전 받게 + offline에서 캐시 fallback
- `_next/static/*`: `CacheFirst` (Next.js 자동 hash bust로 invalidation 안전)
- `/api/*`: `NetworkOnly` — sync(Realtime/SSE/POST) 깨지지 않게
- offline fallback page: `app/~offline/page.tsx` (캐시 미존재 라우트 진입 시)
- `skipWaiting: true` + `clientsClaim: true` — 새 SW 즉시 활성화 (캐시 invalidation 함정 완화)

### Dev mode disable

`process.env.NODE_ENV === "development"` 조건으로 SW 빌드 자체 disable. 개발자가 dev server에서 PWA 동작을 보려면 `npm run build && npm run start` 명시적 실행.

## Alternatives Considered

### next-pwa (거부)
- App Router 호환성 부족, 유지보수 정체

### Workbox 직접 사용 (거부)
- 저수준 boilerplate. Serwist가 동일 기능 wrap 제공

### Manifest only (SW 생략) (거부)
- 설치는 가능하나 offline 미동작
- 사용자 의도(학부모 PWA에서 자녀 시간표 오프라인 조회)에 부족

### Capacitor/Tauri로 native wrapping (거부)
- class-planner에 native 기능 필요 없음 (camera/file system/native push 등)
- PWA로 충분, 배포 복잡도 절감

### Edge runtime icon (거부)
- Lightsail standalone build는 Node.js 서버 — edge runtime 미지원
- ImageResponse는 nodejs runtime에서도 동작 (next/og 14.2+)

## Consequences

### Positive
- 학생/학부모가 share token URL을 홈 화면에 추가 → 앱처럼 사용 + offline에서도 시간표 조회
- `offline-network.spec.ts:67` 회귀 가드 활성 가능
- ARCHITECTURE.md §1.4의 미구현 항목 해소

### Negative / Risks
- **캐시 invalidation 함정** — 잘못 배포된 SW는 사용자 브라우저에 박힘. 완화: `skipWaiting`+`clientsClaim` + Lightsail 배포 후 1주일 production 모니터링
- **dev server에서 SW 안 보임** — 개발 검증 불편. 완화: development-guide.md에 `npm run build && npm run start` 안내 명시
- **iOS PWA push 미지원** — 알림 시나리오는 별도 plan 필요

## Verification

- `npm run build` 성공 + `public/sw.js` 생성 확인 (PR R 후)
- Chrome DevTools Application 탭 > Manifest 인식 + 모든 icon 로드
- Network 탭 Offline 토글 → reload → `/schedule` 정상 mount (PR R 후)
- `tests/e2e/offline-network.spec.ts` 3/3 통과 (PR S 후)
