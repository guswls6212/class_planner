# Onboarding Flow Design Spec

> 2026-04-14 | Phase 2A 핵심 미완료 항목

## 1. 목적

첫 로그인 사용자가 학원명과 역할을 입력하여 academy를 생성하고, 온보딩 미완료 사용자가 데이터 페이지에 접근하지 못하도록 서버사이드 가드를 구축한다.

## 2. 현재 상태 (문제)

- `POST /api/onboarding`이 자동으로 `"{이름}의 학원"` 생성 — 사용자 입력 없음
- `useGlobalDataInitialization`에서 온보딩 실패 시 에러가 조용히 무시됨
- 온보딩 없는 사용자가 데이터 페이지 접근 → `resolveAcademyId` throw → 모든 API 500
- 사용자에게 에러 표시 없음 — 빈 화면만 보임

## 3. 설계

### 3.1 아키텍처: Next.js Middleware + 쿠키 캐시

**DB 오버헤드 해결 전략:**
- 온보딩 완료 시 `onboarded=1` httpOnly 쿠키 설정 (maxAge: 30일)
- Middleware는 쿠키만 체크 — DB 조회 없음 (O(1))
- 쿠키가 없는 경우에만 `/api/onboarding/status` 호출하여 DB 확인
- 쿠키가 조작되어도 실제 API 호출 시 `resolveAcademyId`가 최종 검증 → 보안 유지

```
요청 흐름:
1. 비로그인? → 통과 (Anonymous-First 유지)
2. 로그인 + 쿠키 "onboarded" 있음? → 통과 (DB 0회)
3. 로그인 + 쿠키 없음 → GET /api/onboarding/status
   3a. academy 있음 → 쿠키 설정 + 통과
   3b. academy 없음 → /onboarding 리디렉트
```

### 3.2 Middleware 범위

```
체크 대상: /students, /subjects, /schedule
제외: /, /login, /onboarding, /about, /api/*, /_next/*, 정적 파일
```

Supabase 세션 감지: `sb-{projectRef}-auth-token` 쿠키 존재 여부로 로그인 상태 판단.
Supabase JS SDK가 자동으로 세션을 쿠키에 저장하므로 Middleware에서 접근 가능.

### 3.3 `/onboarding` 페이지 UI

```
OnboardingPage
  └── 카드형 중앙 정렬 UI (login 페이지와 유사한 스타일)
        ├── "학원 정보 설정" 타이틀
        ├── 환영 메시지 (사용자 이름 표시)
        ├── 학원명 입력 (필수, 2글자 이상, placeholder: "예: 해피수학학원")
        ├── 역할 선택 (라디오 버튼 3개)
        │     ├── 원장 → role: "owner"
        │     ├── 강사 → role: "admin"
        │     └── 직원 → role: "member"
        ├── "시작하기" 버튼
        │     → POST /api/onboarding (academyName, role)
        │     → 성공: /students 리디렉트
        │     → 실패: 에러 메시지 + 재시도
        └── 에러 배너 (조건부)
```

- 비로그인 접근 시 → `/login` 리디렉트
- 이미 온보딩 완료 사용자 → `/schedule` 리디렉트

### 3.4 API 변경

**`POST /api/onboarding` 수정:**
- Request: `{ academyName: string, role: "owner" | "admin" | "member" }` + `?userId=...`
- 기존 idempotency 체크 유지 (이미 academy 있으면 `isNew: false` 반환)
- 새 academy 생성 시: `academyName` 사용, `role` 적용
- 응답에 `Set-Cookie: onboarded=1; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax` 포함

**`GET /api/onboarding/status` 신규:**
- Request: `?userId=...`
- `academy_members` 조회 → 존재 여부 반환
- 있으면 `{ hasAcademy: true, academyId }` + Set-Cookie
- 없으면 `{ hasAcademy: false }`

### 3.5 `useGlobalDataInitialization` 변경

- 자동 온보딩 호출 (line 139-153) 제거
- Middleware가 가드하므로, 이 훅에 도달한 로그인 사용자는 온보딩 완료 보장
- 데이터 fetch 로직은 그대로 유지

### 3.6 로그아웃 처리

- `LoginButton`의 로그아웃에서 `onboarded` 쿠키 삭제 추가
- `document.cookie = "onboarded=; Path=/; Max-Age=0"`

### 3.7 에러 처리

| 시나리오 | 처리 |
|----------|------|
| 온보딩 API 실패 | 페이지 내 에러 메시지 + 재시도 버튼 |
| 네트워크 에러 | "연결을 확인해주세요" 안내 |
| 학원명 2글자 미만 | 클라이언트 유효성 검사, 버튼 비활성화 |
| status API 실패 (Middleware) | 안전하게 통과 (기존 동작 유지, 데이터 API에서 최종 검증) |

## 4. 파일 변경 목록

| 파일 | 변경 |
|------|------|
| `src/middleware.ts` | 신규 — Middleware 가드 |
| `src/app/onboarding/page.tsx` | 신규 — 온보딩 페이지 |
| `src/app/api/onboarding/route.ts` | 수정 — academyName, role 파라미터, Set-Cookie |
| `src/app/api/onboarding/status/route.ts` | 신규 — GET status 체크 |
| `src/hooks/useGlobalDataInitialization.ts` | 수정 — 자동 온보딩 호출 제거 |
| `src/components/organisms/LoginButton.tsx` | 수정 — 로그아웃 시 쿠키 삭제 |
| `src/app/login/page.tsx` | 수정 — 리디렉트 통일 |

## 5. 테스트

- 단위: Middleware matcher 로직, 온보딩 API 파라미터 검증
- 통합: 로그인 → 온보딩 → 데이터 페이지 접근 E2E flow
- 엣지: 쿠키 없는 기존 사용자 → status 체크 → 쿠키 설정 → 정상 동작

## 6. 검증 라우트

| 변경 | 확인할 라우트 |
|------|-------------|
| middleware.ts | /students, /subjects, /schedule (가드 동작) |
| onboarding/page.tsx | /onboarding (폼, 제출, 리디렉트) |
| LoginButton.tsx | 모든 페이지 (로그아웃 후 쿠키 삭제) |
| login/page.tsx | /login (리디렉트 대상) |
