import React, { useState } from 'react';
import type { Subject } from '../../types/subjectsTypes';
import Button from './Button';
import styles from './SubjectListItem.module.css';

interface SubjectListItemProps {
  subject: Subject;
  isSelected: boolean;
  onSelect: (subjectId: string) => void;
  onDelete: (subjectId: string) => void;
  onUpdate: (subjectId: string, name: string, color: string) => void;
}

const SubjectListItem: React.FC<SubjectListItemProps> = ({
  subject,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subject.name);
  const [editColor, setEditColor] = useState(subject.color);

  const handleEdit = () => {
    setIsEditing(true);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(subject.id, editName.trim(), editColor);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={`${styles.container} ${isSelected ? styles.selected : ''}`}
      data-testid={`subject-item-${subject.id}`}
    >
      <div className={styles.content}>
        <div
          className={styles.colorIndicator}
          style={{ backgroundColor: subject.color }}
        />

        {isEditing ? (
          <div className={styles.editForm}>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editInput}
              autoFocus
            />
            <input
              type="color"
              value={editColor}
              onChange={e => setEditColor(e.target.value)}
              className={styles.colorInput}
              title="색상 변경"
            />
            <button
              onClick={handleSave}
              className={styles.saveButton}
              title="저장"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className={styles.cancelButton}
              title="취소"
            >
              ✕
            </button>
          </div>
        ) : (
          <span
            className={`${styles.name} ${isSelected ? styles.selectedName : ''}`}
            onClick={() => onSelect(subject.id)}
            data-testid={`subject-name-${subject.id}`}
          >
            {subject.name}
          </span>
        )}
      </div>

      {!isEditing && (
        <div className={styles.actions}>
          <Button
            onClick={handleEdit}
            variant="transparent"
            size="small"
            className={styles.editButton}
          >
            편집
          </Button>
          <Button
            onClick={() => onDelete(subject.id)}
            variant="danger"
            size="small"
            className={styles.deleteButton}
          >
            삭제
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubjectListItem;
