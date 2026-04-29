import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SessionOverflowPopover,
  type OverflowSessionItem,
} from "../SessionOverflowPopover";

const items: OverflowSessionItem[] = [
  {
    id: "s1",
    subject: { id: "sub1", name: "피아노", color: "blue" } as any,
    studentNames: ["김지우"],
    accent: "var(--color-subject-blue-accent)",
    toneBg: "var(--color-subject-blue-bg)",
    toneFg: "var(--color-subject-blue-fg)",
    startTime: "11:30",
    endTime: "12:30",
    teacherName: "김선생",
    studentCount: 1,
  },
  {
    id: "s2",
    subject: { id: "sub2", name: "기타", color: "amber" } as any,
    studentNames: ["이서연"],
    accent: "var(--color-subject-amber-accent)",
    toneBg: "var(--color-subject-amber-bg)",
    toneFg: "var(--color-subject-amber-fg)",
    startTime: "13:00",
    endTime: "14:00",
    studentCount: 1,
  },
];

describe("SessionOverflowPopover", () => {
  it("title과 items를 렌더한다", () => {
    render(
      <SessionOverflowPopover
        title="14:00 수업 2건"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("14:00 수업 2건")).toBeDefined();
    expect(screen.getByText("피아노")).toBeDefined();
    expect(screen.getByText("기타")).toBeDefined();
  });

  it("item 클릭 시 onSelect(id)를 호출한다", () => {
    const onSelect = vi.fn();
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("피아노"));
    expect(onSelect).toHaveBeenCalledWith("s1");
  });

  it("backdrop 클릭 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("overflow-popover-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape 키 입력 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("각 항목에 시간 범위를 표시한다", () => {
    render(
      <SessionOverflowPopover
        title="11:30 · 숨은 세션 2개"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("11:30–12:30")).toBeDefined();
    expect(screen.getByText("13:00–14:00")).toBeDefined();
  });

  it("teacherName이 있을 때 선생 이름을 표시한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("김선생")).toBeDefined();
  });

  it("학생 수 칩을 렌더한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getAllByText(/학생 \d+명/).length).toBeGreaterThan(0);
  });

  it("마운트 시 첫 번째 항목 버튼에 포커스가 이동한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const itemBtns = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-overflow-item"));
    expect(document.activeElement).toBe(itemBtns[0]);
  });

  it("ArrowDown 키로 다음 항목으로 포커스가 이동한다", () => {
    render(
      <SessionOverflowPopover
        title="t"
        items={items}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const itemBtns = screen
      .getAllByRole("button")
      .filter((b) => b.hasAttribute("data-overflow-item"));
    itemBtns[0].focus();
    fireEvent.keyDown(itemBtns[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(itemBtns[1]);
  });
});
