import React, { useEffect, useRef, useState } from "react";
import type { Student } from "../../lib/planner";
import StudentListItem from "../atoms/StudentListItem";

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

    window.addEventListener("resize", checkScrollable);

    return () => {
      window.removeEventListener("resize", checkScrollable);
    };
  }, [students]);

  return (
    <div className={className} style={style}>
      <div
        ref={containerRef}
        className="m-0 max-h-[400px] list-none overflow-auto rounded-md border border-[--color-border] bg-[--color-bg-primary] p-0"
        role="list"
      >
        {isLoading ? (
          <div className="m-2 flex min-h-[120px] flex-col items-center justify-center rounded border border-dashed border-[--color-border-light] bg-[--color-bg-secondary] p-6 text-[--color-text-muted]">
            <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[--color-border-light] border-t-[--color-primary]" />
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
              <div className="m-2 rounded border border-dashed border-[--color-border-light] bg-[--color-bg-secondary] p-4 text-center italic text-[--color-text-muted]">
                학생을 추가해주세요
              </div>
            )}
          </>
        )}
      </div>

      {isScrollable && !isLoading && (
        <div className="mt-2 rounded-b-md border-t border-[--color-border-light] bg-[--color-bg-secondary] p-2 text-center text-xs italic text-[--color-text-muted]">
          스크롤하여 확인
        </div>
      )}
    </div>
  );
};

export default StudentList;
