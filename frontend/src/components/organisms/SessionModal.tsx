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
export const getModalStyles = (): React.CSSProperties => {
  return {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.9)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 16,
    zIndex: 1000,
    minWidth: 320,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getTitleStyles = (): React.CSSProperties => {
  return {
    margin: '0 0 12px 0',
    color: '#fff',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getFormGridStyles = (): React.CSSProperties => {
  return {
    display: 'grid',
    gap: 8,
    marginBottom: 16,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getLabelStyles = (): React.CSSProperties => {
  return {
    display: 'block',
    color: '#ccc',
    fontSize: 12,
    marginBottom: 4,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getSelectStyles = (): React.CSSProperties => {
  return {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getInputStyles = (): React.CSSProperties => {
  return {
    width: '100%',
    padding: '6px',
    borderRadius: 4,
    background: '#333',
    color: '#fff',
    border: '1px solid #555',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getButtonContainerStyles = (): React.CSSProperties => {
  return {
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getRightButtonContainerStyles = (): React.CSSProperties => {
  return {
    display: 'flex',
    gap: 8,
    marginLeft: 'auto',
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowModal = (isOpen: boolean): boolean => {
  return isOpen;
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowDeleteButton = (
  isEdit: boolean,
  onDelete?: () => void
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
    data.studentId && data.weekday >= 0 && data.startTime && data.endTime
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

  const modalStyles = getModalStyles();
  const titleStyles = getTitleStyles();
  const formGridStyles = getFormGridStyles();
  const labelStyles = getLabelStyles();
  const selectStyles = getSelectStyles();
  const inputStyles = getInputStyles();
  const buttonContainerStyles = getButtonContainerStyles();
  const rightButtonContainerStyles = getRightButtonContainerStyles();

  return (
    <div style={modalStyles}>
      <h4 style={titleStyles}>{title}</h4>

      <div style={formGridStyles}>
        <div>
          <label style={labelStyles}>과목</label>
          <select id={getSubjectSelectId(isEdit)} style={selectStyles}>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyles}>요일</label>
          <select
            id={getWeekdaySelectId(isEdit)}
            defaultValue={data.weekday}
            style={selectStyles}
          >
            {weekdays.map((w, idx) => (
              <option key={idx} value={idx}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyles}>시작 시간</label>
          <input
            id={getStartTimeInputId(isEdit)}
            type="time"
            defaultValue={data.startTime}
            style={inputStyles}
          />
        </div>

        <div>
          <label style={labelStyles}>종료 시간</label>
          <input
            id={getEndTimeInputId(isEdit)}
            type="time"
            defaultValue={data.endTime}
            style={inputStyles}
          />
        </div>
      </div>

      <div style={buttonContainerStyles}>
        {shouldShowDeleteButton(isEdit, onDelete) && (
          <Button variant="danger" size="small" onClick={onDelete}>
            삭제
          </Button>
        )}

        <div style={rightButtonContainerStyles}>
          <Button variant="secondary" size="small" onClick={onCancel}>
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
