/**
 * omni-radar production observability — Mac Studio self-host endpoint.
 *
 * dev-pack `omni-radar/docs/ROADMAP-production-observability.md` § Phase 1.
 *
 * 발화 경로:
 *   GlobalErrorHandlers (`src/components/atoms/GlobalErrorHandlers.tsx`) 가
 *   window.onerror / unhandledrejection 시 sendErrorEvent 호출.
 *   ErrorBoundary 의 componentDidCatch 도 호출.
 *
 * 안전 원칙 (Phase 1 graceful failure):
 *   - 모든 호출은 fire-and-forget. Mac Studio 다운 / network 실패 시 throw X
 *   - AbortController 2초 timeout. 사용자 UX 영향 0
 *   - env 미설정 시 noop (e2e / preview / dev 자동 비활성)
 *
 * 환경 변수:
 *   NEXT_PUBLIC_OMNI_RADAR_URL    — 예: https://radar.deepcraft.app
 *   NEXT_PUBLIC_OMNI_RADAR_TOKEN  — omni-radar `.env.local` 의 OMNI_RADAR_TOKEN 과 동일
 */

const REQUEST_TIMEOUT_MS = 2000;
const STACK_MAX_CHARS = 4000;
const MESSAGE_MAX_CHARS = 1000;

export interface ErrorEventParams {
  /**
   * 'window.onerror' | 'unhandledrejection' | 'react-error-boundary'
   */
  source: "window.onerror" | "unhandledrejection" | "react-error-boundary";
  error: Error;
  componentStack?: string | null;
  metadata?: Record<string, unknown>;
}

function truncate(s: string | undefined, limit: number): string | undefined {
  if (s === undefined || s === null) return undefined;
  if (s.length <= limit) return s;
  return s.slice(0, limit) + "…[truncated]";
}

function getEnvConfig(): { url: string; token: string } | null {
  const url = (process.env.NEXT_PUBLIC_OMNI_RADAR_URL || "").trim();
  const token = (process.env.NEXT_PUBLIC_OMNI_RADAR_TOKEN || "").trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isOmniRadarEnabled(): boolean {
  return getEnvConfig() !== null;
}

export async function sendErrorEvent(params: ErrorEventParams): Promise<void> {
  const config = getEnvConfig();
  if (!config) return; // env 미설정 — noop

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const payload = {
      event_type: "exception",
      target: "browser",
      ts: new Date().toISOString(),
      payload: {
        source: params.source,
        message: truncate(params.error.message, MESSAGE_MAX_CHARS) ?? "(no message)",
        name: params.error.name || "Error",
        stack: truncate(params.error.stack, STACK_MAX_CHARS),
        component_stack: truncate(
          params.componentStack ?? undefined,
          STACK_MAX_CHARS,
        ),
        url: typeof window !== "undefined" ? window.location.href : undefined,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        viewport_w: typeof window !== "undefined" ? window.innerWidth : undefined,
        viewport_h: typeof window !== "undefined" ? window.innerHeight : undefined,
        locale:
          typeof navigator !== "undefined" ? navigator.language : undefined,
        ...(params.metadata ?? {}),
      },
    };

    await fetch(`${config.url}/ingest`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });
  } catch {
    // fire-and-forget — Mac Studio 다운 / network 실패 무시
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
