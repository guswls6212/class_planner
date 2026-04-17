import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
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

describe("HelpTooltip — viewport boundary", () => {
  const origGBCR = Element.prototype.getBoundingClientRect;
  const origInnerWidth = window.innerWidth;

  afterEach(() => {
    Element.prototype.getBoundingClientRect = origGBCR;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: origInnerWidth,
    });
  });

  it("뷰포트 우측 경계 초과 시 data-flip='left' 속성이 붙는다", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 320,
    });

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      right: 340,
      left: 100,
      top: 0,
      bottom: 100,
      width: 240,
      height: 100,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    })) as any;

    render(<HelpTooltip content="도움말 내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));

    const popover = screen.getByTestId("help-tooltip-popover");
    expect(popover.getAttribute("data-flip")).toBe("left");
  });

  it("뷰포트 경계 내이면 data-flip='none'", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      right: 400,
      left: 100,
      top: 0,
      bottom: 100,
      width: 300,
      height: 100,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    })) as any;

    render(<HelpTooltip content="내용" />);
    fireEvent.click(screen.getByRole("button", { name: "도움말" }));

    const popover = screen.getByTestId("help-tooltip-popover");
    expect(popover.getAttribute("data-flip")).toBe("none");
  });
});
