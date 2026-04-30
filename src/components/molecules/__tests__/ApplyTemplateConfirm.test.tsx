import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApplyTemplateConfirm } from "../ApplyTemplateConfirm";

describe("ApplyTemplateConfirm", () => {
  it("기존 세션 수와 destructive 액션 표기", () => {
    render(<ApplyTemplateConfirm existingSessionCount={12} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/12개 수업/)).toBeInTheDocument();
    expect(screen.getByText("기존 삭제하고 적용")).toBeInTheDocument();
  });

  it("취소 클릭 시 onCancel 호출", () => {
    const onCancel = vi.fn();
    render(<ApplyTemplateConfirm existingSessionCount={5} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("취소"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("확인 클릭 시 onConfirm 호출", () => {
    const onConfirm = vi.fn();
    render(<ApplyTemplateConfirm existingSessionCount={5} onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText("기존 삭제하고 적용"));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
