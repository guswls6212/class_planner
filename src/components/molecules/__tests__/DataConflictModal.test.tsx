import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DataConflictModal from "../DataConflictModal";
import type { ClassPlannerData } from "../../../lib/localStorageCrud";

const localData: ClassPlannerData = {
  students: [
    { id: "s1", name: "A" },
    { id: "s2", name: "B" },
    { id: "s3", name: "C" },
  ],
  subjects: [
    { id: "sub1", name: "수학", color: "#ff0" },
    { id: "sub2", name: "영어", color: "#00f" },
  ],
  sessions: [
    { id: "sess1", enrollmentIds: ["e1"], weekday: 0, startsAt: "09:00", endsAt: "10:00" },
  ],
  enrollments: [{ id: "e1", studentId: "s1", subjectId: "sub1" }],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

const serverData: ClassPlannerData = {
  students: [{ id: "ss1", name: "Server" }],
  subjects: [],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: new Date().toISOString(),
};

describe("DataConflictModal", () => {
  it("로컬 데이터 요약 표시 (학생 3명, 과목 2개, 수업 1개)", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.getByText(/학생 3명/)).toBeInTheDocument();
    expect(screen.getByText(/과목 2개/)).toBeInTheDocument();
    expect(screen.getByText(/수업 1개/)).toBeInTheDocument();
  });

  it("닫기 버튼 없음 (강제 선택)", () => {
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /닫기|close|×/i })).toBeNull();
  });

  it('"서버 데이터 사용" 클릭 시 onSelectServer 호출', () => {
    const onSelectServer = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /서버 데이터 사용/ }));
    expect(onSelectServer).toHaveBeenCalledTimes(1);
  });

  it('"로컬 데이터 사용" 클릭 시 onSelectLocal 호출', () => {
    const onSelectLocal = vi.fn();
    render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={onSelectLocal}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /로컬 데이터 사용/ }));
    expect(onSelectLocal).toHaveBeenCalledTimes(1);
  });

  it("backdrop 클릭해도 닫히지 않음", () => {
    const onSelectServer = vi.fn();
    const onSelectLocal = vi.fn();
    const { container } = render(
      <DataConflictModal
        localData={localData}
        serverData={serverData}
        onSelectServer={onSelectServer}
        onSelectLocal={onSelectLocal}
      />
    );
    // Click the outermost div (backdrop)
    if (container.firstElementChild) {
      fireEvent.click(container.firstElementChild);
    }
    expect(onSelectServer).not.toHaveBeenCalled();
    expect(onSelectLocal).not.toHaveBeenCalled();
  });

  it("localData가 비어있으면 항목 표시 안 함", () => {
    const emptyLocalData: ClassPlannerData = {
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: new Date().toISOString(),
    };
    render(
      <DataConflictModal
        localData={emptyLocalData}
        serverData={serverData}
        onSelectServer={vi.fn()}
        onSelectLocal={vi.fn()}
      />
    );
    expect(screen.queryByText(/학생/)).toBeNull();
    expect(screen.queryByText(/과목/)).toBeNull();
    expect(screen.queryByText(/수업/)).toBeNull();
  });
});
