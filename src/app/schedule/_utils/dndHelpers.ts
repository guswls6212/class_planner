import type { Dispatch, SetStateAction } from "react";
import { logger } from "../../../lib/logger";
import { showError } from "../../../lib/toast";
import type { Enrollment, Session, Student } from "../../../lib/planner";

// page.tsx와 동일한 로거 인스턴스를 사용

export function onDragStartStudent(
  e: React.DragEvent,
  student: Student,
  enrollments: Enrollment[],
  setIsStudentDragging: (v: boolean) => void,
  resetPanelDragState: () => void
) {
  logger.debug("학생 드래그 시작", { studentName: student.name });
  setIsStudentDragging(true);
  const studentEnrollment = enrollments.find(
    (en) => en.studentId === student.id
  );
  if (studentEnrollment) {
    e.dataTransfer.setData("text/plain", studentEnrollment.id);
  } else {
    e.dataTransfer.setData("text/plain", `student:${student.id}`);
  }
  e.dataTransfer.effectAllowed = "copy";
  resetPanelDragState();
}

export function onDragEndStudent(
  e: React.DragEvent,
  setIsStudentDragging: (v: boolean) => void,
  resetPanelDragState: () => void
) {
  logger.debug("학생 드래그 종료", { dropEffect: e.dataTransfer.dropEffect });
  setIsStudentDragging(false);
  resetPanelDragState();
}

export function forceClearDragStateAfterDrop(delayMs: number = 100) {
  setTimeout(() => {
    const dragEndEvent = new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(dragEndEvent);

    const mouseUpEvent = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      clientX: 0,
      clientY: 0,
    });
    document.dispatchEvent(mouseUpEvent);
  }, delayMs);
}

/** 모달이 열릴 때 setGroupModalData 로 세팅되는 데이터 형태. weekStartDate 는 옵션 —
 *  부모(page.tsx) 의 currentWeekStart 를 전달하면 모달 캘린더 popover 가 month grid 로
 *  렌더되어 다른 주 날짜 선택 가능 (EditSessionModal V3 패턴 미러). 미지정 시 weekday-only fallback. */
type GroupModalInitData = {
  studentIds: string[];
  subjectId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  yPosition: number;
  weekStartDate?: string;
};

export function buildOpenGroupModalHandler(
  setGroupModalData: (data: GroupModalInitData) => void,
  setShowGroupModal: (open: boolean) => void,
  getNextHour: (time: string) => string,
  /** 현재 시간표 주의 월요일 YYYY-MM-DD (KST). 호출 시점에 read 하여 모달 초기 weekStartDate 로 사용.
   *  미지정 시 모달 캘린더는 weekday-only fallback (이전 동작 호환). */
  getCurrentWeekStart?: () => string | undefined,
) {
  return (weekday: number, time: string, yPosition?: number) => {
    const weekStartDate = getCurrentWeekStart?.();
    logger.debug("그룹 수업 모달 열기", { weekday, time, yPosition, weekStartDate });
    setGroupModalData({
      studentIds: [],
      subjectId: "",
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      yPosition: yPosition || 1,
      weekStartDate,
    });
    setShowGroupModal(true);
    logger.debug("모달 상태 설정 완료", { showGroupModal: true });
  };
}

export function buildHandleDrop(params: {
  students: { id: string; name: string }[];
  enrollments: { id: string; studentId: string; subjectId: string }[];
  setIsStudentDragging: (v: boolean) => void;
  setGroupModalData: (data: GroupModalInitData) => void;
  setShowGroupModal: (open: boolean) => void;
  getNextHour: (time: string) => string;
  /** 현재 시간표 주의 월요일 YYYY-MM-DD (KST). drop 으로 모달이 열릴 때 캘린더 popover 가
   *  다른 주 날짜를 선택 가능하도록 초기 weekStartDate 로 세팅. */
  getCurrentWeekStart?: () => string | undefined;
}) {
  const {
    students,
    enrollments,
    setIsStudentDragging,
    setGroupModalData,
    setShowGroupModal,
    getNextHour,
    getCurrentWeekStart,
  } = params;

  return (
    weekday: number,
    time: string,
    enrollmentId: string,
    yPosition?: number
  ) => {
    logger.debug("handleDrop 호출됨", {
      weekday,
      time,
      enrollmentId,
      yPosition,
    });
    setIsStudentDragging(false);
    const weekStartDate = getCurrentWeekStart?.();

    if (enrollmentId.startsWith("student:")) {
      const studentId = enrollmentId.replace("student:", "");
      const student = students.find((s) => s.id === studentId);
      if (!student) {
        logger.warn("학생을 찾을 수 없음", { studentId });
        return;
      }

      setGroupModalData({
        studentIds: [studentId],
        subjectId: "",
        weekday,
        startTime: time,
        endTime: getNextHour(time),
        yPosition: yPosition || 1,
        weekStartDate,
      });
      setShowGroupModal(true);
      return;
    }

    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    if (!enrollment) {
      logger.warn("enrollment를 찾을 수 없음", { enrollmentId });
      return;
    }

    setGroupModalData({
      studentIds: [enrollment.studentId],
      subjectId: "",
      weekday,
      startTime: time,
      endTime: getNextHour(time),
      yPosition: yPosition || 1,
      weekStartDate,
    });
    setShowGroupModal(true);

    forceClearDragStateAfterDrop(100);
  };
}

export function buildHandleSessionClick(params: {
  enrollments: { id: string; studentId: string; subjectId: string }[];
  setEditModalData: (session: Session | null) => void;
  setEditModalTimeData: (v: { startTime: string; endTime: string }) => void;
  setTempSubjectId: (id: string) => void;
  setTempEnrollments: Dispatch<
    SetStateAction<Array<{ id: string; studentId: string; subjectId: string }>>
  >;
  setShowEditModal: (open: boolean) => void;
}) {
  const {
    enrollments,
    setEditModalData,
    setEditModalTimeData,
    setTempSubjectId,
    setTempEnrollments,
    setShowEditModal,
  } = params;

  return (session: Session) => {
    logger.debug("세션 클릭됨", {
      sessionId: session.id,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      enrollmentIds: session.enrollmentIds,
    });

    setEditModalData(session);
    setEditModalTimeData({
      startTime: session.startsAt,
      endTime: session.endsAt,
    });

    const firstEnrollment = enrollments.find(
      (e) => e.id === (session.enrollmentIds?.[0] || "")
    );
    setTempSubjectId(firstEnrollment?.subjectId || "");
    setTempEnrollments([]);
    setShowEditModal(true);

    logger.debug("편집 모달 열림", {
      editModalData: session,
      editModalTimeData: {
        startTime: session.startsAt,
        endTime: session.endsAt,
      },
      tempSubjectId: firstEnrollment?.subjectId || "",
    });
  };
}

export function buildHandleSessionDrop(params: {
  updateSessionPosition: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => Promise<void>;
  setGridVersion: Dispatch<SetStateAction<number>>;
}) {
  const { updateSessionPosition, setGridVersion } = params;
  return async (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => {
    logger.debug("Schedule 페이지 세션 드롭 처리", {
      sessionId,
      weekday,
      time,
      yPosition,
    });
    try {
      logger.debug("updateSessionPosition 호출 시작", { sessionId });
      await updateSessionPosition(sessionId, weekday, time, yPosition);
      logger.debug("세션 위치 업데이트 완료", { sessionId });
      setGridVersion((v) => v + 1);
    } catch (error) {
      logger.error("세션 위치 업데이트 실패", { sessionId }, error as Error);
      showError("세션 이동에 실패했습니다.");
    }
  };
}
