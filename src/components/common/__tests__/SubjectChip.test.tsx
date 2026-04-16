import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubjectChip from "../SubjectChip";

describe("SubjectChip", () => {
  it("label과 subLabel을 렌더한다", () => {
    render(<SubjectChip label="수학" subLabel="김민준" color="#3b82f6" />);
    expect(screen.getByText("수학")).toBeDefined();
    expect(screen.getByText("김민준")).toBeDefined();
  });

  it("variant='fill'일 때 배경에 color 적용", () => {
    const { container } = render(<SubjectChip label="수학" color="#3b82f6" variant="fill" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.style.backgroundColor).not.toBe("");
  });

  it("variant='border-left'일 때 borderLeft에 color 적용", () => {
    const { container } = render(<SubjectChip label="수학" color="#3b82f6" variant="border-left" />);
    const chip = container.firstChild as HTMLElement;
    expect(chip.style.borderLeft).toContain("3px");
  });

  it("onClick 주입 시 button 역할", () => {
    const onClick = vi.fn();
    render(<SubjectChip label="수학" color="#3b82f6" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("badge slot을 렌더한다", () => {
    render(<SubjectChip label="수학" color="#3b82f6" badge={<span>+2</span>} />);
    expect(screen.getByText("+2")).toBeDefined();
  });
});
