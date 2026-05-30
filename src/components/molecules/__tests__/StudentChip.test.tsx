import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StudentChip, type StudentChipData } from "../StudentChip";

const baseStudent: StudentChipData = {
  id: "s-1",
  name: "이현진",
  grade: "중1",
  gender: "male",
  birthDate: "2011-03-15",
};

describe("StudentChip — compact variant", () => {
  it("학년 배지 + 이름이 보인다", () => {
    render(<StudentChip student={baseStudent} />);
    expect(screen.getByTestId("student-grade-chip-s-1")).toHaveTextContent("중1");
    expect(screen.getByText("이현진")).toBeInTheDocument();
  });

  it("부가정보(성별/생년월일)가 툴팁 컨텐츠로 노출된다 — 칩 본문에는 없음", () => {
    render(<StudentChip student={baseStudent} />);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("성별");
    expect(tip).toHaveTextContent("남");
    expect(tip).toHaveTextContent("생년월일");
    expect(tip).toHaveTextContent("2011-03-15");
    // 칩 본문(이름 옆 텍스트)에는 부가정보가 직접 노출되지 않아야 함
    const chip = screen.getByTestId("student-chip-compact-s-1");
    expect(chip.textContent).not.toContain("2011-03-15");
  });

  it("학생에 정보가 없으면 툴팁은 렌더되지 않는다", () => {
    render(
      <StudentChip
        student={{ id: "s-x", name: "이름만", grade: "고1" }}
      />,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    // GradeBadge는 여전히 보임
    expect(screen.getByText("고1")).toBeInTheDocument();
  });

  it("onRemove 제공 시 ✕ 버튼이 보이고 클릭하면 호출된다", () => {
    const onRemove = vi.fn();
    render(<StudentChip student={baseStudent} onRemove={onRemove} />);
    const removeBtn = screen.getByLabelText("이현진 제거");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("학교 정보까지 있으면 툴팁에 학교 row 포함", () => {
    render(
      <StudentChip
        student={{
          ...baseStudent,
          gender: "female",
          school: "한빛고",
        }}
      />,
    );
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("학교");
    expect(tip).toHaveTextContent("한빛고");
    expect(tip).toHaveTextContent("여");
  });
});

describe("StudentChip — row variant", () => {
  it("avatar(이름 첫 글자) + 학년 배지 + 이름 + meta 우측 노출", () => {
    render(
      <StudentChip
        student={baseStudent}
        variant="row"
        metaRight="남 · 2011-03-15"
      />,
    );
    expect(screen.getByText("이")).toBeInTheDocument();
    expect(screen.getByTestId("student-grade-chip-s-1")).toHaveTextContent("중1");
    expect(screen.getByText("이현진")).toBeInTheDocument();
    expect(screen.getByText("남 · 2011-03-15")).toBeInTheDocument();
  });

  it("row variant 는 툴팁이 없다 (공간 충분 영역 — 인라인 노출)", () => {
    render(
      <StudentChip student={baseStudent} variant="row" subtitle="동명이인" />,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("onClick 제공 시 button 으로 렌더되고 클릭 호출된다", () => {
    const onClick = vi.fn();
    render(
      <StudentChip student={baseStudent} variant="row" onClick={onClick} />,
    );
    fireEvent.click(screen.getByTestId("student-chip-row-s-1"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
