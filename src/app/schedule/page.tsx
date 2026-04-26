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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useColorBy } from "../../hooks/useColorBy";
import { useAttendance } from "../../hooks/useAttendance";
import { useDisplaySessions } from "../../hooks/useDisplaySessions";
import { useScheduleView } from "../../hooks/useScheduleView";
import { useTemplates } from "../../hooks/useTemplates";
import type { TemplateData, ScheduleTemplate } from "@/shared/types/templateTypes";
import { Plus } from "lucide-react";
import { DayChipBar } from "../../components/molecules/DayChipBar";
import { ScheduleDateNavigator } from "../../components/molecules/ScheduleDateNavigator";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { usePerformanceMonitoring } from "../../hooks/usePerformanceMonitoring";
import { useStudentFilter } from "./_hooks/useStudentFilter";
import { filterSessionsByStudents } from "@/features/schedule/filters";
import { useTimeValidation } from "../../hooks/useTimeValidation";
import { getClassPlannerData } from "../../lib/localStorageCrud";
import { logger } from "../../lib/logger";
import { showError, showToast } from "../../lib/toast";
import type { Session, Student } from "../../lib/planner";
import { minutesToTime, timeToMinutes, weekdays } from "../../lib/planner";
import { repositionSessions as repositionSessionsUtil } from "../../lib/sessionCollisionUtils";
import type { GroupSessionData } from "../../types/scheduleTypes";
import { supabase } from "../../utils/supabaseClient";
import { renderSchedulePdf } from "@/lib/pdf/PdfRenderer";
import PdfExportRangeModal, { type PdfExportRange } from "@/components/molecules/PdfExportRangeModal";
import ConfirmModal from "../../components/molecules/ConfirmModal";
import ScheduleGridSection from "./_components/ScheduleGridSection";
import ScheduleHeader from "./_components/ScheduleHeader";
import StudentFilterChipBar from "./_components/StudentFilterChipBar";
import {
  DEFAULT_GROUP_SESSION_DATA,
  ERROR_MESSAGES,
  MAX_SESSION_DURATION_MINUTES,
} from "./_constants/scheduleConstants";
import { useEditModalState } from "./_hooks/useEditModalState";
import { useUiState } from "./_hooks/useUiState";
import { findCollidingSessionsImpl } from "./_utils/collisionQueries";
import {
  buildHandleDrop,
  buildHandleSessionClick,
  buildHandleSessionDrop,
  buildOpenGroupModalHandler,
  onDragEndStudent,
  onDragStartStudent,
} from "./_utils/dndHelpers";
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
const SaveTemplateModal = dynamic(
  () => import("../../components/molecules/SaveTemplateModal"),
  { ssr: false, loading: () => null }
);
const ApplyTemplateModal = dynamic(
  () => import("../../components/molecules/ApplyTemplateModal"),
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
 * 페이지 엔트리 컴포넌트
 * 인증 가드로 감싼 스케줄 페이지 컨테이너를 노출합니다.
 */
export default function SchedulePage(): JSX.Element {
  return <SchedulePageContent />;
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
  } = useIntegratedDataLocal();

  // Color-by 토글
  const { colorBy, setColorBy } = useColorBy();

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

  // 성능 모니터링
  const { startApiCall, endApiCall, startInteraction, endInteraction } =
    usePerformanceMonitoring();

  // ================================
  // 🎯 사용자 ID (useStudentFilter 스코프 키에 필요)
  // ================================
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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
  };

  type SessionUpdateInput = {
    startTime?: string;
    endTime?: string;
    weekday?: number;
    room?: string;
    yPosition?: number;
    subjectId?: string;
    studentIds?: string[];
  };

  const {
    selectedStudentIds,
    toggleStudent: toggleStudentFilter,
    clearFilter: clearStudentFilter,
  } = useStudentFilter(userId);

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

      // 1단계: 각 학생에 대해 enrollment 생성/확인
      const enrollmentIds: string[] = [];
      const newEnrollments: any[] = [];

      for (const studentId of sessionData.studentIds) {
        // 기존 enrollment가 있는지 확인
        let enrollment = enrollments.find(
          (e) =>
            e.studentId === studentId && e.subjectId === sessionData.subjectId
        );

        if (!enrollment) {
          // 새로운 enrollment 생성
          enrollment = {
            id: crypto.randomUUID(),
            studentId: studentId,
            subjectId: sessionData.subjectId,
          };
          newEnrollments.push(enrollment);
          logger.debug("새로운 enrollment 생성", { enrollment });
        } else {
          logger.debug("기존 enrollment 사용", { enrollment });
        }

        enrollmentIds.push(enrollment.id);
      }

      // 2단계: 세션 생성
      const newSession = {
        id: crypto.randomUUID(),
        subjectId: sessionData.subjectId,
        studentIds: sessionData.studentIds,
        ...(sessionData.teacherId && { teacherId: sessionData.teacherId }),
        weekday: sessionData.weekday,
        startsAt: sessionData.startTime,
        endsAt: sessionData.endTime,
        room: sessionData.room || "",
        enrollmentIds: enrollmentIds, // ✅ 실제 enrollment ID 사용
        yPosition: sessionData.yPosition || 1, // 🆕 yPosition 추가
      };

      logger.debug("새로운 세션 생성", { newSession });

      // 3단계: enrollment와 session을 한 번에 업데이트
      const updateDataPayload: any = {
        sessions: [...sessions, newSession],
      };

      if (newEnrollments.length > 0) {
        logger.debug("새로운 enrollments와 세션을 함께 저장", {
          newEnrollments,
        });
        updateDataPayload.enrollments = [...enrollments, ...newEnrollments];
      }

      startApiCall("update_data");
      await updateData(updateDataPayload);
      endApiCall("update_data", true);

      logger.info("세션 추가 완료");
      endInteraction("add_session");

      // 🆕 충돌 해결을 위해 다음 렌더링 사이클에서 실행
      setTimeout(async () => {
        try {
          logger.debug("충돌 해결 시작 (비동기)");

          // 현재 세션 목록으로 충돌 해결 (새로 생성된 enrollment 포함)
          const updatedSessions = [...sessions, newSession];
          const updatedEnrollments =
            newEnrollments.length > 0
              ? [...enrollments, ...newEnrollments]
              : enrollments;

          const repositionedSessions = repositionSessionsUtil(
            updatedSessions,
            updatedEnrollments,
            subjects,
            sessionData.weekday,
            sessionData.startTime,
            sessionData.endTime,
            sessionData.yPosition || 1,
            newSession.id
          );

          logger.debug("충돌 해결 완료", {
            finalSessionCount: repositionedSessions.length,
          });

          // 충돌 해결된 세션들과 enrollment를 함께 업데이트
          const updatePayload: any = { sessions: repositionedSessions };
          if (newEnrollments.length > 0) {
            updatePayload.enrollments = updatedEnrollments;
          }

          await updateData(updatePayload);

          logger.info("충돌 해결 업데이트 완료");
        } catch (error) {
          logger.error("충돌 해결 실패", undefined, error as Error);
        }
      }, 0);
    },
    [sessions, enrollments, updateData]
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

      const newSessions = sessions.map((s) => {
        if (s.id === sessionId) {
          const updatedSession = {
            ...s,
            ...sessionData,
            // 시간 필드명 변환 (startTime/endTime → startsAt/endsAt)
            startsAt: sessionData.startTime || s.startsAt,
            endsAt: sessionData.endTime || s.endsAt,
          };

          // 불필요한 필드 제거
          delete updatedSession.startTime;
          delete updatedSession.endTime;

          logger.debug("세션 업데이트", {
            original: { startsAt: s.startsAt, endsAt: s.endsAt },
            updated: {
              startsAt: updatedSession.startsAt,
              endsAt: updatedSession.endsAt,
            },
          });

          return updatedSession;
        }
        return s;
      });

      // 🆕 시간 변경 시 충돌 재배치 수행
      const target = newSessions.find((s) => s.id === sessionId);
      const targetWeekday = target?.weekday ?? sessionData.weekday ?? 0;
      const targetStartTime = (target?.startsAt ?? sessionData.startTime) || "";
      const targetEndTime = (target?.endsAt ?? sessionData.endTime) || "";
      const targetYPosition = target?.yPosition || 1;

      const repositioned = repositionSessionsUtil(
        newSessions,
        enrollments,
        subjects,
        targetWeekday,
        targetStartTime,
        targetEndTime,
        targetYPosition,
        sessionId
      );

      await updateData({ sessions: repositioned });
      logger.info("세션 업데이트 및 재배치 완료");
    },
    [sessions, updateData, enrollments, subjects]
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
      // 기존 세션의 지속 시간 계산
      const existingSession = sessions.find((s) => s.id === sessionId);
      if (!existingSession) {
        logger.error("세션을 찾을 수 없습니다", { sessionId });
        return;
      }

      const startMinutes = timeToMinutes(existingSession.startsAt);
      const endMinutes = timeToMinutes(existingSession.endsAt);
      const durationMinutes = endMinutes - startMinutes;

      // 새로운 종료 시간 계산
      const newStartMinutes = timeToMinutes(time);
      const newEndMinutes = newStartMinutes + durationMinutes;
      const newEndTime = minutesToTime(newEndMinutes);

      logger.debug("세션 위치 업데이트", {
        sessionId,
        originalTime: `${existingSession.startsAt}-${existingSession.endsAt}`,
        newTime: `${time}-${newEndTime}`,
        durationMinutes,
        targetYPosition: yPosition,
        originalYPosition: existingSession.yPosition,
      });

      // 충돌 방지 로직 적용
      logger.debug("repositionSessions 호출 시작");
      const newSessions = repositionSessionsUtil(
        sessions,
        enrollments,
        subjects,
        weekday,
        time,
        newEndTime,
        yPosition,
        sessionId
      );
      logger.debug("repositionSessions 완료", {
        newSessionCount: newSessions.length,
      });

      logger.debug("updateData 호출 시작");
      await updateData({ sessions: newSessions });
      logger.info("updateData 완료");
    },
    [sessions, updateData, enrollments, subjects]
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      const newSessions = sessions.filter((s) => s.id !== sessionId);
      await updateData({ sessions: newSessions });
    },
    [sessions, updateData]
  );

  const handleSessionDelete = useCallback((session: Session) => {
    setDeleteConfirmSessionId(session.id);
  }, []);

  // 🆕 로그인 상태 감지 및 로그아웃 시 정리
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          logger.debug("로그아웃 상태 감지 - 컴포넌트 정리");
          // 로그아웃 상태에서는 불필요한 로그 방지
          return;
        }

        logger.debug("로그인 상태 확인됨", { email: user.email });
      } catch (error) {
        logger.error("인증 상태 확인 실패", undefined, error as Error);
      }
    };

    checkAuthState();
  }, []);

  // 커스텀 훅 사용
  const { sessions: displaySessions } = useDisplaySessions(
    sessions,
    enrollments,
    ""
  );

  const filteredDisplaySessions = useMemo(() => {
    if (selectedStudentIds.length === 0) return displaySessions;
    const filtered = new Map<number, Session[]>();
    displaySessions.forEach((daySessions, weekday) => {
      filtered.set(weekday, filterSessionsByStudents(daySessions, selectedStudentIds, enrollments));
    });
    return filtered;
  }, [displaySessions, selectedStudentIds, enrollments]);

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

  // 세션 삭제 확인 모달 상태
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);

  // 학생 생성 훅 (모달에서 신규 학생 추가 시 사용)
  const { addStudent: createStudent } = useStudentManagementLocal();

  // 🆕 학생 입력 관련 상태
  const [studentInputValue, setStudentInputValue] = useState("");
  const [studentCreating, setStudentCreating] = useState(false);
  const [studentCreateError, setStudentCreateError] = useState<string>("");

  // 🆕 모달용 학생 검색 결과
  const filteredStudentsForModal = useMemo(() => {
    if (!studentInputValue.trim()) return [];
    return students.filter((student) =>
      student.name.toLowerCase().includes(studentInputValue.toLowerCase())
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

  // 강사 선택 상태 (편집 모달용; undefined = 변경 없음, "" = 제거)
  const [tempTeacherId, setTempTeacherId] = useState<string | undefined>(undefined);

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

  // 🆕 학생 추가 핸들러 최적화
  const handleEditStudentAddClick = useMemo(
    () => buildEditStudentAddClick(handleEditStudentAdd),
    [handleEditStudentAdd]
  );

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

  // 🆕 신규 학생 생성 함수 (B-1: 이름만, 성별 미설정)
  const handleCreateStudentFromInput = async () => {
    const trimmed = studentInputValue.trim();
    if (!trimmed) return;

    setStudentCreating(true);
    setStudentCreateError("");

    try {
      const success = await createStudent(trimmed);
      if (success) {
        // 생성 성공 후 localStorage에서 새 학생 ID 조회
        const data = getClassPlannerData();
        const newStudent = data.students.find(
          (s) => s.name.trim() === trimmed
        );
        if (newStudent) {
          addStudent(newStudent.id);
        }
      } else {
        setStudentCreateError("이미 존재하는 이름입니다.");
      }
    } catch {
      setStudentCreateError("학생 생성에 실패했습니다.");
    } finally {
      setStudentCreating(false);
    }
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
    const trimmedValue = studentInputValue.trim();
    if (!trimmedValue) return;

    // 정확한 이름으로 기존 학생 찾기
    const student = students.find(
      (s) => s.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (student && !groupModalData.studentIds.includes(student.id)) {
      // 🆕 최대 14명 제한 확인
      if (groupModalData.studentIds.length >= 14) {
        showToast("warning", "최대 14명까지 추가할 수 있습니다.");
        return;
      }
      addStudent(student.id);
    } else if (!student) {
      // 일치하는 학생 없으면 신규 생성 플로우로 위임
      handleCreateStudentFromInput();
    }
  };

  // 🆕 입력창 키보드 이벤트 처리
  const handleStudentInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      addStudentFromInput();
      // 입력 초기화는 addStudent/handleCreateStudentFromInput 성공 시에만 수행
    }
  };

  // 🆕 입력값 변경 시 에러 초기화
  useEffect(() => {
    if (studentCreateError) {
      setStudentCreateError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentInputValue]);

  // 🆕 그룹 수업 추가 함수
  const addGroupSession = async (data: GroupSessionData) => {
    logger.debug("addGroupSession 시작", { data });

    // 시간 유효성 검사 (그룹 모달용)
    if (
      !validateAndToastGroup(data.startTime, data.endTime, setGroupTimeError)
    ) {
      return;
    }
    setGroupTimeError("");
    logger.debug("시간 유효성 검사 통과");

    // 🆕 과목 선택 검증
    if (!data.subjectId) {
      logger.warn("과목 선택 검증 실패");
      showToast("warning", ERROR_MESSAGES.SUBJECT_NOT_SELECTED);
      return;
    }
    logger.debug("과목 선택 검증 통과");

    // 🆕 학생 선택 검증
    if (!data.studentIds || data.studentIds.length === 0) {
      logger.warn("학생 선택 검증 실패");
      showToast("warning", ERROR_MESSAGES.STUDENT_NOT_SELECTED);
      return;
    }
    logger.debug("학생 선택 검증 통과");

    logger.debug("addSession 호출 시작", {
      subjectId: data.subjectId,
      studentIds: data.studentIds,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    try {
      logger.debug("addSession 함수 호출 중");
      await addSession({
        studentIds: data.studentIds,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room,
        yPosition: data.yPosition || 1, // 🆕 yPosition 추가
      });
      logger.debug("addSession 함수 완료");

      logger.debug("모달 닫기 중");
      setShowGroupModal(false);
      logger.debug("세션 추가 완료");
    } catch (error) {
      logger.error("세션 추가 실패", undefined, error as Error);
      showError("세션 추가에 실패했습니다.");
    }
  };

  // 🆕 그룹 수업 모달 열기
  const openGroupModal = useMemo(
    () =>
      buildOpenGroupModalHandler(
        setGroupModalData,
        setShowGroupModal,
        getNextHour
      ),
    [setGroupModalData, setShowGroupModal, getNextHour]
  );

  // 🆕 그룹 모달 시간 변경 핸들러 (헬퍼 적용)
  const { handleStartTimeChange, handleEndTimeChange } = useMemo(
    () => buildGroupTimeChangeHandlers(validateTimeRange, setGroupModalData),
    [validateTimeRange, setGroupModalData]
  );

  // 🆕 UI 상태 훅
  const {
    isStudentDragging,
    setIsStudentDragging,
    gridVersion,
    setGridVersion,
  } = useUiState();

  // 🆕 드래그 앤 드롭 처리 (헬퍼 빌더로 교체)
  const handleDrop = useMemo(() => {
    // setIsStudentDragging 선언 이후에 클로저가 캡처되도록 지연 생성
    return buildHandleDrop({
      students,
      enrollments,
      setIsStudentDragging,
      setGroupModalData,
      setShowGroupModal,
      getNextHour,
    });
  }, [
    students,
    enrollments,
    setIsStudentDragging,
    setGroupModalData,
    setShowGroupModal,
    getNextHour,
  ]);

  // 🆕 세션 드롭 핸들러 (헬퍼 빌더 적용)
  const handleSessionDrop = useMemo(() => {
    return buildHandleSessionDrop({
      updateSessionPosition,
      // setGridVersion는 함수 식별자이므로 선언 위치와 무관하게 안전하게 참조 가능
      setGridVersion,
    });
  }, [updateSessionPosition]);

  // 🆕 빈 공간 클릭 처리
  const handleEmptySpaceClick = (
    weekday: number,
    time: string,
    yPosition?: number
  ) => {
    logger.debug("빈 공간 클릭됨", { weekday, time, yPosition });
    openGroupModal(weekday, time, yPosition);
  };

  // 🆕 세션 클릭 처리 (헬퍼 빌더 적용)
  const handleSessionClick = useMemo(
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

  // 🆕 PDF 다운로드 처리
  const timeTableRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  const handlePdfExport = async (range: PdfExportRange) => {
    setIsDownloading(true);
    try {
      await renderSchedulePdf(
        Array.from(displaySessions.values()).flat(),
        subjects,
        students,
        enrollments,
        teachers,
        {
          academyName: "CLASS PLANNER",
          filterStudentId: selectedStudentIds[0] ?? undefined,
          weekRange: range,
        }
      );
      setIsPdfDialogOpen(false);
    } finally {
      setIsDownloading(false);
    }
  };

  // ================================
  // 🎯 템플릿 기능
  // ================================
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);

  const { templates, isLoading: templatesLoading, isSaving: templateSaving, fetchTemplates: _fetchTemplates, saveTemplate } = useTemplates(userId);

  // 현재 세션 → TemplateData 변환
  const buildTemplateData = useCallback((): TemplateData => {
    if (!displaySessions) return { version: "1.0", sessions: [] };
    const sessionsData = Array.from(displaySessions.values()).flat();
    return {
      version: "1.0",
      sessions: sessionsData.map((session) => {
        const firstEnrollment = enrollments.find(
          (e) => (session.enrollmentIds ?? []).includes(e.id)
        );
        const subject = subjects.find((s) => s.id === firstEnrollment?.subjectId);
        const sessionStudentNames = (session.enrollmentIds ?? [])
          .map((eid) => {
            const enrollment = enrollments.find((e) => e.id === eid);
            if (!enrollment) return null;
            return students.find((st) => st.id === enrollment.studentId)?.name ?? null;
          })
          .filter((n): n is string => n !== null);
        return {
          weekday: session.weekday,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          subjectName: subject?.name ?? "미지정",
          subjectColor: subject?.color ?? "#6366f1",
          studentNames: sessionStudentNames,
        };
      }),
    };
  }, [displaySessions, subjects, enrollments, students]);

  const handleApplyTemplate = useCallback(
    async (template: ScheduleTemplate) => {
      const { sessions: templateSessions } = template.templateData;
      let applied = 0;
      let skipped = 0;

      for (const tplSession of templateSessions) {
        let subject = subjects.find((s) => s.name === tplSession.subjectName);
        if (!subject) {
          const newSubjectId = crypto.randomUUID();
          subject = { id: newSubjectId, name: tplSession.subjectName, color: tplSession.subjectColor };
          await updateData({ subjects: [...subjects, subject] });
        }

        const studentIds: string[] = [];
        for (const name of tplSession.studentNames) {
          const student = students.find((s) => s.name === name);
          if (student) {
            studentIds.push(student.id);
          } else {
            skipped++;
          }
        }

        if (studentIds.length === 0) continue;

        await addSession({
          subjectId: subject.id,
          studentIds,
          weekday: tplSession.weekday,
          startTime: tplSession.startsAt,
          endTime: tplSession.endsAt,
          yPosition: 1,
        });
        applied++;
      }

      setShowApplyTemplateModal(false);
      if (applied > 0) {
        showToast("success", `${applied}개 세션이 적용되었습니다.${skipped > 0 ? ` (${skipped}명 학생 매칭 실패)` : ""}`);
      } else {
        showToast("error", "매칭된 학생이 없어 세션을 생성하지 못했습니다.");
      }
    },
    [subjects, students, enrollments, sessions, updateData, addSession]
  );

  // ================================
  // 🎯 출석 관리 섹션
  // ================================
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const { attendance, fetchAttendance, markAttendance, markAllPresent } =
    useAttendance(userId);

  const handleOpenAttendance = useCallback(
    async (session: Session) => {
      setAttendanceSession(session);
      const dateStr = selectedDate.toISOString().slice(0, 10);
      await fetchAttendance(session.id, dateStr);
    },
    [selectedDate, fetchAttendance]
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

  // 드래그 시작 처리
  const handleDragStart = (e: React.DragEvent, student: Student) =>
    onDragStartStudent(
      e,
      student,
      enrollments,
      setIsStudentDragging,
      () => {}
    );

  // 🆕 드래그 종료 처리
  const handleDragEnd = (e: React.DragEvent) =>
    onDragEndStudent(e, setIsStudentDragging, () => {});

  return (
    <div className="timetable-container p-4">
      <ScheduleHeader
        dataLoading={dataLoading}
        error={error ?? undefined}
        colorBy={colorBy}
        onColorByChange={(mode) => {
          setColorBy(mode);
          if (mode !== "student") clearStudentFilter();
        }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {colorBy === "student" && (
        <StudentFilterChipBar
          students={students}
          selectedStudentIds={selectedStudentIds}
          onToggleStudent={toggleStudentFilter}
          onClearFilter={clearStudentFilter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      )}

      {/* 일별 뷰: 요일 칩 바 */}
      {viewMode === "daily" && (
        <DayChipBar
          selectedWeekday={selectedWeekday}
          onSelectWeekday={(wd) => {
            const monday = new Date(selectedDate);
            const currentWd = (monday.getDay() + 6) % 7;
            monday.setDate(monday.getDate() - currentWd + wd);
            setSelectedDate(monday);
          }}
          baseDate={selectedDate}
        />
      )}

      {/* 액션 바: PDF · 템플릿 · 공유 */}
      <ScheduleActionBar
        viewLabel={
          viewMode === "daily"
            ? "일별 시간표"
            : viewMode === "monthly"
              ? "월별 시간표"
              : "주간 시간표"
        }
        onOpenPdfDialog={() => setIsPdfDialogOpen(true)}
        isDownloading={isDownloading}
        onDownloadStart={() => {}}
        onDownloadEnd={() => {}}
        userId={userId}
        onSaveTemplate={() => setShowSaveTemplateModal(true)}
        onApplyTemplate={() => {
          _fetchTemplates();
          setShowApplyTemplateModal(true);
        }}
        isSaving={templateSaving}
      />

      {/* 날짜 네비게이터 (일별/주간/월별 공통) */}
      <ScheduleDateNavigator
        label={(() => {
          if (viewMode === "daily") {
            const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
            return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAY_LABELS[selectedDate.getDay()]})`;
          }
          if (viewMode === "weekly") {
            const mon = new Date(selectedDate);
            mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
            const sun = new Date(mon);
            sun.setDate(sun.getDate() + 6);
            const sameMonth = mon.getMonth() === sun.getMonth();
            const start = `${mon.getFullYear()}년 ${mon.getMonth() + 1}월 ${mon.getDate()}일`;
            const end = sameMonth
              ? `${sun.getDate()}일`
              : sun.getFullYear() !== mon.getFullYear()
                ? `${sun.getFullYear()}년 ${sun.getMonth() + 1}월 ${sun.getDate()}일`
                : `${sun.getMonth() + 1}월 ${sun.getDate()}일`;
            return `${start} — ${end}`;
          }
          return `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월`;
        })()}
        onPrev={viewMode === "daily" ? goToPrevDay : viewMode === "weekly" ? goToPrevWeek : goToPrevMonth}
        onNext={viewMode === "daily" ? goToNextDay : viewMode === "weekly" ? goToNextWeek : goToNextMonth}
        onToday={goToToday}
        prevAriaLabel={viewMode === "daily" ? "이전 날" : viewMode === "weekly" ? "이전 주" : "이전 달"}
        nextAriaLabel={viewMode === "daily" ? "다음 날" : viewMode === "weekly" ? "다음 주" : "다음 달"}
      />

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
          onSessionClick={handleSessionClick}
          onSwipeLeft={goToNextDay}
          onSwipeRight={goToPrevDay}
          onAttendanceClick={handleOpenAttendance}
        />
      ) : viewMode === "monthly" ? (
        <ScheduleMonthlyView
          sessions={displaySessions}
          subjects={subjects}
          enrollments={enrollments}
          currentDate={selectedDate}
          onDayClick={(date) => {
            setSelectedDate(date);
            setViewMode("daily");
          }}
        />
      ) : (
        /* 주간 시간표 그리드 */
        <ScheduleGridSection
          containerRef={timeTableRef}
          gridVersion={gridVersion}
          sessions={filteredDisplaySessions}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onSessionClick={handleSessionClick}
          onSessionDelete={handleSessionDelete}
          onDrop={handleDrop}
          onSessionDrop={handleSessionDrop}
          onEmptySpaceClick={handleEmptySpaceClick}
          selectedStudentIds={selectedStudentIds}
          isStudentDragging={isStudentDragging}
          teachers={teachers}
          colorBy={colorBy}
          baseDate={selectedDate}
        />
      )}

      {/* FAB — 모든 뷰(일별/주간/월별)에서 공통 표시 */}
      <button
        onClick={() => {
          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, "0")}:00`;
          openGroupModal(selectedWeekday, currentTime, 1);
        }}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors hover:opacity-90 active:opacity-80"
        aria-label="수업 추가"
      >
        <Plus size={24} strokeWidth={2} />
      </button>

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
        teachers={teachers.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1" }))}
        students={students}
        weekdays={weekdays}
        handleStartTimeChange={handleStartTimeChange}
        handleEndTimeChange={handleEndTimeChange}
        groupTimeError={groupTimeError}
        addGroupSession={addGroupSession}
        onCreateStudent={handleCreateStudentFromInput}
        studentCreating={studentCreating}
        studentCreateError={studentCreateError}
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
        onEditStudentInputKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            logger.debug("Enter 키로 학생 추가 시도");
            handleEditStudentAdd();
            setEditStudentInputValue("");
          }
        }}
        onAddStudentClick={handleEditStudentAddClick}
        editSearchResults={filterEditableStudents(
          editStudentInputValue,
          editModalData,
          enrollments,
          students
        )}
        onSelectSearchStudent={(studentId) => handleEditStudentAdd(studentId)}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        onSubjectColorChange={(subjectId, newColor) => {
          const updated = subjects.map((s) =>
            s.id === subjectId ? { ...s, color: newColor } : s
          );
          updateData({ subjects: updated });
        }}
        teachers={teachers.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "#6366f1" }))}
        tempSubjectId={tempSubjectId}
        onSubjectChange={(subjectId) => setTempSubjectId(subjectId)}
        tempTeacherId={tempTeacherId ?? (editModalData?.teacherId || "")}
        onTeacherChange={(teacherId) => setTempTeacherId(teacherId)}
        weekdays={weekdays}
        defaultWeekday={editModalData?.weekday ?? 0}
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
        })}
      />

      {/* 세션 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteConfirmSessionId !== null}
        title="수업 삭제"
        message="이 수업을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
        onConfirm={async () => {
          if (deleteConfirmSessionId) {
            await deleteSession(deleteConfirmSessionId);
          }
          setDeleteConfirmSessionId(null);
        }}
        onCancel={() => setDeleteConfirmSessionId(null)}
      />

      {/* 템플릿 저장 모달 */}
      <SaveTemplateModal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        onSave={async (payload) => {
          const ok = await saveTemplate(payload);
          if (ok) {
            setShowSaveTemplateModal(false);
            showToast("success", "템플릿이 저장되었습니다.");
          } else {
            showError("템플릿 저장에 실패했습니다.");
          }
        }}
        templateData={buildTemplateData()}
        isSaving={templateSaving}
      />

      {/* 템플릿 적용 모달 */}
      <ApplyTemplateModal
        isOpen={showApplyTemplateModal}
        onClose={() => setShowApplyTemplateModal(false)}
        onApply={handleApplyTemplate}
        templates={templates}
        isApplying={false}
        isLoading={templatesLoading}
      />

      {/* PDF 범위 선택 다이얼로그 */}
      <PdfExportRangeModal
        isOpen={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
        onExport={handlePdfExport}
        viewMode={viewMode}
        selectedDate={selectedDate}
        isExporting={isDownloading}
      />
    </div>
  );
}
