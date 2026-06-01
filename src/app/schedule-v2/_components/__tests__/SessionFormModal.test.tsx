import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SessionFormModal, { formatDuration } from "../SessionFormModal";

describe("formatDuration", () => {
  it("75분 → 1시간 15분", () => {
    expect(formatDuration("14:45", "16:00")).toBe("1시간 15분");
  });
  it("정각 → N시간만", () => {
    expect(formatDuration("15:00", "16:00")).toBe("1시간");
    expect(formatDuration("13:00", "15:00")).toBe("2시간");
  });
  it("1시간 미만 → N분만", () => {
    expect(formatDuration("15:00", "15:30")).toBe("30분");
  });
  it("0 이하 → 빈 문자열 (역전/동일)", () => {
    expect(formatDuration("16:00", "16:00")).toBe("");
    expect(formatDuration("16:00", "15:00")).toBe("");
  });
});

describe("SessionFormModal", () => {
  beforeEach(() => {
    // 모바일(바텀시트) 경로로 고정 → useModalA11y inert(타이머 없음). matchMedia 폴리필.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });
  afterEach(() => cleanup());

  it("add 모드 — 제목 + 요일 segmented 렌더", () => {
    render(
      <SessionFormModal
        mode="add"
        students={[]}
        subjects={[]}
        teachers={[]}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("수업 추가")).toBeInTheDocument();
    // 요일 segmented 7칩 중 하나 (aria-label)
    expect(screen.getByRole("button", { name: "수요일" })).toBeInTheDocument();
    // 학생 선택 placeholder (add 모드)
    expect(screen.getByText("학생 선택…")).toBeInTheDocument();
  });

  it("edit 모드 — 학생·과목 읽기전용 + 삭제 버튼", () => {
    render(
      <SessionFormModal
        mode="edit"
        initial={{
          studentId: "s1",
          studentName: "김민준",
          subjectId: "sub1",
          subjectName: "수학",
          teacherId: null,
          weekday: 2,
          startTime: "14:45",
          endTime: "16:00",
        }}
        students={[]}
        subjects={[]}
        teachers={[]}
        onSubmit={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("수업 편집")).toBeInTheDocument();
    expect(screen.getByText(/김민준 · 수학/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });
});
