"use client";
import React from "react";
import Button from "../../../components/atoms/Button";
import Label from "../../../components/atoms/Label";
import type { GroupSessionData } from "../../../types/scheduleTypes";
import styles from "../Schedule.module.css";

type SubjectOption = { id: string; name: string; color?: string };
type StudentOption = { id: string; name: string };

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
  students: StudentOption[];
  weekdays: string[];
  handleStartTimeChange: (newStartTime: string) => void;
  handleEndTimeChange: (newEndTime: string) => void;
  groupTimeError: string;
  addGroupSession: (data: GroupSessionData) => void;
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
  students,
  weekdays,
  handleStartTimeChange,
  handleEndTimeChange,
  groupTimeError,
  addGroupSession,
}) => {
  if (!isOpen) return null;

  const selectableStudents = filteredStudentsForModal.filter(
    (st) => !groupModalData.studentIds.includes(st.id)
  );

  const studentExistsExact = students.some(
    (s) => s.name.toLowerCase() === studentInputValue.toLowerCase()
  );

  return (
    <div className="modal-backdrop">
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <h4 className={styles.modalTitle}>수업 추가</h4>
          <div className={styles.modalForm}>
            <div className="form-group">
              <Label htmlFor="modal-student" required>
                학생
              </Label>
              <div className={styles.studentTagsContainer}>
                {groupModalData.studentIds.map((studentId) => {
                  const student = students.find((s) => s.id === studentId);
                  return student ? (
                    <span key={studentId} className={styles.studentTag}>
                      {student.name}
                      <button
                        type="button"
                        className={styles.removeStudentBtn}
                        onClick={() => removeStudent(studentId)}
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
              <div className={styles.studentInputContainer}>
                <input
                  id="modal-student-input"
                  type="text"
                  className="form-input"
                  placeholder="학생 이름을 입력하세요"
                  value={studentInputValue}
                  onChange={(e) => setStudentInputValue(e.target.value)}
                  onKeyDown={handleStudentInputKeyDown}
                />
                <button
                  type="button"
                  className={styles.addStudentBtn}
                  onClick={addStudentFromInput}
                  disabled={!studentInputValue.trim()}
                >
                  추가
                </button>
              </div>
              {studentInputValue && (
                <div className={styles.studentSearchResults}>
                  {selectableStudents.length === 0 ? (
                    <div className={styles.noSearchResults}>
                      <span>검색 결과가 없습니다</span>
                      {!studentExistsExact && (
                        <span className={styles.studentNotFound}>
                          (존재하지 않는 학생입니다)
                        </span>
                      )}
                    </div>
                  ) : (
                    selectableStudents.map((student) => (
                      <div
                        key={student.id}
                        className={styles.studentSearchItem}
                        onClick={() => addStudent(student.id)}
                      >
                        {student.name}
                      </div>
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

          <div className={styles.modalActions}>
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
        </div>
      </div>
    </div>
  );
};

export default GroupSessionModal;


