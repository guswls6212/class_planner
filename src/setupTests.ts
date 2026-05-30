import "@testing-library/jest-dom";
import React from "react";
import { afterEach, vi } from "vitest";

// Supabase 환경 변수 설정
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

/**
 * 글로벌 afterEach — 모든 test 종료 후 mock call history 리셋 (state pollution 회피).
 *
 * 효과: vi.clearAllMocks() 는 mock.calls / mock.results / mock.instances / mock.contexts 만
 * 리셋 — implementation (vi.fn(impl)) 은 유지. 개별 test 안의 expect(fn).toHaveBeenCalled...
 * 검증은 그 test 종료 시점 이후만 영향 받으므로 깨지지 않음.
 *
 * flaky audit 후속 (2026-05-19): unit test 간 state leakage 확률은 jsdom 격리 덕분에 낮지만,
 * 통합 test (RTL + mock) 결합 시 회귀 가드 효과. P1-3 표준화.
 */
afterEach(() => {
  vi.clearAllMocks();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/students",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver — use class syntax so `new ResizeObserver(cb)` returns a proper instance
// with callable methods. @dnd-kit/core does `const { ResizeObserver } = window;` then
// `new ResizeObserver(cb)` and expects `.observe` / `.disconnect` on the instance.
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
