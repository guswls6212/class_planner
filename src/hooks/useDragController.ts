import { useCallback, useEffect, useReducer, useState } from "react";
import type { Session } from "@/lib/planner";

// ── State machine ──────────────────────────────────────────────────────────

type DragSource =
  | { kind: "session"; session: Session }
  | { kind: "student"; studentId: string };

type DragTarget = {
  weekday: number;
  time: string;
  yPosition: number;
};

type DragState =
  | { phase: "idle" }
  | { phase: "dragging"; source: DragSource }
  | { phase: "hovering"; source: DragSource; target: DragTarget };

type DragAction =
  | { type: "START_SESSION"; session: Session }
  | { type: "START_STUDENT"; studentId: string }
  | { type: "HOVER"; target: DragTarget }
  | { type: "LEAVE" }
  | { type: "COMPLETE" }
  | { type: "CANCEL" };

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case "START_SESSION":
      return { phase: "dragging", source: { kind: "session", session: action.session } };
    case "START_STUDENT":
      return { phase: "dragging", source: { kind: "student", studentId: action.studentId } };
    case "HOVER":
      if (state.phase === "idle") return state;
      return { phase: "hovering", source: state.source, target: action.target };
    case "LEAVE":
      if (state.phase === "idle") return state;
      return { phase: "dragging", source: state.source };
    case "COMPLETE":
    case "CANCEL":
      return { phase: "idle" };
    default:
      return state;
  }
}

// ── Public interface ────────────────────────────────────────────────────────

export interface DragControllerResult {
  /** 현재 드래그 중인 session (computeTentativeLayout 전달용). null = 드래그 없음. */
  draggedSession: Session | null;
  /** 현재 hover 중인 target 좌표. null = hover 없음. */
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
  /**
   * Ctrl(Win/Linux) 또는 Meta/Cmd(macOS) 키 보유 중 → drop 시점에 read하여
   * "복사" vs "이동" 분기. window-level keydown/keyup로 추적되어 drag 도중
   * 키를 누르고 떼면 즉시 반영됨 (DragOverlayCard 시각도 동시 갱신).
   */
  isCopyMode: boolean;

  /** 파생 selector — 특정 세션이 드래그 중인지 */
  isDraggingSession: (sessionId: string) => boolean;
  /** 파생 selector — 어떤 드래그든 진행 중인지 */
  isAnyDragging: () => boolean;

  startSessionDrag: (session: Session) => void;
  startStudentDrag: (studentId: string) => void;
  hoverTarget: (weekday: number, time: string, yPosition: number) => void;
  leaveTarget: () => void;
  completeDrop: () => void;
  cancelDrag: () => void;
}

export function useDragController(): DragControllerResult {
  const [state, dispatch] = useReducer(dragReducer, { phase: "idle" });
  const [isCopyMode, setIsCopyMode] = useState(false);

  // window-level Ctrl/Meta 키 추적 — drag 도중 키 변화도 즉시 반영
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Control" || e.key === "Meta") setIsCopyMode(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Control" || e.key === "Meta") setIsCopyMode(false);
    }
    function onBlur() {
      // 창 포커스 잃으면 안전하게 reset (modifier 키 stuck 방지)
      setIsCopyMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const startSessionDrag = useCallback((session: Session) => {
    dispatch({ type: "START_SESSION", session });
  }, []);

  const startStudentDrag = useCallback((studentId: string) => {
    dispatch({ type: "START_STUDENT", studentId });
  }, []);

  const hoverTarget = useCallback((weekday: number, time: string, yPosition: number) => {
    dispatch({ type: "HOVER", target: { weekday, time, yPosition } });
  }, []);

  const leaveTarget = useCallback(() => dispatch({ type: "LEAVE" }), []);
  const completeDrop = useCallback(() => dispatch({ type: "COMPLETE" }), []);
  const cancelDrag = useCallback(() => dispatch({ type: "CANCEL" }), []);

  const draggedSession =
    state.phase !== "idle" && state.source.kind === "session"
      ? state.source.session
      : null;

  const target = state.phase === "hovering" ? state.target : null;

  const isDraggingSession = useCallback(
    (sessionId: string) => draggedSession?.id === sessionId,
    [draggedSession]
  );

  const isAnyDragging = useCallback(() => state.phase !== "idle", [state.phase]);

  return {
    draggedSession,
    targetWeekday: target?.weekday ?? null,
    targetTime: target?.time ?? null,
    targetYPosition: target?.yPosition ?? null,
    isCopyMode,
    isDraggingSession,
    isAnyDragging,
    startSessionDrag,
    startStudentDrag,
    hoverTarget,
    leaveTarget,
    completeDrop,
    cancelDrag,
  };
}
