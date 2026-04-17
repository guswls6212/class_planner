import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SegmentedButton from "../SegmentedButton";

const OPTIONS = [
  { label: "일별", value: "daily" },
  { label: "주간", value: "weekly" },
  { label: "월별", value: "monthly" },
] as const;

describe("SegmentedButton", () => {
  it("모든 옵션을 렌더한다", () => {
    render(<SegmentedButton options={OPTIONS} value="daily" onChange={vi.fn()} />);
    expect(screen.getByText("일별")).toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
    expect(screen.getByText("월별")).toBeInTheDocument();
  });

  it("활성 옵션에 bg-accent 클래스가 있다", () => {
    render(<SegmentedButton options={OPTIONS} value="weekly" onChange={vi.fn()} />);
    const weeklyBtn = screen.getByText("주간").closest("button")!;
    expect(weeklyBtn.className).toContain("bg-accent");
  });

  it("비활성 옵션에 bg-accent 클래스가 없다", () => {
    render(<SegmentedButton options={OPTIONS} value="weekly" onChange={vi.fn()} />);
    const dailyBtn = screen.getByText("일별").closest("button")!;
    expect(dailyBtn.className).not.toContain("bg-accent");
  });

  it("클릭 시 onChange(value) 호출", () => {
    const onChange = vi.fn();
    render(<SegmentedButton options={OPTIONS} value="daily" onChange={onChange} />);
    fireEvent.click(screen.getByText("주간"));
    expect(onChange).toHaveBeenCalledWith("weekly");
  });

  it("aria-label이 group role에 붙는다", () => {
    render(
      <SegmentedButton
        options={OPTIONS}
        value="daily"
        onChange={vi.fn()}
        aria-label="뷰 모드"
      />
    );
    expect(screen.getByRole("group", { name: "뷰 모드" })).toBeInTheDocument();
  });
});
