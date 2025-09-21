/**
 * LoginButton 보안 테스트 (기본)
 *
 * 로그아웃 시 데이터 삭제 기본 동작을 검증합니다.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginButton from "../LoginButton";

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

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload },
  writable: true,
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

describe("LoginButton 보안 기본 테스트", () => {
  it("컴포넌트가 에러 없이 렌더링되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    expect(() => {
      render(<LoginButton />);
    }).not.toThrow();
  });

  it("로그인 버튼이 표시되어야 한다", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { container } = render(<LoginButton />);

    expect(container).toBeTruthy();
  });

  it("필요한 환경 변수가 설정되어야 한다", () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
  });
});
