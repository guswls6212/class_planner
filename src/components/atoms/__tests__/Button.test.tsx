import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Button, { Button as NamedButton } from "../Button";

vi.mock("@/lib/toast", () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
  showToast: vi.fn(),
}));

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
      expect(screen.getByRole("button").className).toContain("bg-[--color-primary]");

      rerender(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[--color-secondary]");

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByRole("button").className).toContain("bg-[--color-danger]");
    });

    it("tonal variant가 accent 배경 클래스를 가져야 한다", () => {
      render(<Button variant="tonal">복사</Button>);
      expect(screen.getByRole("button").className).toContain("bg-accent/10");
    });

    it("ghost variant가 투명 배경 클래스를 가져야 한다", () => {
      render(<Button variant="ghost">취소</Button>);
      expect(screen.getByRole("button").className).toContain("bg-transparent");
    });

    it("accent variant가 accent 배경 클래스를 가져야 한다", () => {
      render(<Button variant="accent">초대하기</Button>);
      expect(screen.getByRole("button").className).toContain("bg-accent");
    });

    it("다양한 size가 올바르게 적용되어야 한다", () => {
      const { rerender } = render(<Button size="small">Small</Button>);
      expect(screen.getByRole("button").className).toContain("min-h-[28px]");

      rerender(<Button size="medium">Medium</Button>);
      expect(screen.getByRole("button").className).toContain("min-h-[36px]");

      rerender(<Button size="large">Large</Button>);
      expect(screen.getByRole("button").className).toContain("min-h-[44px]");
    });

    it("press 피드백 클래스(active:enabled:scale)가 포함되어야 한다", () => {
      render(<Button>버튼</Button>);
      expect(screen.getByRole("button").className).toContain("active:enabled:scale-[0.97]");
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

  describe("feedback prop — inline", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("feedback=inline 클릭 후 successLabel이 표시되어야 한다", async () => {
      render(
        <Button feedback="inline" successLabel="복사됨">
          복사
        </Button>
      );
      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText("복사됨")).toBeInTheDocument();
    });

    it("feedback=inline feedbackDuration 이후 원래 레이블로 돌아와야 한다", async () => {
      render(
        <Button feedback="inline" successLabel="복사됨" feedbackDuration={800}>
          복사
        </Button>
      );
      const button = screen.getByRole("button");
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText("복사됨")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.getByText("복사")).toBeInTheDocument();
    });

    it("feedback=toast 클릭 시 showSuccess가 호출되어야 한다", async () => {
      const { showSuccess } = await import("@/lib/toast");
      render(
        <Button feedback="toast" toastMessage="복사되었습니다">
          복사
        </Button>
      );
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
      expect(showSuccess).toHaveBeenCalledWith("복사되었습니다");
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

    it("loading 상태에서 aria-busy가 true여야 한다", () => {
      render(<Button loading>로딩 중</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("로딩 상태", () => {
    it("로딩 상태일 때 스피너가 표시되어야 한다", () => {
      render(<Button loading>로딩 중</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("cursor-not-allowed");

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
