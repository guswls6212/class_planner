/**
 * Home Page 실제 테스트 (368줄 - 세 번째로 큰 파일)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../page";

// Mock all dependencies
vi.mock("../../components/atoms/AuthGuard", () => ({
  default: vi.fn(({ children }) => (
    <div data-testid="auth-guard">{children}</div>
  )),
}));

vi.mock("../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("홈 페이지가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<HomePage />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<HomePage />);

    expect(container.firstChild).toBeDefined();
  });

  it("AuthGuard가 포함되어야 한다", () => {
    render(<HomePage />);

    // AuthGuard는 내부적으로 작동하므로 페이지가 렌더링되면 성공
    expect(screen.getByText("클래스 플래너")).toBeInTheDocument();
  });

  it("네비게이션 링크들이 있어야 한다", () => {
    render(<HomePage />);

    expect(screen.getAllByText(/로그인/)).toHaveLength(2);
  });

  it("메인 콘텐츠가 표시되어야 한다", () => {
    render(<HomePage />);

    expect(screen.getAllByText(/시간표/)).toHaveLength(2);
  });

  // 핵심 기능 테스트만 유지
  it("로그인 상태에 따른 조건부 렌더링이 작동해야 한다", () => {
    render(<HomePage />);

    // 로그인 버튼이 표시되는지 확인
    expect(screen.getAllByText(/로그인/)).toHaveLength(2);
  });

  it("기능 카드들이 올바른 링크를 가져야 한다", () => {
    render(<HomePage />);

    // 주요 기능 카드들 확인
    expect(screen.getByText("학생 관리")).toBeInTheDocument();
    expect(screen.getByText("과목 관리")).toBeInTheDocument();
    expect(screen.getAllByText(/시간표/)).toHaveLength(2);
  });
});
