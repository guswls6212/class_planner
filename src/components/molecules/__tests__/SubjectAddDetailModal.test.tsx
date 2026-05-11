import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubjectAddDetailModal from "../SubjectAddDetailModal";
import { SUBJECT_DEFAULT_COLOR, DEFAULT_SUBJECT_COLORS } from "@/lib/subjectColors";

describe("SubjectAddDetailModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("isOpen=false면 렌더링되지 않는다", () => {
    render(<SubjectAddDetailModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("이름만 입력 → onSubmit에 default 색상 전달", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<SubjectAddDetailModal {...baseProps} onSubmit={onSubmit} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "고등수학" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("고등수학", SUBJECT_DEFAULT_COLOR);
    expect(onClose).toHaveBeenCalled();
  });

  it("팔레트 색상 선택 → 선택한 색상으로 onSubmit", () => {
    const onSubmit = vi.fn();
    render(<SubjectAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "영어" } });
    const targetColor = DEFAULT_SUBJECT_COLORS[3];
    fireEvent.click(screen.getByTestId(`color-swatch-${targetColor}`));
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("영어", targetColor);
  });

  it("hex 직접 입력 → 입력값으로 onSubmit", () => {
    const onSubmit = vi.fn();
    render(<SubjectAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "국어" } });
    fireEvent.change(screen.getByLabelText("색상 hex 입력"), {
      target: { value: "#abcdef" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("국어", "#abcdef");
  });

  it("빈 이름 → 추가 버튼 disabled, onSubmit 호출 안 됨", () => {
    const onSubmit = vi.fn();
    render(<SubjectAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "추가" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("잘못된 hex 형식 → 에러 메시지", () => {
    const onSubmit = vi.fn();
    render(<SubjectAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "수학" } });
    fireEvent.change(screen.getByLabelText("색상 hex 입력"), {
      target: { value: "not-a-color" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/색상/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("defaultName prop → 모달 열릴 때 prefill", () => {
    render(<SubjectAddDetailModal {...baseProps} defaultName="과학" />);

    expect((screen.getByLabelText(/이름/) as HTMLInputElement).value).toBe("과학");
  });
});
