# ADR-025 — SEO/AEO 권위는 앱 메인 도메인 루트에 통합

- Status: Accepted
- Date: 2026-06-04
- 관련: proposal `study-room-gtm-landing`(공부방 GTM·랜딩·SEO/AEO), proposal `study-room-marketing-experiments`(정적 랜딩 계측), `class-planner-landing/`(정적 웨이트리스트 랜딩), ADR-022(monetization freemium)

## Context

class-planner 가 프로덕션(class-planner.deepcraft.app, 2026-05-30 런칭)으로 라이브된 뒤,
검색·AI 답변(AEO) 유입을 위한 SEO 자산을 **어디에 둘지** 결정이 필요했다.

당시 상태:
- **앱 메인 도메인**(루트 `/`)은 이미 마케팅 랜딩 컴포넌트(Hero/Steps/CTA)를 갖고 있었으나
  `"use client"` + 인증 체크 전 `return null` 이라 **크롤러가 빈 HTML 을 봄**. title 도 제네릭
  `"Class Planner"`. OG·canonical·JSON-LD·robots·sitemap **전무**.
- 별도 정적 랜딩(`class-planner-landing/`)은 공부방 포지셔닝 + JSON-LD·OG·키워드까지 갖췄으나
  **웨이트리스트(얼리액세스)** 성격 + 미배포 + 최종 URL(서브도메인) 미정.

`study-room-gtm-landing` 의 초기 가정은 "정적 랜딩을 별도 서브도메인에 배포"였다. 그러나
앱이 이미 라이브 + 루트가 이미 마케팅 면이라는 점에서, 서브도메인 분리는 **도메인 권위를
쪼개고** 가장 권위 있는 URL(메인 도메인)을 SEO상 비워두는 선택이 된다.

## Decision

**SEO/AEO 권위를 앱 메인 도메인 루트(`class-planner.deepcraft.app/`)에 통합한다.**

- 루트 `/` 를 **server component 로 전환** — 마케팅 콘텐츠를 SSR 로 항상 렌더(크롤러 색인),
  리다이렉트는 `RootRedirectGate`(client)로 분리. hydration mismatch 0.
- **자동 이동은 로그인 직후에만**: `/` 는 모두의 랜딩. login 진입 시 set 하는 1회성 신호
  (`sessionStorage.cp_just_logged_in`)가 있을 때만 게이트가 `/schedule` 로 보낸다. 이미 로그인된
  재방문자(끈적한 `supabase_user_id` 마커만 있음)는 랜딩·FAQ 를 그대로 보고 "내 시간표로 가기"
  바로가기만 노출 — 마커만으로 강제 이동하지 않는다(랜딩 접근성). login `else` 분기는 게이트 경유
  없이 `/schedule` 직행.
- 루트 메타데이터를 **공부방 포지셔닝**으로 좁힘(키워드 title/description/OG/Twitter/canonical).
  layout 에 `metadataBase` + `title.template`("%s | class-planner").
- **JSON-LD**(SoftwareApplication + FAQPage + Organization) 서버 렌더 — 화면 FAQ 와 동일 소스
  (`FAQ_ITEMS`)로 가시 콘텐츠·마크업 일치(구글 가이드).
- `app/robots.ts`(공개 면 허용·앱/인증 라우트 disallow) + `app/sitemap.ts`(`/`,`/privacy`) +
  `public/llms.txt`(AI 답변엔진용 요약).
- 정적 랜딩(`class-planner-landing/`)은 **폐기하지 않고 유료광고 캠페인 착지점**으로 역할 분리
  — 빠른 카피 A/B·UTM 계측(`study-room-marketing-experiments`)은 앱 배포 사이클과 독립 유지.
- 정식 canonical origin SSOT = `src/lib/seo/site.ts`(`SITE_URL`, env `NEXT_PUBLIC_SITE_URL`
  fallback = 프로덕션 도메인).

근거: 사용자(HYUNJIN) 결정(2026-06-04) — "앱 메인 도메인 통합" + "공부방 톤으로 좁힘".

## Alternatives (rejected)

- **별도 서브도메인에 정적 랜딩만 배포**(초기 로드맵 가정) — 도메인 권위 분산 + 라이브 제품의
  메인 URL 을 SEO상 비워둠. 정적 랜딩은 캠페인용으로만 남겨 절충.
- **루트 일반 포지셔닝 유지**("학원 시간표 관리 도구") — beachhead(공부방·교습소·1인 학원)
  키워드 정합 약화. GTM(study-room)·정적 랜딩과 메시지 분리 위험.
- **앱 루트를 그대로 client 렌더 유지 + 메타데이터만 보강** — 크롤러가 본문을 못 봄(빈 HTML).
  SSR 전환이 핵심이라 기각.

## Consequences

- (+) 라이브 제품의 메인 도메인이 즉시 색인·AEO 인용 가능 — 키워드·구조화 데이터·sitemap 확보.
- (+) 정적 랜딩은 캠페인 실험 자유도 유지(역할 분리).
- (+) 로그인 사용자도 `/` 의 랜딩·FAQ 를 그대로 볼 수 있다(자동 이동은 로그인 직후에만, 재방문자는
  "내 시간표로 가기" 바로가기). 끈적한 마커로 강제 이동하던 기존 동작 제거.
- (−) 매일 쓰는 운영자가 맨주소(`/`) 진입 시 작업공간이 아닌 랜딩을 먼저 본다(바로가기 1클릭).
  보통 `/schedule-v2` 직행이라 비용 낮음. OAuth 왕복은 `sessionStorage` 신호 보존에 의존(UAT 검증).
- (−) 루트 포지셔닝과 일반 학원 사용자 사이 메시지 갭 가능 — 확장 시 카피 재조정 필요.
- 후속: og:image(1200×630) 동적 생성(`opengraph-image`), Search Console·Naver Search Advisor
  등록 + sitemap 제출(proposal Step D), 콘텐츠 엔진(Step E). 배포 시 인프라(nginx)가
  `/robots.txt`·`/sitemap.xml` 을 가로채지 않는지 1회 확인.
