import Button from '../atoms/Button';
import type { Subject } from '../../lib/planner';

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
  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>{title}</h4>

      <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div>
          <label
            style={{
              display: 'block',
              color: '#ccc',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            과목
          </label>
          <select
            id={isEdit ? 'edit-modal-subject' : 'modal-subject'}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: 4,
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          >
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#ccc',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            요일
          </label>
          <select
            id={isEdit ? 'edit-modal-weekday' : 'modal-weekday'}
            defaultValue={data.weekday}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: 4,
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          >
            {weekdays.map((w, idx) => (
              <option key={idx} value={idx}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#ccc',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            시작 시간
          </label>
          <input
            id={isEdit ? 'edit-modal-start-time' : 'modal-start-time'}
            type="time"
            defaultValue={data.startTime}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: 4,
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              color: '#ccc',
              fontSize: 12,
              marginBottom: 4,
            }}
          >
            종료 시간
          </label>
          <input
            id={isEdit ? 'edit-modal-end-time' : 'modal-end-time'}
            type="time"
            defaultValue={data.endTime}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: 4,
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        {isEdit && onDelete && (
          <Button variant="danger" size="small" onClick={onDelete}>
            삭제
          </Button>
        )}

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <Button variant="secondary" size="small" onClick={onCancel}>
            취소
          </Button>
          <Button variant="primary" size="small" onClick={onSubmit}>
            {isEdit ? '저장' : '추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
