import React from 'react';
import type { Subject } from '../../types/subjectsTypes';
import SubjectManagementSection from './SubjectManagementSection';

interface SubjectsPageLayoutProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onAddSubject: (name: string, color: string) => boolean;
  onDeleteSubject: (subjectId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onUpdateSubject: (subjectId: string, name: string, color: string) => void;
  errorMessage?: string;
}

const SubjectsPageLayout: React.FC<SubjectsPageLayoutProps> = ({
  subjects,
  selectedSubjectId,
  onAddSubject,
  onDeleteSubject,
  onSelectSubject,
  onUpdateSubject,
  errorMessage,
}) => {
  return (
    <div
      data-testid="subjects-page"
      className="grid"
      style={{
        gridTemplateColumns: '340px 1fr', // 좌측 340px 고정 너비 (학생 페이지와 동일)
        gap: 16,
        padding: 16,
      }}
    >
      <SubjectManagementSection
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onAddSubject={onAddSubject}
        onDeleteSubject={onDeleteSubject}
        onSelectSubject={onSelectSubject}
        onUpdateSubject={onUpdateSubject}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default SubjectsPageLayout;
