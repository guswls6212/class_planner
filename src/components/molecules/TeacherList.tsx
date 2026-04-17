import React, { useEffect, useRef, useState } from "react";
import TeacherListItem from "../atoms/TeacherListItem";

interface Teacher {
  id: string;
  name: string;
  color: string;
}

interface TeacherListProps {
  teachers: Teacher[];
  onDeleteTeacher: (teacherId: string) => void;
  onUpdateTeacher: (teacherId: string, name: string, color: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const TeacherList: React.FC<TeacherListProps> = ({
  teachers,
  onDeleteTeacher,
  onUpdateTeacher,
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
    return () => window.removeEventListener("resize", checkScrollable);
  }, [teachers]);

  return (
    <div className={className} style={style}>
      <div
        ref={containerRef}
        className="list-scroll-reveal relative m-0 max-h-[400px] list-none overflow-auto rounded-md border border-[--color-border] bg-[--color-bg-primary] p-0"
        role="list"
      >
        {teachers.map((teacher) => (
          <TeacherListItem
            key={teacher.id}
            teacher={teacher}
            onDelete={onDeleteTeacher}
            onUpdate={onUpdateTeacher}
          />
        ))}
        {teachers.length === 0 && (
          <div className="m-2 rounded border border-dashed border-[--color-border-light] bg-[--color-bg-secondary] p-4 text-center italic text-[--color-text-muted]">
            강사를 추가해주세요
          </div>
        )}
      </div>

      {isScrollable && (
        <div className="mt-2 rounded-b-md border-t border-[--color-border-light] bg-[--color-bg-secondary] p-2 text-center text-xs italic text-[--color-text-muted]">
          스크롤하여 확인
        </div>
      )}
    </div>
  );
};

export default TeacherList;
