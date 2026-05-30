import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeacherChip, type TeacherChipData } from "../TeacherChip";

const baseTeacher: TeacherChipData = {
  id: "t-1",
  name: "김민철",
  color: "#ef4444",
  email: "abcd@naver.com",
  phone: "010-9410-4426",
};

describe("TeacherChip", () => {
  it("색상 도트 + 이름만 본문에 노출 (이메일/전화는 본문 X)", () => {
    render(<TeacherChip teacher={baseTeacher} />);
    expect(screen.getByText("김민철")).toBeInTheDocument();
    const chip = screen.getByTestId("teacher-chip-t-1");
    expect(chip.textContent).not.toContain("abcd@naver.com");
    expect(chip.textContent).not.toContain("010-9410-4426");
  });

  it("이메일 / 전화는 호버 툴팁으로 분리", () => {
    render(<TeacherChip teacher={baseTeacher} />);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("이메일");
    expect(tip).toHaveTextContent("abcd@naver.com");
    expect(tip).toHaveTextContent("전화");
    expect(tip).toHaveTextContent("010-9410-4426");
  });

  it("연락처 정보가 모두 비어있으면 툴팁이 없다", () => {
    render(
      <TeacherChip
        teacher={{ id: "t-x", name: "강사", color: "#22c55e" }}
      />,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("selected=true 시 aria-pressed=true + violet ring 스타일", () => {
    render(<TeacherChip teacher={baseTeacher} selected />);
    const btn = screen.getByTestId("teacher-chip-t-1");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn.className).toMatch(/border-\[#a78bfa\]/);
  });

  it("onClick 호출", () => {
    const onClick = vi.fn();
    render(<TeacherChip teacher={baseTeacher} onClick={onClick} />);
    fireEvent.click(screen.getByTestId("teacher-chip-t-1"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("contextTag (예: 관리자) 가 본문 옆에 인라인 노출", () => {
    render(<TeacherChip teacher={baseTeacher} contextTag="관리자" />);
    expect(screen.getByText(/관리자/)).toBeInTheDocument();
  });
});
