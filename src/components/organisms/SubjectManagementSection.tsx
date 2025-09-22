import type { Subject } from "@/shared/types/DomainTypes";
import React, { useState } from "react";
import SubjectInputSection from "../molecules/SubjectInputSection";
import SubjectList from "../molecules/SubjectList";

interface SubjectManagementSectionProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onAddSubject: (name: string, color: string) => Promise<boolean>;
  onDeleteSubject: (subjectId: string) => void;
  onSelectSubject: (subjectId: string) => void;
  onUpdateSubject: (subjectId: string, name: string, color: string) => void;
  errorMessage?: string;
}

const SubjectManagementSection: React.FC<SubjectManagementSectionProps> = ({
  subjects,
  selectedSubjectId,
  onAddSubject,
  onDeleteSubject,
  onSelectSubject,
  onUpdateSubject,
  errorMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // 검색어에 따라 과목 필터링
  const filteredSubjects = searchQuery.trim()
    ? subjects.filter((subject) =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subjects;

  return (
    <section
      className="subject-management-section"
      data-testid="subject-management-section"
    >
      <h2>과목 목록</h2>

      {/* 과목 추가 섹션 */}
      <SubjectInputSection
        onAddSubject={onAddSubject}
        onSearchChange={setSearchQuery}
        errorMessage={errorMessage}
        subjects={subjects}
      />

      {/* 과목 목록 */}
      <SubjectList
        subjects={filteredSubjects}
        selectedSubjectId={selectedSubjectId}
        onSelectSubject={onSelectSubject}
        onDeleteSubject={onDeleteSubject}
        onUpdateSubject={onUpdateSubject}
      />

      {/* 선택된 과목 표시 */}
      {selectedSubjectId && (
        <div style={{ marginTop: 16 }}>
          <h3>
            선택된 과목:{" "}
            {subjects.find((s) => s.id === selectedSubjectId)?.name}
          </h3>
        </div>
      )}
    </section>
  );
};

export default SubjectManagementSection;
