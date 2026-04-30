import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmptyWeekState } from "../EmptyWeekState";

describe("EmptyWeekState", () => {
  it("템플릿 있을 때 두 버튼 노출", () => {
    render(<EmptyWeekState hasTemplate onApplyTemplate={vi.fn()} onAddSession={vi.fn()} />);
    expect(screen.getByText("템플릿 적용")).toBeInTheDocument();
    expect(screen.getByText("+ 수업 추가")).toBeInTheDocument();
  });

  it("템플릿 없을 때 수업 추가만 + 안내문", () => {
    render(<EmptyWeekState hasTemplate={false} onApplyTemplate={vi.fn()} onAddSession={vi.fn()} />);
    expect(screen.queryByText("템플릿 적용")).not.toBeInTheDocument();
    expect(screen.getByText("+ 수업 추가")).toBeInTheDocument();
    expect(screen.getByText(/한 주를 짜고 저장하면/)).toBeInTheDocument();
  });

  it("버튼 클릭 시 핸들러 호출", () => {
    const onApply = vi.fn();
    render(<EmptyWeekState hasTemplate onApplyTemplate={onApply} onAddSession={vi.fn()} />);
    fireEvent.click(screen.getByText("템플릿 적용"));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
