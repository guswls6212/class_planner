import type { Dispatch, SetStateAction } from "react";
import { logger } from "../../../lib/logger";
import type { Session } from "../../../lib/planner";
import type { TempEnrollment } from "./sessionSaveUtils";

export function buildEditStudentInputChange(
  setEditStudentInputValue: (v: string) => void
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    logger.debug("학생 입력값 변경", { value });
    setEditStudentInputValue(value);
  };
}

export function buildEditStudentAdd(params: {
  students: { id: string; name: string }[];
  enrollments: { id: string; studentId: string; subjectId: string }[];
  editModalData: Session | null;
  getEditStudentInputValue: () => string;
  setEditStudentInputValue: (v: string) => void;
  setTempEnrollments: Dispatch<SetStateAction<TempEnrollment[]>>;
  setEditModalData: Dispatch<SetStateAction<Session | null>>;
}) {
  const {
    students,
    enrollments,
    editModalData,
    getEditStudentInputValue,
    setEditStudentInputValue,
    setTempEnrollments,
    setEditModalData,
  } = params;

  return (studentId?: string) => {
    logger.debug("handleEditStudentAdd 호출", { studentId });

    const inputValue = getEditStudentInputValue();

    const targetStudentId =
      studentId ||
      students.find((s) => s.name.toLowerCase() === inputValue.toLowerCase())
        ?.id;

    logger.debug("찾은 학생 ID", { targetStudentId });

    if (!targetStudentId) {
      logger.warn("학생을 찾을 수 없음", { inputValue });
      return;
    }

    const isAlreadyAdded = editModalData?.enrollmentIds?.some(
      (enrollmentId: string) => {
        const enrollment = enrollments.find((e) => e.id === enrollmentId);
        return enrollment?.studentId === targetStudentId;
      }
    );

    if (isAlreadyAdded) {
      logger.warn("이미 추가된 학생", { studentId: targetStudentId });
      setEditStudentInputValue("");
      return;
    }

    const existing = enrollments.find((e) => {
      const firstEnrollment = enrollments.find(
        (x) => x.id === editModalData?.enrollmentIds?.[0]
      );
      return (
        e.studentId === targetStudentId &&
        e.subjectId === (firstEnrollment?.subjectId || "")
      );
    });

    const tempId: string | null = null;
    const subjectIdForTemp = ((): string => {
      const firstEnrollment = enrollments.find(
        (e) => e.id === editModalData?.enrollmentIds?.[0]
      );
      return firstEnrollment?.subjectId || "";
    })();

    const enrollmentIdToUse = existing?.id || crypto.randomUUID();

    // 14명 제한 체크를 먼저 수행
    if (
      editModalData &&
      !editModalData.enrollmentIds?.includes(enrollmentIdToUse)
    ) {
      const currentCount = editModalData.enrollmentIds?.length || 0;
      if (currentCount >= 14) {
        alert("최대 14명까지 추가할 수 있습니다.");
        return;
      }
    }

    if (!existing) {
      // 임시 enrollment 생성 (TempEnrollment 형태로 상태에 저장)
      const temp: TempEnrollment = {
        id: enrollmentIdToUse,
        studentId: targetStudentId,
        subjectId: subjectIdForTemp,
      };
      setTempEnrollments((prev) => [...prev, temp]);
    }

    if (
      editModalData &&
      enrollmentIdToUse &&
      !editModalData.enrollmentIds?.includes(enrollmentIdToUse)
    ) {
      setEditModalData((prev: Session | null) =>
        prev
          ? {
              ...prev,
              enrollmentIds: [...(prev.enrollmentIds || []), enrollmentIdToUse],
            }
          : null
      );
      setEditStudentInputValue("");
    }
  };
}

export function buildEditStudentAddClick(
  handleEditStudentAdd: (studentId?: string) => void
) {
  return () => {
    logger.debug("학생 추가 버튼 클릭");
    handleEditStudentAdd();
  };
}
