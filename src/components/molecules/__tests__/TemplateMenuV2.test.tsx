import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateMenuV2 } from "../TemplateMenuV2";

describe("TemplateMenuV2", () => {
  const handlers = {
    onApply: vi.fn(),
    onClearWeek: vi.fn(),
    onSave: vi.fn(),
    onPreview: vi.fn(),
  };
  beforeEach(() => Object.values(handlers).forEach((h) => h.mockClear()));

  it("4개 메뉴 항목이 모두 노출", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("템플릿 적용하기")).toBeInTheDocument();
    expect(screen.getByText("시간표 비우기")).toBeInTheDocument();
    expect(screen.getByText("현재 주를 템플릿으로 저장")).toBeInTheDocument();
    expect(screen.getByText("미리보기")).toBeInTheDocument();
  });

  it("템플릿 없으면 적용/미리보기 disabled", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate={false} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("템플릿 적용하기").closest("button")).toBeDisabled();
    expect(screen.getByText("미리보기").closest("button")).toBeDisabled();
  });

  it("canManage=false면 저장 disabled", () => {
    render(<TemplateMenuV2 {...handlers} canManage={false} hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    expect(screen.getByText("현재 주를 템플릿으로 저장").closest("button")).toBeDisabled();
  });

  it("각 항목 클릭 시 해당 핸들러 호출", () => {
    render(<TemplateMenuV2 {...handlers} canManage hasTemplate />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/ }));
    fireEvent.click(screen.getByText("템플릿 적용하기"));
    expect(handlers.onApply).toHaveBeenCalledOnce();
  });
});
