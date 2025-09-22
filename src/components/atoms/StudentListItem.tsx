import React, { useState } from "react";
import type { Student } from "../../lib/planner";
import ConfirmModal from "../molecules/ConfirmModal";
import Button from "./Button";
import styles from "./StudentListItem.module.css";

interface StudentListItemProps {
  student: Student;
  isSelected: boolean;
  onSelect: (studentId: string) => void;
  onDelete: (studentId: string) => void;
  onUpdate?: (studentId: string, name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentListItem: React.FC<StudentListItemProps> = ({
  student,
  isSelected,
  onSelect,
  onDelete,
  onUpdate,
  className = "",
  style = {},
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(student.name);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(student.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditName(student.name);
  };

  const handleSave = () => {
    const name = editName.trim();
    if (!name) return setIsEditing(false);
    if (onUpdate) {
      onUpdate(student.id, name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setIsEditing(false);
  };

  const containerClasses = [
    styles.container,
    isSelected ? styles.selected : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const studentNameClasses = [
    styles.studentName,
    isSelected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={containerClasses}
        onClick={() => onSelect(student.id)}
        style={style}
        role="listitem"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(student.id);
          }
        }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value.slice(0, 4))}
            onKeyDown={handleKeyDown}
            className={styles.editInput}
            autoFocus
          />
        ) : (
          <span className={studentNameClasses}>{student.name}</span>
        )}
        <div className={styles.deleteButton}>
          {isEditing ? (
            <>
              <Button
                variant="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
              >
                저장
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(false);
                }}
              >
                취소
              </Button>
            </>
          ) : (
            <>
              {onUpdate && (
                <Button
                  variant="transparent"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                >
                  편집
                </Button>
              )}
              <Button
                variant="danger"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
              >
                삭제
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="학생 삭제"
        message={`'${student.name}' 학생을 삭제하시겠습니까?`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </>
  );
};

export default StudentListItem;
