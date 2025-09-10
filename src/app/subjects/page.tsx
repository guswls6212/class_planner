"use client";

import React, { useEffect, useState } from "react";
import SubjectsPageLayout from "../../components/organisms/SubjectsPageLayout";
import { useGlobalSubjects } from "../../hooks/useGlobalSubjects";

const SELECTED_SUBJECT_KEY = "selectedSubjectId";

const SubjectsPage: React.FC = () => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const { subjects, addSubject, deleteSubject, updateSubject, errorMessage } =
    useGlobalSubjects();

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
      subjects={subjects}
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
