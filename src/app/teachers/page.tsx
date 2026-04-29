"use client";

import { useState } from "react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";

const TeachersPage = () => {
  const { teachers, addTeacher, deleteTeacher, updateTeacher, errorMessage, clearError } =
    useTeacherManagementLocal();

  const { data } = useIntegratedDataLocal();
  const { subjects = [], enrollments = [], sessions = [], students = [] } = data ?? {};

  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const handleUpdate = (id: string, name: string, color: string) => {
    updateTeacher(id, { name, color });
  };

  return (
    <TeachersPageLayout
      teachers={teachers}
      sessions={sessions}
      enrollments={enrollments}
      subjects={subjects}
      students={students}
      selectedTeacherId={selectedTeacherId}
      onSelectTeacher={setSelectedTeacherId}
      onAddTeacher={addTeacher}
      onDeleteTeacher={deleteTeacher}
      onUpdateTeacher={handleUpdate}
      errorMessage={errorMessage}
      onClearError={clearError}
    />
  );
};

export default TeachersPage;
