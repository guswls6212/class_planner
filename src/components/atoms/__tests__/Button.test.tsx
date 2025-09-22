// 간단한 hover 스타일 존재 여부 스모크 테스트 + 버튼 컴포넌트 테스트
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Button, { Button as NamedButton } from "../Button";

describe("Button hover styles - transparency variant", () => {
  it("transparent 버튼 렌더링 스모크", () => {
    const { container } = render(<Button variant="transparent">편집</Button>);
    expect(container.firstChild).toBeDefined();
  });
});
describe("Button Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("렌더링", () => {
    it("기본 버튼이 올바르게 렌더링되어야 한다", () => {
      render(<Button>클릭하세요</Button>);

      const button = screen.getByRole("button", { name: "클릭하세요" });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent("클릭하세요");
    });

    it("disabled 상태의 버튼이 올바르게 렌더링되어야 한다", () => {
      render(<Button disabled>비활성화된 버튼</Button>);

      const button = screen.getByRole("button", { name: "비활성화된 버튼" });
      expect(button).toBeDisabled();
    });

    it("다양한 variant가 올바르게 적용되어야 한다", () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole("button")).toHaveClass("_primary_716912");

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button")).toHaveClass("_secondary_716912");

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole("button")).toHaveClass("_danger_716912");
    });

    it("다양한 size가 올바르게 적용되어야 한다", () => {
      const { rerender } = render(<Button size="small">Small</Button>);
      expect(screen.getByRole("button")).toHaveClass("_small_716912");

      rerender(<Button size="medium">Medium</Button>);
      expect(screen.getByRole("button")).toHaveClass("_medium_716912");

      rerender(<Button size="large">Large</Button>);
      expect(screen.getByRole("button")).toHaveClass("_large_716912");
    });
  });

  describe("이벤트 처리", () => {
    it("클릭 이벤트가 올바르게 처리되어야 한다", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>클릭하세요</Button>);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("disabled 상태에서는 클릭 이벤트가 발생하지 않아야 한다", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          비활성화된 버튼
        </Button>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });

    it("키보드 이벤트가 올바르게 처리되어야 한다", () => {
      const handleKeyDown = vi.fn();
      render(<Button onKeyDown={handleKeyDown}>키보드 테스트</Button>);

      const button = screen.getByRole("button");
      fireEvent.keyDown(button, { key: "Enter" });

      expect(handleKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("접근성", () => {
    it("aria-label이 올바르게 설정되어야 한다", () => {
      render(<Button aria-label="저장 버튼">저장</Button>);

      const button = screen.getByRole("button", { name: "저장 버튼" });
      expect(button).toBeInTheDocument();
    });

    it("aria-describedby가 올바르게 설정되어야 한다", () => {
      render(
        <div>
          <Button aria-describedby="help-text">도움말이 있는 버튼</Button>
          <div id="help-text">이 버튼을 클릭하면 저장됩니다.</div>
        </div>
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-describedby", "help-text");
    });

    it("loading 상태에서 aria-label이 설정되어야 한다", () => {
      render(
        <Button loading aria-label="로딩 중">
          로딩 버튼
        </Button>
      );

      const button = screen.getByRole("button", { name: "로딩 중" });
      expect(button).toBeInTheDocument();
    });
  });

  describe("로딩 상태", () => {
    it("로딩 상태일 때 스피너가 표시되어야 한다", () => {
      render(<Button loading>로딩 중</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("_loading_716912");

      // 스피너 아이콘이 있는지 확인 (실제 구현에 따라 조정)
      const spinner = button.querySelector('[data-testid="spinner"]');
      expect(spinner).toBeInTheDocument();
    });

    it("로딩 상태일 때 클릭이 비활성화되어야 한다", () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          로딩 중
        </Button>
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("커스텀 속성", () => {
    it("data-testid가 올바르게 설정되어야 한다", () => {
      render(<Button data-testid="custom-button">커스텀 버튼</Button>);

      const button = screen.getByTestId("custom-button");
      expect(button).toBeInTheDocument();
    });

    it("className이 올바르게 적용되어야 한다", () => {
      render(<Button className="custom-class">커스텀 클래스</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("style 속성이 올바르게 적용되어야 한다", () => {
      render(<Button style={{ backgroundColor: "red" }}>빨간 버튼</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveStyle("background-color: rgb(255, 0, 0)");
    });
  });
});
