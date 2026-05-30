# design-explorations 라우트 production 노출 가드

> **Status:** ✅ Implemented (2026-05-12) — middleware 404 차단 + matcher 추가. 7 unit tests 통과.
> **Trigger:** production 배포 전, SEO/번들 사이즈 우려 발생 시, 또는 사용자가 우연히 mockup URL 접근 보고 시 → 충족.
> **Implementation:** `src/middleware.ts` — `NODE_ENV === "production"` + pathname.startsWith `/design-explorations` 시 `NextResponse(null, { status: 404 })`. matcher에 `/design-explorations/:path*` 추가.
> **번들 크기 추가 fix:** 별도 후속 작업 (현재는 라우트만 차단, mockup 코드는 prod 번들에 여전히 포함). 우려 명확화 시 webpack `IgnorePlugin` 또는 `pageExtensions` 트릭으로 진행.
> **Created:** 2026-05-12

## 1. Problem

Next.js App Router는 `src/app/` 하위의 모든 `page.tsx`를 자동으로 라우트로 변환. 따라서 디자인 탐색용 mockup 페이지가 `src/app/design-explorations/{topic}/page.tsx` 위치에 있으면 production build (`npm run build`) 시 자동으로 `class-planner.info365.studio/design-explorations/{topic}` URL로 노출된다.

### 영향 라우트 (현재)

```
src/app/design-explorations/
├─ page.tsx              → /design-explorations
├─ option-c/page.tsx     → /design-explorations/option-c
├─ p4-a/page.tsx         → /design-explorations/p4-a
├─ p4-b/page.tsx         → /design-explorations/p4-b
├─ p4-c/page.tsx         → /design-explorations/p4-c
└─ notifications/page.tsx → /design-explorations/notifications (2026-05-12 신규)
```

향후 새 디자인 탐색이 추가될 때마다 같은 문제 누적.

### 위험 카테고리

| # | 위험 | 영향 |
|---|---|---|
| 1 | 사용자 우연 접근 시 혼란 | mockup이 실서비스처럼 보이지만 기능 X. "이게 뭐지" / "서비스 망가졌나" 오해 |
| 2 | SEO 노출 | Google이 mockup URL 인덱싱 가능 → 검색 결과에 노출 |
| 3 | 번들 크기 증가 | mockup React 컴포넌트가 production JS 번들에 포함 → 모든 사용자 다운로드 |
| 4 | 미래 사고 가능성 | mockup이 production data와 섞이는 코드가 실수로 추가되면 실데이터 노출 가능 |
| 5 | 모니터링 오인 | mockup 라우트 hit이 분석 도구(GA/omni-radar)에 잡혀 노이즈 |

## 2. Options

### (a) Next.js private folder 컨벤션 — `_design-explorations`

폴더명 앞에 `_` 추가:
```
src/app/_design-explorations/notifications/page.tsx
```
Next.js는 `_`로 시작하는 폴더를 라우트로 변환하지 않음 (공식 컨벤션). dev 환경에서도 라우트 안 잡힘 → mockup 검토 위해선 별도 mount 필요.

| 장점 | 단점 |
|---|---|
| Next.js 표준 | dev 환경에서도 라우트 안 잡혀 mockup 검토 불가 → 이 옵션은 부적합 |

→ **기각**: 디자인 탐색 핵심 가치는 사용자가 본인 브라우저로 dev 서버에서 본다는 것 ([feedback memory](#)).

### (b) middleware로 prod 환경 404 — 추천

`src/middleware.ts`에 1줄 추가:

```ts
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.pathname.startsWith("/design-explorations")
  ) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }
  // ... 기존 middleware 로직
}

export const config = {
  matcher: ["/design-explorations/:path*"],
};
```

| 장점 | 단점 |
|---|---|
| dev에서는 그대로 동작 | 번들 크기는 여전 (mockup 코드가 prod build에 포함됨 — 단지 라우트만 차단) |
| 코드 1줄 추가 | — |
| 모든 design-explorations 하위 자동 보호 | — |

### (c) next.config.ts 또는 webpack 설정으로 build 제외

production build에서 `src/app/design-explorations/` 폴더 자체 제외 — webpack `IgnorePlugin` 또는 Next.js `pageExtensions` 트릭.

| 장점 | 단점 |
|---|---|
| 번들에서 완전 제거 | 설정 복잡, Next.js 버전 업그레이드 시 깨질 가능성 |
| URL도 자동 차단 | dev/prod 차등 처리 시 분기 코드 필요 |

### (d) 무시

현재 상태 유지.

| 장점 | 단점 |
|---|---|
| 작업 0 | 위 5가지 위험 그대로 |

## 3. Recommendation

**(b) middleware 404**.

- 작업량 최소 (middleware 1줄)
- dev 환경 영향 없음
- 모든 design-explorations 하위 자동 보호 (option-c, p4-a/b/c, notifications, 향후 신규)
- 번들 크기 문제는 별도 후속 작업으로 — middleware로 라우트 차단만 우선 처리

번들 크기 우려가 명확히 측정되면 (c)로 추가 진행.

## 4. Implementation sketch

1. `src/middleware.ts` 현재 상태 확인 — 다른 middleware 로직과 공존 가능한지
2. `NODE_ENV === "production"` 분기 + pathname startsWith `/design-explorations` 시 404 rewrite
3. matcher에 `/design-explorations/:path*` 추가 (성능 위해 — 모든 요청에 middleware 실행 회피)
4. unit test: jest/vitest로 middleware 함수 직접 호출
5. e2e test: prod 빌드 후 `/design-explorations/notifications` 접근 → 404 확인
   - 또는 manual check: `NODE_ENV=production npm run build && npm start` 후 curl로 확인

## 5. Verification

```bash
# dev 모드: 200 OK (mockup 검토 가능)
NODE_ENV=development npm run dev
curl -sI http://localhost:3000/design-explorations/notifications
# → HTTP/1.1 200 OK

# prod 모드: 404
NODE_ENV=production npm run build && npm start
curl -sI http://localhost:3000/design-explorations/notifications
# → HTTP/1.1 404 Not Found
```

## 6. Related

- 메모리 `feedback-visual-companion-html-not-png` — design-explorations 라우트가 디자인 탐색 표준 패턴이 됨 → 가드도 표준화 필요
- 영향 라우트 전체: `src/app/design-explorations/{option-c, p4-a, p4-b, p4-c, notifications}/page.tsx`
- 알림 히스토리 spec: [`../notification-history-spec.md`](../notification-history-spec.md) § 10 Out of Scope에 본 문서 참조

## 7. Rollout

1. 본 doc 승인 → 별도 PR (`fix/design-explorations-prod-guard`)
2. middleware 변경 + unit test
3. local `NODE_ENV=production npm run build` 수동 검증
4. dev → main 머지 → production 배포 후 실제 URL 확인
5. 이후 새 design-explorations 라우트 추가 시 자동 보호됨 — 추가 작업 0
