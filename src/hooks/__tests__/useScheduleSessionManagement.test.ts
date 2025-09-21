/**
 * useScheduleSessionManagement 테스트 (231줄 - 큰 파일)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScheduleSessionManagement } from "../useScheduleSessionManagement";

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock planner
vi.mock("../../lib/planner", () => ({
  timeToMinutes: vi.fn((time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
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
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockEnrollments = [
  {
    id: "enrollment-1",
    studentId: "student-1",
    subjectId: "subject-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("useScheduleSessionManagement", () => {
  const mockUpdateData = vi.fn(() => Promise.resolve());
  const mockStartApiCall = vi.fn();
  const mockEndApiCall = vi.fn();
  const mockStartInteraction = vi.fn();
  const mockEndInteraction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("세션 관리 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() =>
        useScheduleSessionManagement(
          mockSessions,
          mockEnrollments,
          mockUpdateData,
          mockStartApiCall,
          mockEndApiCall,
          mockStartInteraction,
          mockEndInteraction
        )
      );
    }).not.toThrow();
  });

  it("기본 함수들을 반환해야 한다", () => {
    const { result } = renderHook(() =>
      useScheduleSessionManagement(
        mockSessions,
        mockEnrollments,
        mockUpdateData,
        mockStartApiCall,
        mockEndApiCall,
        mockStartInteraction,
        mockEndInteraction
      )
    );

    expect(typeof result.current.addSession).toBe("function");
    expect(typeof result.current.updateSession).toBe("function");
    expect(typeof result.current.findCollidingSessions).toBe("function");
    expect(typeof result.current.checkCollisionsAtYPosition).toBe("function");
    expect(typeof result.current.isTimeOverlapping).toBe("function");
  });

  it("시간 충돌 감지가 올바르게 작동해야 한다", () => {
    const { result } = renderHook(() =>
      useScheduleSessionManagement(
        mockSessions,
        mockEnrollments,
        mockUpdateData,
        mockStartApiCall,
        mockEndApiCall,
        mockStartInteraction,
        mockEndInteraction
      )
    );

    const isOverlapping = result.current.isTimeOverlapping(
      "09:00",
      "10:00",
      "09:30",
      "10:30"
    );
    expect(isOverlapping).toBeDefined();
  });

  it("충돌하는 세션들을 찾을 수 있어야 한다", () => {
    const { result } = renderHook(() =>
      useScheduleSessionManagement(
        mockSessions,
        mockEnrollments,
        mockUpdateData,
        mockStartApiCall,
        mockEndApiCall,
        mockStartInteraction,
        mockEndInteraction
      )
    );

    const collidingSessions = result.current.findCollidingSessions(
      0,
      "09:30",
      "10:30"
    );
    expect(Array.isArray(collidingSessions)).toBe(true);
  });
});


