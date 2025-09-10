import React, { useState } from 'react';
import type { Student } from '../../lib/planner';
import Button from './Button';
import ConfirmModal from '../molecules/ConfirmModal';
import styles from './StudentListItem.module.css';

interface StudentListItemProps {
  student: Student;
  isSelected: boolean;
  onSelect: (studentId: string) => void;
  onDelete: (studentId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentListItem: React.FC<StudentListItemProps> = ({
  student,
  isSelected,
  onSelect,
  onDelete,
  className = '',
  style = {},
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const containerClasses = [
    styles.container,
    isSelected ? styles.selected : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const studentNameClasses = [
    styles.studentName,
    isSelected ? styles.selected : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        className={containerClasses}
        onClick={() => onSelect(student.id)}
        style={style}
        role="listitem"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(student.id);
          }
        }}
      >
        <span className={studentNameClasses}>{student.name}</span>
        <div className={styles.deleteButton}>
          <Button
            variant="danger"
            size="small"
            onClick={handleDeleteClick}
          >
            삭제
          </Button>
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
