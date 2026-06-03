/**
 * Native analytics tracker — Mac Studio analytics-server 로 event POST.
 *
 * 발화 경로:
 *   AnalyticsTracker (`src/app/_components/AnalyticsTracker.tsx`) 가
 *   usePathname 변화 시 sendPageview 호출.
 *
 * 안전 원칙 (analytics-server ADR 0001 선결 #3 — fire-and-forget):
 *   - 모든 호출은 fire-and-forget. 실패해도 사용자 UX 영향 0.
 *   - AbortController 로 2초 timeout. Mac Studio 응답 지연 시 hang 안 함.
 *   - NEXT_PUBLIC_ANALYTICS_URL / NEXT_PUBLIC_ANALYTICS_TOKEN 미설정 시 noop
 *     (e2e/preview 환경 등에서 자동 비활성).
 *
 * 환경 변수:
 *   NEXT_PUBLIC_ANALYTICS_URL    — 예: https://analytics.deepcraft.app
 *   NEXT_PUBLIC_ANALYTICS_TOKEN  — analytics-server `.env.local` 의 ANALYTICS_TOKEN 과 동일 값
 */

const VISITOR_ID_KEY = "analytics_visitor_id";
const SESSION_ID_KEY = "analytics_session_id";
const SESSION_LAST_ACTIVITY_KEY = "analytics_session_last_activity";
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30분
const REQUEST_TIMEOUT_MS = 2000;
const IGNORE_KEY = "analytics_ignore";

const BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /\bcurl\b/i,
  /wget/i,
  /python-requests/i,
];

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some((re) => re.test(userAgent));
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback (구형 브라우저 대응) — 실 운용 거의 없음.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing && existing.length === 36) return existing;
    const fresh = generateUuid();
    window.localStorage.setItem(VISITOR_ID_KEY, fresh);
    return fresh;
  } catch {
    return generateUuid(); // localStorage 차단 (private mode 등) — 매 호출 새 UUID
  }
}

export function getOrCreateSessionId(now: number = Date.now()): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    const lastActivityStr = window.sessionStorage.getItem(SESSION_LAST_ACTIVITY_KEY);
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;
    const idle = !lastActivity || now - lastActivity > SESSION_IDLE_MS;

    if (existing && existing.length === 36 && !idle) {
      window.sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
      return existing;
    }

    const fresh = generateUuid();
    window.sessionStorage.setItem(SESSION_ID_KEY, fresh);
    window.sessionStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
    return fresh;
  } catch {
    return generateUuid();
  }
}

/**
 * 내부(본인) 트래픽 opt-out — `?analytics_ignore=1` 방문 시 그 브라우저 영구 제외, `=0` 해제.
 * Plausible/Umami 방식. localStorage 영속이라 기기마다 1회면 됨. UUID/IP 제외와 독립(중복 안전).
 * search 인자는 테스트용(미지정 시 현재 URL) — jsdom location 의존 제거.
 */
export function applyIgnoreFlagFromUrl(search?: string): void {
  if (typeof window === "undefined") return;
  try {
    const qs = search ?? window.location.search;
    const v = new URLSearchParams(qs).get(IGNORE_KEY);
    if (v === "1") window.localStorage.setItem(IGNORE_KEY, "1");
    else if (v === "0") window.localStorage.removeItem(IGNORE_KEY);
  } catch {
    // localStorage 차단(private mode) — opt-out 불가, noop
  }
}

/** 이 브라우저가 내부 트래픽으로 표시됐는지(analytics_ignore). 모든 전송의 최종 gate. */
export function isAnalyticsIgnored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(IGNORE_KEY) === "1";
  } catch {
    return false;
  }
}

export interface SendPageviewParams {
  visitorId: string;
  sessionId: string;
  path: string;
  referrer?: string | null;
  metadata?: Record<string, unknown>;
}

function getEnvConfig(): { url: string; token: string } | null {
  const url = (process.env.NEXT_PUBLIC_ANALYTICS_URL || "").trim();
  const token = (process.env.NEXT_PUBLIC_ANALYTICS_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

/**
 * 공통 전송 — config(noop guard) + 2초 timeout + fire-and-forget.
 * analytics-server `POST /event` 가 body 의 event_type 으로 pageview/click/custom 구분.
 */
async function postAnalyticsEvent(body: Record<string, unknown>): Promise<void> {
  const config = getEnvConfig();
  if (!config) return; // env 미설정 — noop
  if (isAnalyticsIgnored()) return; // 내부(본인) opt-out — noop. 미설정 브라우저(실사용자)엔 영향 0

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    await fetch(`${config.url}/event`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
      signal: controller?.signal,
    });
  } catch {
    // fire-and-forget — Mac Studio 장애 / network 실패 무시 (ADR 0001 선결 #3)
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function sendPageview(params: SendPageviewParams): Promise<void> {
  if (!params.visitorId || !params.sessionId || !params.path) return;
  await postAnalyticsEvent({
    visitor_id: params.visitorId,
    session_id: params.sessionId,
    event_type: "pageview",
    path: params.path,
    referrer: params.referrer ?? null,
    metadata: params.metadata ?? {},
  });
}

export interface SendEventParams {
  visitorId: string;
  sessionId: string;
  eventType: string; // 'click' | 'custom' | ...
  path: string;
  referrer?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * 임의 event_type(click/custom) 전송 — pageview 와 같은 안전 원칙(fire-and-forget, env 미설정 noop).
 * metadata 에 PII(학생/강사 인명·입력값) 금지 — 안정 식별자(target/label)만 (analytics 는 행동만, 내용 X).
 */
export async function sendEvent(params: SendEventParams): Promise<void> {
  if (
    !params.visitorId ||
    !params.sessionId ||
    !params.eventType ||
    !params.path
  )
    return;
  await postAnalyticsEvent({
    visitor_id: params.visitorId,
    session_id: params.sessionId,
    event_type: params.eventType,
    path: params.path,
    referrer: params.referrer ?? null,
    metadata: params.metadata ?? {},
  });
}

/**
 * 컴포넌트 callsite 용 클릭 계측 helper — fire-and-forget(void). visitor/session 자동,
 * path 는 현재 location. `target` 은 안정 식별자(PII 금지).
 *   예: trackClick("pdf_download") · trackClick("login", { provider: "google" })
 */
export function trackClick(
  target: string,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!isAnalyticsEnabled()) return;
  void sendEvent({
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(),
    eventType: "click",
    path: window.location.pathname,
    metadata: { target, ...(metadata ?? {}) },
  });
}

export function isAnalyticsEnabled(): boolean {
  return getEnvConfig() !== null;
}

/* ─────────────── Phase 2 — UTM · 체류시간 · 스크롤 · Web Vitals ───────────────
 * 모두 익명·집계(법적 안전). metadata 에 PII(인명/입력값) 금지. (analytics-feature-completeness Phase 2)
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
const UTM_STORAGE_KEY = "analytics_first_touch_utm";

/**
 * first-touch UTM — `utm_*` 만 화이트리스트(나머지 query=share token 등 PII 회피, AnalyticsTracker 주석).
 * 세션 최초 캡처를 sessionStorage 보존 → 같은 세션은 첫 캠페인에 귀속.
 */
export function getFirstTouchUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as Record<string, string>;
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    if (Object.keys(utm).length > 0) {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
    return utm;
  } catch {
    return {};
  }
}

/** 체류시간 — event_type='engagement', metadata.duration_ms (1초~30분 clamp). fire-and-forget. */
export function trackEngagement(durationMs: number, path?: string): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
  if (!Number.isFinite(durationMs) || durationMs < 1000) return; // 1초 미만 노이즈 무시
  void sendEvent({
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(),
    eventType: "engagement",
    path: path ?? window.location.pathname,
    metadata: { duration_ms: Math.min(Math.round(durationMs), 30 * 60 * 1000) },
  });
}

/** 스크롤 깊이 — event_type='scroll', metadata.depth(25/50/75/100). milestone 중복 가드는 caller. */
export function trackScrollDepth(depth: 25 | 50 | 75 | 100, path?: string): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
  void sendEvent({
    visitorId: getOrCreateVisitorId(),
    sessionId: getOrCreateSessionId(),
    eventType: "scroll",
    path: path ?? window.location.pathname,
    metadata: { depth },
  });
}

/**
 * Web Vitals value 반올림 — ms 지표(LCP/INP/FCP/TTFB)는 정수, **CLS(0~1 무차원 소수)는 4자리 보존**.
 * CLS 를 Math.round 하면 0/1 로 뭉개져 지표가 무의미해짐(2026-06-02 발견). name 기준 분기.
 */
export function roundVitalValue(name: string, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return name === "CLS" ? Math.round(value * 10000) / 10000 : Math.round(value);
}

/** Web Vitals — event_type='web_vital', metadata {name, value, rating}. web-vitals lib dynamic import(번들 분리). */
export function initWebVitals(): void {
  if (typeof window === "undefined" || !isAnalyticsEnabled()) return;
  void import("web-vitals")
    .then((mod) => {
      const report = (m: { name: string; value: number; rating: string }) => {
        void sendEvent({
          visitorId: getOrCreateVisitorId(),
          sessionId: getOrCreateSessionId(),
          eventType: "web_vital",
          path: window.location.pathname,
          metadata: { name: m.name, value: roundVitalValue(m.name, m.value), rating: m.rating },
        });
      };
      mod.onLCP(report);
      mod.onINP(report);
      mod.onCLS(report);
    })
    .catch(() => {
      // web-vitals 로드 실패 — fire-and-forget 무시
    });
}

/* ─────────────── Phase 2b — 외부 링크 · 파일 다운로드 자동 계측 ───────────────
 * 익명·집계(법적 안전). PII 회피: query/hash 미수집, pathname·host 만.
 */

const DOWNLOAD_EXT_RE =
  /\.(pdf|csv|xlsx?|docx?|pptx?|hwpx?|zip|txt|json|png|jpe?g|gif|svg|mp4|mp3)$/i;

export type OutboundClassification =
  | { type: "outbound"; host: string; path: string }
  | { type: "download"; ext: string; path: string }
  | null;

/**
 * 클릭된 링크 분류 — 외부(다른 origin) / 다운로드(확장자 또는 download 속성) / 무시(null).
 * 내부 같은-origin 일반 네비게이션은 null (pageview 가 커버). http(s) 만 — mailto/tel/javascript 무시.
 */
export function classifyOutbound(
  href: string | null | undefined,
  currentOrigin: string,
  hasDownloadAttr = false,
): OutboundClassification {
  if (!href) return null;
  let u: URL;
  try {
    u = new URL(href, currentOrigin);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const path = u.pathname.slice(0, 200);
  const extMatch = u.pathname.match(DOWNLOAD_EXT_RE);
  if (hasDownloadAttr || extMatch) {
    return { type: "download", ext: extMatch ? extMatch[1].toLowerCase() : "file", path };
  }
  if (u.origin !== currentOrigin) {
    return { type: "outbound", host: u.host.slice(0, 120), path };
  }
  return null;
}

/**
 * 외부링크/다운로드 자동 계측 — document click(capture) 1회 등록. AnalyticsTracker 마운트 시 호출.
 * fire-and-forget(void). cleanup 함수 반환(언마운트 시 listener 제거).
 */
export function initOutboundLinks(): () => void {
  if (typeof document === "undefined" || !isAnalyticsEnabled()) return () => {};
  const onClick = (e: MouseEvent) => {
    const start = e.target as Element | null;
    const anchor = start?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;
    const cls = classifyOutbound(
      anchor.getAttribute("href"),
      window.location.origin,
      anchor.hasAttribute("download"),
    );
    if (!cls) return;
    const common = {
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      path: window.location.pathname,
    };
    if (cls.type === "download") {
      void sendEvent({ ...common, eventType: "download", metadata: { ext: cls.ext, file: cls.path } });
    } else {
      void sendEvent({ ...common, eventType: "outbound", metadata: { host: cls.host, target_path: cls.path } });
    }
  };
  document.addEventListener("click", onClick, { capture: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}
