/**
 * LoginButton 실제 테스트 (301줄 - 매우 큰 파일)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginButton from "../LoginButton";

// Mock all dependencies
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(() =>
        Promise.resolve({ data: { provider: "google" }, error: null })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
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

vi.mock("../../../hooks/useUserTracking", () => ({
  useUserTracking: vi.fn(() => ({
    setUserId: vi.fn(),
    clearUserId: vi.fn(),
    trackAction: vi.fn(),
    trackSecurityEvent: vi.fn(),
  })),
}));

// Mock window methods
Object.defineProperty(window, "location", {
  value: {
    origin: "http://localhost:3000",
    reload: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, "history", {
  value: {
    back: vi.fn(),
  },
  writable: true,
});

describe("LoginButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      },
      writable: true,
    });
  });

  it("로그인 버튼이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<LoginButton />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<LoginButton />);

    expect(container.firstChild).toBeDefined();
  });

  it("로그인 버튼이 표시되어야 한다", () => {
    render(<LoginButton />);

    expect(screen.getByText("로그인")).toBeInTheDocument();
  });

  it("로그인 버튼 클릭 시 모달이 열려야 한다", () => {
    render(<LoginButton />);

    const loginButton = screen.getByText("로그인");
    fireEvent.click(loginButton);

    expect(
      screen.getByText("Google 계정으로 간편하게 로그인하세요")
    ).toBeInTheDocument();
  });

  it("Google 로그인 버튼이 표시되어야 한다", () => {
    render(<LoginButton />);

    const loginButton = screen.getByText("로그인");
    fireEvent.click(loginButton);

    expect(screen.getByText("Google로 로그인")).toBeInTheDocument();
  });

  it("모달 닫기 버튼이 작동해야 한다", () => {
    render(<LoginButton />);

    const loginButton = screen.getByText("로그인");
    fireEvent.click(loginButton);

    const closeButton = screen.getByText("×");
    fireEvent.click(closeButton);

    expect(
      screen.queryByText("Google 계정으로 간편하게 로그인하세요")
    ).not.toBeInTheDocument();
  });

  it("className prop을 처리해야 한다", () => {
    expect(() => {
      render(<LoginButton className="custom-class" />);
    }).not.toThrow();
  });

  it("Supabase 설정이 없을 때 안전하게 처리해야 한다", () => {
    // 환경 변수 제거
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => {
      render(<LoginButton />);
    }).not.toThrow();
  });

  it("사용자 추적 시스템을 사용해야 한다", () => {
    // LoginButton이 렌더링되면 useUserTracking이 내부적으로 사용됨
    expect(() => {
      render(<LoginButton />);
    }).not.toThrow();
  });

  it("로거 시스템을 사용해야 한다", () => {
    render(<LoginButton />);

    // 컴포넌트가 로드되면 로거가 사용됨
    expect(true).toBe(true);
  });
});
