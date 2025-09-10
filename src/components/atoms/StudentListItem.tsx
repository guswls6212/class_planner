import React from 'react';
import type { Student } from '../../lib/planner';
import Button from './Button';
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
          onClick={() => {
            onDelete(student.id);
          }}
        >
          삭제
        </Button>
      </div>
    </div>
  );
};

export default StudentListItem;
