import { logger } from "../../../lib/logger";
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
  buildSessionSaveData: (
    currentEnrollmentIds: string[],
    currentStudentIds: string[],
    currentSubjectId: string,
    weekday: number,
    startTime: string,
    endTime: string,
    room: string
  ) => {
    enrollmentIds: string[];
    studentIds: string[];
    subjectId: string;
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
      weekday: number;
      startTime: string;
      endTime: string;
      room: string;
    }
  ) => Promise<void>;
  validateAndToastEdit: (start: string, end: string) => boolean;
  setShowEditModal: (open: boolean) => void;
  setTempSubjectId: (id: string) => void;
  setTempEnrollments: (v: TempEnrollment[]) => void;
}) {
  const {
    editModalData,
    editModalTimeData,
    tempSubjectId,
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
  } = params;

  return async () => {
    if (!editModalData) return;

    const weekday = Number(
      (document.getElementById("edit-modal-weekday") as HTMLSelectElement)
        ?.value
    );
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

      const sessionData = buildSessionSaveData(
        ensured.enrollmentIds,
        currentStudentIds,
        tempSubjectId ||
          ((): string => {
            const first = enrollments.find(
              (e) => e.id === editModalData.enrollmentIds?.[0]
            );
            return first?.subjectId || "";
          })(),
        weekday,
        startTime,
        endTime,
        editModalData.room || ""
      );

      await updateSession(editModalData.id, sessionData);

      // 상태 초기화
      setShowEditModal(false);
      setTempSubjectId("");
      setTempEnrollments([]);
      logger.debug("세션 업데이트 완료");
    } catch (error) {
      console.error("세션 업데이트 실패:", error);
      alert("세션 업데이트에 실패했습니다.");
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
    if (editModalData && confirm("정말로 이 수업을 삭제하시겠습니까?")) {
      try {
        await deleteSession(editModalData.id);
        setShowEditModal(false);
        logger.debug("세션 삭제 완료");
      } catch (error) {
        console.error("세션 삭제 실패:", error);
        alert("세션 삭제에 실패했습니다.");
      }
    }
  };
}

export function buildEditOnCancel(params: {
  setShowEditModal: (open: boolean) => void;
  setTempSubjectId: (id: string) => void;
}) {
  const { setShowEditModal, setTempSubjectId } = params;
  return () => {
    setShowEditModal(false);
    setTempSubjectId("");
  };
}
