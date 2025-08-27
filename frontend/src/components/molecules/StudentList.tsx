import React from 'react';
import type { Student } from '../../lib/planner';
import StudentListItem from '../atoms/StudentListItem';

interface StudentListProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onDeleteStudent,
  className = '',
  style = {},
}) => {
  return (
    <ul
      className={`student-list ${className}`}
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        maxHeight: '400px',
        overflow: 'auto',
        ...style,
      }}
    >
      {students.map(student => (
        <StudentListItem
          key={student.id}
          student={student}
          isSelected={selectedStudentId === student.id}
          onSelect={onSelectStudent}
          onDelete={onDeleteStudent}
        />
      ))}
      {students.length === 0 && (
        <li
          style={{
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            textAlign: 'center',
          }}
        >
          학생을 추가해주세요
        </li>
      )}
      {students.length > 10 && (
        <li
          style={{
            color: 'var(--color-text-muted)',
            padding: '8px 0',
            fontSize: '12px',
            textAlign: 'center',
            borderTop: '1px solid var(--color-border-light)',
            marginTop: '8px',
          }}
        >
          스크롤하여 확인
        </li>
      )}
    </ul>
  );
};

export default StudentList;
