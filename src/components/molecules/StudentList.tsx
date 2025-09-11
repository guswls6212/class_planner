import React, { useEffect, useRef, useState } from "react";
import type { Student } from "../../lib/planner";
import StudentListItem from "../atoms/StudentListItem";

interface StudentListProps {
  students: Student[];
  selectedStudentId: string;
  onSelectStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  isLoading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  onDeleteStudent,
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
      <div
        ref={containerRef}
        className="relative custom-scrollbar list-none m-0 p-0 max-h-[400px] overflow-auto bg-bg-primary rounded-md border border-border"
        role="list"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-lg text-text-muted bg-bg-secondary m-sm rounded-sm border border-dashed border-border-light min-h-[120px]">
            <div className="w-6 h-6 border-2 border-border-light border-t-primary rounded-full animate-spin mb-sm"></div>
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
              />
            ))}
            {students.length === 0 && (
              <div className="text-center italic text-text-muted p-md bg-bg-secondary m-sm rounded-sm border border-dashed border-border-light">
                학생을 추가해주세요
              </div>
            )}
          </>
        )}
      </div>

      {/* 스크롤 안내 메시지 - 실제 스크롤이 활성화될 때만 표시 */}
      {isScrollable && !isLoading && (
        <div className="text-center italic text-text-muted p-sm text-xs border-t border-border-light mt-sm bg-bg-secondary rounded-b-md">
          스크롤하여 확인
        </div>
      )}
    </div>
  );
};

export default StudentList;
