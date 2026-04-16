"use client";
import React from "react";
import Button from "../../../components/atoms/Button";
import Label from "../../../components/atoms/Label";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { BottomSheet } from "../../../components/molecules/BottomSheet";

type StudentOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };
type TeacherOption = { id: string; name: string; color: string };

interface EditSessionModalProps {
  isOpen: boolean;
  selectedStudents: StudentOption[];
  onRemoveStudent: (studentId: string) => void;
  editStudentInputValue: string;
  onEditStudentInputChange: (value: string) => void;
  onEditStudentInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddStudentClick: () => void;
  editSearchResults: StudentOption[];
  onSelectSearchStudent: (studentId: string) => void;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  tempSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
  tempTeacherId: string;
  onTeacherChange: (teacherId: string) => void;
  weekdays: string[];
  defaultWeekday: number;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  timeError: string;
  onDelete: () => Promise<void> | void;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
}

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  selectedStudents,
  onRemoveStudent,
  editStudentInputValue,
  onEditStudentInputChange,
  onEditStudentInputKeyDown,
  onAddStudentClick,
  editSearchResults,
  onSelectSearchStudent,
  subjects,
  teachers,
  tempSubjectId,
  onSubjectChange,
  tempTeacherId,
  onTeacherChange,
  weekdays,
  defaultWeekday,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  timeError,
  onDelete,
  onCancel,
  onSave,
}) => {
  const { containerRef } = useModalA11y({ isOpen, onClose: onCancel });
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const formContent = (
    <>
      <div className="mb-4 flex-1 overflow-y-auto pr-2">
        <div className="form-group">
          <Label htmlFor="edit-modal-students" required>
            학생
          </Label>
          <div className="mb-2 flex min-h-[32px] flex-wrap gap-2 rounded border border-[--color-border] bg-[--color-bg-secondary] p-1">
            {selectedStudents.map((student) => (
              <div key={student.id} className="inline-flex items-center gap-1.5 rounded-full bg-[--color-primary] px-2 py-1 text-xs font-medium text-white">
                <span>{student.name}</span>
                <button
                  type="button"
                  className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-0 text-sm font-bold text-white transition-colors duration-200 hover:bg-white/20"
                  onClick={() => onRemoveStudent(student.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="edit-modal-students"
              type="text"
              placeholder="학생 이름을 입력하세요"
              className="form-input flex-1"
              value={editStudentInputValue}
              onChange={(e) => onEditStudentInputChange(e.target.value)}
              onKeyDown={onEditStudentInputKeyDown}
            />
            <button
              type="button"
              className="cursor-pointer whitespace-nowrap rounded border-none bg-[--color-primary] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:enabled:bg-[--color-primary-dark] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-50"
              onClick={onAddStudentClick}
              disabled={!editStudentInputValue || !editStudentInputValue.trim()}
            >
              추가
            </button>
          </div>

          {editStudentInputValue.trim() && (
            <div className="mt-2 max-h-[200px] overflow-y-auto rounded border border-[--color-border] bg-[--color-bg-primary]">
              {editSearchResults.length === 0 ? (
                <div className="flex flex-col gap-1 p-3 text-center text-sm text-[--color-text-secondary]">
                  <span>검색 결과가 없습니다</span>
                  <span className="text-xs italic text-[--color-danger]">
                    (존재하지 않는 학생입니다)
                  </span>
                </div>
              ) : (
                editSearchResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="block w-full cursor-pointer border-0 border-b border-solid border-b-[--color-border-light] bg-transparent px-3 py-2 text-left text-[--color-text-primary] transition-colors duration-200 last:border-b-0 hover:bg-[--color-bg-secondary]"
                    onClick={() => onSelectSearchStudent(student.id)}
                  >
                    {student.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <Label htmlFor="edit-modal-subject" required>
            과목
          </Label>
          <select
            id="edit-modal-subject"
            className="form-select"
            value={tempSubjectId}
            onChange={(e) => onSubjectChange(e.target.value)}
          >
            <option value="">과목을 선택하세요</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {teachers.length > 0 && (
          <div className="form-group">
            <label htmlFor="edit-modal-teacher" className="form-label">강사</label>
            <select
              id="edit-modal-teacher"
              className="form-select"
              value={tempTeacherId}
              onChange={(e) => onTeacherChange(e.target.value)}
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
          <label htmlFor="edit-modal-weekday" className="form-label">요일</label>
          <select
            id="edit-modal-weekday"
            className="form-select"
            defaultValue={defaultWeekday}
          >
            {weekdays.map((w, idx) => (
              <option key={idx} value={idx}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="edit-modal-start-time" className="form-label">시작 시간</label>
          <input
            id="edit-modal-start-time"
            type="time"
            className="form-input"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="edit-modal-end-time" className="form-label">종료 시간</label>
          <input
            id="edit-modal-end-time"
            type="time"
            className="form-input"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
          />
        </div>
        {timeError && (
          <div className="form-error" role="alert">
            {timeError}
          </div>
        )}
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-2">
        <Button variant="danger" onClick={onDelete}>
          삭제
        </Button>
        <div className="flex gap-2">
          <Button variant="transparent" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" onClick={onSave}>
            저장
          </Button>
        </div>
      </div>
    </>
  );

  if (!isDesktop && isOpen) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onCancel}
        title="수업 편집"
        aria-labelledby="edit-session-modal-title"
      >
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
          aria-labelledby="edit-session-modal-title"
          ref={containerRef}
        >
          <h4 id="edit-session-modal-title" className="mb-4 shrink-0 text-lg font-semibold text-[--color-text-primary]">수업 편집</h4>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default EditSessionModal;
