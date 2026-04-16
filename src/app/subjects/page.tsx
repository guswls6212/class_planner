"use client";

import React from "react";
import SubjectsPageLayout from "../../components/organisms/SubjectsPageLayout";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useSubjectManagementLocal } from "../../hooks/useSubjectManagementLocal";
import { useLocal } from "../../hooks/useLocal";
import { logger } from "../../lib/logger";

const SubjectsPage: React.FC = () => {
  return <SubjectsPageContent />;
};

const SubjectsPageContent: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useLocal("ui:selectedSubject", "");

  const { subjects, addSubject, deleteSubject, updateSubject, errorMessage } =
    useSubjectManagementLocal();

  // Integrated data for students, enrollments, sessions
  const { data } = useIntegratedDataLocal();
  const { students = [], enrollments = [], sessions = [] } = data ?? {};

  logger.debug("SubjectsPage - subjects:", { subjects });

  // 과목 선택 핸들러
  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
  };

  const handleUpdateSubject = async (
    subjectId: string,
    name: string,
    color: string
  ): Promise<boolean | void> => {
    return updateSubject(subjectId, { name, color });
  };

  return (
    <SubjectsPageLayout
      subjects={subjects}
      students={students}
      enrollments={enrollments}
      sessions={sessions}
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
