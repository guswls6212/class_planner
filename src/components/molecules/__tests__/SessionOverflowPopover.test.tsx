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
  },
  {
    id: "s2",
    subject: { id: "sub2", name: "기타", color: "amber" } as any,
    studentNames: ["이서연"],
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
});
