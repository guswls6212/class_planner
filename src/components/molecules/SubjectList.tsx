import React, { useEffect, useRef, useState } from 'react';
import type { Subject } from '../../types/subjectsTypes';
import SubjectListItem from '../atoms/SubjectListItem';
import styles from './SubjectList.module.css';

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
  className = '',
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
    window.addEventListener('resize', checkScrollable);

    return () => {
      window.removeEventListener('resize', checkScrollable);
    };
  }, [subjects]);

  return (
    <div className={className} style={style}>
      {/* 과목 목록 */}
      <div ref={containerRef} className={styles.container} role="list">
        {subjects.map(subject => (
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
          <div className={styles.emptyMessage}>과목을 추가해주세요</div>
        )}
      </div>

      {/* 스크롤 안내 메시지 - 실제 스크롤이 활성화될 때만 표시 */}
      {isScrollable && (
        <div className={styles.scrollIndicator}>스크롤하여 확인</div>
      )}
    </div>
  );
};

export default SubjectList;
