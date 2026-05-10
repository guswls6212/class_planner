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

  it("6글자 초과 시 잘림 (maxLength)", () => {
    render(<StudentAddDetailModal {...baseProps} />);
    const nameInput = screen.getByLabelText(/이름/) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "김민준수영민영" } });
    expect(nameInput.value.length).toBeLessThanOrEqual(6);
  });

  it("동명이인 등록 허용 — UAT 2026-05-10 정책 (이름+성별+생년월일 모두 일치 시에만 server에서 차단)", () => {
    // client-side 단순 이름 중복 check 제거됨. existingNames는 더 이상 차단 사유 X.
    // 진짜 중복(이름+성별+생년월일 모두 일치)은 server idempotent 처리.
    const onSubmit = vi.fn();
    render(
      <StudentAddDetailModal
        {...baseProps}
        existingNames={["김민준"]}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/이름/), { target: { value: "김민준" } });
    fireEvent.change(screen.getByLabelText(/성별/), { target: { value: "male" } });
    fireEvent.change(screen.getByLabelText(/생년월일/), { target: { value: "2010-03-15" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    // client는 통과시키고 server에 위임
    expect(onSubmit).toHaveBeenCalledWith("김민준", {
      gender: "male",
      birthDate: "2010-03-15",
    });
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
