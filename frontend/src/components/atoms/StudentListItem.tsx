import React from 'react';
import type { Student } from '../../lib/planner';
import Button from './Button';

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
  return (
    <li
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        ...style,
      }}
    >
      <Button
        variant="transparent"
        onClick={() => onSelect(student.id)}
        style={{
          fontWeight: isSelected ? 600 : 400,
        }}
        data-testid={`student-name-${student.id}`}
      >
        {student.name}
      </Button>
      <Button
        variant="danger"
        size="small"
        onClick={() => onDelete(student.id)}
      >
        삭제
      </Button>
    </li>
  );
};

export default StudentListItem;
