import { useCallback, useEffect, useReducer, useState } from "react";
import type { Session } from "@/lib/planner";

// ── State machine ──────────────────────────────────────────────────────────

type DragSource =
  | { kind: "session"; session: Session }
  | { kind: "student"; studentId: string };

type DragTargetMode = "lane" | "insertBefore";
type DragTargetHalf = "left" | "right";

type DragTarget = {
  weekday: number;
  time: string;
  yPosition: number;
  /**
   * "lane": yPosition 자체에 drop (기존 동작 — 빈 lane occupy 또는 같은 lane 재배치)
   * "insertBefore": yPosition 앞에 새 lane 명시적 삽입 (Variant E — Edge Hover Slot).
   *   같은 시간 겹침 lane ≥ yPosition 모두 +1 shift.
   */
  mode: DragTargetMode;
  /**
   * mode === "insertBefore" 일 때만 의미. cell 의 어느 절반 위에 cursor 가 있는지.
   * row 단위 amber overlay 가 boundary glow line (left/right edge) 을 렌더할 때 사용.
   * cell-split hit-test (TimeTableCell) 결과를 dragController state 로 끌어올린 것.
   */
  half?: DragTargetHalf;
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
  /** "lane" (기본) 또는 "insertBefore" (lane 사이 drop slot, Variant E). null = hover 없음. */
  targetMode: DragTargetMode | null;
  /** insertBefore 모드 시 cell 의 어느 절반에 cursor 가 있는지 ("left" / "right"). 그 외 null. */
  targetHalf: DragTargetHalf | null;
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
  hoverTarget: (
    weekday: number,
    time: string,
    yPosition: number,
    mode?: DragTargetMode,
    half?: DragTargetHalf,
  ) => void;
  leaveTarget: () => void;
  completeDrop: () => void;
  cancelDrag: () => void;
  /**
   * drag 시작 시점의 modifier key 상태로 isCopyMode를 강제 설정.
   * window keydown listener가 놓치는 케이스(이미 누른 상태로 페이지 진입,
   * focus 변화 race) 방어. handleDndDragStart에서 activatorEvent의
   * ctrlKey/metaKey를 그대로 전달.
   */
  setCopyModeOverride: (value: boolean) => void;
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

  const hoverTarget = useCallback(
    (
      weekday: number,
      time: string,
      yPosition: number,
      mode: DragTargetMode = "lane",
      half?: DragTargetHalf,
    ) => {
      dispatch({ type: "HOVER", target: { weekday, time, yPosition, mode, half } });
    },
    [],
  );

  const leaveTarget = useCallback(() => dispatch({ type: "LEAVE" }), []);
  const completeDrop = useCallback(() => dispatch({ type: "COMPLETE" }), []);
  const cancelDrag = useCallback(() => dispatch({ type: "CANCEL" }), []);
  const setCopyModeOverride = useCallback(
    (value: boolean) => setIsCopyMode(value),
    [],
  );

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
    targetMode: target?.mode ?? null,
    targetHalf: target?.half ?? null,
    isCopyMode,
    isDraggingSession,
    isAnyDragging,
    startSessionDrag,
    startStudentDrag,
    hoverTarget,
    leaveTarget,
    completeDrop,
    cancelDrag,
    setCopyModeOverride,
  };
}
