"use client";

/**
 * EditSessionModal 호출 래퍼 — 30+ props 의 거대한 inline JSX (~113 줄) 을 별도 component 분리.
 *
 * 기존: schedule/page.tsx 의 inline JSX (line 2312-2425) — selectedStudents 계산 +
 * onRemoveStudent / onSubjectColorChange 등 inline 콜백 + buildEditOnSave/Cancel/
 * Delete builder 호출 + tempTeacherId 분기 모두 inline.
 *
 * 본 component: presentation only. 30+ props (state + setter + deps) 받아 EditSessionModal
 * 호출. inline 콜백은 본 component 안에 그대로 (props 받은 setter/handler 사용).
 *
 * Sub-proposal: schedule-page-split-refactor PR 22 (loop iter 19, JSX 분리 phase).
 */

import dynamic from "next/dynamic";
import type { Session, Student, Enrollment, Subject, Teacher } from "@/lib/planner";
import { weekdays } from "@/lib/planner";
import { logger } from "@/lib/logger";
import { syncSubjectUpdate } from "@/lib/apiSync";
import { getClassPlannerData } from "@/lib/localStorageCrud";
import { buildEditOnCancel, buildEditOnDelete, buildEditOnSave } from "../_utils/editSaveHandlers";
import { buildSelectedStudents, filterEditableStudents, removeStudentFromEnrollmentIds } from "../_utils/scheduleSelectors";
import {
  buildSessionSaveData,
  ensureEnrollmentIdsForSubject,
  extractStudentIds,
  processTempEnrollments,
} from "../_utils/sessionSaveUtils";

const EditSessionModal = dynamic(() => import("./EditSessionModal"), {
  ssr: false,
});

interface TempEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

interface Props {
  showEditModal: boolean;
  editModalData: Session | null;
  setEditModalData: React.Dispatch<React.SetStateAction<Session | null>>;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;

  enrollments: Enrollment[];
  students: Student[];
  subjects: Subject[];
  teachers: Teacher[];
  tempEnrollments: TempEnrollment[];
  setTempEnrollments: React.Dispatch<React.SetStateAction<TempEnrollment[]>>;

  editStudentInputValue: string;
  setEditStudentInputValue: React.Dispatch<React.SetStateAction<string>>;
  handleEditCreateStudentAndAdd: () => Promise<void> | void;
  handleEditStudentAdd: (studentId: string) => void;

  tempSubjectId: string;
  setTempSubjectId: React.Dispatch<React.SetStateAction<string>>;
  tempTeacherId: string | null | undefined;
  setTempTeacherId: React.Dispatch<
    React.SetStateAction<string | null | undefined>
  >;

  currentWeekStart: string;
  editModalTimeData: { startTime: string; endTime: string };
  handleEditStartTimeChange: (value: string) => void;
  handleEditEndTimeChange: (value: string) => void;
  editTimeError: string;

  userId: string | null;
  updateData: (payload: any) => Promise<boolean>;
  updateSession: (sessionId: string, data: any) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>;
  validateAndToastEdit: any;
  setSelectedDate: (date: Date) => void;

  // Layer 1 B 출결 통합 (2026-05-28, mockup edit-session-with-attendance)
  /** 본 세션의 출결 map (key = studentId). 미제공 시 출결 섹션 안 보임. */
  attendanceMap?: Record<string, { status: string }>;
  /** 학생 cycle pill click handler — caller (schedule/page.tsx) 가 markAttendance 호출. */
  onMarkAttendance?: (
    studentId: string,
    status: "present" | "absent" | "late" | "none",
  ) => Promise<void> | void;
  /** 출결 권한 — false 시 pill disabled. caller 가 role + member-teacher 매칭 계산. */
  canManageAttendance?: boolean;
}

export default function ScheduleEditModalWrapper(props: Props) {
  return (
    <EditSessionModal
      isOpen={Boolean(props.showEditModal && props.editModalData)}
      selectedStudents={buildSelectedStudents(
        props.editModalData?.enrollmentIds,
        props.enrollments,
        props.tempEnrollments.map((t) => ({
          id: t.id,
          studentId: t.studentId,
          subjectId: t.subjectId,
        })),
        props.students,
      )}
      onRemoveStudent={(studentId) => {
        const updatedEnrollmentIds = removeStudentFromEnrollmentIds(
          studentId,
          props.editModalData?.enrollmentIds,
          props.enrollments,
          props.tempEnrollments.map((t) => ({
            id: t.id,
            studentId: t.studentId,
            subjectId: t.subjectId,
          })),
        );
        props.setTempEnrollments((prev) =>
          prev.filter((e) => e.studentId !== studentId),
        );
        props.setEditModalData((prev) =>
          prev ? { ...prev, enrollmentIds: updatedEnrollmentIds } : null,
        );
      }}
      editStudentInputValue={props.editStudentInputValue}
      onEditStudentInputChange={(value) => {
        logger.debug("학생 입력값 변경", { value });
        props.setEditStudentInputValue(value);
      }}
      onEditStudentInputKeyDown={() => {
        // C 패턴 — Enter no-op. 추가는 dropdown row 클릭 또는 CTA 버튼만.
        // 이전 동작(Enter 자동 매칭 추가)은 동명이인 케이스에서 잘못된 학생
        // 자동 선택 위험 → 의식적 클릭으로 통일.
      }}
      onAddStudentClick={props.handleEditCreateStudentAndAdd}
      editSearchResults={filterEditableStudents(
        props.editStudentInputValue,
        props.editModalData,
        props.enrollments,
        props.tempEnrollments,
        props.students,
      )}
      onSelectSearchStudent={(studentId) => props.handleEditStudentAdd(studentId)}
      subjects={props.subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      onSubjectColorChange={(subjectId, newColor) => {
        const subject = props.subjects.find((s) => s.id === subjectId);
        if (!subject) return;
        const updated = props.subjects.map((s) =>
          s.id === subjectId ? { ...s, color: newColor } : s,
        );
        props.updateData({ subjects: updated });
        syncSubjectUpdate(props.userId, subjectId, {
          name: subject.name,
          color: newColor,
        });
      }}
      teachers={props.teachers.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? "#6366f1",
        role: t.role,
        email: t.email,
        phone: t.phone,
        subjectIds: t.subjectIds ?? [],
      }))}
      tempSubjectId={props.tempSubjectId}
      onSubjectChange={(subjectId) => props.setTempSubjectId(subjectId)}
      tempTeacherId={
        props.tempTeacherId === undefined
          ? props.editModalData?.teacherId || ""
          : props.tempTeacherId ?? ""
      }
      onTeacherChange={(teacherId) => props.setTempTeacherId(teacherId)}
      weekdays={weekdays}
      defaultWeekday={props.editModalData?.weekday ?? 0}
      weekStartDate={props.currentWeekStart}
      startTime={props.editModalTimeData.startTime}
      endTime={props.editModalTimeData.endTime}
      onStartTimeChange={props.handleEditStartTimeChange}
      onEndTimeChange={props.handleEditEndTimeChange}
      timeError={props.editTimeError}
      onDelete={buildEditOnDelete({
        editModalData: props.editModalData,
        deleteSession: props.deleteSession,
        setShowEditModal: props.setShowEditModal,
      })}
      onCancel={buildEditOnCancel({
        setShowEditModal: props.setShowEditModal,
        setTempSubjectId: props.setTempSubjectId,
        onCancel: () => props.setTempTeacherId(undefined),
      })}
      onSave={buildEditOnSave({
        editModalData: props.editModalData,
        editModalTimeData: props.editModalTimeData,
        tempSubjectId: props.tempSubjectId,
        tempTeacherId: props.tempTeacherId,
        tempEnrollments: props.tempEnrollments,
        enrollments: props.enrollments,
        addEnrollment: props.addEnrollment,
        getClassPlannerData,
        processTempEnrollments,
        ensureEnrollmentIdsForSubject,
        extractStudentIds,
        buildSessionSaveData,
        updateSession: props.updateSession,
        validateAndToastEdit: props.validateAndToastEdit,
        setShowEditModal: props.setShowEditModal,
        setTempSubjectId: props.setTempSubjectId,
        setTempEnrollments: props.setTempEnrollments,
        onSaveComplete: () => props.setTempTeacherId(undefined),
        onMoveToWeek: (weekStartDate: string) => {
          props.setSelectedDate(
            new Date(`${weekStartDate}T12:00:00+09:00`),
          );
        },
      })}
      attendanceMap={props.attendanceMap}
      onMarkAttendance={props.onMarkAttendance}
      canManageAttendance={props.canManageAttendance}
    />
  );
}
