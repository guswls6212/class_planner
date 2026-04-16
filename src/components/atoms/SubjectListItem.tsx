import type { Subject } from "@/shared/types/DomainTypes";
import React, { useState } from "react";
import ConfirmModal from "../molecules/ConfirmModal";
import Button from "./Button";

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
        className={`flex items-center justify-between rounded border border-[--color-border] bg-[--color-bg-primary] p-2 mb-1 transition-all duration-200 hover:border-[--color-border-light] hover:bg-[--color-bg-secondary] ${
          isSelected ? "border-[--color-primary] bg-[--color-primary-light]" : ""
        }`}
        data-testid={`subject-item-${subject.id}`}
      >
        <div className="flex flex-1 items-center gap-2">
          <div
            className="h-3 w-3 shrink-0 rounded-full border border-[--color-border]"
            style={{ backgroundColor: subject.color }}
          />

          {isEditing ? (
            <div className="flex flex-1 items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, 6))}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded border border-[--color-border] bg-[--color-bg-primary] px-1.5 py-0.5 text-sm text-[--color-text-primary] focus:border-[--color-primary] focus:shadow-[0_0_0_1px_var(--color-primary)] focus:outline-none"
                autoFocus
                maxLength={6}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border border-[--color-border] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                title="색상 변경"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none bg-[--color-success] text-xs text-white hover:bg-[--color-success-dark]"
                title="저장"
              >
                ✓
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel();
                }}
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded border-none bg-[--color-danger] text-xs text-white hover:bg-[--color-danger-dark]"
                title="취소"
              >
                ✕
              </button>
            </div>
          ) : (
            <span
              className={`cursor-pointer text-sm transition-[font-weight] duration-200 hover:text-[--color-primary] ${
                isSelected
                  ? "font-bold text-[--color-primary]"
                  : "text-[--color-text-primary]"
              }`}
              onClick={() => onSelect(subject.id)}
              data-testid={`subject-name-${subject.id}`}
            >
              {subject.name}
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-1">
            <Button
              onClick={handleEdit}
              variant="transparent"
              size="small"
            >
              편집
            </Button>
            <Button
              onClick={handleDeleteClick}
              variant="danger"
              size="small"
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
