import React from 'react';
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
  return (
    <div className={className} style={style}>
      {/* 과목 목록 */}
      <div
        className={`${styles.container} ${className}`}
        style={style}
        role="list"
      >
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
        {subjects.length > 10 && (
          <div className={styles.scrollIndicator}>스크롤하여 확인</div>
        )}
      </div>
    </div>
  );
};

export default SubjectList;
