"use client";
import React from "react";
import Button from "../../../components/atoms/Button";
import Label from "../../../components/atoms/Label";
import styles from "../Schedule.module.css";

type StudentOption = { id: string; name: string };
type SubjectOption = { id: string; name: string };

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
  tempSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
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
  tempSubjectId,
  onSubjectChange,
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
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h4 className={styles.modalTitle}>수업 편집</h4>
          <div className={styles.modalForm}>
            <div className="form-group">
              <Label htmlFor="edit-modal-students" required>
                학생
              </Label>
              <div className={styles.studentTagsContainer}>
                {selectedStudents.map((student) => (
                  <div key={student.id} className={styles.studentTag}>
                    <span>{student.name}</span>
                    <button
                      type="button"
                      className={styles.removeStudentBtn}
                      onClick={() => onRemoveStudent(student.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className={styles.studentInputContainer}>
                <input
                  type="text"
                  placeholder="학생 이름을 입력하세요"
                  className="form-input"
                  value={editStudentInputValue}
                  onChange={(e) => onEditStudentInputChange(e.target.value)}
                  onKeyDown={onEditStudentInputKeyDown}
                />
                <button
                  type="button"
                  className={styles.addStudentBtn}
                  onClick={onAddStudentClick}
                  disabled={!editStudentInputValue || !editStudentInputValue.trim()}
                  style={{
                    opacity:
                      !editStudentInputValue || !editStudentInputValue.trim()
                        ? 0.5
                        : 1,
                    cursor:
                      !editStudentInputValue || !editStudentInputValue.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  추가
                </button>
              </div>

              {editStudentInputValue.trim() && (
                <div className={styles.studentSearchResults}>
                  {editSearchResults.length === 0 ? (
                    <div className={styles.noSearchResults}>
                      <span>검색 결과가 없습니다</span>
                      <span className={styles.studentNotFound}>
                        (존재하지 않는 학생입니다)
                      </span>
                    </div>
                  ) : (
                    editSearchResults.map((student) => (
                      <div
                        key={student.id}
                        className={styles.studentSearchItem}
                        onClick={() => onSelectSearchStudent(student.id)}
                      >
                        {student.name}
                      </div>
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

            <div className="form-group">
              <label className="form-label">요일</label>
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
              <label className="form-label">시작 시간</label>
              <input
                id="edit-modal-start-time"
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">종료 시간</label>
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

          <div className={styles.modalActions}>
            <Button variant="danger" onClick={onDelete}>
              삭제
            </Button>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="transparent" onClick={onCancel}>
                취소
              </Button>
              <Button variant="primary" onClick={onSave}>
                저장
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSessionModal;


