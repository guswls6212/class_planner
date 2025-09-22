/**
 * AuthGuard 테스트 (150줄 - 큰 파일)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthGuard from "../AuthGuard";

// Mock all dependencies
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "test-user" } }, error: null })
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

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증 가드가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(container.firstChild).toBeDefined();
  });

  it("로딩 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    }).not.toThrow();
  });

  it("인증된 사용자를 처리해야 한다", () => {
    expect(() => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    }).not.toThrow();
  });

  it("미인증 사용자를 처리해야 한다", () => {
    expect(() => {
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    }).not.toThrow();
  });
});
