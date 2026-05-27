"use client";

/**
 * SchedulePage
 *
 * 파일 구성 가이드 (읽기 순서 권장):
 * 1) Imports & Constants
 * 2) Public Component Entrypoint (SchedulePage)
 * 3) Container Component (SchedulePageContent)
 *    3-1) Data hooks & perf hooks
 *    3-2) Local UI states
 *    3-3) Core callbacks (addSession / updateSession)
 *    3-4) Collision helpers (findCollidingSessions, ...)
 *    3-5) DnD handlers & UI event handlers
 *    3-6) Modal wiring (GroupSessionModal / EditSessionModal)
 *    3-7) Render
 *
 * 주의: 본 리팩토링은 비기능적(가독성) 수정으로, 로직 변경 없음
 */

import dynamic from "next/dynamic";
import type { JSX } from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScheduleFilters } from "./_hooks/useScheduleFilters";
import { usePdfDialog } from "./_hooks/usePdfDialog";
import { useTemplateState } from "./_hooks/useTemplateState";
import {
  createStudentFromInputUtil,
  createTeacherFromInputUtil,
  createSubjectFromInputUtil,
} from "./_utils/pickerCreateHelpers";
import {
  applyTemplateUtil,
  saveTemplateSlotUtil,
} from "./_utils/templateHelpers";
import { useAttendance } from "../../hooks/useAttendance";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useScheduleLayout } from "../../hooks/useScheduleLayout";
import { useScheduleView } from "../../hooks/useScheduleView";
import { useTimeRange } from "../../hooks/useTimeRange";
import { useTemplates } from "../../hooks/useTemplates";
import type { TemplateData, ScheduleTemplate } from "@/shared/types/templateTypes";
import { buildTemplateDataPure } from "./_utils/buildTemplateData";
import { buildApplyTemplatePayload } from "./_utils/buildApplyTemplate";
import { sanitizeStudentIds } from "./_utils/sanitizeStudentIds";
import { sanitizeTempEnrollments } from "./_utils/sanitizeTempEnrollments";
import { getWeekStartDate } from "../../lib/weekStart";
import { TemplateMenuV2 } from "../../components/molecules/TemplateMenuV2";
import { EmptyWeekState } from "../../components/molecules/EmptyWeekState";
import { ApplyTemplateConfirm } from "../../components/molecules/ApplyTemplateConfirm";
import { TemplatePreviewModal } from "../../components/molecules/TemplatePreviewModal";
import { Plus } from "lucide-react";
import { sessionMatchesFilters } from "../../components/molecules/SessionBlock.utils";
import { cascadeFilterOptions } from "./_utils/cascadeFilterOptions";
import { findClosestMatchingWeek } from "./_utils/findClosestMatchingWeek";
import type { ScheduleViewMode } from "../../hooks/useScheduleView";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useSubjectManagementLocal } from "../../hooks/useSubjectManagementLocal";
import {
  getNextUnusedColor,
  TEACHER_PALETTE,
  SUBJECT_PALETTE,
} from "../../lib/colors/getNextUnusedColor";
import { usePerformanceMonitoring } from "../../hooks/usePerformanceMonitoring";
// useStudentFilter — useScheduleFilters 로 통합 (PR 1)
import { useTimeValidation } from "../../hooks/useTimeValidation";
import { getActiveAcademyId, getClassPlannerData } from "../../lib/localStorageCrud";
import { createSnapshot } from "../../lib/snapshots/createSnapshot";
import { syncSubjectUpdate } from "../../lib/apiSync";
import { logger } from "../../lib/logger";
import { showActionToast, showError, showToast } from "../../lib/toast";
import type { Session, Student } from "../../lib/planner";
import { minutesToTime, timeToMinutes, weekdays } from "../../lib/planner";
import { repositionSessions as repositionSessionsUtil } from "../../lib/sessionCollisionUtils";
import type { GroupSessionData } from "../../types/scheduleTypes";
import { useAuth } from "../../contexts/AuthContext";
import { useMyRole } from "../../hooks/useMyRole";
import { renderSchedulePdf } from "@/lib/pdf/PdfRenderer";
import { preflightCheck } from "@/lib/pdf/preflightCheck";
import { TOUR_STATE_EVENT } from "@/lib/tour-steps";
import PdfExportRangeModal, { type PdfExportRange } from "@/components/molecules/PdfExportRangeModal";
// ConfirmModal — 세션 삭제 confirm 제거 (PR γ undo 토스트 일관성). 다른 곳 사용 시 재 import 필요.
import ScheduleGridSection from "./_components/ScheduleGridSection";
import ScheduleHeader from "./_components/ScheduleHeader";
// ScheduleChangeBanner 컴포넌트는 deprecated — toast로 대체 (2026-05-04).
// 컴포넌트 자체는 legacy로 유지하지만 schedule 페이지에선 mount 안 함.
import { useScheduleMeta } from "../../hooks/useScheduleMeta";
import { useOutboxFlush } from "../../hooks/useOutboxFlush";
import { useSessionSelection } from "../../hooks/useSessionSelection";
import SelectionBar from "@/components/atoms/SelectionBar";
import ChipFilterPopover from "./_components/ChipFilterPopover";
import PrimarySidebar from "./_components/PrimarySidebar";
import ScheduleFloatingToolbar from "./_components/ScheduleFloatingToolbar";
import ScheduleToolbarFilters from "./_components/ScheduleToolbarFilters";
import TimeRangeSelector from "./_components/TimeRangeSelector";
import {
  DEFAULT_GROUP_SESSION_DATA,
  ERROR_MESSAGES,
  MAX_SESSION_DURATION_MINUTES,
} from "./_constants/scheduleConstants";
import { useEditModalState } from "./_hooks/useEditModalState";
// useTeacherFilter — useScheduleFilters 로 통합 (PR 1)
import { useUiState } from "./_hooks/useUiState";
import { findCollidingSessionsImpl } from "./_utils/collisionQueries";
import {
  planBulkSessionCopy,
  planSingleSessionCopy,
} from "./_utils/sessionCopyHelpers";
import { planBulkSessionDrop } from "./_utils/sessionDropHelpers";
import { planPdfExport } from "./_utils/pdfExportHelpers";
import { planFilterToggleAttempt } from "./_utils/filterToggleHelpers";
import {
  planSessionAdd,
  buildRepositionedSessionsAfterAdd,
} from "./_utils/sessionAddHelpers";
import { planSessionUpdate } from "./_utils/updateSessionHelpers";
import { planSessionPositionUpdate } from "./_utils/updateSessionPositionHelpers";
import { planSessionInsertBeforeLane } from "./_utils/insertSessionHelpers";
import { computeFilterCascadeAutoDeselect } from "./_utils/filterCascadeAutoDeselect";
import { planGroupSessionAdd } from "./_utils/groupSessionAddHelpers";
import { planAddStudentFromInput } from "./_utils/studentInputHelpers";
import {
  computeFilteredAndAllSessions,
  computeFilterChipLabel,
} from "./_utils/pdfDialogHelpers";
import {
  computeScheduleTitle,
  computeScheduleDateLabels,
} from "./_utils/scheduleDateLabelHelpers";
import {
  buildHandleDrop,
  buildHandleSessionClick,
  buildHandleSessionDrop,
  buildOpenGroupModalHandler,
  onDragEndStudent,
  onDragStartStudent,
} from "./_utils/dndHelpers";
import {
  syncSessionUpdateAsync,
  syncSessionUpdate,
  syncSessionCreate,
  syncEnrollmentCreate,
} from "../../lib/apiSync";
import {
  buildEditOnCancel,
  buildEditOnDelete,
  buildEditOnSave,
} from "./_utils/editSaveHandlers";
import {
  buildEditStudentAdd,
  buildEditStudentAddClick,
  buildEditStudentInputChange,
} from "./_utils/editStudentHandlers";
import {
  buildEditTimeChangeHandlers,
  buildGroupTimeChangeHandlers,
} from "./_utils/modalHandlers";
import {
  buildSelectedStudents,
  filterEditableStudents,
  removeStudentFromEnrollmentIds,
} from "./_utils/scheduleSelectors";
import {
  buildSessionSaveData,
  ensureEnrollmentIdsForSubject,
  extractStudentIds,
  processTempEnrollments,
} from "./_utils/sessionSaveUtils";

const EditSessionModal = dynamic(
  () => import("./_components/EditSessionModal"),
  { ssr: false, loading: () => null }
);
const GroupSessionModal = dynamic(
  () => import("./_components/GroupSessionModal"),
  { ssr: false, loading: () => null }
);
const ScheduleActionBar = dynamic(
  () => import("./_components/ScheduleActionBar"),
  { ssr: false }
);
const SlotPickerModal = dynamic(
  () => import("../../components/molecules/SlotPickerModal").then((m) => ({ default: m.SlotPickerModal })),
  { ssr: false, loading: () => null }
);
const ScheduleDailyView = dynamic(
  () => import("../../components/organisms/ScheduleDailyView").then(m => ({ default: m.ScheduleDailyView })),
  { ssr: false, loading: () => null }
);
const AttendanceSheet = dynamic(
  () => import("../../components/molecules/AttendanceSheet"),
  { ssr: false, loading: () => null }
);
const ScheduleMonthlyView = dynamic(
  () => import("../../components/organisms/ScheduleMonthlyView"),
  { ssr: false, loading: () => null }
);

/**
 * "YYYY-MM-DD" KST 월요일 → "M월 D일 — M월 D일" 표시 (banner용).
 */
function formatBannerWeekRange(mondayIso: string): string {
  const monday = new Date(`${mondayIso}T12:00:00+09:00`);
  if (isNaN(monday.getTime())) return mondayIso;
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${fmt(monday)} — ${fmt(sunday)}`;
}

/**
 * 페이지 엔트리 컴포넌트
 * 인증 가드로 감싼 스케줄 페이지 컨테이너를 노출합니다.
 *
 * Suspense 경계: SchedulePageContent 내부의 useSearchParams가 Next.js 15
 * Static Generation 빌드에서 CSR-bailout 경계를 요구하므로 여기서 감싼다.
 */
export default function SchedulePage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <SchedulePageContent />
    </Suspense>
  );
}

/**
 * 스케줄 페이지 컨테이너
 * 데이터 훅 바인딩, 콜백 정의, 모달/그리드/패널을 연결합니다.
 */
function SchedulePageContent(): JSX.Element {
  // 🚀 통합 데이터 훅 사용 (JSONB 기반 효율적 데이터 관리)
  const {
    data: { students, subjects, sessions, enrollments, teachers },
    loading: dataLoading,
    error,
    updateData,
    addEnrollment,
    deleteSession: deleteSessionFromHook,
    bulkDeleteSessions,
  } = useIntegratedDataLocal();

  // Color-by 토글
  // colorBy / setColorBy — useScheduleFilters 로 이동 (PR 1)

  // 뷰 모드 (일별/주간/월별) 및 날짜 선택
  const {
    viewMode,
    setViewMode,
    selectedDate,
    selectedWeekday,
    goToNextDay,
    goToPrevDay,
    goToNextWeek,
    goToPrevWeek,
    goToToday,
    setSelectedDate,
    goToNextMonth,
    goToPrevMonth,
  } = useScheduleView();

  // 현재 주 시작일 (KST 기준 월요일) — addSession stub 정상화 + 그리드 필터에 모두 사용
  const currentWeekStart = useMemo(() => getWeekStartDate(selectedDate), [selectedDate]);

  // 성능 모니터링
  const { startApiCall, endApiCall, startInteraction, endInteraction } =
    usePerformanceMonitoring();

  // 사용자 ID — AuthContext에서 단일 source.
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  // Role-based UI gate — member role gets read-only schedule
  const { canManage, adminCount, role, linkedTeacherId } = useMyRole();

  // member 는 /teacher-schedule 로 redirect (학원 전체 view 권한 X).
  // router 선언이 본 useEffect 보다 뒤라 window.location 사용 (single redirect, lifecycle 무관).
  useEffect(() => {
    if (role === "member" && typeof window !== "undefined") {
      window.location.replace("/teacher-schedule");
    }
  }, [role]);

  // 활성 academy id — useScheduleMeta 가 academy 별 lastViewed 키 분리에 사용.
  // localStorage 만 source — Sidebar 의 학원 selector 가 academy 전환 시 reload
  // 하므로 mount 시 1회 읽음. SSR safe (getActiveAcademyId 가 window undefined 처리).
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    setActiveAcademyId(getActiveAcademyId(userId));
  }, [userId]);

  // 다른 admin의 변경 인지 — academies.schedule_updated_at 30초 polling
  const {
    scheduleUpdatedAt,
    hasChanges: hasScheduleChanges,
    acknowledgeChanges: ackScheduleChanges,
  } = useScheduleMeta(userId, activeAcademyId);

  // hasScheduleChanges false → true 전이 시 토스트 발화 (이전 banner 대체).
  // useScheduleMeta가 본인 변경(같은 탭 윈도우 + 다른 탭 localStorage 공유 + 24h
  // stale auto-ack)은 자동 suppress하므로 여긴 진짜 다른 admin 변경만 도달.
  //
  // 추가 가드 (사용자 보고 회귀): adminCount=1인 학원에선 토스트 자체 발화 안 함.
  // wording도 \"다른 관리자\"가 아닌 중립적 \"새로 갱신\" — 단일 admin 환경에서
  // 잘못 발화될 때도 \"해킹당한 줄 알았다\"는 공포 회피.
  const lastAlertedAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasScheduleChanges || !scheduleUpdatedAt) return;
    if (lastAlertedAtRef.current === scheduleUpdatedAt) return;
    // 단일 admin 학원 → 토스트 자체 발화 안 함 (논리적으로 다른 사람 변경 불가능).
    // adminCount=0은 useMyRole이 아직 fetch 중인 race 상태로, 이때도 발화 막음
    // (UAT 2026-05-09 회귀 가드 — fullDataMigration 직후 race로 토스트 잘못 발화).
    if (adminCount <= 1) return;
    lastAlertedAtRef.current = scheduleUpdatedAt;
    showActionToast({
      message: "시간표가 새로 갱신되었어요. 새로고침할까요?",
      actionLabel: "새로고침",
      variant: "info",
      onAction: () => {
        ackScheduleChanges();
        if (typeof window !== "undefined") window.location.reload();
      },
      durationMs: 10000,
    });
  }, [hasScheduleChanges, scheduleUpdatedAt, ackScheduleChanges, adminCount]);

  // 이전 세션에서 retry 10회 후 포기된 sync 작업 자동 재시도
  useOutboxFlush(userId);

  // 다중 선택 (Shift/Ctrl/Meta+click) — Esc로 해제, 50개 상한
  const sessionSelection = useSessionSelection({
    max: 50,
    onLimitExceeded: (max) =>
      showToast("warning", `최대 ${max}개까지 선택 가능합니다.`),
  });

  const handleBulkDelete = useCallback(async () => {
    const ids = sessionSelection.selectedSessionIds;
    if (ids.length === 0) return;
    sessionSelection.clear();
    await bulkDeleteSessions(ids);
  }, [sessionSelection, bulkDeleteSessions]);

  // 모바일 long-press 메뉴 — Ctrl/Cmd 키 없는 환경에서 대안 진입점
  const handleContextMenuStartSelect = useCallback(
    (sessionId: string) => {
      sessionSelection.toggle(sessionId);
      showToast(
        "info",
        "선택 모드 — 다른 세션을 탭하여 더 추가하거나 Esc로 종료",
      );
    },
    [sessionSelection],
  );

  // 미들웨어가 admin-only 라우트 접근을 차단하면서 보낸 toast 파라미터를 표시하고
  // URL을 정리한다. 새로고침 시 토스트가 반복 표시되지 않도록 한 번만 처리.
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("toast") === "permission_denied") {
      showToast("error", "해당 페이지는 원장과 관리자만 접근 가능합니다.");
      router.replace("/schedule", { scroll: false });
    }
  }, [searchParams, router]);

  // ================================
  // 🧩 로컬 타입 (가독성 향상용)
  // ================================
  type SessionCreateInput = {
    subjectId: string;
    studentIds: string[];
    teacherId?: string;
    weekday: number;
    startTime: string;
    endTime: string;
    yPosition?: number;
    room?: string;
    /** YYYY-MM-DD KST 월요일. 지정 시 현재 시간표 주(currentWeekStart) override —
     *  GroupSessionModal 캘린더에서 다른 주 날짜로 등록 시 사용. 미지정이면 selectedDate 기반 fallback. */
    weekStartDate?: string;
  };

  type SessionUpdateInput = {
    startTime?: string;
    endTime?: string;
    weekday?: number;
    /** YYYY-MM-DD. 다른 주로 세션 이동 시 forward. 미지정이면 기존 weekStartDate 유지. */
    weekStartDate?: string;
    room?: string;
    yPosition?: number;
    subjectId?: string;
    studentIds?: string[];
    enrollmentIds?: string[];
    teacherId?: string | null;
  };

  // schedule-page-split-refactor PR 1 — useScheduleFilters 로 통합.
  // 기존 useStudentFilter + useTeacherFilter + useColorBy + selectedSubjectIds(page state) + autoColorBy(derived) 가 분산.
  const {
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
    colorBy,
    autoColorBy,
    toggleStudent: toggleStudentFilter,
    toggleSubject: toggleSubjectFilter,
    toggleTeacher: toggleTeacherFilter,
    setSelectedSubjectIds,
    clearStudentFilter,
    clearTeacherFilter,
    setColorBy,
  } = useScheduleFilters(userId);

  // ================================
  // 🧩 핵심 콜백: 세션 추가
  // ================================
  /**
   * 세션을 추가하고, 생성된 enrollment와 함께 업데이트합니다.
   * 이후 충돌 재배치를 비동기 사이클에 수행합니다.
   */
  const addSession = useCallback(
    async (sessionData: SessionCreateInput) => {
      logger.debug("세션 추가 시작", { sessionData });
      startInteraction("add_session");

      const plan = planSessionAdd({
        input: sessionData,
        sessions,
        enrollments,
        fallbackWeekStartDate: getWeekStartDate(selectedDate),
      });
      logger.debug("새로운 세션 생성", { newSession: plan.newSession });

      const updateDataPayload: any = { sessions: plan.mergedSessions };
      if (plan.newEnrollments.length > 0) {
        updateDataPayload.enrollments = plan.mergedEnrollments;
      }
      startApiCall("update_data");
      await updateData(updateDataPayload);
      endApiCall("update_data", true);

      // ⚠️ Bug fix (2026-05-04): updateData 는 localStorage 만 갱신. server 동기화는
      // syncSessionCreate + syncEnrollmentCreate 명시 호출 (client UUID 포함).
      const uidForSync = localStorage.getItem("supabase_user_id");
      for (const enr of plan.newEnrollments) {
        syncEnrollmentCreate(uidForSync, enr);
      }
      syncSessionCreate(uidForSync, plan.newSession);

      logger.info("세션 추가 완료");
      endInteraction("add_session");

      // 🆕 충돌 해결 — 다음 렌더링 사이클에서 reposition 후 다시 updateData.
      setTimeout(async () => {
        try {
          const { repositionedSessions, mergedEnrollments } =
            buildRepositionedSessionsAfterAdd({
              newSession: plan.newSession,
              sessions,
              enrollments,
              newEnrollments: plan.newEnrollments,
              subjects,
              weekday: sessionData.weekday,
              startTime: sessionData.startTime,
              endTime: sessionData.endTime,
              yPosition: sessionData.yPosition || 1,
            });
          const updatePayload: any = { sessions: repositionedSessions };
          if (plan.newEnrollments.length > 0) {
            updatePayload.enrollments = mergedEnrollments;
          }
          await updateData(updatePayload);
          logger.info("충돌 해결 업데이트 완료");
        } catch (error) {
          logger.error("충돌 해결 실패", undefined, error as Error);
        }
      }, 0);
    },
    [sessions, enrollments, subjects, updateData, selectedDate]
  );

  // ================================
  // 🧩 핵심 콜백: 세션 업데이트
  // ================================
  /**
   * 지정된 세션의 시간/속성을 갱신하고, 동일 요일 내에서 충돌 재배치를 수행합니다.
   */
  const updateSession = useCallback(
    async (sessionId: string, sessionData: SessionUpdateInput) => {
      logger.debug("세션 업데이트 시작", { sessionId, sessionData });
      const plan = planSessionUpdate({
        sessionId,
        input: sessionData,
        sessions,
        enrollments,
        subjects,
      });
      await updateData({ sessions: plan.mergedSessions });
      logger.info("세션 업데이트 및 재배치 완료");

      if (userId && plan.changedSession) {
        const changed = plan.changedSession;
        void syncSessionUpdate(userId, sessionId, {
          weekday: changed.weekday,
          startsAt: changed.startsAt,
          endsAt: changed.endsAt,
          yPosition: changed.yPosition,
          room: changed.room,
          subjectId: changed.subjectId,
          enrollmentIds: changed.enrollmentIds,
          ...(plan.hasTeacherId && { teacherId: sessionData.teacherId }),
          // weekStartDate: 다른 주 이동 시 forward (PATCH /api/sessions/[id]).
          ...(plan.hasWeekStartDate && {
            weekStartDate: sessionData.weekStartDate,
          }),
        });
      }
    },
    [sessions, updateData, enrollments, subjects, userId]
  );

  // ================================
  // 🎯 드래그 앤 드롭 / 충돌 처리 섹션
  // ================================

  // 🆕 시간 충돌 감지: 유틸로 추출 (useCallback 불필요)

  // 🆕 특정 요일과 시간대에서 충돌하는 세션들 찾기
  const findCollidingSessions = useCallback(
    (
      weekday: number,
      startTime: string,
      endTime: string,
      excludeSessionId?: string
    ): Session[] =>
      findCollidingSessionsImpl(
        sessions,
        weekday,
        startTime,
        endTime,
        excludeSessionId
      ),
    [sessions]
  );

  // ================================
  // 🎯 세션 위치 업데이트 섹션
  // ================================

  const updateSessionPosition = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string,
      yPosition: number
    ) => {
      const plan = planSessionPositionUpdate({
        sessionId,
        weekday,
        time,
        yPosition,
        sessions,
        enrollments,
        subjects,
      });
      if (!plan.ok) {
        logger.error("세션을 찾을 수 없습니다", { sessionId: plan.sessionId });
        return;
      }

      await updateData({ sessions: plan.mergedSessions });
      logger.info("updateData 완료 (localStorage)");

      // 변경된 sessions 서버 await 동기화 — isSyncingSession 로 UI "저장 중" 표시.
      const uid = localStorage.getItem("supabase_user_id");
      if (uid && plan.changedSessions.length > 0) {
        setIsSyncingSession(true);
        try {
          const results = await Promise.all(
            plan.changedSessions.map((s) =>
              syncSessionUpdateAsync(uid, s.id, {
                weekday: s.weekday,
                startsAt: s.startsAt,
                endsAt: s.endsAt,
                yPosition: s.yPosition,
              }),
            ),
          );
          if (!results.every(Boolean)) {
            logger.warn(
              "일부 세션 서버 동기화 실패 — 다음 새로고침 시 서버에서 복원될 수 있음",
            );
          } else {
            logger.info("세션 서버 동기화 완료");
          }
        } finally {
          setIsSyncingSession(false);
        }
      }
    },
    [sessions, updateData, enrollments, subjects]
  );

  // Variant E (Edge Hover Slot) — lane 사이 LaneInsertSlot 에 drop 시 호출.
  // 명시적 lane 삽입 (같은 시간 lane ≥ insertBeforeYPos 모두 +1 shift +
  // movingSession 그 자리 차지). updateSessionPosition 의 collision-based 와 달리
  // 사용자가 "이 위치에 끼우기" 명시한 case 전용.
  const insertSessionBeforeLane = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string,
      insertBeforeYPos: number,
    ) => {
      const plan = planSessionInsertBeforeLane({
        sessionId,
        weekday,
        time,
        insertBeforeYPos,
        sessions,
      });
      if (!plan.ok) {
        logger.error("세션을 찾을 수 없습니다 (insertBefore)", {
          sessionId: plan.sessionId,
        });
        return;
      }

      await updateData({ sessions: plan.mergedSessions });

      // 서버 동기화 — moving session + shift 된 lane 들.
      const uid = localStorage.getItem("supabase_user_id");
      if (uid && plan.changedSessions.length > 0) {
        setIsSyncingSession(true);
        try {
          await Promise.all(
            plan.changedSessions.map((s) =>
              syncSessionUpdateAsync(uid, s.id, {
                weekday: s.weekday,
                startsAt: s.startsAt,
                endsAt: s.endsAt,
                yPosition: s.yPosition,
              }),
            ),
          );
          logger.info("세션 lane 삽입 서버 동기화 완료");
        } finally {
          setIsSyncingSession(false);
        }
      }

      setGridVersion((v) => v + 1);
    },
    [sessions, updateData],
  );

  const handleSessionInsertBefore = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string,
      insertBeforeYPos: number,
    ) => {
      if (!canManage) return;
      await insertSessionBeforeLane(sessionId, weekday, time, insertBeforeYPos);
    },
    [canManage, insertSessionBeforeLane],
  );

  const deleteSession = useCallback(
    // useIntegratedDataLocal.deleteSession에 위임 — 5초 undo 토스트 자동 적용
    // (이전엔 자체 updateData로 wipe만 해서 undo 미동작 — 학생/과목/강사와 불일치)
    async (sessionId: string) => {
      await deleteSessionFromHook(sessionId);
    },
    [deleteSessionFromHook]
  );

  const handleSessionDelete = useCallback(
    (session: Session) => {
      // 학생/과목/강사 삭제와 일관성: 즉시 삭제 + 5초 undo 토스트가 안전망.
      // (이전엔 ConfirmModal "정말 삭제?" alert. 이제 모든 entity 동일 흐름.)
      void deleteSession(session.id);
    },
    [deleteSession],
  );

  // 로그인 상태 감지 — AuthContext의 user/session으로 자동 반영.
  useEffect(() => {
    if (!authUser) {
      logger.debug("로그아웃 상태 감지 - 컴포넌트 정리");
      return;
    }
    logger.debug("로그인 상태 확인됨", { email: authUser.email });
  }, [authUser]);

  // 현재 주 세션만 — 주간/일별 그리드 표시 + EmptyWeekState 조건에 사용
  const weekFilteredSessions = useMemo(
    () => sessions.filter((s) => s.weekStartDate === currentWeekStart),
    [sessions, currentWeekStart]
  );

  // 주간·일별 뷰용: 현재 주 세션만 weekday Map으로 변환.
  // 강사 필터는 더 이상 hide 패턴이 아니라 dim 패턴(SessionBlock + TimeTableRow의
  // sessionMatchesFilters 4-param)으로 통일됐으므로 여기서 사전 필터하지 않는다.
  const { sessions: displaySessions } = useDisplaySessions(
    weekFilteredSessions,
    enrollments,
    ""
  );

  // P3 옵션 — ?layout=p3 또는 localStorage로 활성. default 모드는 영향 없음.
  const { isP3 } = useScheduleLayout();
  // 시간 범위 — query > storage > default(9-23). 전체 sessions 기준으로 auto 계산.
  const timeRange = useTimeRange({ sessions, userId });
  // P3 사이드바 토글
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // selectedSubjectIds / toggleSubjectFilter / autoColorBy 는 useScheduleFilters 로 이동 (PR 1).

  // ADR-020 보강 (UAT 2026-05-21): 필터 옵션 cascading.
  // 활성/비활성 type 모두 narrowing — 현재 selected 의 AND 매칭 session 에 나타나는 entity 만 표시.
  // selected 자기 자신은 자기 type 에 항상 등장 (chip 해제 가능).
  // 로직 본체는 `_utils/cascadeFilterOptions.ts` — 단위 테스트 가능한 형태.
  const cascadedFilterOptions = useMemo(
    () =>
      cascadeFilterOptions({
        students,
        subjects,
        teachers,
        sessions,
        enrollments,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
      }),
    [
      students,
      subjects,
      teachers,
      sessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    ],
  );

  // ADR-020 보강 (UAT 2026-05-21): cross-week filter empty.
  // 현재 주에 매칭 0 + 다른 주에 매칭 1+ 이면 inline banner 표시 (Variant C). weekly view 한정.
  // 로직 본체는 `_utils/findClosestMatchingWeek.ts` — 단위 테스트 가능한 형태.
  const closestMatchingWeek = useMemo(() => {
    if (viewMode !== "weekly") return null;
    return findClosestMatchingWeek({
      sessions,
      enrollments,
      currentWeekStart,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    });
  }, [
    viewMode,
    sessions,
    enrollments,
    currentWeekStart,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
  ]);

  // Auto-deselect: selected 가 cascading 매칭 set 에 없어졌으면 silent 해제.
  // computeFilterCascadeAutoDeselect 가 다음 selected + removed 결정. page 는 setter 호출.
  useEffect(() => {
    const plan = computeFilterCascadeAutoDeselect({
      sessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    });
    if (!plan.shouldCleanup) return;
    plan.removedStudentIds.forEach((id) => toggleStudentFilter(id));
    if (plan.subjectsChanged) {
      setSelectedSubjectIds(plan.nextSubjectIds);
    }
    plan.removedTeacherIds.forEach((id) => toggleTeacherFilter(id));
  }, [
    sessions,
    enrollments,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
    toggleStudentFilter,
    toggleTeacherFilter,
    setSelectedSubjectIds,
  ]);

  // chip 추가 검증 — 새 chip 으로 인해 매칭 0 되면 추가 거부 + 토스트 (Edge 1, option b).
  // 기존 selected 해제는 거부 없이 항상 허용. planFilterToggleAttempt 가 outcome 결정.
  const tryToggleStudent = useCallback(
    (id: string) => {
      const outcome = planFilterToggleAttempt({
        id,
        kind: "student",
        sessions,
        enrollments,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
        entityName: students.find((s) => s.id === id)?.name ?? "이 학생",
      });
      if (outcome.action === "rejected") {
        showToast(
          "info",
          `${outcome.entityName}은(는) 현재 필터와 매칭되는 수업이 없어요.`,
        );
        return;
      }
      toggleStudentFilter(id);
    },
    [
      students,
      sessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
      toggleStudentFilter,
    ],
  );

  const tryToggleSubject = useCallback(
    (id: string) => {
      const outcome = planFilterToggleAttempt({
        id,
        kind: "subject",
        sessions,
        enrollments,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
        entityName: subjects.find((s) => s.id === id)?.name ?? "이 과목",
      });
      if (outcome.action === "rejected") {
        showToast(
          "info",
          `${outcome.entityName}은(는) 현재 필터와 매칭되는 수업이 없어요.`,
        );
        return;
      }
      toggleSubjectFilter(id);
    },
    [
      subjects,
      sessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
      toggleSubjectFilter,
    ],
  );

  const tryToggleTeacher = useCallback(
    (id: string) => {
      const outcome = planFilterToggleAttempt({
        id,
        kind: "teacher",
        sessions,
        enrollments,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
        entityName: teachers.find((t) => t.id === id)?.name ?? "이 강사",
      });
      if (outcome.action === "rejected") {
        showToast(
          "info",
          `${outcome.entityName}은(는) 현재 필터와 매칭되는 수업이 없어요.`,
        );
        return;
      }
      toggleTeacherFilter(id);
    },
    [
      teachers,
      sessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
      toggleTeacherFilter,
    ],
  );

  useEffect(() => {
    if (!isP3) return;
    // 활성 필터 있을 때만 colorBy 자동 결정 — 모두 빈 상태면 사용자 이전 preference 유지
    const anyActive =
      selectedStudentIds.length > 0 ||
      selectedTeacherIds.length > 0 ||
      selectedSubjectIds.length > 0;
    if (anyActive && colorBy !== autoColorBy) {
      setColorBy(autoColorBy);
    }
  }, [
    isP3,
    autoColorBy,
    colorBy,
    setColorBy,
    selectedStudentIds.length,
    selectedTeacherIds.length,
    selectedSubjectIds.length,
  ]);

  // Option C — Hide-on-Scroll: 시간표 스크롤 시 헤더 압축
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const initial = (window as Window & { __tourActive?: boolean }).__tourActive;
      if (initial === true) setTourActive(true);
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ isActive: boolean }>).detail;
      setTourActive(detail?.isActive ?? false);
    };
    window.addEventListener(TOUR_STATE_EVENT, handler);
    return () => window.removeEventListener(TOUR_STATE_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!isP3 || tourActive) {
      setHeaderScrolled(false);
      if (tourActive && mainScrollRef.current) {
        mainScrollRef.current.scrollTop = 0;
      }
      return;
    }
    const el = mainScrollRef.current;
    if (!el) return;
    const onScroll = () => setHeaderScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isP3, tourActive]);

  const {
    validateTimeRange,
    validateDurationWithinLimit,
    getNextHour,
    validateAndToastGroup,
    validateAndToastEdit,
  } = useTimeValidation();

  // 🆕 그룹 수업 모달 상태
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalData, setGroupModalData] = useState<GroupSessionData>({
    ...DEFAULT_GROUP_SESSION_DATA,
    yPosition: 1, // 🆕 기본값 1
  });
  const [groupTimeError, setGroupTimeError] = useState<string>(""); // 시간 입력 에러 메시지

  // students id 교체 (temp → reconciled) 시 modal selected studentIds 의 stale id 자동 제거.
  // 상세 reason 은 sanitizeStudentIds 헤더 — omni-radar 2026-05-13 사고.
  useEffect(() => {
    setGroupModalData((prev) => {
      const next = sanitizeStudentIds(prev.studentIds, students);
      if (next === prev.studentIds) return prev;
      return { ...prev, studentIds: next };
    });
  }, [students]);

  // 세션 삭제 확인 모달 상태
  // (deleteConfirmSessionId state 제거됨 — 세션 삭제는 즉시 + undo 토스트로 처리)
  // 세션 서버 동기화 중 여부 (드래그 완료 후 PUT 완료 전)
  const [isSyncingSession, setIsSyncingSession] = useState(false);

  // 학생 생성 훅 (모달에서 신규 학생 추가 시 사용)
  const { addStudent: createStudent } = useStudentManagementLocal();

  // 강사·과목 인라인 추가 훅 (수업 추가 모달에서 즉시 등록)
  const { addTeacher: createTeacher } = useTeacherManagementLocal();
  const { addSubject: createSubject } = useSubjectManagementLocal();

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState("");
  const [studentCreating, setStudentCreating] = useState(false);
  const [studentCreateError, setStudentCreateError] = useState<string>("");

  // 강사·과목 인라인 입력 상태 (학생 패턴 미러링)
  const [teacherInputValue, setTeacherInputValue] = useState("");
  const [teacherCreating, setTeacherCreating] = useState(false);
  const [teacherCreateError, setTeacherCreateError] = useState<string>("");
  const [subjectInputValue, setSubjectInputValue] = useState("");
  const [subjectCreating, setSubjectCreating] = useState(false);
  const [subjectCreateError, setSubjectCreateError] = useState<string>("");

  // 🆕 모달용 학생 검색 결과 — 입력이 비어 있으면 전체 학생 목록을 보여 주는
  // 리스트 우선(list-first) UX. 빈 문자열일 때 빈 배열을 반환하던 기존 동작은
  // "모달 열고 입력하기 전엔 학생이 안 보인다"는 부정적 인상을 만들어 수정.
  const filteredStudentsForModal = useMemo(() => {
    const input = studentInputValue.trim();
    if (!input) return students;
    return students.filter((student) =>
      student.name.toLowerCase().includes(input.toLowerCase())
    );
  }, [students, studentInputValue]);

  // 🆕 편집 모달 상태 훅 사용
  const {
    showEditModal,
    setShowEditModal,
    editModalData,
    setEditModalData,
    tempSubjectId,
    setTempSubjectId,
    tempEnrollments,
    setTempEnrollments,
    editStudentInputValue,
    setEditStudentInputValue,
    editModalTimeData,
    setEditModalTimeData,
    editTimeError,
    setEditTimeError,
  } = useEditModalState();

  // 강사 선택 상태 (편집 모달용; undefined = 변경 없음, null = 제거, "uuid" = 할당)
  const [tempTeacherId, setTempTeacherId] = useState<string | null | undefined>(undefined);

  // EditSessionModal 의 tempEnrollments 도 GroupSessionModal 의 studentIds 와 동일한
  // local-first reconciliation 함정 (omni-radar 2026-05-13). students 변경 시 stale
  // studentId 를 가진 tempEnrollment 를 제거하고 editModalData.enrollmentIds 에서도
  // 동기 정리. 상세 reason 은 sanitizeTempEnrollments 헤더.
  useEffect(() => {
    const { kept, removedIds } = sanitizeTempEnrollments(tempEnrollments, students);
    if (removedIds.size === 0) return;
    setTempEnrollments(kept);
    setEditModalData((prev) =>
      prev
        ? {
            ...prev,
            enrollmentIds: (prev.enrollmentIds ?? []).filter(
              (id) => !removedIds.has(id),
            ),
          }
        : prev,
    );
  }, [students, tempEnrollments, setTempEnrollments, setEditModalData]);

  // 🆕 수업 편집 모달 시간 변경 핸들러 (헬퍼 적용)
  const { handleEditStartTimeChange, handleEditEndTimeChange } = useMemo(
    () =>
      buildEditTimeChangeHandlers({
        validateTimeRange,
        validateDurationWithinLimit,
        maxMinutes: MAX_SESSION_DURATION_MINUTES,
        setEditModalTimeData,
        setEditTimeError,
        endBeforeStartMsg: ERROR_MESSAGES.END_TIME_BEFORE_START,
        tooLongMsg: ERROR_MESSAGES.SESSION_TOO_LONG,
      }),
    [
      validateTimeRange,
      validateDurationWithinLimit,
      MAX_SESSION_DURATION_MINUTES,
      setEditModalTimeData,
      setEditTimeError,
    ]
  );

  // 🆕 학생 입력값 상태 디버깅 및 최적화
  useEffect(() => {
    logger.debug("editStudentInputValue 상태 변경", { editStudentInputValue });
    logger.debug("버튼 활성화 조건", {
      isEnabled: !!editStudentInputValue.trim(),
    });
  }, [editStudentInputValue]);

  // (훅으로 대체됨)

  // ================================
  // 🎯 모달 제어 / 학생 관리 섹션
  // ================================

  // 🆕 학생 입력값 변경 핸들러 최적화
  const handleEditStudentInputChange = useMemo(
    () => buildEditStudentInputChange(setEditStudentInputValue),
    [setEditStudentInputValue]
  );

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAdd = useMemo(
    () =>
      buildEditStudentAdd({
        students,
        enrollments,
        editModalData,
        getEditStudentInputValue: () => editStudentInputValue,
        setEditStudentInputValue,
        setTempEnrollments,
        setEditModalData,
      }),
    [
      students,
      enrollments,
      editModalData,
      editStudentInputValue,
      setEditStudentInputValue,
    ]
  );

  // 🆕 학생 추가 핸들러 최적화 (Enter 등 — 기존 학생 매칭만)
  const handleEditStudentAddClick = useMemo(
    () => buildEditStudentAddClick(handleEditStudentAdd),
    [handleEditStudentAdd]
  );

  // EditSessionModal "+ 새 학생으로 추가" CTA — GroupSessionModal과 동일하게
  // createStudent → 신규 학생 도메인 생성 → 그 ID로 enroll. 매칭 실패 토스트는
  // 핸들러 분리(이건 CTA 전용)이므로 Enter 흐름에는 영향 없음.
  const handleEditCreateStudentAndAdd = async () => {
    const trimmed = editStudentInputValue.trim();
    if (!trimmed) return;
    try {
      const success = await createStudent(trimmed);
      if (success) {
        const data = getClassPlannerData();
        const newStudent = data.students.find(
          (s) => s.name.trim() === trimmed,
        );
        if (newStudent) handleEditStudentAdd(newStudent.id);
      } else {
        showToast(
          "info",
          "이미 존재하는 이름입니다. 위 검색 결과에서 선택해주세요.",
        );
      }
    } catch {
      showToast("error", "학생 생성에 실패했습니다.");
    }
  };

  // 🆕 학생 추가 함수 (최대 14명 제한)
  const addStudent = (studentId: string) => {
    if (!groupModalData.studentIds.includes(studentId)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        showToast("warning", "최대 14명까지 추가할 수 있습니다.");
        return;
      }

      setGroupModalData((prev) => ({
        ...prev,
        studentIds: [...prev.studentIds, studentId],
      }));
    }
    setStudentInputValue("");
    setStudentCreateError("");
  };

  // 신규 학생 생성 — pickerCreateHelpers util 호출 + setter orchestration (PR 4 utils 패턴).
  const handleCreateStudentFromInput = async () => {
    setStudentCreating(true);
    setStudentCreateError("");
    const result = await createStudentFromInputUtil({
      input: studentInputValue,
      createStudent,
    });
    setStudentCreating(false);
    if (!result.ok) {
      if (result.reason === "duplicate") setStudentCreateError("이미 존재하는 이름입니다.");
      else if (result.reason === "error") setStudentCreateError("학생 생성에 실패했습니다.");
      return;
    }
    addStudent(result.studentId);
  };

  // 강사 인라인 추가 — 성공 시 true (모달 row 자동 닫힘 트리거).
  const handleCreateTeacherFromInput = async (): Promise<boolean> => {
    setTeacherCreating(true);
    setTeacherCreateError("");
    const result = await createTeacherFromInputUtil({
      input: teacherInputValue,
      canManage,
      teachers,
      createTeacher,
    });
    setTeacherCreating(false);
    if (!result.ok) {
      if (result.reason === "no-permission" || result.reason === "empty") return false;
      if (result.reason === "duplicate") setTeacherCreateError("이미 같은 이름의 강사가 존재합니다.");
      else setTeacherCreateError("강사 생성에 실패했습니다.");
      return false;
    }
    setGroupModalData((prev) => ({ ...prev, teacherId: result.teacherId }));
    setTeacherInputValue("");
    return true;
  };

  // 과목 인라인 추가 — 성공 시 true.
  const handleCreateSubjectFromInput = async (): Promise<boolean> => {
    setSubjectCreating(true);
    setSubjectCreateError("");
    const result = await createSubjectFromInputUtil({
      input: subjectInputValue,
      canManage,
      subjects,
      createSubject,
    });
    setSubjectCreating(false);
    if (!result.ok) {
      if (result.reason === "no-permission" || result.reason === "empty") return false;
      if (result.reason === "duplicate") setSubjectCreateError("이미 같은 이름의 과목이 존재합니다.");
      else setSubjectCreateError("과목 생성에 실패했습니다.");
      return false;
    }
    setGroupModalData((prev) => ({ ...prev, subjectId: result.subjectId }));
    setSubjectInputValue("");
    return true;
  };

  // 🆕 학생 제거 함수
  const removeStudent = (studentId: string) => {
    setGroupModalData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.filter((id) => id !== studentId),
    }));
  };

  // 🆕 입력창에서 학생 추가 함수
  const addStudentFromInput = () => {
    const outcome = planAddStudentFromInput({
      input: studentInputValue,
      students,
      selectedStudentIds: groupModalData.studentIds,
      maxStudents: 14,
    });
    switch (outcome.action) {
      case "noop":
        return;
      case "add":
        addStudent(outcome.studentId);
        return;
      case "already-added":
        showToast(
          "info",
          outcome.otherDuplicatesCount > 0
            ? `'${outcome.studentName}' 학생이 이미 추가되어 있습니다. 동명이인이 ${outcome.otherDuplicatesCount}명 더 있어요 — 아래 목록에서 직접 선택해주세요.`
            : `'${outcome.studentName}' 학생이 이미 추가되어 있습니다.`,
        );
        return;
      case "max-reached":
        showToast("warning", "최대 14명까지 추가할 수 있습니다.");
        return;
      case "not-found":
        // 신규 생성은 dropdown CTA 버튼만 담당 (Enter 자동 등록 회피).
        showToast(
          "info",
          `'${outcome.trimmedInput}' 학생을 찾을 수 없습니다. 아래 '+ 새 학생으로 추가' 버튼을 눌러주세요.`,
        );
        return;
    }
  };

  // C 패턴 — Enter 는 추가 호출 X (의식적 버튼 클릭 또는 dropdown 클릭만).
  // GroupSessionModal 학생 검색 input. 동명이인 식별/오타 자동 등록 회피.
  const handleStudentInputKeyDown = (_e: React.KeyboardEvent) => {
    // no-op
  };

  // 🆕 입력값 변경 시 에러 초기화
  useEffect(() => {
    if (studentCreateError) {
      setStudentCreateError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentInputValue]);

  // 편집 모달이 열릴 때 tempTeacherId 초기화 (BUG #3 fix)
  useEffect(() => {
    if (showEditModal) {
      setTempTeacherId(undefined);
    }
  }, [showEditModal]);

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = async (data: GroupSessionData) => {
    // 시간 유효성 검사 — validateAndToastGroup 이 invalid 시 자체 토스트 + setGroupTimeError 처리.
    const timeValid = validateAndToastGroup(
      data.startTime,
      data.endTime,
      setGroupTimeError,
    );
    const plan = planGroupSessionAdd({
      data,
      currentWeekStart,
      timeValid,
    });
    if (!plan.ok) {
      if (plan.reason === "no-subject") {
        showToast("warning", ERROR_MESSAGES.SUBJECT_NOT_SELECTED);
      } else if (plan.reason === "no-students") {
        showToast("warning", ERROR_MESSAGES.STUDENT_NOT_SELECTED);
      }
      // time-invalid 는 validateAndToastGroup 안에서 이미 토스트 표시.
      return;
    }
    setGroupTimeError("");

    try {
      await addSession(plan.addSessionInput);
      // 다른 주에 등록 시 시간표 navigate — weekFilteredSessions 가 새 주 기준으로 표시되도록.
      if (plan.movedToOtherWeek && data.weekStartDate) {
        setSelectedDate(new Date(`${data.weekStartDate}T12:00:00+09:00`));
      }
      setShowGroupModal(false);
      showToast("success", "수업이 추가됐습니다");
    } catch (error) {
      logger.error("세션 추가 실패", undefined, error as Error);
      showError("세션 추가에 실패했습니다.");
    }
  };

  // 🆕 그룹 수업 모달 열기. getCurrentWeekStart 를 함수로 전달해 호출 시점의 currentWeekStart 를 read
  // — 사용자가 시간표 주를 navigate 한 후 모달 열어도 항상 최신 주 기준 캘린더 popover 렌더.
  const openGroupModal = useMemo(
    () =>
      buildOpenGroupModalHandler(
        setGroupModalData,
        setShowGroupModal,
        getNextHour,
        () => currentWeekStart,
      ),
    [setGroupModalData, setShowGroupModal, getNextHour, currentWeekStart]
  );

  // 🆕 그룹 모달 시간 변경 핸들러 (헬퍼 적용)
  // setGroupTimeError 전달 — invalid 시 즉시 error state 설정 → canProceedStep1 차단.
  // validateDurationWithinLimit 도 전달 — picker change 시점에 8시간 초과 즉시 감지.
  // 미전달 시 step 1→2 transition 만 통과시키고 step 3 submit 에서 silent fail
  // (UAT 2026-05-20 사고). buildEditTimeChangeHandlers 와 패턴 통일.
  const { handleStartTimeChange, handleEndTimeChange } = useMemo(
    () =>
      buildGroupTimeChangeHandlers(
        validateTimeRange,
        setGroupModalData,
        setGroupTimeError,
        validateDurationWithinLimit,
        480,
      ),
    [validateTimeRange, validateDurationWithinLimit, setGroupModalData, setGroupTimeError]
  );

  // 🆕 UI 상태 훅
  const {
    isStudentDragging,
    setIsStudentDragging,
    gridVersion,
    setGridVersion,
  } = useUiState();

  // 🆕 드래그 앤 드롭 처리 (헬퍼 빌더로 교체)
  const _handleDropBase = useMemo(() => {
    // setIsStudentDragging 선언 이후에 클로저가 캡처되도록 지연 생성
    return buildHandleDrop({
      students,
      enrollments,
      setIsStudentDragging,
      setGroupModalData,
      setShowGroupModal,
      getNextHour,
      // drop 으로 모달 열릴 때 현재 시간표 주를 캘린더 popover 초기값으로 — currentWeekStart 변경 시
      // 새로 빌드되도록 deps 에 포함.
      getCurrentWeekStart: () => currentWeekStart,
    });
  }, [
    students,
    enrollments,
    setIsStudentDragging,
    setGroupModalData,
    setShowGroupModal,
    getNextHour,
    currentWeekStart,
  ]);
  // Gate: member role — drop opens modal which is blocked; skip entirely
  const handleDrop = useCallback(
    (...args: Parameters<typeof _handleDropBase>) => {
      if (!canManage) return;
      _handleDropBase(...args);
    },
    [canManage, _handleDropBase]
  );

  // 🆕 세션 드롭 핸들러 (헬퍼 빌더 적용)
  const _handleSessionDropBase = useMemo(() => {
    return buildHandleSessionDrop({
      updateSessionPosition,
      // setGridVersion는 함수 식별자이므로 선언 위치와 무관하게 안전하게 참조 가능
      setGridVersion,
    });
  }, [updateSessionPosition]);

  // Gate: member role — drag-to-reorder is disabled
  const handleSessionDrop = useCallback(
    async (sessionId: string, weekday: number, time: string, yPosition: number) => {
      // 다중 선택된 sessions 중 dragged session 이 포함되어 있으면 일괄 이동.
      // planBulkSessionDrop 이 updatedSessions + moves + outOfRange 까지 pure 계산.
      if (
        sessionSelection.count > 1 &&
        sessionSelection.isSelected(sessionId)
      ) {
        const plan = planBulkSessionDrop({
          canManage,
          sessions,
          enrollments,
          subjects,
          anchorSessionId: sessionId,
          newWeekday: weekday,
          newTime: time,
          newYPosition: yPosition,
          selectedSessionIds: sessionSelection.selectedSessionIds,
        });
        if (!plan.ok) return;

        await updateData({ sessions: plan.updatedSessions });
        // 서버 동기화 — 단일 drag 와 동일 /position 엔드포인트 (PR #194 userId 쿼리 fix).
        const uid = localStorage.getItem("supabase_user_id");
        if (uid) {
          await Promise.all(
            plan.moves.map((m) =>
              syncSessionUpdateAsync(uid, m.session.id, {
                weekday: m.weekday,
                startsAt: m.startsAt,
                endsAt: m.endsAt,
                yPosition: m.yPosition,
              }),
            ),
          );
        }
        // 강제 리렌더 (lane layout 재계산)
        setGridVersion((v) => v + 1);
        const total = sessionSelection.count;
        if (plan.outOfRange > 0) {
          showToast(
            "warning",
            `${total}개 중 ${plan.movedCount}개 이동 — ${plan.outOfRange}개는 시간 범위(자정 이전) 초과로 건너뜀`,
          );
        } else {
          showToast("success", `${plan.movedCount}개 이동`);
        }
        sessionSelection.clear();
        return;
      }
      if (!canManage) return;
      _handleSessionDropBase(sessionId, weekday, time, yPosition);
    },
    [
      canManage,
      _handleSessionDropBase,
      sessionSelection,
      sessions,
      enrollments,
      subjects,
      updateData,
    ]
  );

  // 🆕 Ctrl/Meta + drag로 복사 — 원본 유지 + 새 ID로 sessions 추가
  // (page-local addSession은 enrollmentIds 대신 studentIds를 받으므로 변환 필요)
  const handleSessionCopy = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string,
      yPosition: number,
    ) => {
      // 다중 선택 묶음 일괄 복사 — planBulkSessionCopy 가 mergedSessions / newEnrollments
      // 까지 계산. page 는 updateData / sync / toast / setGridVersion / clear orchestration.
      if (
        sessionSelection.count > 1 &&
        sessionSelection.isSelected(sessionId)
      ) {
        const plan = planBulkSessionCopy({
          canManage,
          sessions,
          enrollments,
          subjects,
          anchorSessionId: sessionId,
          newWeekday: weekday,
          newTime: time,
          newYPosition: yPosition,
          selectedSessionIds: sessionSelection.selectedSessionIds,
          selectedDate,
        });
        if (!plan.ok) return;

        const updatePayload: any = { sessions: plan.mergedSessions };
        if (plan.newEnrollments.length > 0) {
          updatePayload.enrollments = plan.mergedEnrollments;
        }
        await updateData(updatePayload);
        const uid = localStorage.getItem("supabase_user_id");
        for (const ne of plan.newEnrollments) {
          syncEnrollmentCreate(uid, ne);
        }
        for (const ns of plan.newSessions) {
          syncSessionCreate(uid, ns);
        }
        setGridVersion((v) => v + 1);
        if (plan.outOfRange > 0) {
          showToast(
            "warning",
            `${sessionSelection.count}개 중 ${plan.copiedCount}개 복사 — ${plan.outOfRange}개는 시간 범위(자정 이전) 초과로 건너뜀`,
          );
        } else {
          showToast("success", `${plan.copiedCount}개 복사`);
        }
        sessionSelection.clear();
        return;
      }

      // 단일 복사 — planSingleSessionCopy 가 addSession payload 만 계산.
      const plan = planSingleSessionCopy({
        canManage,
        sessions,
        enrollments,
        sessionId,
        newWeekday: weekday,
        newTime: time,
        newYPosition: yPosition,
      });
      if (!plan.ok) {
        if (plan.reason === "session-not-found") {
          logger.warn("복사 대상 세션을 찾을 수 없음", {
            sessionId: plan.sessionId,
          });
        } else if (plan.reason === "missing-subject") {
          logger.warn("복사 대상 subjectId 없음", {
            sessionId: plan.sessionId,
          });
        }
        return;
      }
      await addSession(plan.payload);
    },
    [
      canManage,
      sessions,
      enrollments,
      subjects,
      addSession,
      sessionSelection,
      updateData,
      selectedDate,
    ],
  );

  // 모바일 long-press 메뉴 — "복사" 항목.
  // 같은 시간/요일의 next yPosition lane으로 복제. 사용자가 후속 drag로 위치 조정.
  const handleContextMenuCopy = useCallback(
    (sessionId: string) => {
      if (!canManage) return;
      const original = sessions.find((s) => s.id === sessionId);
      if (!original) return;
      void handleSessionCopy(
        sessionId,
        original.weekday,
        original.startsAt,
        (original.yPosition ?? 1) + 1,
      );
      showToast("success", "수업 복사 — drag로 위치를 조정하세요");
    },
    [canManage, sessions, handleSessionCopy],
  );

  // 🆕 빈 공간 클릭 처리 — member 역할은 no-op
  const handleEmptySpaceClick = (
    weekday: number,
    time: string,
    yPosition?: number
  ) => {
    if (!canManage) return;
    logger.debug("빈 공간 클릭됨", { weekday, time, yPosition });
    openGroupModal(weekday, time, yPosition);
  };

  // 🆕 세션 클릭 처리 (헬퍼 빌더 적용)
  const _handleSessionClickBase = useMemo(
    () =>
      buildHandleSessionClick({
        enrollments,
        setEditModalData,
        setEditModalTimeData,
        setTempSubjectId,
        setTempEnrollments,
        setShowEditModal,
      }),
    [
      enrollments,
      setEditModalData,
      setEditModalTimeData,
      setTempSubjectId,
      setTempEnrollments,
      setShowEditModal,
    ]
  );
  // Gate: member role sees read-only schedule — session click is a no-op
  const handleSessionClick = useCallback(
    (...args: Parameters<typeof _handleSessionClickBase>) => {
      if (!canManage) return;
      _handleSessionClickBase(...args);
    },
    [canManage, _handleSessionClickBase]
  );

  // PDF dialog state — usePdfDialog 로 통합 (schedule-page-split-refactor PR 2).
  // handlePdfExport (200+ 줄, 다수 dependency) 는 page 안 유지.
  const timeTableRef = useRef<HTMLDivElement>(null);
  const {
    isDownloading,
    isPdfDialogOpen,
    pdfInitialScope,
    pdfInitialPrintTarget,
    setIsDownloading,
    openPdfDialog,
    closePdfDialog,
  } = usePdfDialog();

  // PR #432: preflight 는 필터된 수업 기준 (modal 의 printTarget='filtered' default).
  // PR #429-B: crowded-class warning (1h + 5+ 학생) — enrollments 전달.
  const pdfPreflightResult = useMemo(() => {
    if (!isPdfDialogOpen) return undefined;
    const { filteredSessions } = computeFilteredAndAllSessions({
      displaySessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    });
    return preflightCheck(filteredSessions, {
      isStudentFilter: selectedStudentIds.length > 0,
      startHour: timeRange.startHour,
      endHour: timeRange.endHour + 1,
      enrollments,
    });
  }, [
    isPdfDialogOpen,
    displaySessions,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
    timeRange,
    enrollments,
  ]);

  // PR #438: "전체 수업" 인쇄 시 전체 sessions 기준 preflight — 더 많은 경고 가능.
  const pdfPreflightResultAll = useMemo(() => {
    if (!isPdfDialogOpen) return undefined;
    const allSessionsRaw = Array.from(displaySessions.values()).flat();
    return preflightCheck(allSessionsRaw, {
      isStudentFilter: false,
      startHour: timeRange.startHour,
      endHour: timeRange.endHour + 1,
      enrollments,
    });
  }, [isPdfDialogOpen, displaySessions, timeRange, enrollments]);

  // PR #432: modal 의 "필터 적용 N 수업 / 전체 N 수업" 카운트.
  // PR #435: dropdown 도 사용 — isPdfDialogOpen 가드 제거.
  const pdfCounts = useMemo(() => {
    if (!displaySessions) return { filtered: 0, total: 0 };
    const { allSessionsRaw, filteredSessions } = computeFilteredAndAllSessions({
      displaySessions,
      enrollments,
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
    });
    return {
      filtered: filteredSessions.length,
      total: allSessionsRaw.length,
    };
  }, [
    displaySessions,
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
    enrollments,
  ]);

  // PR #435: B1 amber pill — 첫 활성 필터의 label (학생 → 과목 → 강사 priority).
  const filterChipLabel = useMemo<string | undefined>(
    () =>
      computeFilterChipLabel({
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
        students,
        subjects,
        teachers,
      }),
    [
      selectedStudentIds,
      selectedSubjectIds,
      selectedTeacherIds,
      students,
      subjects,
      teachers,
    ],
  );

  const handlePdfExport = async (range: PdfExportRange) => {
    setIsDownloading(true);
    try {
      const allSessionsRaw = Array.from(displaySessions.values()).flat();
      const plans = planPdfExport({
        range,
        allSessionsRaw,
        enrollments,
        students,
        teachers,
        selectedStudentIds,
        selectedSubjectIds,
        selectedTeacherIds,
        userTimeRange: timeRange,
      });
      for (const plan of plans) {
        renderSchedulePdf(
          plan.sessions,
          subjects,
          students,
          enrollments,
          teachers,
          plan.options,
        );
      }
      closePdfDialog();
    } finally {
      setIsDownloading(false);
    }
  };

  // ================================
  // 🎯 템플릿 기능
  // ================================
  // Template dialog state — useTemplateState 로 통합 (schedule-page-split-refactor PR 3).
  // handler (doApplyTemplate / handleApplyTemplate / handleSaveSlot / handleApplySlot / handlePreviewTemplate)
  // 는 page 안 유지 — dependency 8+ (sessions / subjects / students / teachers / enrollments /
  // updateData / weekFilteredSessions / currentWeekStart / showToast).
  const {
    showSavePickerModal,
    showApplyPickerModal,
    applyConfirmTemplate,
    isApplyingTemplate,
    previewTemplate,
    setShowSavePickerModal,
    setShowApplyPickerModal,
    setApplyConfirmTemplate,
    setIsApplyingTemplate,
    setPreviewTemplate,
  } = useTemplateState();

  const { templates, activeTemplate, isLoading: templatesLoading, isSaving: templateSaving, fetchTemplates: _fetchTemplates, saveTemplate, updateTemplate } = useTemplates(userId);

  // 현재 세션 → TemplateData 변환
  const buildTemplateData = useCallback((): TemplateData => {
    if (!displaySessions) return { version: "1.0", sessions: [] };
    const sessionsData = Array.from(displaySessions.values()).flat();
    return buildTemplateDataPure({
      sessions: sessionsData,
      teachers,
      subjects,
      enrollments,
      students,
    });
  }, [displaySessions, subjects, enrollments, students, teachers]);

  // 실제 적용 로직 (id 기반 매칭)
  // ⚠️ 이전 구현은 weekFilteredSessions 일괄 삭제 + addSession 을 9회 sequential await
  // 호출했음. addSession 내부의 [...sessions, newSession] 이 stale React closure 라
  // localStorage 가 매 호출마다 1개로 덮어써져 client state 가 마지막 1개만 살아남았음.
  // (server INSERT 는 syncSessionCreate fire-and-forget 으로 9개 모두 정상 — 새로고침
  // 시에만 복원). 또한 모든 새 sessions 가 같은 yPosition 일 때 setTimeout reposition
  // 9회 race 로 lane 깨짐 발생. → bulk copy/move (line 1198-1280) 와 동일 패턴 적용:
  // 새 sessions/enrollments 를 미리 build → repositionSessionsUtil sequential → updateData 1회.
  // doApplyTemplate — applyTemplateUtil 호출 + setter/toast orchestration (PR 5 utils 패턴).
  const doApplyTemplate = useCallback(
    async (template: ScheduleTemplate) => {
      setIsApplyingTemplate(true);
      const result = await applyTemplateUtil({
        template,
        weekFilteredSessions,
        sessions,
        subjects,
        students,
        teachers,
        enrollments,
        currentWeekStart,
        updateData,
      });
      setIsApplyingTemplate(false);
      setApplyConfirmTemplate(null);
      if (!result.ok) {
        showToast("error", "템플릿 적용 실패: " + result.error);
        return;
      }
      const uniqueMissing = [...new Set(result.missingEntities)];
      const warningText = uniqueMissing.length > 0
        ? ` (매칭 실패: ${uniqueMissing.slice(0, 3).join(", ")}${uniqueMissing.length > 3 ? " 외" : ""})`
        : "";
      showToast("success", `${result.newSessionsCount}개 수업이 템플릿으로 교체되었습니다${warningText}`);
    },
    [
      weekFilteredSessions,
      sessions,
      subjects,
      students,
      teachers,
      enrollments,
      updateData,
      currentWeekStart,
    ]
  );

  const handleApplyTemplate = useCallback(
    (template: ScheduleTemplate) => {
      if (weekFilteredSessions.length > 0) {
        setApplyConfirmTemplate(template);
        return;
      }
      doApplyTemplate(template);
    },
    [weekFilteredSessions, doApplyTemplate]
  );

  const handleClearWeek = useCallback(async () => {
    if (weekFilteredSessions.length === 0) {
      showToast("info", "이번 주는 이미 비어있어요.");
      return;
    }
    if (!confirm(`이 주의 ${weekFilteredSessions.length}개 수업을 모두 삭제할까요?`)) return;
    let remaining = sessions;
    for (const s of weekFilteredSessions) {
      remaining = remaining.filter((x) => x.id !== s.id);
    }
    await updateData({ sessions: remaining });
    showToast("success", `${weekFilteredSessions.length}개 수업이 삭제되었습니다.`);
  }, [weekFilteredSessions, sessions, updateData]);

  /**
   * T2 (ADR-008): SlotPickerModal save mode 의 onSelect 콜백.
   * 슬롯 별 PUT (기존) 또는 POST (빈 슬롯) 분기. quota 초과는 server 가 reject.
   */
  // handleSaveSlot — saveTemplateSlotUtil 호출 + toast/setter/auto-backup orchestration (PR 5).
  const handleSaveSlot = useCallback(
    async (slotIndex: number, userName?: string) => {
      const result = await saveTemplateSlotUtil({
        slotIndex,
        userName,
        templateData: buildTemplateData(),
        templates,
        saveTemplate,
        updateTemplate,
      });
      if (!result.ok) {
        if (result.reason === "empty") showToast("error", "저장할 수업이 없습니다.");
        else if (result.reason === "quota") showToast("error", "프리 티어는 academy 당 최대 2개 템플릿까지 사용할 수 있습니다. (추후 업데이트 예정)");
        else showToast("error", `템플릿 ${result.reason === "error" ? "처리" : "저장"}에 실패했습니다. 잠시 후 다시 시도해주세요.`);
        return;
      }
      showToast("success", `"${result.name}" 슬롯${result.action === "create" ? "에 저장" : "이 갱신"}되었습니다.`);
      setShowSavePickerModal(false);

      // 템플릿 저장 직후 자동 백업 (auto_template) — fire-and-forget, 사용자 흐름 차단 X.
      // 30일/10개 retention 은 server side atomic 처리.
      if (userId) {
        const academyId = getActiveAcademyId(userId);
        if (academyId) {
          void createSnapshot(userId, academyId, {
            type: "auto_template",
            payload: getClassPlannerData(),
            description: `템플릿 "${result.name}" 저장 직후 자동 백업`,
          });
        }
      }
    },
    [buildTemplateData, templates, updateTemplate, saveTemplate, userId]
  );

  /**
   * T2: SlotPickerModal apply mode 의 onSelect 콜백.
   * 사용자가 선택한 slotIndex 의 template 으로 handleApplyTemplate 호출.
   */
  const handleApplySlot = useCallback(
    (slotIndex: number) => {
      const template = templates.find((t) => t.slotIndex === slotIndex);
      if (!template) return;
      setShowApplyPickerModal(false);
      handleApplyTemplate(template);
    },
    [templates, handleApplyTemplate]
  );

  const handlePreviewTemplate = useCallback(() => {
    if (activeTemplate) setPreviewTemplate(activeTemplate);
  }, [activeTemplate]);

  // ================================
  // 🎯 출석 관리 섹션
  // ================================
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const { attendance, fetchAttendance, markAttendance, markAllPresent } =
    useAttendance(userId);

  const handleOpenAttendance = useCallback(
    async (session: Session) => {
      // attendance-permission-fix Phase 1 Step 4 (2026-05-27): 강사 (member) 본인 수업만 진입.
      // 다른 강사 수업 또는 NULL teacher_id session 출결 차단 — UI 가 click 시점에 막음 (API 도 가드).
      if (role === "member" && session.teacherId !== linkedTeacherId) {
        return;
      }
      setAttendanceSession(session);
      const dateStr = selectedDate.toISOString().slice(0, 10);
      await fetchAttendance(session.id, dateStr);
    },
    [selectedDate, fetchAttendance, role, linkedTeacherId]
  );

  const attendanceStudents = useMemo(() => {
    if (!attendanceSession) return [];
    const eIds = attendanceSession.enrollmentIds ?? [];
    return eIds.flatMap((eid) => {
      const enrollment = enrollments.find((e) => e.id === eid);
      if (!enrollment) return [];
      const student = students.find((s) => s.id === enrollment.studentId);
      return student ? [{ id: student.id, name: student.name }] : [];
    });
  }, [attendanceSession, enrollments, students]);


  // 🆕 학생 드래그 상태 관리 (중복 선언 제거)
  // (훅으로 대체됨)

  // 드래그 시작 처리 — member 역할은 drag 비활성화
  const handleDragStart = (e: React.DragEvent, student: Student) => {
    if (!canManage) {
      e.preventDefault();
      return;
    }
    onDragStartStudent(e, student, enrollments, setIsStudentDragging, () => {});
  };

  // 🆕 드래그 종료 처리
  const handleDragEnd = (e: React.DragEvent) =>
    onDragEndStudent(e, setIsStudentDragging, () => {});

  const VIEW_MODES: readonly { label: string; value: ScheduleViewMode }[] = [
    { label: "일별", value: "daily" },
    { label: "주간", value: "weekly" },
    { label: "월별", value: "monthly" },
  ] as const;

  const scheduleTitle = computeScheduleTitle(viewMode);

  // dateLabel 두 형태 — desktop은 full, mobile은 함축. computeScheduleDateLabels 가 viewMode 별 분기.
  const { dateLabel, dateLabelShort } = computeScheduleDateLabels(
    viewMode,
    selectedDate,
  );

  const teachersForPdfModal = useMemo(
    () => teachers.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    [teachers]
  );

  const studentsForPdfModal = useMemo(
    () => students.map((s) => ({ id: s.id, name: s.name })),
    [students]
  );

  return (
    <div className={isP3 ? "flex h-screen overflow-hidden" : ""}>
      {isP3 && (
        <PrimarySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          students={cascadedFilterOptions.students}
          totalStudents={students.length}
          selectedStudentIds={selectedStudentIds}
          onToggleStudent={tryToggleStudent}
          subjects={cascadedFilterOptions.subjects}
          totalSubjects={subjects.length}
          selectedSubjectIds={selectedSubjectIds}
          onToggleSubject={tryToggleSubject}
          teachers={cascadedFilterOptions.teachers}
          totalTeachers={teachers.length}
          selectedTeacherIds={selectedTeacherIds}
          onToggleTeacher={tryToggleTeacher}
        />
      )}
    <div
      className={`timetable-container p-4 ${
        isP3 ? "flex-1 min-w-0 flex flex-col overflow-hidden" : ""
      }`}
    >
      {/*
        ⚠️ 변경 알림 UX (2026-05-04): 이전엔 화면 상단을 가로로 가득 채우는 banner였으나
        (a) 사용자 본인 변경에도 잘못 발화 (b) 시각 영역 잠식 — 두 가지 문제로 토스트로 변경.
        본인 변경은 useScheduleMeta + apiSync.subscribeSelfSync 윈도우(10s)로 자동 suppress.
        다른 admin 변경만 토스트로 안내 + [새로고침] 액션 버튼 (sync 옵션 useEffect 아래).
      */}
      {/* P3: 헤더/필터/네비는 layout-anchored 영역. default 모드는 단순 wrap. */}
      <div className={isP3 ? "shrink-0" : ""}>
      {/* Row 1: 제목(좌) + 액션(우) — P3 + scroll 시 헤더 영역 자체 hide */}
      <div
        className={`flex items-start justify-between border-b transition-all duration-200 overflow-hidden ${
          isP3 && headerScrolled
            ? "max-h-0 mb-0 pb-0 pt-0 opacity-0 border-b-0 pointer-events-none"
            : "max-h-32 mb-4 pb-3 border-[--color-border]"
        }`}
      >
        <ScheduleHeader
          dataLoading={dataLoading}
          error={error ?? undefined}
          title={scheduleTitle}
          isSyncingSession={isSyncingSession}
          scheduleUpdatedAt={scheduleUpdatedAt}
          userId={userId}
        />
        <div className="flex items-center gap-2">
          {canManage && userId && viewMode === "weekly" && (
            <TemplateMenuV2
              onApply={() => { _fetchTemplates(); setShowApplyPickerModal(true); }}
              onClearWeek={handleClearWeek}
              onSave={() => setShowSavePickerModal(true)}
              onPreview={handlePreviewTemplate}
              canManage={canManage}
              hasTemplate={Boolean(activeTemplate)}
            />
          )}
          <ScheduleActionBar
            viewLabel={scheduleTitle}
            onOpenPdfDialog={() => openPdfDialog()}
            onOpenPdfPerTeacher={() => openPdfDialog("per-teacher", "all")}
            onOpenPdfPerStudent={() => openPdfDialog("per-student", "all")}
            onOpenPdfAllPrint={() => openPdfDialog(undefined, "all")}
            hasAnyFilter={
              selectedStudentIds.length > 0 ||
              selectedSubjectIds.length > 0 ||
              selectedTeacherIds.length > 0
            }
            filteredCount={pdfCounts.filtered}
            totalCount={pdfCounts.total}
            isDownloading={isDownloading}
            onDownloadStart={() => {}}
            onDownloadEnd={() => {}}
            viewMode={viewMode}
            onSaveTemplate={() => setShowSavePickerModal(true)}
            onApplyTemplate={() => {
              _fetchTemplates();
              setShowApplyPickerModal(true);
            }}
            isSaving={templateSaving}
          />
        </div>
      </div>

      <ScheduleToolbarFilters
        isP3={isP3}
        viewMode={viewMode}
        colorBy={colorBy}
        students={students}
        selectedStudentIds={selectedStudentIds}
        onToggleStudentFilter={toggleStudentFilter}
        onClearStudentFilter={clearStudentFilter}
        onStudentDragStart={handleDragStart}
        onStudentDragEnd={handleDragEnd}
        teachers={teachers}
        selectedTeacherIds={selectedTeacherIds}
        onToggleTeacherFilter={toggleTeacherFilter}
        onClearTeacherFilter={clearTeacherFilter}
        selectedWeekday={selectedWeekday}
        baseDate={selectedDate}
        onSelectWeekday={(wd) => {
          const monday = new Date(selectedDate);
          const currentWd = (monday.getDay() + 6) % 7;
          monday.setDate(monday.getDate() - currentWd + wd);
          setSelectedDate(monday);
        }}
        dateLabel={dateLabel}
        onPrev={viewMode === "daily" ? goToPrevDay : viewMode === "weekly" ? goToPrevWeek : goToPrevMonth}
        onNext={viewMode === "daily" ? goToNextDay : viewMode === "weekly" ? goToNextWeek : goToNextMonth}
        onToday={goToToday}
        prevAriaLabel={viewMode === "daily" ? "이전 날" : viewMode === "weekly" ? "이전 주" : "이전 달"}
        nextAriaLabel={viewMode === "daily" ? "다음 날" : viewMode === "weekly" ? "다음 주" : "다음 달"}
        viewModes={VIEW_MODES}
        onChangeViewMode={setViewMode}
        onChangeColorBy={(mode) => {
          setColorBy(mode);
          if (mode !== "student") clearStudentFilter();
          if (mode !== "teacher") clearTeacherFilter();
        }}
      />
      </div>
      {/* P3: 시간표 영역만 자체 스크롤. default 모드는 wrap만 추가. */}
      <div
        ref={mainScrollRef}
        className={
          isP3
            ? "flex-1 min-h-0 overflow-y-auto overflow-x-hidden schedule-p3-scroll"
            : ""
        }
      >
      {/* 시간표 뷰 (일별/주간/월별 조건부 렌더링) */}
      {viewMode === "daily" ? (
        <ScheduleDailyView
          sessions={displaySessions}
          subjects={subjects}
          students={students}
          enrollments={enrollments}
          teachers={teachers}
          selectedWeekday={selectedWeekday}
          colorBy={colorBy}
          selectedStudentIds={selectedStudentIds}
          selectedSubjectIds={selectedSubjectIds}
          selectedTeacherIds={selectedTeacherIds}
          onSessionClick={handleSessionClick}
          onSwipeLeft={goToNextDay}
          onSwipeRight={goToPrevDay}
          onAttendanceClick={handleOpenAttendance}
        />
      ) : viewMode === "monthly" ? (
        <ScheduleMonthlyView
          sessions={sessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          teachers={teachers}
          colorBy={colorBy}
          selectedStudentIds={selectedStudentIds}
          selectedSubjectIds={selectedSubjectIds}
          selectedTeacherIds={selectedTeacherIds}
          currentDate={selectedDate}
          onDayClick={(date) => {
            setSelectedDate(date);
            setViewMode("daily");
          }}
        />
      ) : (
        /* 주간 시간표 그리드 */
        <div className="relative">
          <SelectionBar
            count={sessionSelection.count}
            onDelete={handleBulkDelete}
            onClear={sessionSelection.clear}
          />
          {/* ADR-020 보강 (UAT 2026-05-21): cross-week filter empty banner (Variant C).
            * 현재 주에 매칭 없고 다른 주에 있으면 표시. 클릭 시 가장 가까운 매칭 주로 navigate. */}
          {closestMatchingWeek && (
            <div
              role="status"
              data-testid="cross-week-filter-banner"
              className="px-3 py-2 mb-2 rounded bg-[var(--color-bg-secondary)] border-l-2 border-[var(--color-accent)] text-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[var(--color-text-primary)] font-medium">
                  현재 주에 필터 매칭 수업이 없어요
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        `${closestMatchingWeek.weekStartDate}T12:00:00+09:00`,
                      ),
                    )
                  }
                  className="shrink-0 px-2 py-1 text-[10px] rounded bg-[var(--color-accent)] text-white font-bold hover:opacity-90"
                >
                  {closestMatchingWeek.isFuture ? "다음" : "지난"} 매칭 주로 →
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                가장 가까운 매칭:{" "}
                <span className="text-[var(--color-text-secondary)] font-medium">
                  {formatBannerWeekRange(closestMatchingWeek.weekStartDate)}
                </span>{" "}
                ({closestMatchingWeek.count}개 수업)
              </p>
            </div>
          )}
          <ScheduleGridSection
            containerRef={timeTableRef}
            gridVersion={gridVersion}
            sessions={displaySessions}
            subjects={subjects}
            enrollments={enrollments}
            students={students}
            onSessionClick={handleSessionClick}
            onSessionDelete={handleSessionDelete}
            onDrop={handleDrop}
            onSessionDrop={handleSessionDrop}
            onSessionCopy={canManage ? handleSessionCopy : undefined}
            onSessionInsertBefore={canManage ? handleSessionInsertBefore : undefined}
            onEmptySpaceClick={handleEmptySpaceClick}
            selectedStudentIds={selectedStudentIds}
            selectedSubjectIds={selectedSubjectIds}
            selectedTeacherIds={selectedTeacherIds}
            isStudentDragging={isStudentDragging}
            teachers={teachers}
            colorBy={colorBy}
            baseDate={selectedDate}
            selectedSessionIds={sessionSelection.selectedSet}
            onSessionSelectToggle={canManage ? sessionSelection.toggle : undefined}
            onSessionContextMenuCopy={canManage ? handleContextMenuCopy : undefined}
            onSessionContextMenuStartSelect={canManage ? handleContextMenuStartSelect : undefined}
            startHour={timeRange.startHour}
            endHour={timeRange.endHour}
            fillHeight={isP3}
          />
          {weekFilteredSessions.length === 0 && (
            <EmptyWeekState
              hasTemplate={Boolean(activeTemplate)}
              onApplyTemplate={() => { if (canManage) setShowApplyPickerModal(true); }}
              onAddSession={() => {
                if (!canManage) return;
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, "0")}:00`;
                openGroupModal(selectedWeekday, currentTime, 1);
              }}
            />
          )}
        </div>
      )}
      </div>

      {/* FAB — 모든 뷰(일별/주간/월별)에서 공통 표시; member 역할은 숨김 */}
      {canManage && (
        <button
          onClick={() => {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, "0")}:00`;
            openGroupModal(selectedWeekday, currentTime, 1);
          }}
          className={`fixed right-4 md:right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors hover:opacity-90 active:opacity-80 ${
            isP3 ? "bottom-20 md:bottom-12" : "bottom-20 md:bottom-6"
          }`}
          aria-label="수업 추가"
        >
          <Plus size={24} strokeWidth={2} />
        </button>
      )}

      {/* 그룹 수업 추가 모달 (분리) */}
      <GroupSessionModal
        isOpen={showGroupModal}
        groupModalData={groupModalData}
        setGroupModalData={setGroupModalData}
        setShowGroupModal={setShowGroupModal}
        removeStudent={removeStudent}
        studentInputValue={studentInputValue}
        setStudentInputValue={setStudentInputValue}
        handleStudentInputKeyDown={handleStudentInputKeyDown}
        addStudentFromInput={addStudentFromInput}
        filteredStudentsForModal={filteredStudentsForModal}
        addStudent={addStudent}
        subjects={subjects}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1", role: t.role, email: t.email, phone: t.phone, subjectIds: t.subjectIds ?? [] }))}
        students={students}
        weekdays={weekdays}
        handleStartTimeChange={handleStartTimeChange}
        handleEndTimeChange={handleEndTimeChange}
        groupTimeError={groupTimeError}
        addGroupSession={addGroupSession}
        onCreateStudent={handleCreateStudentFromInput}
        studentCreating={studentCreating}
        studentCreateError={studentCreateError}
        canManage={canManage}
        subjectInputValue={subjectInputValue}
        setSubjectInputValue={setSubjectInputValue}
        onCreateSubject={handleCreateSubjectFromInput}
        subjectCreating={subjectCreating}
        subjectCreateError={subjectCreateError}
        teacherInputValue={teacherInputValue}
        setTeacherInputValue={setTeacherInputValue}
        onCreateTeacher={handleCreateTeacherFromInput}
        teacherCreating={teacherCreating}
        teacherCreateError={teacherCreateError}
        weekStartDate={currentWeekStart}
      />

      {/* 출석 시트 */}
      {attendanceSession && (
        <AttendanceSheet
          isOpen={!!attendanceSession}
          onClose={() => setAttendanceSession(null)}
          sessionId={attendanceSession.id}
          date={selectedDate.toISOString().slice(0, 10)}
          students={attendanceStudents}
          attendance={attendance[attendanceSession.id] ?? {}}
          canManage={canManage}
          onMarkAttendance={(studentId, status) =>
            markAttendance(
              attendanceSession.id,
              studentId,
              selectedDate.toISOString().slice(0, 10),
              status
            )
          }
          onMarkAllPresent={() =>
            markAllPresent(
              attendanceSession.id,
              attendanceStudents.map((s) => s.id),
              selectedDate.toISOString().slice(0, 10)
            )
          }
        />
      )}

      {/* 세션 편집 모달 (분리) */}
      <EditSessionModal
        isOpen={Boolean(showEditModal && editModalData)}
        selectedStudents={buildSelectedStudents(
          editModalData?.enrollmentIds,
          enrollments,
          tempEnrollments.map((t) => ({
            id: t.id,
            studentId: t.studentId,
            subjectId: t.subjectId,
          })),
          students
        )}
        onRemoveStudent={(studentId) => {
          const updatedEnrollmentIds = removeStudentFromEnrollmentIds(
            studentId,
            editModalData?.enrollmentIds,
            enrollments,
            tempEnrollments.map((t) => ({
              id: t.id,
              studentId: t.studentId,
              subjectId: t.subjectId,
            }))
          );
          setTempEnrollments((prev) =>
            prev.filter((e) => e.studentId !== studentId)
          );
          setEditModalData((prev) =>
            prev ? { ...prev, enrollmentIds: updatedEnrollmentIds } : null
          );
        }}
        editStudentInputValue={editStudentInputValue}
        onEditStudentInputChange={(value) => {
          logger.debug("학생 입력값 변경", { value });
          setEditStudentInputValue(value);
        }}
        onEditStudentInputKeyDown={() => {
          // C 패턴 — Enter no-op. 추가는 dropdown row 클릭 또는 CTA 버튼만.
          // 이전 동작(Enter 자동 매칭 추가)은 동명이인 케이스에서 잘못된 학생
          // 자동 선택 위험 → 의식적 클릭으로 통일.
        }}
        onAddStudentClick={handleEditCreateStudentAndAdd}
        editSearchResults={filterEditableStudents(
          editStudentInputValue,
          editModalData,
          enrollments,
          tempEnrollments,
          students
        )}
        onSelectSearchStudent={(studentId) => handleEditStudentAdd(studentId)}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        onSubjectColorChange={(subjectId, newColor) => {
          const subject = subjects.find((s) => s.id === subjectId);
          if (!subject) return;
          // 1. React 상태 + localStorage 업데이트
          const updated = subjects.map((s) =>
            s.id === subjectId ? { ...s, color: newColor } : s
          );
          updateData({ subjects: updated });
          // 2. 서버 fire-and-forget sync (API는 name 필수)
          syncSubjectUpdate(userId, subjectId, { name: subject.name, color: newColor });
        }}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1", role: t.role, email: t.email, phone: t.phone, subjectIds: t.subjectIds ?? [] }))}
        tempSubjectId={tempSubjectId}
        onSubjectChange={(subjectId) => setTempSubjectId(subjectId)}
        tempTeacherId={
          tempTeacherId === undefined
            ? (editModalData?.teacherId || "")
            : (tempTeacherId ?? "")
        }
        onTeacherChange={(teacherId) => setTempTeacherId(teacherId)}
        weekdays={weekdays}
        defaultWeekday={editModalData?.weekday ?? 0}
        weekStartDate={currentWeekStart}
        startTime={editModalTimeData.startTime}
        endTime={editModalTimeData.endTime}
        onStartTimeChange={handleEditStartTimeChange}
        onEndTimeChange={handleEditEndTimeChange}
        timeError={editTimeError}
        onDelete={buildEditOnDelete({
          editModalData,
          deleteSession,
          setShowEditModal,
        })}
        onCancel={buildEditOnCancel({
          setShowEditModal,
          setTempSubjectId,
          onCancel: () => setTempTeacherId(undefined),
        })}
        onSave={buildEditOnSave({
          editModalData,
          editModalTimeData,
          tempSubjectId,
          tempTeacherId,
          tempEnrollments,
          enrollments,
          addEnrollment,
          getClassPlannerData,
          processTempEnrollments,
          ensureEnrollmentIdsForSubject,
          extractStudentIds,
          buildSessionSaveData,
          updateSession,
          validateAndToastEdit,
          setShowEditModal,
          setTempSubjectId,
          setTempEnrollments,
          onSaveComplete: () => setTempTeacherId(undefined),
          // 다른 주 날짜로 이동 시 시간표 자동 navigate (PR #378, 사용자 결정 ii)
          onMoveToWeek: (weekStartDate: string) => {
            // weekStartDate (YYYY-MM-DD KST) → 그 주 월요일 Date 객체
            setSelectedDate(new Date(`${weekStartDate}T12:00:00+09:00`));
          },
        })}
      />

      {/* 세션 삭제는 즉시 + undo 토스트로 처리 — ConfirmModal 제거됨 (학생/과목/강사 일관성) */}

      {/* T2 (ADR-008): 슬롯 picker — 저장 */}
      <SlotPickerModal
        open={showSavePickerModal}
        onClose={() => setShowSavePickerModal(false)}
        onSelect={(slotIndex, name) => { void handleSaveSlot(slotIndex, name); }}
        templates={templates}
        mode="save"
        isSubmitting={templateSaving}
      />

      {/* T2: 슬롯 picker — 적용 */}
      <SlotPickerModal
        open={showApplyPickerModal}
        onClose={() => setShowApplyPickerModal(false)}
        onSelect={(slotIndex) => handleApplySlot(slotIndex)}
        templates={templates}
        mode="apply"
        isSubmitting={isApplyingTemplate}
      />

      {/* 템플릿 적용 확인 모달 (교체 충돌 감지) */}
      {applyConfirmTemplate && (
        <ApplyTemplateConfirm
          existingSessionCount={weekFilteredSessions.length}
          onConfirm={() => doApplyTemplate(applyConfirmTemplate)}
          onCancel={() => setApplyConfirmTemplate(null)}
          isApplying={isApplyingTemplate}
        />
      )}

      {/* 템플릿 미리보기 모달 */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={{
            name: previewTemplate.name,
            template_data: {
              sessions: previewTemplate.templateData.sessions.map((s) => ({
                weekday: s.weekday,
                startsAt: s.startsAt,
                endsAt: s.endsAt,
                subjectName: s.subjectName,
                studentNames: s.studentNames,
              })),
            },
          }}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* PDF 범위 선택 다이얼로그 */}
      <PdfExportRangeModal
        isOpen={isPdfDialogOpen}
        onClose={closePdfDialog}
        onExport={handlePdfExport}
        viewMode={viewMode}
        selectedDate={selectedDate}
        isExporting={isDownloading}
        teachers={teachersForPdfModal}
        students={studentsForPdfModal}
        preflightResult={pdfPreflightResult}
        allPreflightResult={pdfPreflightResultAll}
        hasStudentFilter={selectedStudentIds.length > 0}
        hasTeacherFilter={selectedTeacherIds.length > 0}
        initialScope={pdfInitialScope}
        initialPrintTarget={pdfInitialPrintTarget}
        filterChipLabel={filterChipLabel}
        hasAnyFilter={
          selectedStudentIds.length > 0 ||
          selectedSubjectIds.length > 0 ||
          selectedTeacherIds.length > 0
        }
        filteredCount={pdfCounts.filtered}
        totalCount={pdfCounts.total}
      />
    </div>

    {/* Option C: P3 모드의 floating toolbar — 날짜 네비 + 통합 필터 + 시간 + 뷰모드 */}
    {isP3 && (
      <ScheduleFloatingToolbar
        dateLabel={dateLabel}
        dateLabelShort={dateLabelShort}
        onPrev={viewMode === "daily" ? goToPrevDay : viewMode === "weekly" ? goToPrevWeek : goToPrevMonth}
        onNext={viewMode === "daily" ? goToNextDay : viewMode === "weekly" ? goToNextWeek : goToNextMonth}
        onToday={goToToday}
        prevAriaLabel={viewMode === "daily" ? "이전 날" : viewMode === "weekly" ? "이전 주" : "이전 달"}
        nextAriaLabel={viewMode === "daily" ? "다음 날" : viewMode === "weekly" ? "다음 주" : "다음 달"}
        students={cascadedFilterOptions.students}
        totalStudents={students.length}
        selectedStudentIds={selectedStudentIds}
        onToggleStudent={tryToggleStudent}
        subjects={cascadedFilterOptions.subjects}
        totalSubjects={subjects.length}
        selectedSubjectIds={selectedSubjectIds}
        onToggleSubject={tryToggleSubject}
        teachers={cascadedFilterOptions.teachers}
        totalTeachers={teachers.length}
        selectedTeacherIds={selectedTeacherIds}
        onToggleTeacher={tryToggleTeacher}
        onClearAllFilters={() => {
          clearStudentFilter();
          clearTeacherFilter();
          setSelectedSubjectIds([]);
        }}
        onExpandToSidebar={() => setSidebarOpen(true)}
        colorBy={colorBy}
        timeRange={timeRange}
        userId={userId}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />
    )}
    </div>
  );
}
