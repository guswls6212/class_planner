"use client";

import React from "react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";

const TeachersPage: React.FC = () => {
  const { teachers, addTeacher, deleteTeacher, updateTeacher, errorMessage } =
    useTeacherManagementLocal();

  const handleUpdateTeacher = (
    teacherId: string,
    name: string,
    color: string
  ) => {
    updateTeacher(teacherId, { name, color });
  };

  return (
    <TeachersPageLayout
      teachers={teachers}
      onAddTeacher={addTeacher}
      onDeleteTeacher={deleteTeacher}
      onUpdateTeacher={handleUpdateTeacher}
      errorMessage={errorMessage}
    />
  );
};

export default TeachersPage;
