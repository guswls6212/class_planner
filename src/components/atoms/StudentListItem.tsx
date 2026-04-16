import React, { useState } from "react";
import type { Student } from "../../lib/planner";
import ConfirmModal from "../molecules/ConfirmModal";
import Button from "./Button";

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

  return (
    <>
      <div
        className={`relative flex cursor-pointer items-center justify-between rounded border border-[--color-border] bg-[--color-bg-primary] px-4 py-2 mb-1 list-none select-none transition-all duration-200 before:!content-none before:!hidden after:!content-none after:!hidden hover:border-[--color-border-light] hover:bg-[--color-bg-secondary] ${
          isSelected
            ? "border-[--color-primary] bg-[--color-primary-light]"
            : ""
        } ${className}`}
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
            className="mr-2 flex-1 rounded border border-[--color-border] bg-[--color-bg-primary] px-2 py-1 text-[--color-text-primary]"
            autoFocus
          />
        ) : (
          <span className={`flex-1 text-left transition-[font-weight] duration-200 ${
            isSelected
              ? "font-semibold text-[--color-primary]"
              : "font-normal text-[--color-text-primary]"
          }`}>
            {student.name}
          </span>
        )}
        <div className="ml-2 flex shrink-0 gap-1">
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
