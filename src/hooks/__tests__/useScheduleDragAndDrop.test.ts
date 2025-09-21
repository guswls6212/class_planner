/**
 * useScheduleDragAndDrop 테스트 (157줄)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleDragAndDrop } from "../useScheduleDragAndDrop";

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock planner
vi.mock("../../lib/planner", () => ({
  timeToMinutes: vi.fn((time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }),
  minutesToTime: vi.fn((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`;
  }),
}));

const mockSessions = [
  {
    id: "session-1",
    subjectId: "subject-1",
    startsAt: "09:00",
    endsAt: "10:00",
    weekday: 0,
    enrollmentIds: ["enrollment-1"],
    yPosition: 1,
  },
];

describe("useScheduleDragAndDrop", () => {
  const mockUpdateData = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("드래그&드롭 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useScheduleDragAndDrop(mockSessions, mockUpdateData));
    }).not.toThrow();
  });

  it("기본 함수들을 반환해야 한다", () => {
    const { result } = renderHook(() =>
      useScheduleDragAndDrop(mockSessions, mockUpdateData)
    );

    expect(typeof result.current.handleDragStart).toBe("function");
    expect(typeof result.current.handleDragOver).toBe("function");
    expect(typeof result.current.handleDrop).toBe("function");
    expect(typeof result.current.handleDragEnd).toBe("function");
    expect(typeof result.current.handleTimeDrop).toBe("function");
  });

  it("드래그된 세션 상태를 관리해야 한다", () => {
    const { result } = renderHook(() =>
      useScheduleDragAndDrop(mockSessions, mockUpdateData)
    );

    expect(result.current.draggedSession).toBeNull();
  });

  it("빈 세션 배열을 안전하게 처리해야 한다", () => {
    expect(() => {
      renderHook(() => useScheduleDragAndDrop([], mockUpdateData));
    }).not.toThrow();
  });
});
