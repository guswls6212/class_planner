import type { Subject } from "@/shared/types/DomainTypes";
import React, { useState } from "react";
import ConfirmModal from "../molecules/ConfirmModal";
import Button from "./Button";
import styles from "./SubjectListItem.module.css";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const handleSave = () => {
    if (editName.trim()) {
      const name = editName.trim().slice(0, 6);
      onUpdate(subject.id, name, editColor);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(subject.name);
    setEditColor(subject.color);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(subject.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div
        className={`${styles.container} ${isSelected ? styles.selected : ""}`}
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
                onChange={(e) => setEditName(e.target.value.slice(0, 6))}
                onKeyDown={handleKeyDown}
                className={styles.editInput}
                autoFocus
                maxLength={6}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className={styles.colorInput}
                title="색상 변경"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className={styles.saveButton}
                title="저장"
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className={styles.cancelButton}
                title="취소"
              >
                ✕
              </button>
            </div>
          ) : (
            <span
              className={`${styles.name} ${
                isSelected ? styles.selectedName : ""
              }`}
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
              onClick={handleDeleteClick}
              variant="danger"
              size="small"
              className={styles.deleteButton}
            >
              삭제
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="과목 삭제"
        message={`'${subject.name}' 과목을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </>
  );
};

export default SubjectListItem;
