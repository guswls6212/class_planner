import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ScheduleHeader from "../ScheduleHeader";

describe("ScheduleHeader", () => {
  it("제목 '주간 시간표'를 렌더링한다", () => {
    render(
      <ScheduleHeader dataLoading={false} />
    );
    expect(screen.getByText("주간 시간표")).toBeInTheDocument();
  });

  it("dataLoading 시 로딩 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={true} />
    );
    expect(screen.getByText("세션 데이터를 로드 중...")).toBeInTheDocument();
  });

  it("dataLoading + error 시 오류 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={true} error="DB 연결 실패" />
    );
    expect(screen.getByText("데이터 로드 중 오류가 발생했습니다.")).toBeInTheDocument();
  });

  it("error가 있으면 에러 배너를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} error="DB 연결 실패" />
    );
    expect(screen.getByText(/DB 연결 실패/)).toBeInTheDocument();
    expect(screen.getByText(/로컬 데이터로 계속 작업할 수 있습니다/)).toBeInTheDocument();
  });

  it("selectedStudentName이 있으면 해당 학생 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} selectedStudentName="김철수" />
    );
    expect(screen.getByText(/김철수 학생의 시간표입니다/)).toBeInTheDocument();
  });

  it("selectedStudentName이 없으면 전체 시간표 메시지를 표시한다", () => {
    render(
      <ScheduleHeader dataLoading={false} />
    );
    expect(screen.getByText(/전체 학생의 시간표입니다/)).toBeInTheDocument();
  });
});
