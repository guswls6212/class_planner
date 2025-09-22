/**
 * 세션 추가/수정 폼 컴포넌트
 */

import { useCallback, useMemo, useState } from "react";
import type { Student, Subject } from "../../lib/planner";
import { weekdays } from "../../lib/planner";
import Button from "../atoms/Button";
import Input from "../atoms/Input";
import Label from "../atoms/Label";

interface SessionFormProps {
  subjects: Subject[];
  students: Student[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sessionData: any) => void;
  initialData?: {
    subjectId?: string;
    weekday?: number;
    startTime?: string;
    endTime?: string;
    studentIds?: string[];
    room?: string;
    yPosition?: number;
  };
}

export default function SessionForm({
  subjects,
  students,
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SessionFormProps) {
  const [formData, setFormData] = useState({
    subjectId: initialData?.subjectId || "",
    weekday: initialData?.weekday || 0,
    startTime: initialData?.startTime || "09:00",
    endTime: initialData?.endTime || "10:00",
    studentIds: initialData?.studentIds || [],
    room: initialData?.room || "",
    yPosition: initialData?.yPosition || 1,
  });

  // 즉시 검증용 에러 메시지
  const [errorMessage, setErrorMessage] = useState<string>("");

  const toMinutes = useCallback((t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }, []);

  const durationMinutes = useMemo(() => {
    const start = toMinutes(formData.startTime);
    const end = toMinutes(formData.endTime);
    return end - start;
  }, [formData.startTime, formData.endTime, toMinutes]);

  const validateTimes = useCallback(
    (next: { startTime?: string; endTime?: string }) => {
      const start = toMinutes(next.startTime ?? formData.startTime);
      const end = toMinutes(next.endTime ?? formData.endTime);
      if (end <= start) {
        setErrorMessage("종료 시간은 시작 시간보다 늦어야 합니다.");
        return false;
      }
      if (end - start > 8 * 60) {
        setErrorMessage("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
        return false;
      }
      setErrorMessage("");
      return true;
    },
    [formData.startTime, formData.endTime, toMinutes]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.subjectId || formData.studentIds.length === 0) {
        setErrorMessage("과목과 학생을 선택해주세요.");
        return;
      }

      // 제출 시 방어적 검증
      const start = toMinutes(formData.startTime);
      const end = toMinutes(formData.endTime);
      if (end <= start) {
        setErrorMessage("종료 시간은 시작 시간보다 늦어야 합니다.");
        return;
      }
      if (end - start > 8 * 60) {
        setErrorMessage("세션 시간은 최대 8시간까지 설정할 수 있습니다.");
        return;
      }

      onSubmit(formData);
      onClose();
    },
    [formData, onSubmit, onClose, toMinutes]
  );

  const handleStudentToggle = useCallback((studentId: string) => {
    setFormData((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>세션 {initialData ? "수정" : "추가"}</h3>
          <Button variant="transparent" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="session-form">
          {/* 과목 선택 */}
          <div className="form-group">
            <Label htmlFor="subject">과목</Label>
            <select
              id="subject"
              value={formData.subjectId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subjectId: e.target.value }))
              }
              required
            >
              <option value="">과목을 선택하세요</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* 요일 선택 */}
          <div className="form-group">
            <Label htmlFor="weekday">요일</Label>
            <select
              id="weekday"
              value={formData.weekday}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  weekday: parseInt(e.target.value),
                }))
              }
            >
              {weekdays.map((day, index) => (
                <option key={index} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* 시간 선택 */}
          <div className="form-group">
            <Label htmlFor="startTime">시작 시간</Label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) => {
                const value = e.target.value;
                validateTimes({ startTime: value });
                setFormData((prev) => ({ ...prev, startTime: value }));
              }}
              required
            />
          </div>

          <div className="form-group">
            <Label htmlFor="endTime">종료 시간</Label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => {
                const value = e.target.value;
                validateTimes({ endTime: value });
                setFormData((prev) => ({ ...prev, endTime: value }));
              }}
              required
            />
          </div>

          {errorMessage && (
            <div className="form-error" role="alert">
              {errorMessage}
            </div>
          )}

          {/* 강의실 */}
          <div className="form-group">
            <Label htmlFor="room">강의실</Label>
            <Input
              value={formData.room}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, room: e.target.value }))
              }
              placeholder="강의실 (선택사항)"
            />
          </div>

          {/* 학생 선택 */}
          <div className="form-group">
            <Label>수강 학생</Label>
            <div className="student-checkbox-list">
              {students.map((student) => (
                <label key={student.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={formData.studentIds.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                  />
                  <span>{student.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 버튼들 */}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" variant="primary">
              {initialData ? "수정" : "추가"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
