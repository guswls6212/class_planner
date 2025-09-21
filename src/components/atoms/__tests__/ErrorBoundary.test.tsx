/**
 * ErrorBoundary 실제 테스트 (121줄 파일)
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ComponentErrorBoundary,
  ErrorBoundary,
  PageErrorBoundary,
} from "../ErrorBoundary";

// Mock useUserTracking
vi.mock("../../../hooks/useUserTracking", () => ({
  trackError: vi.fn(),
}));

// 에러를 던지는 컴포넌트
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 콘솔 에러 무시
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("에러 경계가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  it("정상 자식 컴포넌트를 렌더링해야 한다", () => {
    render(
      <ErrorBoundary>
        <div data-testid="normal-content">Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("normal-content")).toBeInTheDocument();
  });

  it("에러 발생 시 에러 UI를 표시해야 한다", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("문제가 발생했습니다")).toBeInTheDocument();
  });

  it("커스텀 fallback UI를 사용해야 한다", () => {
    const customFallback = (
      <div data-testid="custom-fallback">Custom Error</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  it("에러 핸들러가 호출되어야 한다", () => {
    const mockOnError = vi.fn();

    render(
      <ErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalled();
  });

  it("새로고침 버튼이 있어야 한다", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("새로고침")).toBeInTheDocument();
  });

  it("이전 페이지 버튼이 있어야 한다", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("이전 페이지")).toBeInTheDocument();
  });

  it("PageErrorBoundary가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <PageErrorBoundary>
          <div>Page Content</div>
        </PageErrorBoundary>
      );
    }).not.toThrow();
  });

  it("ComponentErrorBoundary가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <ComponentErrorBoundary>
          <div>Component Content</div>
        </ComponentErrorBoundary>
      );
    }).not.toThrow();
  });

  it("ComponentErrorBoundary가 커스텀 fallback을 사용해야 한다", () => {
    const customFallback = (
      <div data-testid="component-fallback">Component Error</div>
    );

    render(
      <ComponentErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ComponentErrorBoundary>
    );

    expect(screen.getByTestId("component-fallback")).toBeInTheDocument();
  });
});


