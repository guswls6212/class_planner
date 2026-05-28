/**
 * TimeTableRow: 시간표 grid 의 1 weekday row 렌더 + 1 row 안 session 배치 + lane width
 * scrollable + row-level overflow expand + droppable cell 만 담당.
 *
 * 의존성:
 *   - planner type (Session/Subject/Teacher)
 *   - SessionBlock (session 자체 렌더는 child component)
 *   - dnd-kit useDroppable (cell 단위 droppable)
 *   - non-goal: grid 전체 layout (TimeTableGrid 책임), session 시각 (SessionBlock 책임)
 *
 * 결정 history:
 *   - row cluster expand (PR #387/388 후속): row 별 '+N'/'-' chip 으로 lane overflow 펼치기.
 *   - dnd-kit Variant E LaneInsertSlot (cell 사이 boundary droppable).
 *   - ADR-002 (2026-05-28): Cohesion Sweep Phase 2 — UI molecule, 분리는 needs-review.
 *
 * Sniff test (자기 답변, 2026-05-28):
 *   1. 다른 파일 같이 수정? — yes (TimeTableGrid + SessionBlock 연동).
 *   2. 시그니처 영향? — props 명확.
 *   3. UI/state/API 섞임? — UI + drag droppable. API X.
 *   4. 도메인? — 한 도메인 (1 row layout).
 *   5. pure + 부수효과? — 부수효과 (dnd 이벤트).
 *
 * 분리 후보 (needs-review): LaneInsertSlot 분리, cluster expand UI 분리.
 */

import React from "react";
import type { Session, Subject, Teacher } from "../../lib/planner";
import { logger } from "../../lib/logger";
import type { ColorByMode } from "../../hooks/useColorBy";
import { resolveSessionTone } from "./SessionCard.utils";

import { SLOT_HEIGHT_PX } from "@/shared/constants/sessionConstants";
import { computeRequiredLanes } from "../../lib/sessionCollisionUtils";
import { computeRowClusters } from "../../lib/sessionClusters";
import { sessionMatchesFilters } from "./SessionBlock.utils";
import type { PresentationMode } from "./SessionBlock";
import TimeTableCell from "./TimeTableCell";
import SessionBlock from "./SessionBlock";
import HiddenSessionsPopover from "./HiddenSessionsPopover";

// D-hybrid: columns with ≥4 yPositions show only the first 3 + "+N" inline chip
const OVERFLOW_THRESHOLD = 4;

/**
 * 커서 상대좌표(relX, relY)를 drop 대상 {time, yPosition}으로 변환한다.
 * 브라우저 hit-test(z-index/pointer-events)를 우회하여 픽셀 단위 정밀도 확보.
 * dragover 이벤트는 pointer-events:auto인 드래그 소스에서 버블링되므로
 * 이 함수를 컨테이너 레벨에서 호출하면 셀이 가려져도 항상 올바른 위치를 계산한다.
 */
export function coordsToDropTarget(
  relX: number,
  relY: number,
  laneWidth: number,
  effectiveLanes: number,
  slotHeightPx: number,
  timeSlots: string[],
  dragHoverPad: number,
  isDraggingToThis: boolean,
): { time: string; yPosition: number } | null {
  if (timeSlots.length === 0) return null;
  const adjustedX = Math.max(0, relX - (isDraggingToThis ? dragHoverPad : 0));
  const laneIdx = Math.min(Math.max(0, Math.floor(adjustedX / laneWidth)), effectiveLanes - 1);
  const timeIdx = Math.min(Math.max(0, Math.floor(relY / slotHeightPx)), timeSlots.length - 1);
  return { time: timeSlots[timeIdx], yPosition: laneIdx + 1 };
}

// Drag preview state (same shape as TimeTableGrid)
//
// SSOT (drag-ghost / lane-highlight / amber overlay 3 종 시각 피드백 통일):
//   - drag-ghost     : laidOutSessions.find(ds.id) 좌표 (post-shift, compactYPositions 후)
//   - lane-highlight : 위 ghost 좌표 derive (fallback: targetYPosition raw)
//   - amber overlay  : 위 ghost 좌표 derive + targetHalf glow line (Variant E insertBefore)
// 세 시각 피드백 모두 ghost 좌표 single source 로 derive → 항상 같은 lane 가리킨다.
// 상세 / RC: class-planner/docs/dnd-visual-feedback.md.
//
// targetMode:
//   - "lane"         : drop 후 lane occupy. lane-highlight 박스만, amber overlay 없음.
//   - "insertBefore" : lane 사이 insert (Variant E). amber overlay 표시 + targetHalf glow.
//   - null           : hover 없음.
// targetHalf: insertBefore 시 cell 의 어느 절반에 cursor 가 있는지 ("left" / "right").
interface DragPreviewState {
  draggedSession: Session | null;
  targetWeekday: number | null;
  targetTime: string | null;
  targetYPosition: number | null;
  // optional: legacy 호출자 호환. undefined → "lane" default.
  targetMode?: "lane" | "insertBefore" | null;
  targetHalf?: "left" | "right" | null;
}

interface TimeTableRowProps {
  weekday: number;
  width: number; // 이 weekday column 전체 너비 (max lane 수 × laneWidth)
  sessions: Map<number, Session[]>;
  subjects: Subject[];
  enrollments: Array<{ id: string; studentId: string; subjectId: string }>;
  students: Array<{ id: string; name: string }>;
  onSessionClick: (session: Session) => void;
  onSessionDelete?: (session: Session) => void;
  onDrop: (weekday: number, time: string, enrollmentId: string) => void;
  onSessionDrop?: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => void;
  onEmptySpaceClick: (weekday: number, time: string) => void;
  className?: string;
  style?: React.CSSProperties;
  selectedStudentIds?: string[];
  /** 과목 필터 — 학생과 AND 결합. 매칭 sessions이 앞 lane으로 정렬. */
  selectedSubjectIds?: string[];
  /** 강사 필터 — 학생/과목과 AND 결합. session.teacherId로 매칭. */
  selectedTeacherIds?: string[];
  isAnyDragging?: boolean;
  /** Ctrl/Meta+drag 복사 모드 — SessionBlock에 전달해 원본 opacity 유지 */
  isCopyMode?: boolean;
  /** drag 시작 시점 copy mode (latched). LaneInsertSlot mount 조건에 사용 —
   *  drag 도중 Cmd 풀어도 lane insert 비활성 유지 (T10b 회귀 가드). */
  dragStartedAsCopy?: boolean;
  teachers?: Teacher[];
  colorBy?: ColorByMode;
  isMobile?: boolean;
  dragPreview?: DragPreviewState;
  /**
   * drag 시작 시점의 이 weekday 의 lane 수 (TimeTableGrid 가 latch). drag 중 cell 수가
   * 줄어드는 케이스 (lane shift 후 source weekday 의 lane 줄어듦) 방지 — effectiveLanes
   * = max(frozenLanes, required). drag 중에만 유효, drag 끝나면 null.
   */
  frozenLanes?: number | null;
  /** 선택된 세션 id Set — SessionBlock의 selected 시각 표시 결정 */
  selectedSessionIds?: Set<string>;
  /** modifier(Shift/Ctrl/Meta) + click 시 호출 */
  onSessionSelectToggle?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "복사" 항목 (Ctrl/Cmd 키 없는 환경 대응) */
  onSessionContextMenuCopy?: (sessionId: string) => void;
  /** 모바일 long-press 메뉴 — "선택 시작" 항목 */
  onSessionContextMenuStartSelect?: (sessionId: string) => void;
  // 오늘 열 강조 (주간 헤더 날짜 표시용)
  isToday?: boolean;
  nowLinePx?: number | null;
  nowTimeStr?: string;
  /**
   * Controlled row-level overflow expand state. key = `${weekday}|${clusterKey}` 형식.
   * 한 weekday 안 여러 time-row (cluster) 별로 independent expand. clusterKey 는
   * cluster.startMin 의 string (sessionClusters.ts § SessionCluster.key).
   * 부모 (TimeTableGrid) 가 일관성 위해 controlled-only 로 운영.
   */
  expandedRowKeys?: Set<string>;
  /** 특정 cluster 의 expand toggle (개별 cluster — 외부 control 시나리오). clusterKey 인자. */
  onToggleRowExpand?: (clusterKey: string) => void;
  /**
   * weekday 의 모든 cluster 일괄 토글 (모두 expanded → 모두 collapse, 그 외 → 모두 expand).
   * chip 클릭 시 본 callback 우선 호출 — 한 row chip 만 눌러도 같은 weekday 모든 cluster
   * 일괄 expand (사용자 요구 2026-05-16, column 폭이 이미 max cluster 로 늘어났을 때 다른
   * row 도 같이 expand 가 자연 UX).
   */
  onToggleAllRowsInWeekday?: () => void;
  /** SessionBlock 표시 모드 — share view 분기용. Default "edit". */
  presentationMode?: PresentationMode;
  /**
   * 전체 출결 — 2 차원 key (sessionId → date → studentId → entry).
   * SessionBlock 별로 본 row 의 instanceDate 로 lookup 후 SessionBlock 의 attendanceMap 전달.
   * 미제공 시 dot 안 보임. (이전 PR 호환: 단일-date map 도 lookup helper 가 동시 지원)
   */
  attendanceMapBySession?: Record<
    string,
    Record<string, Record<string, { status: string }>>
  >;
  /**
   * 본 row 의 실 instance 날짜 (YYYY-MM-DD). TimeTableGrid 가 weekDates[weekday] 로 계산.
   * SessionBlock → useSessionStatus 의 date-aware mode 진입 (과거 날짜 출결 dot 알림).
   */
  instanceDate?: string;
  /**
   * @deprecated weekday 전체 토글 — backward compat 용. 새 코드는 expandedRowKeys 사용.
   * 단일 cluster (weekday 에 cluster 1 개) 시나리오에서만 등가. multi-cluster 면 모든
   * cluster 일괄 expand/collapse.
   */
  isExpanded?: boolean;
  /** @deprecated weekday 전체 토글 콜백 — backward compat 용. */
  onToggleExpand?: () => void;
  /** 시간 라벨/세션 위치 계산 기준 시작 시각 (0-23). default 9. */
  startHour?: number;
  /** 표시 종료 시각 (inclusive — endHour:30 슬롯까지 표시). default 23. */
  endHour?: number;
}

/**
 * TimeTableRow — weekday column (B2+).
 * 시간축이 세로(rows), 요일이 가로(cols).
 * yPosition(=overlap lane)은 column 내부에서 가로로 스택된다.
 * Phase 4: ≤3 lanes equal-split, ≥4 lanes show 3 inline + "+N" expand chip.
 */
export const TimeTableRow: React.FC<TimeTableRowProps> = ({
  weekday,
  width,
  sessions,
  subjects,
  enrollments,
  students,
  onSessionClick,
  onSessionDelete,
  onDrop,
  onSessionDrop,
  onEmptySpaceClick,
  className = "",
  style = {},
  selectedStudentIds,
  selectedSubjectIds,
  selectedTeacherIds,
  isAnyDragging = false,
  isCopyMode = false,
  dragStartedAsCopy = false,
  teachers = [],
  colorBy = "subject",
  isMobile = false,
  dragPreview,
  frozenLanes,
  isToday = false,
  nowLinePx = null,
  nowTimeStr,
  expandedRowKeys,
  onToggleRowExpand,
  onToggleAllRowsInWeekday,
  isExpanded: legacyIsExpanded,
  onToggleExpand: legacyOnToggleExpand,
  selectedSessionIds,
  onSessionSelectToggle,
  onSessionContextMenuCopy,
  onSessionContextMenuStartSelect,
  startHour = 9,
  endHour = 23,
  presentationMode = "edit",
  attendanceMapBySession,
  instanceDate,
}) => {
  // popover state — cluster key 기반 단일 변수 (한 번에 하나의 cluster popover 만 열림).
  const [openPopoverClusterKey, setOpenPopoverClusterKey] = React.useState<string | null>(null);
  // uncontrolled internal expand state — 부모가 expandedRowKeys/onToggleRowExpand 도 legacy
  // isExpanded/onToggleExpand 도 안 줄 때 자체적으로 expand 토글. legacy uncontrolled
  // 동작 호환용 (test sandbox 시나리오).
  const [internalExpandedClusters, setInternalExpandedClusters] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Bug4 fix: drag 시작 시 popover 닫기는 DraggableSessionCard 노드를 mid-drag 중 unmount해서
  // dnd-kit이 active draggable을 잃는다. 대신 drag가 종료(draggedSession → null)될 때 닫는다.
  const prevDraggedRef = React.useRef<Session | null>(null);
  React.useEffect(() => {
    const current = dragPreview?.draggedSession ?? null;
    if (prevDraggedRef.current !== null && current === null) {
      // drag 완료 후 popover 닫기 (drag 중에는 노드 유지)
      setOpenPopoverClusterKey(null);
    }
    prevDraggedRef.current = current;
  }, [dragPreview?.draggedSession]);

  // Convert time string to minutes helper
  const timeToMinutes = React.useCallback((time: string): number => {
    if (!time || typeof time !== "string") {
      logger.warn("Invalid time format", { time });
      return 0;
    }
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // [startHour:00, endHour+1:00) 와 strict overlap이 있는 세션. 경계를 넘는
  // 세션(예: 11:30-16:30 + range 7-13)은 양쪽 시간 모드(7-13, 13-22)에서
  // 모두 보이도록 부분 겹침을 허용한다. laidOutSessions에서 보이는 영역만
  // clamp 하고 overflowsTop/Bottom flag로 SessionBlock에 시각 표지를 전달.
  const weekdaySessions = React.useMemo(() => {
    const all = sessions?.get(weekday) || [];
    const lowerBound = startHour * 60;
    const upperBound = (endHour + 1) * 60;
    return all.filter((s) => {
      const startMin = timeToMinutes(s.startsAt);
      const endMin = timeToMinutes(s.endsAt);
      return startMin < upperBound && endMin > lowerBound;
    });
  }, [sessions, weekday, startHour, endHour, timeToMinutes]);

  // Required lane count based on actual time overlaps (not stored yPosition max)
  const rawMaxYPosition = React.useMemo(() => {
    return computeRequiredLanes(weekdaySessions);
  }, [weekdaySessions]);

  const isDragging = React.useMemo(() => {
    return Boolean(dragPreview?.draggedSession);
  }, [dragPreview]);

  // Cluster 별 overflow state — 같은 weekday 안 시간 겹침 없는 time-row 별 independent
  // expand. sessionClusters.ts § computeRowClusters 참조. drag 중에는 cluster 인지 안 함
  // (모든 cluster collapsed treat) — frozenLanes 가 cell mount/unmount flicker 가드 담당.
  const clusters = React.useMemo(
    () => computeRowClusters(weekdaySessions),
    [weekdaySessions],
  );

  // backward-compat: legacy `isExpanded` (boolean) → 모든 cluster 일괄 expand/collapse.
  // 새 코드는 `expandedRowKeys` 직접 전달. 둘 다 없으면 internal state 사용 (uncontrolled).
  const effectiveExpandedKeys = React.useMemo<Set<string>>(() => {
    if (legacyIsExpanded != null) {
      return legacyIsExpanded
        ? new Set(clusters.map((c) => `${weekday}|${c.key}`))
        : new Set<string>();
    }
    if (expandedRowKeys != null) return expandedRowKeys;
    return internalExpandedClusters;
  }, [legacyIsExpanded, expandedRowKeys, clusters, weekday, internalExpandedClusters]);

  // backward-compat: legacy `onToggleExpand` → cluster key 무시 그냥 호출.
  // uncontrolled (부모 콜백 둘 다 없음): internal state 토글.
  const effectiveOnToggleRowExpand = React.useCallback(
    (clusterKey: string) => {
      if (onToggleRowExpand) {
        onToggleRowExpand(clusterKey);
      } else if (legacyOnToggleExpand) {
        legacyOnToggleExpand();
      } else {
        setInternalExpandedClusters((prev) => {
          const next = new Set(prev);
          const k = `${weekday}|${clusterKey}`;
          if (next.has(k)) next.delete(k);
          else next.add(k);
          return next;
        });
      }
    },
    [onToggleRowExpand, legacyOnToggleExpand, weekday],
  );

  // weekday 또는 sessions 변경 시 internal expand state reset (legacy uncontrolled 동작).
  React.useEffect(() => {
    setInternalExpandedClusters(new Set());
  }, [weekday, weekdaySessions]);

  // filter keys / isFilterActive 를 cluster 계산용으로 미리 정의 (orderedSessions 와 동일).
  // orderedSessions 자체는 본 정의 아래 — cluster 안에서는 cluster.sessions 만 filter sort.
  const _studentIdsKey = selectedStudentIds ?? [];
  const _subjectIdsKey = selectedSubjectIds ?? [];
  const _teacherIdsKey = selectedTeacherIds ?? [];
  const _isFilterActive =
    _studentIdsKey.length > 0 ||
    _subjectIdsKey.length > 0 ||
    _teacherIdsKey.length > 0;

  const clusterStates = React.useMemo(() => {
    const sortByYPos = (a: Session, b: Session) => (a.yPosition ?? 1) - (b.yPosition ?? 1);
    return clusters.map((c) => {
      const isExpanded = effectiveExpandedKeys.has(`${weekday}|${c.key}`);
      const isOverflow = !isDragging && c.requiredLanes >= OVERFLOW_THRESHOLD;
      // cluster 안 sessions 의 정렬 — filter 활성 시 matching first (yPosition asc 보조),
      // 미활성 시 단순 yPosition asc. 기존 weekday-level 정책을 cluster 별 재현 —
      // matching session 이 visible 우선 보장.
      let orderedInCluster: Session[];
      if (_isFilterActive) {
        const matching = c.sessions
          .filter((s) =>
            sessionMatchesFilters(s, enrollments, _studentIdsKey, _subjectIdsKey, _teacherIdsKey),
          )
          .sort(sortByYPos);
        const nonMatching = c.sessions
          .filter(
            (s) =>
              !sessionMatchesFilters(s, enrollments, _studentIdsKey, _subjectIdsKey, _teacherIdsKey),
          )
          .sort(sortByYPos);
        orderedInCluster = [...matching, ...nonMatching];
      } else {
        orderedInCluster = [...c.sessions].sort(sortByYPos);
      }
      const visible = isOverflow && !isExpanded
        ? (_isFilterActive
            ? orderedInCluster.slice(0, 3)
            : orderedInCluster.filter((s) => (s.yPosition ?? 1) <= 3))
        : orderedInCluster;
      const hidden = isOverflow && !isExpanded
        ? (_isFilterActive
            ? orderedInCluster.slice(3)
            : orderedInCluster.filter((s) => (s.yPosition ?? 1) >= 4))
        : [];
      const visStartMin = Math.max(c.startMin, startHour * 60);
      const chipTopPx = isOverflow
        ? Math.max(4, ((visStartMin - startHour * 60) / 30) * SLOT_HEIGHT_PX)
        : null;
      return { cluster: c, isExpanded, isOverflow, visible, hidden, chipTopPx };
    });
  }, [clusters, effectiveExpandedKeys, weekday, isDragging, startHour, _isFilterActive, enrollments, _studentIdsKey, _subjectIdsKey, _teacherIdsKey]);

  // session id → cluster state lookup (SessionBlock 의 hasLaneOverflowChip 계산용)
  const sessionToClusterState = React.useMemo(() => {
    const m = new Map<string, (typeof clusterStates)[number]>();
    for (const st of clusterStates) {
      for (const s of st.cluster.sessions) m.set(s.id, st);
    }
    return m;
  }, [clusterStates]);

  // effectiveLanes = column 폭 결정 (drag 중 frozenLanes vs cluster 별 max).
  const effectiveLanes = React.useMemo(() => {
    if (isDragging && frozenLanes != null) {
      return Math.max(frozenLanes, rawMaxYPosition);
    }
    if (clusterStates.length === 0) return Math.max(1, rawMaxYPosition);
    const clusterEffective = clusterStates.map((st) =>
      st.isExpanded
        ? st.cluster.requiredLanes
        : Math.min(st.cluster.requiredLanes, 3),
    );
    return Math.max(1, ...clusterEffective);
  }, [isDragging, frozenLanes, rawMaxYPosition, clusterStates]);

  // 전체 weekday 차원의 overflow 존재 여부 (기존 호환 + drag-source placeholder 등에서 사용).
  const isOverflow = React.useMemo(
    () => clusterStates.some((st) => st.isOverflow),
    [clusterStates],
  );

  // 드래그 중 target 요일에 양쪽 padding 추가 — 세션 너비는 유지하고 좌우 20px 여백만 생성.
  // weekdayWidths가 이미 DRAG_HOVER_PAD * 2 만큼 넓어져 있으므로 baseWidth로 원래 너비 복원.
  const DRAG_HOVER_PAD = 10;
  const isDraggingToThis = isDragging && dragPreview?.targetWeekday === weekday;
  const baseWidth = isDraggingToThis ? width - DRAG_HOVER_PAD * 2 : width;

  // 30분 단위 time slots — startHour:00 ~ endHour:30 (inclusive).
  const timeSlots30Min = React.useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  }, [startHour, endHour]);

  // Lane width for horizontal overlap stacking within this weekday column
  const laneWidth = baseWidth / Math.max(1, effectiveLanes);
  const totalHeight = timeSlots30Min.length * SLOT_HEIGHT_PX;

  // ADR-020 D2: weekday-wide matching-first 정렬 제거 — 같은 weekday 안 cluster 간 ordering
  // 은 yPosition 만 따른다. cluster 안 매칭 우선 정렬은 clusterStates 에서 별도 처리.
  // 이전 spec (PR #284): weekday 전체에 matching first / nonMatching last → 겹침 없는 session 도
  // lane 이동 인지 유발 (UAT 2026-05-21).
  const sortByYPos = (a: Session, b: Session) => (a.yPosition || 1) - (b.yPosition || 1);
  const orderedSessions = React.useMemo(
    () => [...weekdaySessions].sort(sortByYPos),
    [weekdaySessions],
  );

  // Visible / hidden sessions: cluster 별로 분리 (clusterStates 의 visible/hidden flatten).
  // filter 활성 시 cluster 안 sorting (matching first) 은 yPosition asc 만 적용 — filter
  // sort 의 visual 영향은 별도 follow-up. cluster 별 chip 은 그 cluster 의 첫 hidden 위치.
  //
  // orderedSessions 는 SessionBlock 렌더 정렬용 (filter matching first) — 그대로 유지하되
  // visible/hidden 결정은 cluster 단위. 즉 visible 인 sessions 만 orderedSessions 순서로 렌더.
  const visibleSessions = React.useMemo(() => {
    const visibleIds = new Set(clusterStates.flatMap((st) => st.visible.map((s) => s.id)));
    return orderedSessions.filter((s) => visibleIds.has(s.id));
  }, [orderedSessions, clusterStates]);

  // Compute per-session layout. 경계 초과 세션(startMin<lowerBound 또는
  // endMin>upperBound)은 보이는 영역으로 clamp 하고, overflowsTop/Bottom flag로
  // SessionBlock에 시각 표지(그라데이션 cap)를 전달한다.
  const laidOutSessions = React.useMemo(() => {
    const lowerBound = startHour * 60;
    const upperBound = (endHour + 1) * 60;
    return visibleSessions.map((session) => {
      // ADR-020 D2: laneIdx 는 항상 yPosition 기반 (필터 영향 X).
      // cluster 안 매칭 우선 visible 결정은 clusterStates 가 별도 처리.
      // 이전 spec (PR #284) 의 "필터 활성 시 array index 기반" 은 겹침 없는 session 도
      // lane 이동 인지 유발 (UAT 2026-05-21) → 정정.
      const rawIdx = (session.yPosition || 1) - 1;
      const laneIdx = Math.min(Math.max(0, rawIdx), effectiveLanes - 1);
      const startMin = timeToMinutes(session.startsAt);
      const endMin = timeToMinutes(session.endsAt);
      const visStart = Math.max(startMin, lowerBound);
      const visEnd = Math.min(endMin, upperBound);
      const timeIdx = Math.max(0, (visStart - lowerBound) / 30);
      const durationSlots = Math.max(0.5, (visEnd - visStart) / 30);
      return {
        session,
        left: Math.round(laneIdx * laneWidth) + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
        width: Math.round(laneWidth),
        top: Math.round(timeIdx * SLOT_HEIGHT_PX),
        height: Math.round(durationSlots * SLOT_HEIGHT_PX),
        yPosition: laneIdx + 1,
        overflowsTop: startMin < lowerBound,
        overflowsBottom: endMin > upperBound,
      };
    });
  }, [visibleSessions, timeToMinutes, laneWidth, startHour, endHour, isDraggingToThis, effectiveLanes]);

  // ghost layout (드래그 중 movingSession 의 laidOut 위치) — lane-highlight + amber
  // overlay 가 같은 source 에서 좌표 derive. compactYPositions artifact (lane 1 출발
  // + insertBefore=2 시 ghost yPos 가 1 로 compact) 도 자동 반영. dnd-visual-feedback.md
  // § 1 RC 분석 참조.
  const ghostLayout = React.useMemo(() => {
    const dsId = dragPreview?.draggedSession?.id;
    if (!dsId) return null;
    return laidOutSessions.find(({ session }) => session.id === dsId) ?? null;
  }, [laidOutSessions, dragPreview?.draggedSession?.id]);

  return (
    <div
      className={`relative bg-[var(--color-bg-primary)] border-r border-[var(--color-border-grid)] ${className}`}
      data-testid={`time-table-column-${weekday}`}
      data-weekday={weekday}
      style={{
        height: `${totalHeight}px`,
        width: `${width}px`,
        // target 컬럼: 미묘한 inner glow로 "여기에 드래그 중" 표시
        boxShadow: isDraggingToThis
          ? "inset 0 0 0 1.5px rgba(99,179,237,0.35)"
          : undefined,
        ...style,
      }}
    >
      {/* 수평 시간선 overlay — pointer-events:none, 세션 블록보다 낮은 z-index */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {timeSlots30Min.map((slot, idx) => (
          <div
            key={`line-${slot}`}
            className="absolute left-0 right-0"
            style={{
              top: idx * SLOT_HEIGHT_PX,
              height: 1,
              background: idx % 2 === 0
                ? "rgba(255,255,255,0.09)"
                : "rgba(255,255,255,0.04)",
            }}
          />
        ))}

        {/* 현재 시각 선 (오늘 열만) */}
        {isToday && nowLinePx !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{ top: nowLinePx, zIndex: 150, transition: "top 0.5s ease-out" }}
            aria-label="현재 시각"
          >
            {/* Amber time pill on the left */}
            {nowTimeStr && (
              <div
                className="absolute left-0 -top-[11px] text-[10px] font-semibold px-[6px] py-0.5 rounded-[10px] leading-[1.4] whitespace-nowrap z-[151]"
                style={{
                  background: "var(--color-accent-hover)",
                  color: "var(--color-bg-primary)",
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {nowTimeStr}
              </div>
            )}
            {/* 2px horizontal line */}
            <div
              className="absolute left-0 right-0 h-[2px] rounded-[1px]"
              style={{ background: "var(--color-accent-hover)" }}
            />
          </div>
        )}
      </div>

      {/* 드래그 중 레인 경계선 — 어느 lane으로 떨어질지 시각적 힌트 */}
      {isDragging && effectiveLanes >= 2 && (
        Array.from({ length: effectiveLanes - 1 }, (_, i) => (
          <div
            key={`lane-bound-${i}`}
            data-testid={`lane-boundary-${i}`}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: (i + 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0),
              width: 1,
              background: "rgba(255,255,255,0.10)",
              zIndex: 94,
            }}
          />
        ))
      )}

      {/* 드래그 중 타겟 레인 하이라이트 — 항상 column 박스 (사용자 직관 "어느 lane 으로
          드롭하는지"). 좌표는 ghost layout (laidOutSessions) 에서 derive — compactYPositions
          artifact (lane 1 출발 + insertBefore=2 시 ghost yPos=1 로 compact 되는 케이스) 도
          자동 반영. ghost 미존재 시 raw targetYPosition fallback. amber overlay 도 같은
          좌표 derive → 3 종 시각 피드백 항상 같은 lane. dnd-visual-feedback.md § 5 참조. */}
      {isDragging && dragPreview?.targetWeekday === weekday && dragPreview?.targetYPosition != null && (() => {
        const left = ghostLayout
          ? ghostLayout.left
          : (dragPreview.targetYPosition - 1) * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0);
        const width = ghostLayout ? ghostLayout.width : Math.round(laneWidth);
        return (
          <div
            data-testid="lane-highlight"
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left,
              width,
              background: "rgba(99,179,237,0.10)",
              borderLeft: "1.5px solid rgba(99,179,237,0.35)",
              borderRight: "1.5px solid rgba(99,179,237,0.35)",
              zIndex: 95,
            }}
          />
        );
      })()}

      {/* Drop cells — timeSlots × effectiveLanes.
          drag 중 (insertMode=true) 일 땐 cell 을 left/right half 두 insertBefore
          droppable 로 분할 — cursor 가 cell 어디에 hover 하든 가까운 boundary insert.
          Variant E (Edge Hover Slot) — cell split. dragStartedAsCopy (시작 시점 latch)
          기준이라 drag 도중 Cmd 풀어도 insertMode 유지 안 됨 (T10b 회귀 가드). */}
      {timeSlots30Min.map((timeString, timeIndex) => {
        return Array.from({ length: effectiveLanes }, (_, laneIdx) => {
          const yPosition = laneIdx + 1;
          const cellAbsTop = timeIndex * SLOT_HEIGHT_PX;
          return (
            <TimeTableCell
              key={`${timeString}-${yPosition}`}
              weekday={weekday}
              time={timeString}
              yPosition={yPosition}
              onDrop={onDrop}
              onEmptySpaceClick={onEmptySpaceClick}
              isReadOnly={false}
              insertMode={
                isDraggingToThis &&
                !dragStartedAsCopy &&
                (selectedSessionIds?.size ?? 0) <= 1
              }
              style={{
                position: "absolute",
                top: `${cellAbsTop}px`,
                left: `${laneIdx * laneWidth + (isDraggingToThis ? DRAG_HOVER_PAD : 0)}px`,
                width: `${laneWidth}px`,
                height: `${SLOT_HEIGHT_PX}px`,
                zIndex: 1,
              }}
            />
          );
        });
      })}

      {/* Session blocks (absolutely positioned, visible sessions only) */}
      {laidOutSessions.map(({ session, left, width: sWidth, top, height, yPosition, overflowsTop, overflowsBottom }) => (
        // target weekday에서만 SessionBlock을 skip하고 DragGhost가 대신 렌더.
        // targetWeekday === null (아직 셀 위를 안 지남)이면 원본 위치에 정상 렌더.
        session.id === dragPreview?.draggedSession?.id
          && dragPreview?.targetWeekday === weekday
          ? null :
        <SessionBlock
          key={session.id}
          session={session}
          subjects={(subjects || []).map((subject) => ({
            ...subject,
            color: subject.color || "#000000",
          }))}
          enrollments={enrollments}
          students={students}
          left={left}
          width={sWidth}
          yOffset={top}
          yPosition={yPosition}
          height={height}
          onClick={() => onSessionClick(session)}
          onDelete={
            onSessionDelete ? () => onSessionDelete(session) : undefined
          }
          selectedStudentIds={selectedStudentIds}
          selectedSubjectIds={selectedSubjectIds}
          selectedTeacherIds={selectedTeacherIds}
          teachers={teachers}
          colorBy={colorBy}
          isMobile={isMobile}
          isDragging={Boolean(dragPreview?.draggedSession)}
          draggedSessionId={dragPreview?.draggedSession?.id}
          isAnyDragging={isAnyDragging}
          isCopyMode={isCopyMode}
          presentationMode={presentationMode}
          attendanceMap={
            instanceDate
              ? attendanceMapBySession?.[session.id]?.[instanceDate]
              : undefined
          }
          instanceDate={instanceDate}
          overflowsTop={overflowsTop}
          overflowsBottom={overflowsBottom}
          hasLaneOverflowChip={(() => {
            // cluster-aware: 그 session 의 cluster 가 overflow + collapsed + 이 session 이
            // 마지막 visible lane (3) 인 경우만 chip 자리 비움.
            const st = sessionToClusterState.get(session.id);
            return Boolean(st?.isOverflow && !st.isExpanded && yPosition === 3);
          })()}
          selected={selectedSessionIds?.has(session.id) ?? false}
          onSelectToggle={
            onSessionSelectToggle
              ? () => onSessionSelectToggle(session.id)
              : undefined
          }
          onContextMenuCopy={
            onSessionContextMenuCopy
              ? () => onSessionContextMenuCopy(session.id)
              : undefined
          }
          onContextMenuStartSelect={
            onSessionContextMenuStartSelect
              ? () => onSessionContextMenuStartSelect(session.id)
              : undefined
          }
        />
      ))}

      {/* Source placeholder — 세션이 이 요일에서 빠져나갔을 때 원래 자리에 흐릿한 표시 */}
      {(() => {
        const ds = dragPreview?.draggedSession;
        // source weekday이고, hover 중인 target이 있고, 이 요일에서 세션이 사라졌을 때
        if (!ds || ds.weekday !== weekday || dragPreview?.targetWeekday === null) return null;
        // laidOutSessions에 없어야 함 (다른 요일로 이동된 경우)
        if (laidOutSessions.some(({ session }) => session.id === ds.id)) return null;

        const [sh, sm] = (ds.startsAt ?? "").split(":").map(Number);
        const [eh, em] = (ds.endsAt ?? "").split(":").map(Number);
        const timeIdx = Math.max(0, (sh * 60 + sm - startHour * 60) / 30);
        const durationSlots = Math.max(1, ((eh * 60 + em) - (sh * 60 + sm)) / 30);
        const laneIdx = Math.min(Math.max(0, (ds.yPosition ?? 1) - 1), effectiveLanes - 1);

        const firstEnrollId = ds.enrollmentIds?.[0];
        const enr = firstEnrollId ? enrollments.find((e) => e.id === firstEnrollId) : null;
        const subj = enr ? subjects.find((s) => s.id === enr.subjectId) : null;
        const srcColor = subj?.color ?? "#6B7280";

        return (
          <div
            key="drag-source"
            style={{
              position: "absolute",
              left: Math.round(laneIdx * laneWidth),
              top: Math.round(timeIdx * SLOT_HEIGHT_PX) + 1,
              width: Math.round(laneWidth),
              height: Math.round(durationSlots * SLOT_HEIGHT_PX) - 1,
              backgroundColor: srcColor,
              opacity: 0.18,
              borderRadius: 4,
              pointerEvents: "none",
              zIndex: 90,
            }}
            data-testid="drag-source"
          />
        );
      })()}

      {/* amber overlay ("여기 삽입") — Variant E insertBefore mode 시 ghost 좌표
          (laidOutSessions) 에 그려진다. cell 의 isOver 가 아닌 dragController.targetMode
          + targetHalf 기반 — 3 시각 피드백 SSOT 통일 (dnd-visual-feedback.md § 3, 5).
          targetHalf 로 left/right boundary glow 분기. multi-select / Cmd+copy 시 미렌더
          (T10b 회귀 가드, cell 의 insertMode 와 동일 조건). */}
      {(() => {
        if (dragPreview?.targetWeekday !== weekday) return null;
        if (dragPreview?.targetMode !== "insertBefore") return null;
        if (dragStartedAsCopy) return null;
        if ((selectedSessionIds?.size ?? 0) > 1) return null;
        if (!ghostLayout) return null;
        return (
          <div
            data-testid="amber-overlay"
            data-target-half={dragPreview.targetHalf ?? undefined}
            style={{
              position: "absolute",
              left: ghostLayout.left,
              top: ghostLayout.top,
              width: ghostLayout.width,
              height: ghostLayout.height,
              zIndex: 4,
              pointerEvents: "none",
            }}
            className="rounded-md border-2 border-dashed border-amber-400/90 bg-amber-300/25 flex items-center justify-center"
          >
            <span className="text-[12px] font-bold text-amber-200 select-none whitespace-nowrap">
              여기 삽입
            </span>
            {dragPreview.targetHalf === "left" && (
              <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-l-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
            )}
            {dragPreview.targetHalf === "right" && (
              <div className="absolute inset-y-0 right-0 w-1 bg-amber-400 rounded-r-md shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]" />
            )}
          </div>
        );
      })()}

      {/* DragGhost — 드래그 대상 위치에 세션 내용이 담긴 반투명 미리보기 카드 */}
      {(() => {
        const ds = dragPreview?.draggedSession;
        if (!ds || dragPreview?.targetWeekday !== weekday) return null;

        const ghostLayout = laidOutSessions.find(({ session }) => session.id === ds.id);
        if (!ghostLayout) return null;

        // 과목·학생 정보 추출 (sessionsForRender의 세션 = 이미 target 시간으로 업데이트됨)
        const { session: ghostSession } = ghostLayout;
        const firstEnrollId = ds.enrollmentIds?.[0];
        const enr = firstEnrollId ? enrollments.find((e) => e.id === firstEnrollId) : null;
        const subj = enr ? subjects.find((s) => s.id === enr.subjectId) : null;
        const ghostColor = subj?.color ?? "#6B7280";
        const tone = resolveSessionTone(ghostColor);
        const studentNames = (ds.enrollmentIds ?? [])
          .flatMap((eid) => {
            const e = enrollments.find((en) => en.id === eid);
            const st = e ? students.find((s) => s.id === e.studentId) : null;
            return st ? [st.name] : [];
          })
          .slice(0, 4);

        return (
          <div
            key="drag-ghost"
            data-testid="drag-ghost"
            style={{
              position: "absolute",
              left: ghostLayout.left + 1,
              top: ghostLayout.top + 1,
              width: ghostLayout.width - 2,
              height: ghostLayout.height - 2,
              backgroundColor: tone.bg,
              borderRadius: 6,
              pointerEvents: "none",
              zIndex: 200,
              opacity: 0.82,
              boxShadow: "0 4px 16px rgba(0,0,0,0.18), 0 0 0 2px rgba(255,255,255,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              padding: "3px 6px",
              gap: 1,
              borderLeft: `3px solid ${tone.accent}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: tone.fg, lineHeight: 1.3, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {subj?.name ?? "과목 없음"}
            </div>
            <div style={{ fontSize: 10, color: tone.fg, opacity: 0.75, lineHeight: 1.2 }}>
              {ghostSession.startsAt}–{ghostSession.endsAt}
            </div>
            {studentNames.length > 0 && (
              <div style={{ fontSize: 10, color: tone.fg, opacity: 0.65, lineHeight: 1.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {studentNames.join(", ")}
              </div>
            )}
          </div>
        );
      })()}

      {/* Overflow chip 들 — cluster 별 (각 time-row 별) 독립 표시.
          - 미펼침 cluster: "+N" 클릭 → 그 cluster popover 오픈
          - 펼침 cluster:   "−" 클릭 → 그 cluster collapse (onToggleRowExpand)
          chip 위치 = cluster.startMin 기준 chipTopPx. 같은 weekday 안 여러 chip 가능. */}
      {clusterStates
        .filter((st) => st.isOverflow && st.chipTopPx !== null)
        .map((st) => (
          <button
            key={`chip-${st.cluster.key}`}
            type="button"
            className="absolute cursor-pointer border-0 rounded-[6px] session-overlay-pill backdrop-blur-sm text-white text-[10px] font-bold leading-tight whitespace-nowrap"
            onClick={(e) => {
              e.stopPropagation();
              // 사용자 요구 (2026-05-16): chip 클릭 시 같은 weekday 모든 cluster 일괄
              // toggle. column 폭이 이미 max cluster lane 수 라 다른 row 도 같이 expand /
              // collapse 가 자연 UX. onToggleAllRowsInWeekday 우선.
              // legacy fallback (test sandbox / uncontrolled): expanded → 그 cluster
              // collapse, collapsed → popover open (PR #390 이전 동작 호환).
              if (onToggleAllRowsInWeekday) {
                onToggleAllRowsInWeekday();
              } else if (st.isExpanded) {
                effectiveOnToggleRowExpand(st.cluster.key);
              } else {
                setOpenPopoverClusterKey((prev) =>
                  prev === st.cluster.key ? null : st.cluster.key,
                );
              }
            }}
            aria-label={
              st.isExpanded ? "수업 접기" : `${st.hidden.length}개 수업 더 보기`
            }
            aria-expanded={st.isExpanded}
            data-testid={
              clusterStates.length === 1
                ? `overflow-expand-btn-${weekday}`
                : `overflow-expand-btn-${weekday}-${st.cluster.key}`
            }
            style={{
              top: st.chipTopPx ?? 4,
              right: 4,
              zIndex: 115,
              padding: "3px 6px",
            }}
          >
            {st.isExpanded ? "−" : `+${st.hidden.length}`}
          </button>
        ))}

      {/* Overflow popover — openPopoverClusterKey 가 가리키는 cluster 의 hidden sessions */}
      {openPopoverClusterKey != null && (() => {
        const st = clusterStates.find((s) => s.cluster.key === openPopoverClusterKey);
        if (!st || !st.isOverflow || st.isExpanded || st.hidden.length === 0) return null;
        if (st.chipTopPx === null) return null;
        return (
          <HiddenSessionsPopover
            hiddenSessions={st.hidden}
            subjects={subjects || []}
            enrollments={enrollments}
            students={students}
            anchorTop={st.chipTopPx}
            onClose={() => setOpenPopoverClusterKey(null)}
            onExpandAll={() => {
              // popover 의 "모두 펼치기" 도 weekday 전체 일괄 (chip click 과 동일 의미).
              if (onToggleAllRowsInWeekday) {
                onToggleAllRowsInWeekday();
              } else {
                effectiveOnToggleRowExpand(st.cluster.key);
              }
              setOpenPopoverClusterKey(null);
            }}
          />
        );
      })()}
    </div>
  );
};

export default TimeTableRow;
