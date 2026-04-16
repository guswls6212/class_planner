/**
 * LoginButton 실제 테스트 (301줄 - 매우 큰 파일)
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginButton from "../LoginButton";
import { supabase } from "../../../utils/supabaseClient";

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

// useUserTracking is no longer used by LoginButton (moved to AccountMenu)

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

  it("로그인 버튼 클릭 시 signInWithOAuth가 직접 호출되어야 한다", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    render(<LoginButton />);

    const loginButton = screen.getByText("로그인");
    fireEvent.click(loginButton);

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("Google 로그인 모달이 아닌 단일 버튼만 렌더링되어야 한다", () => {
    render(<LoginButton />);

    // No modal — only the CTA button is present
    expect(screen.getByText("로그인")).toBeInTheDocument();
    expect(screen.queryByText("Google 계정으로 간편하게 로그인하세요")).not.toBeInTheDocument();
  });

  it("Supabase 미설정 시 alert를 표시하고 signInWithOAuth를 호출하지 않아야 한다", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    render(<LoginButton />);
    fireEvent.click(screen.getByText("로그인"));

    expect(alertSpy).toHaveBeenCalled();
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    alertSpy.mockRestore();
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

  it("에러 없이 렌더링되어야 한다 (추가 검증)", () => {
    // LoginButton은 이제 단순 CTA 버튼으로 사용자 추적은 AccountMenu에서 담당
    expect(() => {
      render(<LoginButton />);
    }).not.toThrow();
  });

});

// NOTE: 로그아웃 기능은 AccountMenu 컴포넌트로 이전되었습니다.
// AccountMenu 테스트는 별도 테스트 파일에서 관리합니다.
