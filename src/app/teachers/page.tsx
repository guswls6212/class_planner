"use client";

import { useCallback, useState } from "react";
import TeachersPageLayout from "../../components/organisms/TeachersPageLayout";
import { useTeacherManagementLocal } from "../../hooks/useTeacherManagementLocal";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useMyRole } from "../../hooks/useMyRole";
import type { TeacherRole } from "../../lib/planner";

const TeachersPage = () => {
  const { canManage, linkedTeacherId } = useMyRole();
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

  // useTeacherManagementLocal의 addTeacher는 (name, color, userId?, profile?)을 받지만
  // TeachersPageLayout는 (name, color, profile?) 형태만 노출. userId는 신규 추가 시점에
  // 항상 null (강사를 user 계정에 link하는 별도 흐름은 detail panel에서).
  const handleAddTeacher = useCallback(
    async (
      name: string,
      color: string,
      profile?: { email?: string; phone?: string },
    ): Promise<boolean> => {
      return addTeacher(
        name,
        color,
        null,
        profile
          ? { email: profile.email ?? null, phone: profile.phone ?? null }
          : undefined,
      );
    },
    [addTeacher],
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
      onAddTeacher={handleAddTeacher}
      onDeleteTeacher={deleteTeacher}
      onUpdateTeacher={handleUpdate}
      onAddTeacherSubject={addTeacherSubject}
      onRemoveTeacherSubject={removeTeacherSubject}
      errorMessage={errorMessage}
      onClearError={clearError}
      canManage={canManage}
      linkedTeacherId={linkedTeacherId}
    />
  );
};

export default TeachersPage;
