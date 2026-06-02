"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getFirstTouchUtm,
  getOrCreateSessionId,
  getOrCreateVisitorId,
  initOutboundLinks,
  initWebVitals,
  isAnalyticsEnabled,
  isBotUserAgent,
  sendPageview,
  trackEngagement,
  trackScrollDepth,
} from "../../lib/analytics/tracker";

/**
 * Native analytics tracker.
 *
 * - 루트 layout(`src/app/layout.tsx`)에 1회 마운트.
 * - pageview(usePathname 변화) + first-touch UTM(utm_* 화이트리스트) + 체류시간 + 스크롤 깊이 + Web Vitals.
 * - 전체 searchParams 는 미수집(share token 등 PII 회피) — `utm_*` 만 화이트리스트로 수집.
 * - bot UA / env 미설정 시 자동 noop. 모두 fire-and-forget(실패 무시). Render null.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const pageStart = useRef(0);

  // Web Vitals + 외부링크/다운로드 자동 계측 — 마운트 1회 (LCP/INP/CLS)
  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (typeof navigator !== "undefined" && isBotUserAgent(navigator.userAgent)) return;
    initWebVitals();
    const cleanupOutbound = initOutboundLinks();
    return cleanupOutbound;
  }, []);

  // pageview + UTM + 체류시간 + 스크롤 (path 단위)
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
    if (typeof navigator !== "undefined") metadata.locale = navigator.language;
    if (typeof Intl !== "undefined") {
      try {
        metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        // timezone 추출 실패 — 무시
      }
    }
    Object.assign(metadata, getFirstTouchUtm()); // utm_* 만 (화이트리스트, PII 회피)

    void sendPageview({
      visitorId,
      sessionId,
      path: pathname,
      referrer:
        typeof document !== "undefined" && document.referrer ? document.referrer : null,
      metadata,
    });

    // 체류시간 — 페이지 진입 시각
    pageStart.current = Date.now();
    const capturedPath = pathname;
    const sendEngagement = () => {
      if (pageStart.current === 0) return;
      trackEngagement(Date.now() - pageStart.current, capturedPath);
      pageStart.current = 0; // 중복 전송 방지
    };
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        sendEngagement();
      }
    };
    // 스크롤 깊이 — 25/50/75/100 milestone 당 1회
    const fired = new Set<number>();
    const onScroll = () => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      for (const m of [25, 50, 75, 100] as const) {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          trackScrollDepth(m, capturedPath);
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", sendEngagement);
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      sendEngagement(); // path 변경 시 직전 페이지 체류 마감
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", sendEngagement);
        window.removeEventListener("scroll", onScroll);
      }
    };
  }, [pathname]);

  return null;
}
