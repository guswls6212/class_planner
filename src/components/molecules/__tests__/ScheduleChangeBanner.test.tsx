import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ScheduleChangeBanner from "../ScheduleChangeBanner";

describe("ScheduleChangeBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("접근성 role과 aria-live를 갖는다", () => {
    render(<ScheduleChangeBanner scheduleUpdatedAt={new Date().toISOString()} />);
    const banner = screen.getByRole("status");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("aria-live", "polite");
  });

  it("변경 안내 텍스트를 렌더한다", () => {
    render(<ScheduleChangeBanner scheduleUpdatedAt={new Date().toISOString()} />);
    expect(screen.getByText(/시간표가 최근 변경되었습니다/)).toBeInTheDocument();
  });

  it("방금 전 시간표 변경이면 '방금 전'을 표시한다", () => {
    const now = new Date().toISOString();
    render(<ScheduleChangeBanner scheduleUpdatedAt={now} />);
    expect(screen.getByText("방금 전")).toBeInTheDocument();
  });

  it("2시간 전 변경이면 '2시간 전'을 표시한다", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    render(<ScheduleChangeBanner scheduleUpdatedAt={twoHoursAgo} />);
    expect(screen.getByText("2시간 전")).toBeInTheDocument();
  });

  it("3일 전 변경이면 '3일 전'을 표시한다", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    render(<ScheduleChangeBanner scheduleUpdatedAt={threeDaysAgo} />);
    expect(screen.getByText("3일 전")).toBeInTheDocument();
  });
});
