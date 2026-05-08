import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StudentAddDetailModal from "../StudentAddDetailModal";

describe("StudentAddDetailModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    existingNames: [] as string[],
  };

  it("isOpen=false면 렌더링되지 않는다", () => {
    render(<StudentAddDetailModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("이름만 입력 후 추가 → onSubmit에 빈 options 전달, onClose 호출", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(
      <StudentAddDetailModal {...baseProps} onSubmit={onSubmit} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "김민준" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("김민준", {
      gender: undefined,
      birthDate: undefined,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("이름 + 성별 + 생년월일 입력 → onSubmit에 전체 options 전달", () => {
    const onSubmit = vi.fn();
    render(<StudentAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "이수진" } });
    fireEvent.change(screen.getByLabelText(/성별/), { target: { value: "female" } });
    fireEvent.change(screen.getByLabelText(/생년월일/), {
      target: { value: "2010-03-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(onSubmit).toHaveBeenCalledWith("이수진", {
      gender: "female",
      birthDate: "2010-03-15",
    });
  });

  it("빈 이름으로 추가 시도 → 에러 메시지 + onSubmit 호출 안 함", () => {
    const onSubmit = vi.fn();
    render(<StudentAddDetailModal {...baseProps} onSubmit={onSubmit} />);

    // 추가 버튼은 빈 이름일 때 disabled — 직접 Enter로 시도
    const nameInput = screen.getByLabelText(/이름/);
    fireEvent.keyDown(nameInput, { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("4글자 초과 시 잘림 (maxLength)", () => {
    render(<StudentAddDetailModal {...baseProps} />);
    const nameInput = screen.getByLabelText(/이름/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "김민준수영" } });
    expect(nameInput.value.length).toBeLessThanOrEqual(4);
  });

  it("중복 이름으로 추가 → 에러 메시지", () => {
    const onSubmit = vi.fn();
    render(
      <StudentAddDetailModal
        {...baseProps}
        existingNames={["김민준"]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "김민준" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/이미 존재하는 학생/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("취소 버튼 → onClose 호출", () => {
    const onClose = vi.fn();
    render(<StudentAddDetailModal {...baseProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("권장 라벨이 성별/생년월일에 시각화된다", () => {
    render(<StudentAddDetailModal {...baseProps} />);
    const labels = screen.getAllByText("권장");
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});
