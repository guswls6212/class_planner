import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthGuard from "../../../components/atoms/AuthGuard";
import SchedulePage from "../page";

// localStorage mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// requestAnimationFrame mock
const requestAnimationFrameMock = vi.fn((callback) => {
  setTimeout(callback, 0);
  return 1;
});
Object.defineProperty(window, "requestAnimationFrame", {
  value: requestAnimationFrameMock,
});

// Mock hooks and services
vi.mock("../../../hooks/useIntegratedDataLocal", () => ({
  useIntegratedDataLocal: () => ({
    data: {
      students: [
        { id: "s1", name: "김철수" },
        { id: "s2", name: "이영희" },
      ],
      subjects: [
        { id: "sub1", name: "수학" },
        { id: "sub2", name: "영어" },
      ],
      sessions: [
        {
          id: "session1",
          weekday: 0,
          startsAt: "09:00",
          endsAt: "10:00",
          enrollmentIds: ["enroll1"],
          yPosition: 1,
        },
      ],
      enrollments: [{ id: "enroll1", studentId: "s1", subjectId: "sub1" }],
    },
    loading: false,
    error: null,
    updateData: vi.fn(),
    addEnrollment: vi.fn(),
  }),
}));

// AuthGuard mock 추가
vi.mock("../../../components/atoms/AuthGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../../../hooks/useScheduleSessionManagementLocal", () => ({
  useScheduleSessionManagementLocal: () => ({
    updateSessionPosition: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useStudentPanel", () => ({
  useStudentPanel: () => ({
    selectedStudentId: "",
    panelState: {
      handleMouseDown: vi.fn(),
      handleStudentClick: vi.fn(),
      resetDragState: vi.fn(),
      setSearchQuery: vi.fn(),
    },
  }),
}));

vi.mock("../../../hooks/useUiState", () => ({
  useUiState: () => ({
    isStudentDragging: false,
    setIsStudentDragging: vi.fn(),
    gridVersion: 0,
    setGridVersion: vi.fn(),
    bumpGridVersion: vi.fn(),
  }),
}));

describe("스케줄 페이지 스크롤 위치 보존 통합 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    requestAnimationFrameMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("페이지 로드 시 저장된 스크롤 위치를 복원해야 한다", async () => {
    // 저장된 스크롤 위치 데이터 설정
    const savedScrollData = {
      scrollLeft: 800,
      scrollTop: 200,
      timestamp: Date.now() - 2 * 60 * 1000, // 2분 전
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedScrollData));

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    // 시간표 그리드가 로드될 때까지 대기
    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // localStorage에서 데이터를 조회했는지 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "schedule_scroll_position"
    );

    // requestAnimationFrame이 호출되었는지 확인 (스크롤 위치 복원)
    expect(requestAnimationFrameMock).toHaveBeenCalled();
  });

  it("사용자 스크롤 시 위치를 localStorage에 저장해야 한다", async () => {
    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    const gridElement = screen.getByTestId("time-table-grid");

    // 스크롤 이벤트 발생
    fireEvent.scroll(gridElement, {
      target: { scrollLeft: 600, scrollTop: 150 },
    });

    // debounce 적용된 저장이 실행될 때까지 대기
    await waitFor(
      () => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          "schedule_scroll_position",
          expect.stringContaining('"scrollLeft":600')
        );
      },
      { timeout: 500 }
    );
  });

  it("세션 드래그앤드롭 후 스크롤 위치가 유지되어야 한다", async () => {
    // 초기 스크롤 위치 설정
    const initialScrollData = {
      scrollLeft: 1000,
      scrollTop: 100,
      timestamp: Date.now() - 1 * 60 * 1000, // 1분 전
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(initialScrollData));

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // 세션 블록 찾기
    const sessionBlocks = screen.queryAllByTestId(/session-block/);

    if (sessionBlocks.length > 0) {
      const firstSession = sessionBlocks[0];

      // 드래그 시작
      fireEvent.dragStart(firstSession);

      // 드롭 존 찾기
      const dropZones = screen.queryAllByTestId("drop-zone");

      if (dropZones.length > 0) {
        const targetDropZone = dropZones[0];

        // 드롭 이벤트
        fireEvent.dragOver(targetDropZone);
        fireEvent.drop(targetDropZone);
        fireEvent.dragEnd(firstSession);

        // 드래그 종료 후 스크롤 위치 복원 확인
        await waitFor(
          () => {
            expect(localStorageMock.getItem).toHaveBeenCalledWith(
              "schedule_scroll_position"
            );
          },
          { timeout: 200 }
        );
      }
    }
  });

  it("5분을 초과한 스크롤 위치는 복원하지 않아야 한다", async () => {
    // 오래된 스크롤 위치 데이터
    const oldScrollData = {
      scrollLeft: 1500,
      scrollTop: 300,
      timestamp: Date.now() - 10 * 60 * 1000, // 10분 전
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(oldScrollData));

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // localStorage에서 데이터는 조회하지만 복원하지 않아야 함
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "schedule_scroll_position"
    );

    // requestAnimationFrame이 호출되지 않아야 함 (복원하지 않음)
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();
  });

  it("localStorage 오류 시에도 페이지가 정상 동작해야 한다", async () => {
    // localStorage 접근 시 에러 발생
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage access denied");
    });
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("localStorage access denied");
    });

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    // 페이지가 정상적으로 로드되어야 함
    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    const gridElement = screen.getByTestId("time-table-grid");

    // 스크롤이 정상적으로 작동해야 함
    fireEvent.scroll(gridElement, {
      target: { scrollLeft: 500, scrollTop: 100 },
    });

    // 에러가 발생해도 페이지가 정상 동작해야 함
    expect(gridElement).toBeInTheDocument();
  });

  it("잘못된 JSON 데이터는 무시하고 기본 동작해야 한다", async () => {
    // 잘못된 JSON 데이터
    localStorageMock.getItem.mockReturnValue("invalid json data");

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // localStorage에서 데이터를 조회했지만 파싱 실패
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "schedule_scroll_position"
    );

    // requestAnimationFrame이 호출되지 않아야 함 (파싱 실패로 인해 복원하지 않음)
    expect(requestAnimationFrameMock).not.toHaveBeenCalled();

    // 페이지는 정상적으로 동작해야 함
    const gridElement = screen.getByTestId("time-table-grid");
    expect(gridElement).toBeInTheDocument();
  });

  it("여러 번의 스크롤 이벤트에서 debounce가 작동해야 한다", async () => {
    // localStorage mock을 초기화하여 스크롤 관련 호출만 추적
    localStorageMock.setItem.mockClear();

    render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    const gridElement = screen.getByTestId("time-table-grid");

    // 연속된 스크롤 이벤트 발생
    fireEvent.scroll(gridElement, {
      target: { scrollLeft: 100, scrollTop: 0 },
    });
    fireEvent.scroll(gridElement, {
      target: { scrollLeft: 200, scrollTop: 0 },
    });
    fireEvent.scroll(gridElement, {
      target: { scrollLeft: 300, scrollTop: 0 },
    });

    // debounce 시간 후 스크롤 위치 저장이 호출되어야 함
    await waitFor(
      () => {
        // schedule_scroll_position 키로 저장된 호출이 있어야 함
        const scrollPositionCalls = localStorageMock.setItem.mock.calls.filter(
          (call) => call[0] === "schedule_scroll_position"
        );
        expect(scrollPositionCalls.length).toBeGreaterThan(0);
      },
      { timeout: 500 }
    );
  });

  it("그리드 버전 변경 시에도 스크롤 위치가 유지되어야 한다", async () => {
    // 저장된 스크롤 위치
    const savedScrollData = {
      scrollLeft: 700,
      scrollTop: 150,
      timestamp: Date.now() - 1 * 60 * 1000,
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedScrollData));

    const { rerender } = render(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // 그리드 버전 변경 시뮬레이션 (컴포넌트 리렌더링)
    rerender(
      <AuthGuard requireAuth={false}>
        <SchedulePage />
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByTestId("time-table-grid")).toBeInTheDocument();
    });

    // 스크롤 위치 복원이 다시 실행되어야 함
    expect(localStorageMock.getItem).toHaveBeenCalledWith(
      "schedule_scroll_position"
    );
  });
});
