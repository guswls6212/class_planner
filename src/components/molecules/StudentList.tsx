import React, { useEffect, useRef, useState } from "react";
import type { Student } from "../../lib/planner";
import StudentListItem from "../atoms/StudentListItem";
import styles from "./StudentList.module.css";

interface StudentListProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudent?: (studentId: string, name: string) => void;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onDeleteStudent,
  onUpdateStudent,
  isLoading = false,
  className = "",
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        setIsScrollable(scrollHeight > clientHeight);
      }
    };

    checkScrollable();

    // 리사이즈 이벤트 리스너 추가
    window.addEventListener("resize", checkScrollable);

    return () => {
      window.removeEventListener("resize", checkScrollable);
    };
  }, [students]);

  return (
    <div className={className} style={style}>
      {/* 학생 목록 */}
      <div ref={containerRef} className={styles.container} role="list">
        {isLoading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner}></div>
            <span>학생 목록을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {students.map((student) => (
              <StudentListItem
                key={student.id}
                student={student}
                isSelected={selectedStudentId === student.id}
                onSelect={onSelectStudent}
                onDelete={onDeleteStudent}
                onUpdate={onUpdateStudent}
              />
            ))}
            {students.length === 0 && (
              <div className={styles.emptyMessage}>학생을 추가해주세요</div>
            )}
          </>
        )}
      </div>

      {/* 스크롤 안내 메시지 - 실제 스크롤이 활성화될 때만 표시 */}
      {isScrollable && !isLoading && (
        <div className={styles.scrollIndicator}>스크롤하여 확인</div>
      )}
    </div>
  );
};

export default StudentList;
