import type { Subject } from "@/shared/types/DomainTypes";
import React, { useEffect, useRef, useState } from "react";
import SubjectListItem from "../atoms/SubjectListItem";

interface SubjectListProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  onDeleteSubject: (subjectId: string) => void;
  onUpdateSubject: (subjectId: string, name: string, color: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

const SubjectList: React.FC<SubjectListProps> = ({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onDeleteSubject,
  onUpdateSubject,
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
  }, [subjects]);

  return (
    <div className={className} style={style}>
      <div
        ref={containerRef}
        className="list-scroll-reveal relative m-0 max-h-[400px] list-none overflow-auto rounded-md border border-[--color-border] bg-[--color-bg-primary] p-0"
        role="list"
      >
        {subjects.map((subject) => (
          <SubjectListItem
            key={subject.id}
            subject={subject}
            isSelected={selectedSubjectId === subject.id}
            onSelect={onSelectSubject}
            onDelete={onDeleteSubject}
            onUpdate={onUpdateSubject}
          />
        ))}
        {subjects.length === 0 && (
          <div className="m-2 rounded border border-dashed border-[--color-border-light] bg-[--color-bg-secondary] p-4 text-center italic text-[--color-text-muted]">
            과목을 추가해주세요
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

export default SubjectList;
