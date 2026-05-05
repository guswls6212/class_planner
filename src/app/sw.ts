/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// eslint-disable-next-line no-undef
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // /api/* 는 SW 가로채지 않음. 이유: @serwist/next defaultCache가 /api/*를
  // NetworkFirst(networkTimeoutSeconds: 10)로 처리해 SW activate latency와 결합 시
  // AuthGuard 3s race에서 unauth 분기 → 모든 auth-dependent spec fail.
  // 어제 PR R 우회(E2E_DISABLE_SW=1)의 root cause fix.
  runtimeCaching: [
    {
      matcher: ({ url: { pathname }, sameOrigin }) =>
        sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
