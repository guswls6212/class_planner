"use client";

import { useCallback, useState } from "react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useMyRole } from "../../hooks/useMyRole";
import type { TeacherRole } from "../../lib/planner";

const TeachersPage = () => {
  const { canManage } = useMyRole();
  const {
    teachers,
    addTeacher,
    deleteTeacher,
    updateTeacher,
    addTeacherSubject,
    removeTeacherSubject,
    errorMessage,
    clearError,
  } = useTeacherManagementLocal();

  const { data } = useIntegratedDataLocal();
  const { subjects = [], enrollments = [], sessions = [], students = [] } = data ?? {};

  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const handleUpdate = useCallback(
    (id: string, updates: {
      name?: string;
      color?: string;
      email?: string | null;
      phone?: string | null;
      role?: TeacherRole | null;
      notes?: string | null;
    }) => {
      updateTeacher(id, updates);
    },
    [updateTeacher]
  );

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
      onAddTeacherSubject={addTeacherSubject}
      onRemoveTeacherSubject={removeTeacherSubject}
      errorMessage={errorMessage}
      onClearError={clearError}
      canManage={canManage}
    />
  );
};

export default TeachersPage;
