"use client";
import React from "react";
import Button from "../../../components/atoms/Button";
import Label from "../../../components/atoms/Label";
import type { GroupSessionData } from "../../../types/scheduleTypes";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { BottomSheet } from "../../../components/molecules/BottomSheet";

type SubjectOption = { id: string; name: string; color?: string };
type StudentOption = { id: string; name: string };
type TeacherOption = { id: string; name: string; color: string };

interface GroupSessionModalProps {
  isOpen: boolean;
  groupModalData: GroupSessionData;
  setGroupModalData: React.Dispatch<React.SetStateAction<GroupSessionData>>;
  setShowGroupModal: (open: boolean) => void;
  removeStudent: (studentId: string) => void;
  studentInputValue: string;
  setStudentInputValue: (val: string) => void;
  handleStudentInputKeyDown: (e: React.KeyboardEvent) => void;
  addStudentFromInput: () => void;
  filteredStudentsForModal: StudentOption[];
  addStudent: (studentId: string) => void;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  students: StudentOption[];
  weekdays: string[];
  handleStartTimeChange: (newStartTime: string) => void;
  handleEndTimeChange: (newEndTime: string) => void;
  groupTimeError: string;
  addGroupSession: (data: GroupSessionData) => void;
  onCreateStudent: () => void;
  studentCreating: boolean;
  studentCreateError: string;
}

const GroupSessionModal: React.FC<GroupSessionModalProps> = ({
  isOpen,
  groupModalData,
  setGroupModalData,
  setShowGroupModal,
  removeStudent,
  studentInputValue,
  setStudentInputValue,
  handleStudentInputKeyDown,
  addStudentFromInput,
  filteredStudentsForModal,
  addStudent,
  subjects,
  teachers,
  students,
  weekdays,
  handleStartTimeChange,
  handleEndTimeChange,
  groupTimeError,
  addGroupSession,
  onCreateStudent,
  studentCreating,
  studentCreateError,
}) => {
  const { containerRef } = useModalA11y({
    isOpen,
    onClose: () => setShowGroupModal(false),
  });
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectableStudents = filteredStudentsForModal.filter(
    (st) => !groupModalData.studentIds.includes(st.id)
  );

  const studentExistsExact = students.some(
    (s) => s.name.toLowerCase() === studentInputValue.toLowerCase()
  );

  const formContent = (
    <>
      <div className="mb-4 flex-1 overflow-y-auto pr-2">
        <div className="form-group">
          <Label htmlFor="modal-student" required>
            학생
          </Label>
          <div className="mb-2 flex min-h-[32px] flex-wrap gap-2 rounded border border-[--color-border] bg-[--color-bg-secondary] p-1">
            {groupModalData.studentIds.map((studentId) => {
              const student = students.find((s) => s.id === studentId);
              return student ? (
                <span key={studentId} className="inline-flex items-center gap-1.5 rounded-full bg-[--color-primary] px-2 py-1 text-xs font-medium text-white">
                  {student.name}
                  <button
                    type="button"
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/20"
                    onClick={() => removeStudent(studentId)}
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="modal-student-input"
              type="text"
              className="form-input flex-1"
              placeholder="학생 이름을 입력하세요"
              value={studentInputValue}
              onChange={(e) => setStudentInputValue(e.target.value)}
              onKeyDown={handleStudentInputKeyDown}
            />
            <button
              type="button"
              className="cursor-pointer whitespace-nowrap rounded border-none bg-[--color-primary] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:enabled:bg-[--color-primary-dark] disabled:cursor-not-allowed disabled:bg-gray-400"
              onClick={
                selectableStudents.length === 0 && !studentExistsExact && studentInputValue.trim()
                  ? onCreateStudent
                  : addStudentFromInput
              }
              disabled={!studentInputValue.trim() || studentCreating}
            >
              {selectableStudents.length === 0 && !studentExistsExact && studentInputValue.trim()
                ? "새 학생 추가"
                : "추가"}
            </button>
          </div>
          {studentInputValue && (
            <div className="mt-2 max-h-[200px] overflow-y-auto rounded border border-[--color-border] bg-[--color-bg-primary]">
              {selectableStudents.length === 0 ? (
                <div className="flex flex-col gap-1 p-3 text-center text-sm text-[--color-text-secondary]">
                  {studentExistsExact ? (
                    <span>이미 추가된 학생입니다</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="block w-full min-h-[44px] cursor-pointer rounded border-none bg-[--color-primary] px-4 py-2.5 text-left text-sm font-medium text-white transition-colors duration-200 hover:enabled:bg-[--color-primary-dark] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70"
                        onClick={onCreateStudent}
                        disabled={studentCreating}
                      >
                        {studentCreating
                          ? "추가 중..."
                          : `＋ '${studentInputValue.trim()}' 새 학생으로 추가`}
                      </button>
                      {studentCreateError && (
                        <p className="mt-1.5 text-xs text-[--color-danger]">
                          {studentCreateError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                selectableStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="block w-full cursor-pointer border-0 border-b border-solid border-b-[--color-border-light] bg-transparent px-3 py-2 text-left text-[--color-text-primary] transition-colors duration-200 last:border-b-0 hover:bg-[--color-bg-secondary]"
                    onClick={() => addStudent(student.id)}
                  >
                    {student.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <Label htmlFor="modal-subject" required>
            과목
          </Label>
          <select
            id="modal-subject"
            className="form-select"
            value={groupModalData.subjectId}
            onChange={(e) =>
              setGroupModalData((prev) => ({
                ...prev,
                subjectId: e.target.value,
              }))
            }
            disabled={groupModalData.studentIds.length === 0}
          >
            <option value="">
              {groupModalData.studentIds.length === 0
                ? "먼저 학생을 선택하세요"
                : "과목을 선택하세요"}
            </option>
            {groupModalData.studentIds.length > 0 &&
              subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
          </select>
        </div>

        {teachers.length > 0 && (
          <div className="form-group">
            <Label htmlFor="modal-teacher">강사</Label>
            <select
              id="modal-teacher"
              className="form-select"
              value={groupModalData.teacherId || ""}
              onChange={(e) =>
                setGroupModalData((prev) => ({
                  ...prev,
                  teacherId: e.target.value || undefined,
                }))
              }
            >
              <option value="">강사 선택 (선택사항)</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <Label htmlFor="modal-weekday" required>
            요일
          </Label>
          <select
            id="modal-weekday"
            className="form-select"
            value={groupModalData.weekday}
            onChange={(e) =>
              setGroupModalData((prev) => ({
                ...prev,
                weekday: Number(e.target.value),
              }))
            }
          >
            {weekdays.map((w, idx) => (
              <option key={idx} value={idx}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <Label htmlFor="modal-start-time" required>
            시작 시간
          </Label>
          <input
            id="modal-start-time"
            type="time"
            className="form-input"
            value={groupModalData.startTime}
            onChange={(e) => handleStartTimeChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <Label htmlFor="modal-end-time" required>
            종료 시간
          </Label>
          <input
            id="modal-end-time"
            type="time"
            className="form-input"
            value={groupModalData.endTime}
            onChange={(e) => handleEndTimeChange(e.target.value)}
          />
        </div>

        {groupTimeError && (
          <div className="form-error" role="alert">
            {groupTimeError}
          </div>
        )}

        <div className="form-group">
          <Label htmlFor="modal-room">강의실</Label>
          <input
            id="modal-room"
            type="text"
            className="form-input"
            placeholder="강의실 (선택사항)"
            value={groupModalData.room || ""}
            onChange={(e) =>
              setGroupModalData((prev) => ({
                ...prev,
                room: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="transparent"
          onClick={() => setShowGroupModal(false)}
        >
          취소
        </Button>
        <Button
          variant="primary"
          onClick={() => addGroupSession(groupModalData)}
          disabled={
            groupModalData.studentIds.length === 0 ||
            !groupModalData.subjectId ||
            !groupModalData.startTime ||
            !groupModalData.endTime
          }
        >
          추가
        </Button>
      </div>
    </>
  );

  if (!isDesktop && isOpen) {
    return (
      <BottomSheet isOpen={isOpen} onClose={() => setShowGroupModal(false)} title="수업 추가" aria-labelledby="group-session-modal-title">
        {formContent}
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="fixed left-1/2 top-1/2 z-[9999] flex min-w-[320px] max-w-[90vw] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-[--color-border] bg-[--color-bg-primary] p-4 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur-[10px]">
        <div
          className="flex h-full flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-session-modal-title"
          ref={containerRef}
        >
          <h4 id="group-session-modal-title" className="mb-4 shrink-0 text-lg font-semibold text-[--color-text-primary]">수업 추가</h4>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default GroupSessionModal;
