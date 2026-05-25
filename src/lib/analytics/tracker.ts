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

export async function sendPageview(params: SendPageviewParams): Promise<void> {
  const config = getEnvConfig();
  if (!config) return; // env 미설정 — noop

  if (!params.visitorId || !params.sessionId || !params.path) return;

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
      body: JSON.stringify({
        visitor_id: params.visitorId,
        session_id: params.sessionId,
        event_type: "pageview",
        path: params.path,
        referrer: params.referrer ?? null,
        metadata: params.metadata ?? {},
      }),
      signal: controller?.signal,
    });
  } catch {
    // fire-and-forget — Mac Studio 장애 / network 실패 무시 (ADR 0001 선결 #3)
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function isAnalyticsEnabled(): boolean {
  return getEnvConfig() !== null;
}
