# ADR-026: API 인가는 세션 Bearer 토큰으로 — `?userId=` 는 검증 대상일 뿐

- 상태: 채택 (2026-07-26)
- 관련: `dev-pack/proposed-tasks/class-planner/class-planner-userid-authz-bypass.md`
- 연계: ADR-015 (역할 모델), ADR-007 (SW `/api/*` NetworkOnly)

## 맥락

API 라우트 40개가 acting user 를 클라이언트가 보낸 `?userId=` 쿼리에서 취득하고,
세션 검증 없이 `requireRole` / `resolveAcademyMembership` 에 넘겼다. 미들웨어는
`/api/*` 를 매칭하지 않는다. 결과는 **인증 우회 + BOLA + BFLA 동시**였다 —
유효한 UUID 하나만 알면 로그인 없이 그 사용자 권한으로 전 학원 데이터를 읽고 썼다.

2026-06-25 라이브 실증(`GET /api/audit-log?userId=<owner>` → 200), 2026-07-26
재검증에서 여전히 유효함을 확인. blast radius = 실제 학원 6곳, 학생 46명(미성년 PII).

`user-settings` 는 더 나빴다: 쿼리 userId 가 없으면 `"default-user-id"` 라는
**공유 버킷**으로 fallback 했다 — 비인증 요청이 그 버킷을 읽고 쓸 수 있었다.

## 결정

### 1. 자격증명은 `Authorization: Bearer <access_token>`

세션이 **쿠키가 아니라 localStorage 에 있다** (`utils/supabaseClient.ts` 는 쿠키
스토리지 어댑터 없이 `persistSession: true` 만 쓰고, `@supabase/ssr` 은 의존성에
없다). 따라서 서버가 요청에서 읽을 수 있는 자격증명이 쿠키에 존재하지 않는다.

⇒ **미들웨어를 인증 게이트로 쓸 수 없다.** (`middleware.ts:37` 의
`hasSupabaseSession()` 이 `sb-*-auth-token` 쿠키를 찾으므로 항상 false —
사실상 죽은 코드다. admin-only 리다이렉트도 그래서 발동하지 않는다. 데이터
경계가 아니라 별건 UX 버그이며 본 ADR 범위 밖.)

### 2. 서버 — `lib/auth/apiAuth.ts` 가 신원 확인 SSOT

```ts
const auth = await requireSessionUser(request, searchParams.get("userId"));
if (!auth.ok) return auth.response;
const userId = auth.userId;   // 검증된 값. 쿼리 값은 쓰지 않는다.
```

- 유효한 세션 토큰 없음 → **401**. 인가 판단보다 **먼저** 하여 리소스 존재
  여부가 노출되지 않게 한다.
- 쿼리 userId 가 세션 사용자와 불일치 → **403**.
- 쿼리 userId 부재 → 세션 userId 로 진행 (파라미터는 선택).

토큰 검증은 anon 키 클라이언트의 `auth.getUser(jwt)` 한 곳에서만 한다.
service_role 을 쓰지 않는다 — 검증에 특권이 필요 없고, 이 경로는 모든 API
요청에 있으므로 특권 키 사용 표면을 넓히지 않는다.

### 3. `?userId=` 는 제거하지 않고 **대조용으로 유지**

local-first 저장키(`classPlannerData:{userId}:{academyId}`)와 클라 호출부가 그
형태에 묶여 있다. 파라미터를 걷어내면 blast radius 가 몇 배로 커진다.
**인가는 세션 값으로만** 하고 쿼리는 불일치 검사 대상으로만 쓴다.

### 4. 클라 — fetch 인터셉터 1개 (호출부 개별 수정 아님)

`installApiAuthInterceptor()` 가 same-origin `/api/*` 요청에 토큰을 붙인다.
호출부 19개를 각각 수정하는 대안 대비 **누락 위험이 구조적으로 0** 이다 (한 곳만
빠져도 그 기능이 401 로 죽고, 앞으로 추가되는 호출부도 자동으로 덮인다).

- 설치는 `RootProviders` **모듈 최상단**. React effect 는 자식 → 부모 순이라
  부모 effect 에서 설치하면 `useGlobalDataInitialization` 등 자식의 첫 fetch 가
  이미 나가버린다.
- `/api/logs/client` 제외 — logger 싱크라서 토큰 조회 실패가
  logger → fetch → 인터셉터 재귀를 만든다.
- 기존 `Authorization` 은 덮어쓰지 않는다 (admin 페이지가 직접 넣는 Bearer 보존).
- 비로그인이면 헤더 없이 통과 — 익명 경로가 살아 있어야 한다.

### 5. 면제는 두 종류로 분리 — 섞으면 오독된다

`scripts/security/scan-api-session-authz.mjs` 가 SSOT.

- **`ANONYMOUS_ALLOWLIST` (8개)** — 익명이 **의도**된 경로. 공유 토큰(`share/[token]`,
  `share/code`) · 초대 확인(`invites/check`, `share-tokens/from-invite`) · 공개 학원
  정보(`academy/[identifier]/public`, `academies/check-slug`) · 비인증
  텔레메트리(`logs/client`) · UX 쿠키(`auth/set-role-cookie`).
  세션을 요구하면 기능이 죽는다. 추가는 "정말 익명이어야 하는가" 를 리뷰에서 따진다.
- **`ALTERNATE_GUARD` (1개)** — 익명이 아니고 **다른 가드**를 쓰는 경로.
  `admin/logs` = `requireDeveloper` (ADMIN_EMAILS 화이트리스트).

두 목록을 하나로 두면 `admin/logs` 가 "인증 없는 엔드포인트" 로 오독된다.
게이트는 `ALTERNATE_GUARD` 항목에서 **그 가드 심볼이 실제로 존재하는지** 확인한다 —
면제만 하고 넘어가면 가드가 삭제돼도 조용히 통과하기 때문이다 (역검증: 
`requireDeveloper` 를 지우면 위반 1건으로 잡힌다).

## 회귀 방지 (게이트 3중)

1. **정적 게이트** — `npm run security:authz` (CI `check` job). 쿼리 userId 가
   가드를 거치지 않거나, 인가 sink 를 쓰면서 가드가 없으면 exit 1.
   게이트 자체를 두 방향으로 역검증했다: 취약 라우트를 심어 위반 2건 검출(→ 제거 후 0),
   `ALTERNATE_GUARD` 라우트에서 `requireDeveloper` 를 지워 위반 1건 검출.
2. **가드 단위 테스트** — `src/lib/auth/__tests__/apiAuth.test.ts` (401/403/통과).
3. **배선 테스트** — `src/app/api/__tests__/session-authz.integration.test.ts` 는
   가드를 **mock 하지 않고** 라우트 10개 + 경로/body 변형 라우트를 호출한다.
   다른 라우트 테스트는 가드를 스텁하므로 배선을 증명하지 못한다. 한 라우트를
   취약 코드로 되돌려 이 테스트가 실제로 실패하는지 확인했다 (vacuous 아님).

## 결과 (실측, 로컬 dev)

| 요청 | 이전 | 이후 |
|---|---|---|
| `GET /api/audit-log?userId=<owner>` 인증 0 | 200 | **401** |
| `GET /api/students?userId=<owner>` 인증 0 | 200 | **401** |
| 위조 `Bearer fake-jwt-token` | 200 | **401** |
| 타인 userId + 유효 토큰 | 200 | **403** |
| `GET /api/user-settings` (userId 없음) | 200 (공유 버킷) | **401** |
| 익명 경로 (share/invites/check-slug) | 동작 | **동작 유지** |

## 대안과 기각 이유

- **미들웨어에서만 막기** — `/api/*` 가 매칭 밖이고, 무엇보다 서버가 읽을 자격
  증명이 쿠키에 없다. 라우트 헬퍼가 SSOT 이어야 한다.
- **`?userId=` 에 서명/HMAC** — 토큰을 재발명하는 것. Supabase 세션이 이미 있다.
- **`?userId=` 파라미터 전면 제거** — local-first 저장키·호출부 결합 때문에
  blast radius 가 과도. 인가에서 배제하는 것으로 목적은 이미 달성된다.
- **테스트 43개를 전역 mock 으로 통과** — 프로덕션에 닿을 수 있는 인증 우회
  스위치를 만들 위험. 파일별 명시 스텁 + 배선 테스트로 대체했다.

## 남은 리스크

1. **인증 요청마다 Supabase auth 왕복 1회 추가.** `auth.getUser(jwt)` 는 네트워크
   호출이다. local-first 라 API 호출이 잦아 체감 지연 가능 — **미측정**.
   로컬 JWT 서명 검증(네트워크 0)이 대안이나, 측정 전 최적화하지 않는다.
2. 세션 만료 시 클라가 401 을 받는다. 인터셉터는 `getSession()` 을 쓰므로
   supabase-js 의 자동 갱신에 의존한다. 갱신 실패 시 UX 처리는 별건.
3. `middleware.ts` 의 죽은 `hasSupabaseSession()` 은 그대로 남아 있다 (별건).
