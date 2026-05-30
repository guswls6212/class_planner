import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // dev: SW 항상 disable (개발자 경험 보호).
  // E2E_DISABLE_SW=1: 개발자 로컬 escape hatch (옛날 임시 우회 잔재).
  // CI는 더 이상 사용 안 함 — 본 plan에서 SW timing root cause fix
  // (sw.ts /api/* NetworkOnly + AuthGuard 7s) 후 모든 spec이 SW 활성 환경에서 통과.
  disable:
    process.env.NODE_ENV === "development" ||
    process.env.E2E_DISABLE_SW === "1",
});

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["sonner"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
