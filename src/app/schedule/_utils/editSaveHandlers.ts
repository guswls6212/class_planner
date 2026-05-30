import { logger } from "../../../lib/logger";
import { showError } from "../../../lib/toast";
import type { Enrollment, Session } from "../../../lib/planner";
import type { TempEnrollment } from "./sessionSaveUtils";

type EditModalTimeData = { startTime: string; endTime: string };

export function buildEditOnSave(params: {
  editModalData: Session | null;
  editModalTimeData: EditModalTimeData;
  tempSubjectId: string;
  tempEnrollments: TempEnrollment[];
  enrollments: Enrollment[];
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>;
  getClassPlannerData: () => { enrollments: Enrollment[] };
  processTempEnrollments: (
    tempEnrollments: TempEnrollment[],
    addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>,
    getClassPlannerData: () => { enrollments: Enrollment[] }
  ) => Promise<{
    allEnrollments: Enrollment[];
    currentEnrollmentIds: string[];
  }>;
  ensureEnrollmentIdsForSubject: (
    studentIds: string[],
    subjectId: string,
    addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>,
    getClassPlannerData: () => { enrollments: Enrollment[] },
    baseEnrollments: Enrollment[]
  ) => Promise<{ enrollmentIds: string[]; allEnrollments: Enrollment[] }>;
  extractStudentIds: (
    enrollmentIds: string[],
    allEnrollments: Enrollment[]
  ) => string[];
  tempTeacherId?: string | null;
  buildSessionSaveData: (
    currentEnrollmentIds: string[],
    currentStudentIds: string[],
    currentSubjectId: string,
    weekday: number,
    startTime: string,
    endTime: string,
    room: string,
    teacherId?: string | null
  ) => {
    enrollmentIds: string[];
    studentIds: string[];
    subjectId: string;
    teacherId?: string | null;
    weekday: number;
    startTime: string;
    endTime: string;
    room: string;
  };
  updateSession: (
    sessionId: string,
    data: {
      enrollmentIds: string[];
      studentIds: string[];
      subjectId: string;
      teacherId?: string | null;
      weekday: number;
      /** YYYY-MM-DD. 다른 주로 세션 이동 시 forward. 미지정이면 기존 주 유지. */
      weekStartDate?: string;
      startTime: string;
      endTime: string;
      room: string;
    }
  ) => Promise<void>;
  /** 다른 주로 이동 후 시간표 navigate. weekStartDate 받음. */
  onMoveToWeek?: (weekStartDate: string) => void;
  /**
   * Modal save 시 session 의 weekday / weekStartDate 변경 detect 후 출결도 migrate
   * (B move 정책 2026-05-28). signature 는 caller(page) 가 schedule weekStart context 알고 있음.
   *   - oldWeekday / oldWeekStartDate: 모달 열기 시점의 session 메타
   *   - newWeekday / newWeekStartDate: 저장 시 변경된 메타 (이동 미발생 시 동일)
   *   - sessionId: migrate 대상
   * 변경 없으면 caller 가 noop (oldDate === newDate).
   */
  onAttendanceMigrate?: (params: {
    sessionId: string;
    oldWeekday: number;
    oldWeekStartDate: string | undefined;
    newWeekday: number;
    newWeekStartDate: string | undefined;
  }) => void;
  validateAndToastEdit: (start: string, end: string) => boolean;
  setShowEditModal: (open: boolean) => void;
  setTempSubjectId: (id: string) => void;
  setTempEnrollments: (v: TempEnrollment[]) => void;
  onSaveComplete?: () => void;
}) {
  const {
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
    onSaveComplete,
    onMoveToWeek,
    onAttendanceMigrate,
  } = params;

  return async (weekday: number, newWeekStartDate?: string) => {
    if (!editModalData) return;

    const startTime = editModalTimeData.startTime;
    const endTime = editModalTimeData.endTime;
    if (!startTime || !endTime) return;
    if (!validateAndToastEdit(startTime, endTime)) return;

    try {
      // 임시 enrollments 처리 및 병합
      const { allEnrollments, currentEnrollmentIds } =
        await processTempEnrollments(
          tempEnrollments,
          addEnrollment,
          getClassPlannerData
        );

      const existingEnrollmentIds =
        editModalData.enrollmentIds?.filter((enrollmentId) =>
          allEnrollments.some((e) => e.id === enrollmentId)
        ) || [];

      const mergedEnrollmentIds = [
        ...existingEnrollmentIds,
        ...currentEnrollmentIds,
      ];

      const currentStudentIds = extractStudentIds(
        mergedEnrollmentIds,
        allEnrollments
      );

      // 과목 변경 시 해당 과목에 맞는 enrollmentIds 보장
      const needEnsure = Boolean(tempSubjectId);
      const ensured = needEnsure
        ? await ensureEnrollmentIdsForSubject(
            currentStudentIds,
            tempSubjectId,
            addEnrollment,
            getClassPlannerData,
            allEnrollments
          )
        : { enrollmentIds: mergedEnrollmentIds as string[] };

      const resolvedSubjectId =
        tempSubjectId ||
        ((): string => {
          const first = enrollments.find(
            (e) => e.id === editModalData.enrollmentIds?.[0]
          );
          return first?.subjectId || "";
        })();

      const resolvedTeacherId: string | null | undefined =
        tempTeacherId !== undefined
          ? tempTeacherId // null = clear intent, "uuid" = assign; keep as-is
          : editModalData.teacherId;

      const sessionData = buildSessionSaveData(
        ensured.enrollmentIds,
        currentStudentIds,
        resolvedSubjectId,
        weekday,
        startTime,
        endTime,
        editModalData.room || "",
        resolvedTeacherId
      );

      // 다른 주로 이동 시 sessionData에 weekStartDate forward + 시간표 navigate.
      const sessionDataWithWeek = newWeekStartDate
        ? { ...sessionData, weekStartDate: newWeekStartDate }
        : sessionData;
      await updateSession(editModalData.id, sessionDataWithWeek);

      // 출결 follow (B move, 2026-05-28): weekday / weekStartDate 변경 시 attendance 도 migrate.
      // 같은 weekday + 같은 weekStartDate → callback 안에서 oldDate === newDate noop.
      if (onAttendanceMigrate) {
        const oldWeekday = editModalData.weekday;
        const oldWeekStartDate = editModalData.weekStartDate;
        const newWeekdayResolved = weekday;
        const newWeekStartDateResolved = newWeekStartDate ?? oldWeekStartDate;
        if (
          oldWeekday !== newWeekdayResolved ||
          oldWeekStartDate !== newWeekStartDateResolved
        ) {
          onAttendanceMigrate({
            sessionId: editModalData.id,
            oldWeekday,
            oldWeekStartDate,
            newWeekday: newWeekdayResolved,
            newWeekStartDate: newWeekStartDateResolved,
          });
        }
      }

      // 상태 초기화
      setShowEditModal(false);
      setTempSubjectId("");
      setTempEnrollments([]);

      // 다른 주로 이동했으면 시간표 자동 navigate (사용자 결정 ii — 2026-05-12)
      if (newWeekStartDate) onMoveToWeek?.(newWeekStartDate);

      onSaveComplete?.();
      logger.debug("세션 업데이트 완료");
    } catch (error) {
      logger.error("세션 업데이트 실패", undefined, error as Error);
      showError("세션 업데이트에 실패했습니다.");
    }
  };
}

export function buildEditOnDelete(params: {
  editModalData: Session | null;
  deleteSession: (id: string) => Promise<void>;
  setShowEditModal: (open: boolean) => void;
}) {
  const { editModalData, deleteSession, setShowEditModal } = params;
  return async () => {
    // 학생/과목/강사 삭제와 일관성: confirm 알림 제거. 5초 undo 토스트가 안전망.
    if (editModalData) {
      try {
        await deleteSession(editModalData.id);
        setShowEditModal(false);
        logger.debug("세션 삭제 완료 (undo toast 활성)");
      } catch (error) {
        logger.error("세션 삭제 실패", undefined, error as Error);
        showError("세션 삭제에 실패했습니다.");
      }
    }
  };
}

export function buildEditOnCancel(params: {
  setShowEditModal: (open: boolean) => void;
  setTempSubjectId: (id: string) => void;
  onCancel?: () => void;
}) {
  const { setShowEditModal, setTempSubjectId, onCancel } = params;
  return () => {
    setShowEditModal(false);
    setTempSubjectId("");
    onCancel?.();
  };
}
