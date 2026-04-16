import React, { useState } from "react";
import ConfirmModal from "../molecules/ConfirmModal";
import Button from "./Button";

interface Teacher {
  id: string;
  name: string;
  color: string;
}

interface TeacherListItemProps {
  teacher: Teacher;
  onDelete: (teacherId: string) => void;
  onUpdate: (teacherId: string, name: string, color: string) => void;
}

const TeacherListItem: React.FC<TeacherListItemProps> = ({
  teacher,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teacher.name);
  const [editColor, setEditColor] = useState(teacher.color);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEdit = () => {
    setIsEditing(true);
    setEditName(teacher.name);
    setEditColor(teacher.color);
  };

  const handleSave = () => {
    if (editName.trim()) {
      onUpdate(teacher.id, editName.trim(), editColor);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(teacher.name);
    setEditColor(teacher.color);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <>
      <div
        className="flex items-center justify-between rounded border border-[--color-border] bg-[--color-bg-primary] p-2 mb-1 transition-all duration-200 hover:border-[--color-border-light] hover:bg-[--color-bg-secondary]"
        data-testid={`teacher-item-${teacher.id}`}
      >
        <div className="flex flex-1 items-center gap-2">
          <div
            className="h-3 w-3 shrink-0 rounded-full border border-[--color-border]"
            style={{ backgroundColor: teacher.color }}
          />

          {isEditing ? (
            <div className="flex flex-1 items-center gap-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 rounded border border-[--color-border] bg-[--color-bg-primary] px-1.5 py-0.5 text-sm text-[--color-text-primary] focus:border-[--color-primary] focus:shadow-[0_0_0_1px_var(--color-primary)] focus:outline-none"
                autoFocus
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
              className="text-sm text-[--color-text-primary]"
              data-testid={`teacher-name-${teacher.id}`}
            >
              {teacher.name}
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 gap-1">
            <Button onClick={handleEdit} variant="transparent" size="small">
              편집
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
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
        title="강사 삭제"
        message={`'${teacher.name}' 강사를 삭제하시겠습니까? 해당 강사가 배정된 수업에서 강사 정보가 제거됩니다.`}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={() => {
          onDelete(teacher.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </>
  );
};

export default TeacherListItem;
