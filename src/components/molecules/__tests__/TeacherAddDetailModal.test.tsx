import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeacherAddDetailModal from "../TeacherAddDetailModal";

describe("TeacherAddDetailModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    existingNames: [] as string[],
  };

  it("isOpen=false면 렌더링되지 않는다", () => {
    render(<TeacherAddDetailModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("이름만 입력 후 추가 → onSubmit에 빈 profile 전달", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <TeacherAddDetailModal {...baseProps} onSubmit={onSubmit} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "박선생" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("박선생", {
      email: undefined,
      phone: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("이름 + 이메일 + 전화 입력 → onSubmit에 전체 profile 전달", () => {
    const onSubmit = vi.fn();
    render(<TeacherAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "이선생" } });
    fireEvent.change(screen.getByLabelText(/이메일/), {
      target: { value: "lee@academy.com" },
    });
    fireEvent.change(screen.getByLabelText(/전화번호/), {
      target: { value: "010-1234-5678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("이선생", {
      email: "lee@academy.com",
      phone: "010-1234-5678",
    });
  });

  it("잘못된 이메일 형식 → 에러 메시지", () => {
    const onSubmit = vi.fn();
    render(<TeacherAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "박선생" } });
    fireEvent.change(screen.getByLabelText(/이메일/), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/이메일/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("중복 이름 (대소문자 무관) → 에러 메시지", () => {
    const onSubmit = vi.fn();
    render(
      <TeacherAddDetailModal
        {...baseProps}
        existingNames={["Park"]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "park" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/이미 존재하는 강사/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("권장 라벨이 이메일/전화에 시각화된다", () => {
    render(<TeacherAddDetailModal {...baseProps} />);
    const labels = screen.getAllByText("권장");
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});
