import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as useIntegratedDataModule from "../../../hooks/useIntegratedDataLocal";
import SchedulePage from "../page";

// Mock useIntegratedDataLocal
vi.mock("../../../hooks/useIntegratedDataLocal", () => ({
  useIntegratedDataLocal: vi.fn(() => ({
    data: {
      students: [
        { id: "student-1", name: "김철수" },
        { id: "student-2", name: "이영희" },
      ],
      subjects: [
        { id: "subject-1", name: "수학", color: "#ff0000" },
        { id: "subject-2", name: "영어", color: "#0000ff" },
      ],
      sessions: [
        {
          id: "session-1",
          startsAt: "09:00",
          endsAt: "10:00",
          weekday: 0,
          enrollmentIds: ["enrollment-1"],
        },
      ],
      enrollments: [
        { id: "enrollment-1", studentId: "student-1", subjectId: "subject-1" },
      ],
      version: "1.0",
      lastModified: "2024-01-01T00:00:00.000Z",
    },
    loading: false,
    error: null,
    updateData: vi.fn(),
  })),
}));

// Mock useStudentPanel
vi.mock("../../../hooks/useStudentPanel", () => ({
  useStudentPanel: vi.fn(() => ({
    panelPosition: { x: 0, y: 0 },
    setPanelPosition: vi.fn(),
    isPanelVisible: true,
    setIsPanelVisible: vi.fn(),
  })),
}));

// Mock useDisplaySessions
vi.mock("../../../hooks/useDisplaySessions", () => ({
  useDisplaySessions: vi.fn(() => ({
    displaySessions: [
      {
        id: "session-1",
        startsAt: "09:00",
        endsAt: "10:00",
        weekday: 0,
        enrollmentIds: ["enrollment-1"],
        studentNames: ["김철수"],
        subjectName: "수학",
        subjectColor: "#ff0000",
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock useTimeValidation
vi.mock("../../../hooks/useTimeValidation", () => ({
  useTimeValidation: vi.fn(() => ({
    validateTime: vi.fn(() => true),
    validateTimeRange: vi.fn(() => true),
  })),
}));

// Mock components
vi.mock("../../../components/atoms/AuthGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-guard">{children}</div>
  ),
}));

vi.mock("../../../components/organisms/TimeTableGrid", () => ({
  default: () => <div data-testid="time-table-grid">TimeTableGrid</div>,
}));

vi.mock("../../../components/organisms/StudentPanel", () => ({
  default: () => <div data-testid="student-panel">StudentPanel</div>,
}));

vi.mock("../../../components/molecules/PDFDownloadButton", () => ({
  default: () => <div data-testid="pdf-download-button">PDFDownloadButton</div>,
}));

describe("Schedule Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("통합 데이터 훅을 사용하여 페이지가 렌더링되어야 한다", async () => {
    render(<SchedulePage />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-guard")).toBeInTheDocument();
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
      expect(screen.getByTestId("student-panel")).toBeInTheDocument();
      expect(screen.getByTestId("pdf-download-button")).toBeInTheDocument();
    });
  });

  it("통합 데이터 훅이 올바른 데이터를 제공해야 한다", () => {
    render(<SchedulePage />);

    // Mock된 훅이 호출되었는지 확인 (React Strict Mode로 인해 2번 호출될 수 있음)
    expect(
      vi.mocked(useIntegratedDataModule.useIntegratedDataLocal)
    ).toHaveBeenCalled();
  });

  it("로딩 상태일 때 적절히 처리되어야 한다", () => {
    // Mock을 로딩 상태로 변경
    vi.mocked(useIntegratedDataModule.useIntegratedDataLocal).mockReturnValue({
      data: {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
      },
      loading: true,
      error: null,
      refreshData: vi.fn(),
      updateData: vi.fn(),
      clearError: vi.fn(),
      addSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      addEnrollment: vi.fn(),
      deleteEnrollment: vi.fn(),
      studentCount: 0,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    render(<SchedulePage />);

    expect(screen.getByTestId("auth-guard")).toBeInTheDocument();
  });

  it("에러 상태일 때 적절히 처리되어야 한다", () => {
    // Mock을 에러 상태로 변경
    vi.mocked(useIntegratedDataModule.useIntegratedDataLocal).mockReturnValue({
      data: {
        students: [],
        subjects: [],
        sessions: [],
        enrollments: [],
        version: "1.0",
      },
      loading: false,
      error: "데이터 로드 실패",
      refreshData: vi.fn(),
      updateData: vi.fn(),
      clearError: vi.fn(),
      addSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      addEnrollment: vi.fn(),
      deleteEnrollment: vi.fn(),
      studentCount: 0,
      subjectCount: 0,
      sessionCount: 0,
      enrollmentCount: 0,
    });

    render(<SchedulePage />);

    expect(screen.getByTestId("auth-guard")).toBeInTheDocument();
  });
});
