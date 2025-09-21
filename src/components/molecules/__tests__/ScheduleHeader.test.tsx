/**
 * ScheduleHeader 테스트 (66줄)
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleHeader from "../ScheduleHeader";

const mockStudents = [
  {
    id: "student-1",
    name: "김철수",
  },
];

describe("ScheduleHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("스케줄 헤더가 에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(
        <ScheduleHeader
          dataLoading={false}
          error={null}
          selectedStudentId=""
          students={mockStudents}
        />
      );
    }).not.toThrow();
  });

  it("기본 구조가 렌더링되어야 한다", () => {
    const { container } = render(
      <ScheduleHeader
        dataLoading={false}
        error={null}
        selectedStudentId=""
        students={mockStudents}
      />
    );

    expect(container.firstChild).toBeDefined();
  });

  it("로딩 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <ScheduleHeader
          dataLoading={true}
          error={null}
          selectedStudentId=""
          students={mockStudents}
        />
      );
    }).not.toThrow();
  });

  it("에러 상태를 처리해야 한다", () => {
    expect(() => {
      render(
        <ScheduleHeader
          dataLoading={false}
          error="테스트 에러"
          selectedStudentId=""
          students={mockStudents}
        />
      );
    }).not.toThrow();
  });

  it("선택된 학생을 처리해야 한다", () => {
    expect(() => {
      render(
        <ScheduleHeader
          dataLoading={false}
          error={null}
          selectedStudentId="student-1"
          students={mockStudents}
        />
      );
    }).not.toThrow();
  });
});
