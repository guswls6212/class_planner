import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "../BottomSheet";

describe("BottomSheet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("isOpen=false 일 때 아무것도 렌더하지 않는다", () => {
    render(<BottomSheet isOpen={false} onClose={vi.fn()}>내용</BottomSheet>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("내용")).not.toBeInTheDocument();
  });

  it("isOpen=true 일 때 dialog 역할 요소가 렌더된다", () => {
    render(<BottomSheet isOpen={true} onClose={vi.fn()}>내용</BottomSheet>);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("title prop이 화면에 표시된다", () => {
    render(<BottomSheet isOpen={true} onClose={vi.fn()} title="수업 추가">내용</BottomSheet>);
    expect(screen.getByText("수업 추가")).toBeInTheDocument();
  });

  it("children이 렌더된다", () => {
    render(<BottomSheet isOpen={true} onClose={vi.fn()}>테스트 내용</BottomSheet>);
    expect(screen.getByText("테스트 내용")).toBeInTheDocument();
  });

  it("backdrop 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet isOpen={true} onClose={onClose}>내용</BottomSheet>
    );
    // The backdrop is the first child div of the fixed container
    const backdrop = container.querySelector(".absolute.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("aria-modal=true가 설정된다", () => {
    render(<BottomSheet isOpen={true} onClose={vi.fn()}>내용</BottomSheet>);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("title 없으면 타이틀 영역을 렌더하지 않는다", () => {
    render(<BottomSheet isOpen={true} onClose={vi.fn()}>내용</BottomSheet>);
    // h2 should not be present if no title
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
