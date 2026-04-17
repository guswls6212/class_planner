"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * 글로벌 브라우저 에러 핸들러
 *
 * window.onerror와 unhandledrejection을 캡처해 logger.error로 전달.
 * logger.error는 브라우저 환경에서 /api/logs/client로 fire-and-forget POST.
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
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason ?? "Unhandled promise rejection"));

      logger.error("unhandledrejection", {
        url: window.location.href,
        userAgent: navigator.userAgent,
      }, error);
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
