/**
 * useDisplaySessions 테스트 (99줄)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
  },
}));

describe("useDisplaySessions", () => {
  let useDisplaySessions: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic import
    const module = await import("../useDisplaySessions");
    useDisplaySessions = module.useDisplaySessions;
  });

  it("세션 표시 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useDisplaySessions([], [], ""));
    }).not.toThrow();
  });

  it("기본 구조를 반환해야 한다", () => {
    const { result } = renderHook(() => useDisplaySessions([], [], ""));

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });

  it("세션 데이터를 처리해야 한다", () => {
    const sessions = [
      {
        id: "session-1",
        subjectId: "subject-1",
        startsAt: "09:00",
        endsAt: "10:00",
        enrollmentIds: ["enrollment-1"],
        weekday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const enrollments = [
      {
        id: "enrollment-1",
        studentId: "student-1",
        subjectId: "subject-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    expect(() => {
      renderHook(() => useDisplaySessions(sessions, enrollments, "student-1"));
    }).not.toThrow();
  });

  it("빈 데이터를 안전하게 처리해야 한다", () => {
    const { result } = renderHook(() => useDisplaySessions([], [], ""));

    expect(result.current.sessions).toBeDefined();
  });
});
