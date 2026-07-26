// src/lib/auth/apiAuthInterceptor.ts
//
// 같은 출처의 `/api/*` 요청에 Supabase access_token 을 자동으로 붙인다.
//
// 왜 인터셉터 하나인가 (호출부 19개를 개별 수정하는 대안 대비):
//   서버가 `requireSessionUser` 로 401 을 던지기 시작하므로, 토큰을 안 붙인
//   호출부가 하나라도 남으면 그 기능이 그대로 죽는다. 인터셉터는 누락 위험이
//   구조적으로 0 이고, 나중에 추가되는 호출부도 자동으로 덮는다.
//
// 설치 시점 주의:
//   React effect 는 자식 → 부모 순으로 실행되므로, 부모(RootProviders)의
//   useEffect 에서 설치하면 자식들의 첫 fetch 가 이미 나가버린 뒤다.
//   그래서 모듈 최상단(= 브라우저 번들 로드 시점)에서 설치한다.
import { supabase } from "@/utils/supabaseClient";

/**
 * 토큰을 붙이지 않는 경로.
 *
 * - `/api/logs/client`: logger 의 싱크. 여기에 토큰을 붙이려고 getSession() 을
 *   부르면, 그 과정에서 발생한 에러가 다시 logger → fetch → 인터셉터로 돌아오는
 *   재귀가 생긴다. 이 경로는 비인증 텔레메트리로 유지한다.
 */
const SKIP_PATHS = new Set(["/api/logs/client"]);

let installed = false;

/** 요청 입력에서 URL 문자열을 뽑는다 (string | URL | Request 모두 처리). */
function resolveUrl(input: RequestInfo | URL): string | null {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return null;
}

/** same-origin `/api/*` 이고 skip 목록에 없으면 true. */
function needsAuthHeader(rawUrl: string | null): boolean {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl, window.location.origin);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;
  if (!url.pathname.startsWith("/api/")) return false;
  return !SKIP_PATHS.has(url.pathname);
}

/**
 * 이미 Authorization 이 실려 있는지 확인.
 * admin 페이지처럼 직접 Bearer 를 넣는 호출부를 덮어쓰지 않기 위함.
 */
function hasAuthHeader(input: RequestInfo | URL, init?: RequestInit): boolean {
  if (init?.headers && new Headers(init.headers).has("authorization")) return true;
  if (
    typeof Request !== "undefined" &&
    input instanceof Request &&
    input.headers.has("authorization")
  ) {
    return true;
  }
  return false;
}

/**
 * window.fetch 를 감싸 `/api/*` 요청에 `Authorization: Bearer <access_token>` 을 붙인다.
 * 브라우저에서만 동작하고, 중복 호출은 무시된다 (HMR 안전).
 */
export function installApiAuthInterceptor(): void {
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    if (!needsAuthHeader(resolveUrl(input)) || hasAuthHeader(input, init)) {
      return originalFetch(input, init);
    }

    let token: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      // 세션 조회 실패는 비인증 요청으로 흘려보낸다. 여기서 logger 를 쓰면
      // /api/logs/client 로 다시 fetch 가 나가므로 절대 로깅하지 않는다.
      token = null;
    }

    // 비로그인 상태 — 익명 허용 경로(share/invite 등)가 살아 있어야 하므로
    // 헤더 없이 원래대로 보낸다. 인가는 서버가 판단한다.
    if (!token) return originalFetch(input, init);

    // Request 객체로 들어온 경우: headers 를 합쳐 새 Request 로 재구성한다.
    if (typeof Request !== "undefined" && input instanceof Request) {
      const headers = new Headers(input.headers);
      headers.set("Authorization", `Bearer ${token}`);
      return originalFetch(new Request(input, { headers }), init);
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
}

/** 테스트 전용 — 설치 플래그 초기화. */
export function resetApiAuthInterceptorForTests(): void {
  installed = false;
}
