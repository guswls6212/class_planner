"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Next.js 글로벌 에러 폴백
 *
 * 루트 레이아웃 자체에서 렌더 에러가 발생할 때 진입.
 * Next.js 요건: <html><body>를 직접 렌더해야 함.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("global-error.tsx", { digest: error.digest }, error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "sans-serif",
          gap: "16px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
          오류가 발생했습니다
        </h1>
        <p style={{ color: "#666" }}>
          예기치 않은 문제가 생겼습니다. 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "8px 20px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
