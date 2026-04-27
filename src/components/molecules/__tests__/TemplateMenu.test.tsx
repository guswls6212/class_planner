import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TemplateMenu } from "../TemplateMenu";

describe("TemplateMenu", () => {
  it("템플릿 트리거 버튼을 렌더한다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    expect(screen.getByRole("button", { name: /템플릿/i })).toBeDefined();
  });

  it("초기에 드롭다운이 닫혀 있다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("트리거 클릭 시 드롭다운이 열린다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    expect(screen.getByRole("menu")).toBeDefined();
  });

  it("드롭다운에 저장 항목이 있다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    expect(screen.getByRole("menuitem", { name: /템플릿으로 저장/ })).toBeDefined();
  });

  it("드롭다운에 적용 항목이 있다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    expect(screen.getByRole("menuitem", { name: /템플릿 적용/ })).toBeDefined();
  });

  it("저장 항목 클릭 시 onSave를 호출하고 메뉴를 닫는다", () => {
    const onSave = vi.fn();
    render(<TemplateMenu onSave={onSave} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /템플릿으로 저장/ }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("적용 항목 클릭 시 onApply를 호출하고 메뉴를 닫는다", () => {
    const onApply = vi.fn();
    render(<TemplateMenu onSave={vi.fn()} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /템플릿 적용/ }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("백드롭 클릭 시 메뉴를 닫는다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    expect(screen.getByRole("menu")).toBeDefined();
    fireEvent.click(screen.getByTestId("template-menu-backdrop"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("트리거에 aria-expanded가 열림/닫힘 상태를 반영한다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /템플릿/i });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("isSaving=true일 때 저장 항목이 비활성화된다", () => {
    render(<TemplateMenu onSave={vi.fn()} onApply={vi.fn()} isSaving />);
    fireEvent.click(screen.getByRole("button", { name: /템플릿/i }));
    const saveItem = screen.getByRole("menuitem", { name: /템플릿으로 저장/ });
    expect((saveItem as HTMLButtonElement).disabled).toBe(true);
  });
});
