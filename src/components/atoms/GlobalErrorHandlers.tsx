"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { sendErrorEvent } from "@/lib/observability/omni-radar";

/**
 * 글로벌 브라우저 에러 핸들러
 *
 * window.onerror와 unhandledrejection을 캡처해 logger.error + omni-radar 로 전달.
 *
 * 두 path 병행 (둘 다 fire-and-forget):
 *   - logger.error → /api/logs/client → Supabase app_logs (기존)
 *   - sendErrorEvent → omni-radar /ingest (production observability Phase 1)
 *
 * AppContent 내부에 마운트 — ErrorBoundary 바깥에 배치하므로
 * ErrorBoundary가 잡지 못한 에러도 캡처한다.
 */
export default function GlobalErrorHandlers() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      const error = event.error instanceof Error
        ? event.error
        : new Error(event.message || "Unknown window error");

      logger.error("window.onerror", {
        url: window.location.href,
        userAgent: navigator.userAgent,
      }, error);

      void sendErrorEvent({ source: "window.onerror", error });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason ?? "Unhandled promise rejection"));

      logger.error("unhandledrejection", {
        url: window.location.href,
        userAgent: navigator.userAgent,
      }, error);

      void sendErrorEvent({ source: "unhandledrejection", error });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
