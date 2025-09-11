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
        className="relative custom-scrollbar"
        role="list"
        style={{
          listStyle: "none !important",
          listStyleType: "none !important",
          listStyleImage: "none !important",
          margin: 0,
          padding: 0,
          maxHeight: "400px",
          overflow: "auto",
          background: "var(--color-bg-primary)",
          borderRadius: "var(--border-radius-md)",
          border: "1px solid var(--color-border)",
        }}
      >
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: "var(--spacing-lg)",
              color: "var(--color-text-muted)",
              background: "var(--color-bg-secondary)",
              margin: "var(--spacing-sm)",
              borderRadius: "var(--border-radius-sm)",
              border: "1px dashed var(--color-border-light)",
              minHeight: "120px",
            }}
          >
            <div
              className="rounded-full animate-spin mb-2"
              style={{
                width: "24px",
                height: "24px",
                border: "2px solid var(--color-border-light)",
                borderTop: "2px solid var(--color-primary)",
                marginBottom: "var(--spacing-sm)",
              }}
            ></div>
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
              <div
                className="text-center italic"
                style={{
                  color: "var(--color-text-muted)",
                  padding: "var(--spacing-md)",
                  background: "var(--color-bg-secondary)",
                  margin: "var(--spacing-sm)",
                  borderRadius: "var(--border-radius-sm)",
                  border: "1px dashed var(--color-border-light)",
                }}
              >
                학생을 추가해주세요
              </div>
            )}
          </>
        )}
      </div>

      {/* 스크롤 안내 메시지 - 실제 스크롤이 활성화될 때만 표시 */}
      {isScrollable && !isLoading && (
        <div
          className="text-center italic"
          style={{
            color: "var(--color-text-muted)",
            padding: "var(--spacing-sm)",
            fontSize: "12px",
            borderTop: "1px solid var(--color-border-light)",
            marginTop: "var(--spacing-sm)",
            background: "var(--color-bg-secondary)",
            borderRadius: "0 0 var(--border-radius-md) var(--border-radius-md)",
          }}
        >
          스크롤하여 확인
        </div>
      )}
    </div>
  );
};

export default StudentList;
