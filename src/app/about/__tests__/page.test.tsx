/**
 * About 페이지 기본 테스트
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AboutPage from "../page";

describe("About Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("컴포넌트가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<AboutPage />);
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(<AboutPage />);

    expect(container.firstChild).toBeDefined();
  });
});
