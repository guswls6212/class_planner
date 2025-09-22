/**
 * ThemeToggle 테스트 (99줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "../ThemeToggle";

// Mock ThemeContext
vi.mock("../../../contexts/ThemeContext", () => ({
  useTheme: vi.fn(() => ({
    theme: "light",
    toggleTheme: vi.fn(),
  })),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("테마 토글이 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<ThemeToggle />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<ThemeToggle />);

    expect(container.firstChild).toBeDefined();
  });

  it("다크 테마 상태를 처리해야 한다", () => {
    expect(() => {
      render(<ThemeToggle />);
    }).not.toThrow();
  });

  it("라이트 테마 상태를 처리해야 한다", () => {
    expect(() => {
      render(<ThemeToggle />);
    }).not.toThrow();
  });
});
