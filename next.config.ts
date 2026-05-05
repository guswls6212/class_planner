import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // dev: SW 항상 disable (개발자 경험 보호).
  // E2E_DISABLE_SW=1: CI e2e 기본값. SW activation timing이 auth-dependent specs와
  // 충돌 (페이지 mount 지연으로 button visible timeout). PR S에서 offline 시나리오만
  // 별도 job으로 SW 활성 (E2E_DISABLE_SW unset).
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
