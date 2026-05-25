"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  getOrCreateSessionId,
  getOrCreateVisitorId,
  isAnalyticsEnabled,
  isBotUserAgent,
  sendPageview,
} from "../../lib/analytics/tracker";

/**
 * Native analytics page-view tracker.
 *
 * - Mounted once in root layout (`src/app/layout.tsx`).
 * - usePathname 변화 시 Mac Studio analytics-server 로 fire-and-forget POST.
 * - searchParams 는 의도적으로 미수집 (share token 등 PII 회피).
 * - bot UA / env 미설정 시 자동 noop.
 * - Render null (visual 효과 0).
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (typeof navigator !== "undefined" && isBotUserAgent(navigator.userAgent)) return;

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    if (!visitorId || !sessionId || !pathname) return;

    const metadata: Record<string, unknown> = {};
    if (typeof window !== "undefined") {
      metadata.viewport_w = window.innerWidth;
      metadata.viewport_h = window.innerHeight;
      metadata.dpr = window.devicePixelRatio;
    }
    if (typeof navigator !== "undefined") {
      metadata.locale = navigator.language;
    }
    if (typeof Intl !== "undefined") {
      try {
        metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        // timezone 추출 실패 — 무시
      }
    }

    void sendPageview({
      visitorId,
      sessionId,
      path: pathname,
      referrer:
        typeof document !== "undefined" && document.referrer ? document.referrer : null,
      metadata,
    });
  }, [pathname]);

  return null;
}
