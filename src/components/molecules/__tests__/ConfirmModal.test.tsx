import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmModal from "../ConfirmModal";

describe("ConfirmModal Component", () => {
  const defaultProps = {
    isOpen: true,
    title: "테스트 제목",
    message: "테스트 메시지입니다.",
    confirmText: "확인",
    cancelText: "취소",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    variant: "danger" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모달이 열려있을 때 올바르게 렌더링되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText("테스트 제목")).toBeInTheDocument();
    expect(screen.getByText("테스트 메시지입니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("모달이 닫혀있을 때 렌더링되지 않아야 한다", () => {
    render(<ConfirmModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("테스트 제목")).not.toBeInTheDocument();
    expect(screen.queryByText("테스트 메시지입니다.")).not.toBeInTheDocument();
  });

  it("확인 버튼을 클릭하면 onConfirm이 호출되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "확인" });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("취소 버튼을 클릭하면 onCancel이 호출되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("백드롭을 클릭하면 onCancel이 호출되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape 키를 누르면 onCancel이 호출되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it("커스텀 버튼 텍스트가 올바르게 표시되어야 한다", () => {
    const customProps = {
      ...defaultProps,
      confirmText: "삭제",
      cancelText: "취소",
    };

    render(<ConfirmModal {...customProps} />);

    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("다양한 variant에 대해 올바르게 렌더링되어야 한다", () => {
    const variants = ["danger", "warning", "info"] as const;

    variants.forEach((variant) => {
      const { unmount } = render(
        <ConfirmModal {...defaultProps} variant={variant} />
      );

      expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
      unmount();
    });
  });

  it("접근성 속성이 올바르게 설정되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-modal-title");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-modal-message");
  });

  it("제목과 메시지에 올바른 ID가 설정되어야 한다", () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText("테스트 제목")).toHaveAttribute("id", "confirm-modal-title");
    expect(screen.getByText("테스트 메시지입니다.")).toHaveAttribute("id", "confirm-modal-message");
  });
});
