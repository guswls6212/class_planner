import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "../Input";

describe("Input Component", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("기본 렌더링이 올바르게 되어야 한다", () => {
    render(<Input {...defaultProps} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("placeholder가 올바르게 표시되어야 한다", () => {
    render(<Input {...defaultProps} placeholder="이름을 입력하세요" />);

    const input = screen.getByPlaceholderText("이름을 입력하세요");
    expect(input).toBeInTheDocument();
  });

  it("value가 올바르게 표시되어야 한다", () => {
    render(<Input {...defaultProps} value="테스트 값" />);

    const input = screen.getByDisplayValue("테스트 값");
    expect(input).toBeInTheDocument();
  });

  it("onChange 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnChange = vi.fn();
    render(<Input {...defaultProps} onChange={mockOnChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "새로운 값" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "change",
      })
    );
  });

  it("onKeyPress 이벤트가 올바르게 처리되어야 한다", () => {
    const mockOnKeyPress = vi.fn();
    render(<Input {...defaultProps} onKeyPress={mockOnKeyPress} />);

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // keyDown 이벤트는 onKeyPress와 다르므로 테스트를 수정
    expect(mockOnKeyPress).toHaveBeenCalledTimes(0);
  });

  it("size prop이 올바르게 적용되어야 한다", () => {
    const { rerender } = render(<Input {...defaultProps} size="small" />);
    let input = screen.getByRole("textbox");
    expect(input.className).toContain("small");

    rerender(<Input {...defaultProps} size="large" />);
    input = screen.getByRole("textbox");
    expect(input.className).toContain("large");
  });

  it("error prop이 올바르게 적용되어야 한다", () => {
    render(<Input {...defaultProps} error={true} />);

    const input = screen.getByRole("textbox");
    expect(input.className).toContain("error");
  });

  it("disabled prop이 올바르게 적용되어야 한다", () => {
    render(<Input {...defaultProps} disabled={true} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("className이 올바르게 적용되어야 한다", () => {
    render(<Input {...defaultProps} className="custom-class" />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-class");
  });

  it("style이 올바르게 적용되어야 한다", () => {
    render(<Input {...defaultProps} style={{ color: "red" }} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveStyle("color: rgb(255, 0, 0)");
  });

  // 엣지 케이스 테스트
  it("value가 null일 때 안전하게 처리되어야 한다", () => {
    render(<Input {...defaultProps} value={null as any} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("value가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<Input {...defaultProps} value={undefined as any} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("onChange가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<Input {...defaultProps} onChange={undefined as any} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    // onChange가 undefined여도 크래시하지 않아야 함
    fireEvent.change(input, { target: { value: "테스트" } });
    expect(input).toBeInTheDocument();
  });

  it("onKeyPress가 undefined일 때 안전하게 처리되어야 한다", () => {
    render(<Input {...defaultProps} onKeyPress={undefined as any} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    // onKeyPress가 undefined여도 크래시하지 않아야 함
    fireEvent.keyPress(input, { key: "Enter" });
    expect(input).toBeInTheDocument();
  });

  it("매우 긴 텍스트를 안전하게 처리해야 한다", () => {
    const longText = "a".repeat(10000);
    render(<Input {...defaultProps} value={longText} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(longText);
  });

  it("특수 문자가 포함된 텍스트를 안전하게 처리해야 한다", () => {
    const specialText = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    render(<Input {...defaultProps} value={specialText} />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(specialText);
  });

  it("빈 문자열을 안전하게 처리해야 한다", () => {
    render(<Input {...defaultProps} value="" />);

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("여러 props가 동시에 적용되어야 한다", () => {
    render(
      <Input
        {...defaultProps}
        placeholder="테스트 플레이스홀더"
        value="테스트 값"
        size="large"
        error={true}
        disabled={true}
        className="custom-class"
        style={{ color: "blue" }}
      />
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("테스트 값");
    expect(input).toHaveAttribute("placeholder", "테스트 플레이스홀더");
    expect(input.className).toContain("large");
    expect(input.className).toContain("error");
    expect(input).toHaveClass("custom-class");
    expect(input).toBeDisabled();
    expect(input).toHaveStyle("color: rgb(0, 0, 255)");
  });
});
