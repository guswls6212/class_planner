/**
 * useDisplaySessions 테스트
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const warnMock = vi.fn();

vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: (...args: unknown[]) => warnMock(...args),
  },
}));

describe("useDisplaySessions", () => {
  let useDisplaySessions: any;
  let resetCache: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    warnMock.mockClear();

    const cacheModule = await import("../_sessionValidationLogger");
    resetCache = cacheModule._resetSessionValidationLoggerCache;
    resetCache();

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

  it("같은 sessionId의 enrollmentIds 누락 WARN은 한 번만 호출된다 (dedupe)", () => {
    const danglingSession = {
      id: "dangling-1",
      subjectId: "subject-1",
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: [],
      weekday: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { rerender } = renderHook(
      ({ sessions }: { sessions: typeof danglingSession[] }) =>
        useDisplaySessions(sessions, [], ""),
      { initialProps: { sessions: [danglingSession] } }
    );

    // 같은 dangling session으로 3번 더 rerender
    rerender({ sessions: [danglingSession] });
    rerender({ sessions: [danglingSession] });
    rerender({ sessions: [danglingSession] });

    const missingEnrollmentCalls = warnMock.mock.calls.filter(
      ([msg]) => typeof msg === "string" && msg.includes("enrollmentIds 누락")
    );
    expect(missingEnrollmentCalls).toHaveLength(1);
  });

  it("dedupe는 sessionId 단위 — 다른 sessionId 두 개는 각각 한 번 호출된다", () => {
    const danglingA = {
      id: "dangling-A",
      subjectId: "subject-1",
      startsAt: "09:00",
      endsAt: "10:00",
      enrollmentIds: [],
      weekday: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const danglingB = { ...danglingA, id: "dangling-B" };

    renderHook(() => useDisplaySessions([danglingA, danglingB], [], ""));

    const missingEnrollmentCalls = warnMock.mock.calls.filter(
      ([msg]) => typeof msg === "string" && msg.includes("enrollmentIds 누락")
    );
    expect(missingEnrollmentCalls).toHaveLength(2);
  });
});
