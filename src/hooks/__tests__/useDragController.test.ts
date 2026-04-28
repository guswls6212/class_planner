import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDragController } from "../useDragController";
import type { Session } from "@/lib/planner";

const mockSession: Session = {
  id: "session-1",
  weekday: 1,
  startsAt: "10:00",
  endsAt: "11:00",
  enrollmentIds: ["enrollment-1"],
};

describe("useDragController", () => {
  it("초기 상태는 idle이다", () => {
    const { result } = renderHook(() => useDragController());
    expect(result.current.draggedSession).toBeNull();
    expect(result.current.targetWeekday).toBeNull();
    expect(result.current.isAnyDragging()).toBe(false);
    expect(result.current.isDraggingSession("session-1")).toBe(false);
  });

  it("startSessionDrag → dragging phase로 전이", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startSessionDrag(mockSession));

    expect(result.current.draggedSession).toEqual(mockSession);
    expect(result.current.isAnyDragging()).toBe(true);
    expect(result.current.isDraggingSession("session-1")).toBe(true);
    expect(result.current.isDraggingSession("other-session")).toBe(false);
    // target 없음 (dragging phase)
    expect(result.current.targetWeekday).toBeNull();
    expect(result.current.targetTime).toBeNull();
    expect(result.current.targetYPosition).toBeNull();
  });

  it("startStudentDrag → dragging phase, draggedSession은 null", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startStudentDrag("student-abc"));

    expect(result.current.draggedSession).toBeNull();
    expect(result.current.isAnyDragging()).toBe(true);
  });

  it("hoverTarget → hovering phase로 전이", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startSessionDrag(mockSession));
    act(() => result.current.hoverTarget(2, "11:00", 1));

    expect(result.current.targetWeekday).toBe(2);
    expect(result.current.targetTime).toBe("11:00");
    expect(result.current.targetYPosition).toBe(1);
    expect(result.current.draggedSession).toEqual(mockSession);
  });

  it("leaveTarget → dragging phase로 복귀 (target 초기화)", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startSessionDrag(mockSession));
    act(() => result.current.hoverTarget(2, "11:00", 1));
    act(() => result.current.leaveTarget());

    expect(result.current.targetWeekday).toBeNull();
    expect(result.current.draggedSession).toEqual(mockSession);
    expect(result.current.isAnyDragging()).toBe(true);
  });

  it("completeDrop → idle 전이", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startSessionDrag(mockSession));
    act(() => result.current.hoverTarget(3, "14:00", 2));
    act(() => result.current.completeDrop());

    expect(result.current.draggedSession).toBeNull();
    expect(result.current.isAnyDragging()).toBe(false);
    expect(result.current.targetWeekday).toBeNull();
  });

  it("cancelDrag → idle 전이", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.startSessionDrag(mockSession));
    act(() => result.current.cancelDrag());

    expect(result.current.draggedSession).toBeNull();
    expect(result.current.isAnyDragging()).toBe(false);
  });

  it("idle 상태에서 hoverTarget을 호출해도 idle 유지", () => {
    const { result } = renderHook(() => useDragController());

    act(() => result.current.hoverTarget(1, "10:00", 1));

    expect(result.current.isAnyDragging()).toBe(false);
    expect(result.current.targetWeekday).toBeNull();
  });
});
