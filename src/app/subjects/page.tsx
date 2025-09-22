"use client";

import type { Subject as DomainSubject } from "@/shared/types/DomainTypes";
import React, { useEffect, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import SubjectsPageLayout from "../../components/organisms/SubjectsPageLayout";
import { useSubjectManagementLocal } from "../../hooks/useSubjectManagementLocal";
import { logger } from "../../lib/logger";

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
    useSubjectManagementLocal();

  // 디버깅용 로그
  logger.debug("SubjectsPage - subjects:", { subjects });
  logger.debug("SubjectsPage - subjects.length", {
    subjectsLength: subjects.length,
  });

  // subjectsTypes의 Subject를 DomainTypes의 Subject로 변환
  const domainSubjects: DomainSubject[] = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color || "#3b82f6", // 기본 색상 제공
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

  const handleUpdateSubject = (
    subjectId: string,
    name: string,
    color: string
  ) => {
    updateSubject(subjectId, { name, color });
  };

  return (
    <SubjectsPageLayout
      subjects={domainSubjects}
      selectedSubjectId={selectedSubjectId}
      onAddSubject={addSubject}
      onDeleteSubject={deleteSubject}
      onSelectSubject={handleSelectSubject}
      onUpdateSubject={handleUpdateSubject}
      errorMessage={errorMessage}
    />
  );
};

export default SubjectsPage;
