import type { Subject } from '../../lib/planner';
import Button from '../atoms/Button';

interface SessionModalProps {
  isOpen: boolean;
  isEdit?: boolean;
  title: string;
  data: {
    studentId: string;
    weekday: number;
    startTime: string;
    endTime: string;
  };
  subjects: Subject[];
  weekdays: string[];
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowModal = (isOpen: boolean): boolean => {
  return isOpen;
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowDeleteButton = (
  isEdit: boolean,
  onDelete?: () => void,
): boolean => {
  return isEdit && Boolean(onDelete);
};

// eslint-disable-next-line react-refresh/only-export-components
export const getSubmitButtonText = (isEdit: boolean): string => {
  return isEdit ? '저장' : '추가';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getSubjectSelectId = (isEdit: boolean): string => {
  return isEdit ? 'edit-modal-subject' : 'modal-subject';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getWeekdaySelectId = (isEdit: boolean): string => {
  return isEdit ? 'edit-modal-weekday' : 'modal-weekday';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getStartTimeInputId = (isEdit: boolean): string => {
  return isEdit ? 'edit-modal-start-time' : 'modal-start-time';
};

// eslint-disable-next-line react-refresh/only-export-components
export const getEndTimeInputId = (isEdit: boolean): string => {
  return isEdit ? 'edit-modal-end-time' : 'modal-end-time';
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateModalData = (data: SessionModalProps['data']): boolean => {
  return Boolean(
    data.studentId && data.weekday >= 0 && data.startTime && data.endTime,
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const hasSubjects = (subjects: Subject[]): boolean => {
  return subjects.length > 0;
};

// eslint-disable-next-line react-refresh/only-export-components
export const hasWeekdays = (weekdays: string[]): boolean => {
  return weekdays.length > 0;
};

export default function SessionModal({
  isOpen,
  isEdit = false,
  title,
  data,
  subjects,
  weekdays,
  onSubmit,
  onCancel,
  onDelete,
}: SessionModalProps) {
  if (!shouldShowModal(isOpen)) return null;

  return (
    <div className="session-modal">
      <h4>{title}</h4>

      <div className="session-modal-form">
        <div>
          <label>과목</label>
          <select id={getSubjectSelectId(isEdit)}>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>요일</label>
          <select id={getWeekdaySelectId(isEdit)} defaultValue={data.weekday}>
            {weekdays.map((w, idx) => (
              <option key={idx} value={idx}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>시작 시간</label>
          <input
            id={getStartTimeInputId(isEdit)}
            type="time"
            defaultValue={data.startTime}
          />
        </div>

        <div>
          <label>종료 시간</label>
          <input
            id={getEndTimeInputId(isEdit)}
            type="time"
            defaultValue={data.endTime}
          />
        </div>
      </div>

      <div className="session-modal-buttons">
        {shouldShowDeleteButton(isEdit, onDelete) && onDelete && (
          <Button variant="danger" size="small" onClick={onDelete}>
            삭제
          </Button>
        )}

        <div className="session-modal-right-buttons">
          <Button variant="transparent" size="small" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" size="small" onClick={onSubmit}>
            {getSubmitButtonText(isEdit)}
          </Button>
        </div>
      </div>
    </div>
  );
}
