import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HelpTooltip } from "../HelpTooltip";

describe("HelpTooltip", () => {
  it("i 버튼을 렌더한다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    expect(screen.getByRole("button", { name: "도움말" })).toBeDefined();
  });

  it("기본적으로 팝오버가 닫혀있다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    expect(screen.queryByText("도움말 내용")).toBeNull();
  });

  it("버튼 클릭 시 팝오버가 열린다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByText("도움말 내용")).toBeDefined();
  });

  it("백드롭 클릭 시 팝오버가 닫힌다", () => {
    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByText("도움말 내용")).toBeDefined();
    fireEvent.click(screen.getByTestId("help-tooltip-backdrop"));
    expect(screen.queryByText("도움말 내용")).toBeNull();
  });

  it("custom label prop이 aria-label에 반영된다", () => {
    render(<HelpTooltip content="내용" label="색상 기준 도움말" />);
    expect(screen.getByRole("button", { name: "색상 기준 도움말" })).toBeDefined();
  });
});
