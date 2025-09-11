"use client";

import type { Subject as DomainSubject } from "@/shared/types/DomainTypes";
import React, { useEffect, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import SubjectsPageLayout from "../../components/organisms/SubjectsPageLayout";
import { useGlobalSubjects } from "../../hooks/useGlobalSubjects";

const SELECTED_SUBJECT_KEY = "selectedSubjectId";

const SubjectsPage: React.FC = () => {
  return (
    <AuthGuard requireAuth={true}>
      <SubjectsPageContent />
    </AuthGuard>
  );
};

const SubjectsPageContent: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const { subjects, addSubject, deleteSubject, updateSubject, errorMessage } =
    useGlobalSubjects();

  // 디버깅용 로그
  console.log("🔍 SubjectsPage - subjects:", subjects);
  console.log("🔍 SubjectsPage - subjects.length:", subjects.length);

  // subjectsTypes의 Subject를 DomainTypes의 Subject로 변환
  const domainSubjects: DomainSubject[] = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // localStorage에 선택된 과목 저장
  useEffect(() => {
    if (selectedSubjectId) {
      localStorage.setItem(SELECTED_SUBJECT_KEY, selectedSubjectId);
    }
  }, [selectedSubjectId]);

  // 과목 선택 핸들러
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
  };

  return (
    <SubjectsPageLayout
      subjects={domainSubjects}
      selectedSubjectId={selectedSubjectId}
      onAddSubject={addSubject}
      onDeleteSubject={deleteSubject}
      onSelectSubject={handleSelectSubject}
      onUpdateSubject={updateSubject}
      errorMessage={errorMessage}
    />
  );
};

export default SubjectsPage;
