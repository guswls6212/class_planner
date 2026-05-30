import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScheduleHeader from "../ScheduleHeader";

describe("ScheduleHeader", () => {
  it("title prop을 h2로 렌더한다", () => {
    render(<ScheduleHeader dataLoading={false} title="주간 시간표" />);
    expect(screen.getByRole("heading", { name: "주간 시간표" })).toBeDefined();
  });

  it("dataLoading=true이고 error 없으면 로드 중 표시를 렌더한다", () => {
    render(<ScheduleHeader dataLoading={true} title="주간 시간표" />);
    expect(screen.getByText("로드 중...")).toBeDefined();
  });

  it("dataLoading=true라도 error가 있으면 로드 중 표시를 숨긴다", () => {
    render(<ScheduleHeader dataLoading={true} title="주간 시간표" error="DB 오류" />);
    expect(screen.queryByText("로드 중...")).toBeNull();
  });

  it("error가 있으면 에러 배너를 표시한다", () => {
    render(<ScheduleHeader dataLoading={false} title="주간 시간표" error="DB 연결 실패" />);
    expect(screen.getByText(/DB 연결 실패/)).toBeDefined();
    expect(screen.getByText(/로컬 데이터로 계속 작업할 수 있습니다/)).toBeDefined();
  });

  it("뷰 모드 토글과 색상 기준 토글을 포함하지 않는다 (page.tsx로 이동됨)", () => {
    render(<ScheduleHeader dataLoading={false} title="주간 시간표" />);
    expect(screen.queryByRole("group", { name: "뷰 모드" })).toBeNull();
    expect(screen.queryByRole("group", { name: "색상 기준" })).toBeNull();
  });

  it("scheduleUpdatedAt이 있으면 한국어 포맷의 '수정' 시각을 표시한다", () => {
    render(
      <ScheduleHeader
        dataLoading={false}
        title="주간 시간표"
        scheduleUpdatedAt="2026-05-04T10:00:00.000Z"
      />,
    );
    const slot = screen.getByTestId("schedule-updated-at");
    expect(slot.textContent).toMatch(/수정/);
    expect(slot.textContent).toMatch(/5\.\s?4\.|5월/);
  });

  it("scheduleUpdatedAt=null이면 '수정' 시각 슬롯을 렌더하지 않는다", () => {
    render(
      <ScheduleHeader
        dataLoading={false}
        title="주간 시간표"
        scheduleUpdatedAt={null}
      />,
    );
    expect(screen.queryByTestId("schedule-updated-at")).toBeNull();
  });
});
