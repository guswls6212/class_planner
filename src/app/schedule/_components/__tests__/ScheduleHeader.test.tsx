import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduleHeader from "../ScheduleHeader";

const defaultViewProps = {
  viewMode: "weekly" as const,
  onViewModeChange: vi.fn(),
};

describe("ScheduleHeader", () => {
  it("주간 모드에서 제목 '주간 시간표'를 렌더링한다", () => {
    render(
      <ScheduleHeader dataLoading={false} {...defaultViewProps} />
    );
    expect(screen.getByText("주간 시간표")).toBeInTheDocument();
  });

  it("일별 모드에서 제목 '일별 시간표'를 렌더링한다", () => {
    render(
      <ScheduleHeader dataLoading={false} viewMode="daily" onViewModeChange={vi.fn()} />
    );
    expect(screen.getByText("일별 시간표")).toBeInTheDocument();
  });

  it("dataLoading 시 로딩 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={true} {...defaultViewProps} />
    );
    expect(screen.getByText("세션 데이터를 로드 중...")).toBeInTheDocument();
  });

  it("dataLoading + error 시 오류 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={true} error="DB 연결 실패" {...defaultViewProps} />
    );
    expect(screen.getByText("데이터 로드 중 오류가 발생했습니다.")).toBeInTheDocument();
  });

  it("error가 있으면 에러 배너를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} error="DB 연결 실패" {...defaultViewProps} />
    );
    expect(screen.getByText(/DB 연결 실패/)).toBeInTheDocument();
    expect(screen.getByText(/로컬 데이터로 계속 작업할 수 있습니다/)).toBeInTheDocument();
  });

  it("selectedStudentName이 있으면 해당 학생 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} selectedStudentName="김철수" {...defaultViewProps} />
    );
    expect(screen.getByText(/김철수 학생의 시간표입니다/)).toBeInTheDocument();
  });

  it("selectedStudentName이 없으면 전체 시간표 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} {...defaultViewProps} />
    );
    expect(screen.getByText(/전체 학생의 시간표입니다/)).toBeInTheDocument();
  });

  it("뷰 모드 토글 버튼이 렌더링된다", () => {
    render(
      <ScheduleHeader dataLoading={false} {...defaultViewProps} />
    );
    expect(screen.getByText("일별")).toBeInTheDocument();
    expect(screen.getByText("주간")).toBeInTheDocument();
  });
});
