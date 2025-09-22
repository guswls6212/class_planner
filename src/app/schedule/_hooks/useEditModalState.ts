import { useState } from "react";
import type { Session } from "../../../lib/planner";
import { DEFAULT_EDIT_MODAL_TIME_DATA } from "../_constants/scheduleConstants";
import type { TempEnrollment } from "../_utils/sessionSaveUtils";

export function useEditModalState() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalData, setEditModalData] = useState<Session | null>(null);
  const [tempSubjectId, setTempSubjectId] = useState<string>("");
  const [tempEnrollments, setTempEnrollments] = useState<TempEnrollment[]>([]);
  const [editStudentInputValue, setEditStudentInputValue] = useState("");
  const [editModalTimeData, setEditModalTimeData] = useState(
    DEFAULT_EDIT_MODAL_TIME_DATA
  );
  const [editTimeError, setEditTimeError] = useState<string>("");

  return {
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
  } as const;
}
