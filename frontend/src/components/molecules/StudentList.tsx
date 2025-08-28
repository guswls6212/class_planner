import React from 'react';
import type { Student } from '../../lib/planner';
import StudentListItem from '../atoms/StudentListItem';
import styles from './StudentList.module.css';

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
    <div
      className={`${styles.container} ${className}`}
      style={style}
      role="list"
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
        <div className={styles.emptyMessage}>학생을 추가해주세요</div>
      )}
      {students.length > 10 && (
        <div className={styles.scrollIndicator}>스크롤하여 확인</div>
      )}
    </div>
  );
};

export default StudentList;
