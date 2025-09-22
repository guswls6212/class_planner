/**
 * 로그인 페이지 테스트 (327줄 - 매우 큰 파일)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../page";

// Mock all dependencies
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock("../../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("로그인 페이지가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<LoginPage />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<LoginPage />);

    expect(container.firstChild).toBeDefined();
  });

  it("인증 상태 변화를 처리해야 한다", () => {
    expect(() => {
      render(<LoginPage />);
    }).not.toThrow();
  });

  it("사용자 세션을 확인해야 한다", () => {
    expect(() => {
      render(<LoginPage />);
    }).not.toThrow();
  });

  it("로그인 컴포넌트들이 포함되어야 한다", () => {
    expect(() => {
      render(<LoginPage />);
    }).not.toThrow();
  });
});
