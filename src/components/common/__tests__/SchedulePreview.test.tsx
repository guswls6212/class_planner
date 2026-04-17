import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SchedulePreview from "../SchedulePreview";

const DEMO = [
  { day: 0 as const, timeIndex: 0, subjectLabel: "수학", studentLabel: "김민준", color: "blue" as const },
  { day: 2 as const, timeIndex: 2, subjectLabel: "영어", studentLabel: "이서연", color: "red" as const },
];

describe("SchedulePreview", () => {
  it("최상위에 data-surface='surface' 속성", () => {
    const { container } = render(<SchedulePreview data={DEMO} times={["15:00","16:00","17:00","18:00"]} />);
    expect(container.querySelector('[data-surface="surface"]')).not.toBeNull();
  });

  it("요일 헤더 5개(월~금)", () => {
    render(<SchedulePreview data={DEMO} times={["15:00"]} />);
    ["월","화","수","목","금"].forEach((d) => expect(screen.getByText(d)).toBeDefined());
  });

  it("과목/학생 라벨 렌더", () => {
    render(<SchedulePreview data={DEMO} times={["15:00","16:00","17:00","18:00"]} />);
    expect(screen.getByText("수학")).toBeDefined();
    expect(screen.getByText("김민준")).toBeDefined();
  });

  it("시간 라벨을 사이드에 렌더", () => {
    render(<SchedulePreview data={[]} times={["15:00","16:00"]} />);
    expect(screen.getByText("15:00")).toBeDefined();
    expect(screen.getByText("16:00")).toBeDefined();
  });
});
