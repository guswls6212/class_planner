import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OperatingHoursSection from "../OperatingHoursSection";

let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  vi.mocked(localStorage.getItem).mockImplementation(
    (key) => mockStorage[key] ?? null,
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    mockStorage[key] = String(value);
  });
  vi.mocked(localStorage.removeItem).mockImplementation((key) => {
    delete mockStorage[key];
  });
});

afterEach(() => {
  mockStorage = {};
});

function expandSection() {
  fireEvent.click(screen.getByRole("button", { expanded: false }));
}

describe("OperatingHoursSection", () => {
  it("default — collapsed 상태로 시작 + 헤더 + summary 표시", () => {
    render(<OperatingHoursSection userId={null} />);
    expect(screen.getByText("시간표 운영시간")).toBeInTheDocument();
    expect(screen.getByText(/기본 9 - 23시/)).toBeInTheDocument();
    // Mode radio는 collapsed 시 미표시
    expect(screen.queryByLabelText(/기본 \(9시 ~ 23시\)/)).not.toBeInTheDocument();
  });

  it("헤더 클릭 시 expand → 3 mode 옵션 렌더", () => {
    render(<OperatingHoursSection userId={null} />);
    expandSection();
    expect(screen.getByText(/기본 \(9시 ~ 23시\)/)).toBeInTheDocument();
    expect(screen.getByText(/자동 \(데이터 기반\)/)).toBeInTheDocument();
    expect(screen.getByText(/사용자 지정/)).toBeInTheDocument();
  });

  it("expanded — storage 미설정 시 default 라디오 선택됨", () => {
    render(<OperatingHoursSection userId={null} />);
    expandSection();
    const radios = screen.getAllByRole("radio");
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  it("자동 모드 선택 시 storage 저장", () => {
    render(<OperatingHoursSection userId="user-x" />);
    expandSection();
    fireEvent.click(screen.getByText(/자동 \(데이터 기반\)/));
    expect(mockStorage["class_planner_user-x_time_range"]).toContain('"mode":"auto"');
  });

  it("사용자 지정 선택 시 시작/종료 select 표시", () => {
    render(<OperatingHoursSection userId="user-y" />);
    expandSection();
    fireEvent.click(screen.getByText(/사용자 지정/));
    expect(screen.getByText("시작 시각")).toBeInTheDocument();
    expect(screen.getByText(/^종료 시각/)).toBeInTheDocument();
  });

  it("storage 기존값 read — custom 모드 + summary 반영", () => {
    mockStorage["class_planner_user-z_time_range"] = JSON.stringify({
      mode: "custom",
      startHour: 7,
      endHour: 22,
    });
    render(<OperatingHoursSection userId="user-z" />);
    expect(screen.getByText(/7 - 22시 \(사용자 지정\)/)).toBeInTheDocument();
  });
});
