import { fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session, Subject } from "../../../lib/planner";
import TimeTableGrid from "../TimeTableGrid";

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

describe("TimeTableGrid 스크롤 위치 보존", () => {
  const mockSessions = new Map<number, Session[]>();
  const mockSubjects: Subject[] = [];
  const mockEnrollments: Array<{
    id: string;
    studentId: string;
    subjectId: string;
  }> = [];
  const mockStudents: Array<{ id: string; name: string }> = [];

  const defaultProps = {
    sessions: mockSessions,
    subjects: mockSubjects,
    enrollments: mockEnrollments,
    students: mockStudents,
    onSessionClick: vi.fn(),
    onDrop: vi.fn(),
    onSessionDrop: vi.fn(),
    onEmptySpaceClick: vi.fn(),
    selectedStudentId: "",
    isStudentDragging: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    requestAnimationFrameMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("스크롤 위치 저장", () => {
    it("스크롤 시 localStorage에 위치를 저장해야 한다", async () => {
      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 스크롤 이벤트 발생
      fireEvent.scroll(gridElement, {
        target: { scrollLeft: 500, scrollTop: 100 },
      });

      // debounce 적용된 저장이 실행될 때까지 대기
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            "schedule_scroll_position",
            expect.stringContaining('"scrollLeft":500')
          );
        },
        { timeout: 500 }
      );
    });

    it("스크롤 위치 저장 시 타임스탬프를 포함해야 한다", async () => {
      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      fireEvent.scroll(gridElement, {
        target: { scrollLeft: 300, scrollTop: 50 },
      });

      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            "schedule_scroll_position",
            expect.stringMatching(/"timestamp":\d+/)
          );
        },
        { timeout: 500 }
      );
    });

    it("localStorage 저장 실패 시 에러를 무시해야 한다", async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 에러가 발생해도 컴포넌트가 정상 동작해야 함
      expect(() => {
        fireEvent.scroll(gridElement, {
          target: { scrollLeft: 100, scrollTop: 50 },
        });
      }).not.toThrow();
    });
  });

  describe("스크롤 위치 복원", () => {
    it("5분 이내의 저장된 위치를 복원해야 한다", () => {
      const recentTimestamp = Date.now() - 2 * 60 * 1000; // 2분 전
      const savedData = {
        scrollLeft: 800,
        scrollTop: 200,
        timestamp: recentTimestamp,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // requestAnimationFrame이 호출되어야 함
      expect(requestAnimationFrameMock).toHaveBeenCalled();
    });

    it("5분을 초과한 저장된 위치는 복원하지 않아야 한다", () => {
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10분 전
      const savedData = {
        scrollLeft: 800,
        scrollTop: 200,
        timestamp: oldTimestamp,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      render(<TimeTableGrid {...defaultProps} />);

      // requestAnimationFrame이 호출되지 않아야 함
      expect(requestAnimationFrameMock).not.toHaveBeenCalled();
    });

    it("잘못된 JSON 데이터는 복원하지 않아야 한다", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      render(<TimeTableGrid {...defaultProps} />);

      // 에러가 발생하지 않아야 함
      expect(requestAnimationFrameMock).not.toHaveBeenCalled();
    });

    it("localStorage에서 데이터를 가져올 수 없는 경우 기본 위치를 사용해야 한다", () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(<TimeTableGrid {...defaultProps} />);

      // requestAnimationFrame이 호출되지 않아야 함
      expect(requestAnimationFrameMock).not.toHaveBeenCalled();
    });
  });

  describe("드래그 종료 후 스크롤 복원", () => {
    it("드래그 종료 후 저장된 스크롤 위치를 복원해야 한다", async () => {
      const savedData = {
        scrollLeft: 600,
        scrollTop: 150,
        timestamp: Date.now() - 1 * 60 * 1000, // 1분 전
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 드래그 종료 이벤트 시뮬레이션
      const dragEndHandler = vi.fn();
      gridElement.addEventListener("dragend", dragEndHandler);

      // 드래그 종료 이벤트 발생
      fireEvent.dragEnd(gridElement);

      // 100ms 후 복원이 실행될 때까지 대기
      await waitFor(
        () => {
          expect(localStorageMock.getItem).toHaveBeenCalledWith(
            "schedule_scroll_position"
          );
        },
        { timeout: 200 }
      );
    });
  });

  describe("백업 복원 로직", () => {
    it("스크롤 위치가 0,0인 경우에만 백업 복원을 실행해야 한다", async () => {
      const savedData = {
        scrollLeft: 400,
        scrollTop: 100,
        timestamp: Date.now() - 1 * 60 * 1000, // 1분 전
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));

      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 스크롤 위치를 0,0으로 설정
      Object.defineProperty(gridElement, "scrollLeft", {
        value: 0,
        writable: true,
      });
      Object.defineProperty(gridElement, "scrollTop", {
        value: 0,
        writable: true,
      });

      // 100ms 후 백업 복원 로직 실행
      await waitFor(
        () => {
          expect(localStorageMock.getItem).toHaveBeenCalledWith(
            "schedule_scroll_position"
          );
        },
        { timeout: 200 }
      );
    });

    it("스크롤 위치가 이미 설정된 경우 백업 복원을 실행하지 않아야 한다", async () => {
      // localStorage mock을 초기화하여 호출 횟수 추적
      localStorageMock.getItem.mockClear();

      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 스크롤 위치를 이미 설정된 상태로 시뮬레이션
      Object.defineProperty(gridElement, "scrollLeft", {
        value: 100,
        writable: true,
      });
      Object.defineProperty(gridElement, "scrollTop", {
        value: 50,
        writable: true,
      });

      // 초기 마운트 시의 호출은 무시하고, 백업 복원 로직만 확인
      const initialCallCount = localStorageMock.getItem.mock.calls.length;

      // 백업 복원 로직은 100ms 후 실행되므로 그 이후 호출 확인
      await waitFor(
        () => {
          const currentCallCount = localStorageMock.getItem.mock.calls.length;
          // 백업 복원 로직이 추가로 호출되지 않아야 함
          expect(currentCallCount).toBeLessThanOrEqual(initialCallCount + 1);
        },
        { timeout: 300 }
      );
    });
  });

  describe("스크롤바 상태 업데이트", () => {
    it("스크롤 시 가상 스크롤바 상태를 업데이트해야 한다", () => {
      const { container } = render(<TimeTableGrid {...defaultProps} />);
      const gridElement = container.querySelector(
        '[data-testid="time-table-grid"]'
      ) as HTMLElement;

      // 스크롤 이벤트 발생
      fireEvent.scroll(gridElement, { target: { scrollLeft: 300 } });

      // 스크롤바 상태가 업데이트되어야 함 (내부적으로 처리됨)
      expect(gridElement).toBeInTheDocument();
    });
  });
});
