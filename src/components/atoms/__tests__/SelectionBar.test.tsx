import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectionBar from "../SelectionBar";

describe("SelectionBar", () => {
  it("count=0 — 미렌더 (시각 노이즈 0)", () => {
    const { container } = render(
      <SelectionBar count={0} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("selection-bar")).toBeNull();
  });

  it("count>0 — '{N}개 선택됨' + 삭제 + 해제 렌더", () => {
    render(
      <SelectionBar count={3} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.getByTestId("selection-bar")).toBeInTheDocument();
    expect(screen.getByText(/3개 선택됨/)).toBeInTheDocument();
    expect(screen.getByTestId("selection-bar-delete")).toBeInTheDocument();
    expect(screen.getByTestId("selection-bar-clear")).toBeInTheDocument();
  });

  it("onCopy 미전달 — 복사 버튼 렌더 안 함", () => {
    render(
      <SelectionBar count={2} onDelete={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.queryByTestId("selection-bar-copy")).toBeNull();
  });

  it("onDelete / onClear 클릭 시 콜백 호출", () => {
    const onDelete = vi.fn();
    const onClear = vi.fn();
    render(
      <SelectionBar count={2} onDelete={onDelete} onClear={onClear} />,
    );
    fireEvent.click(screen.getByTestId("selection-bar-delete"));
    expect(onDelete).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTestId("selection-bar-clear"));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
