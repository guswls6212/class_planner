"use client";

import { useEffect, useState } from "react";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { useMyRole } from "../../hooks/useMyRole";
import { useAccessCodes } from "../../hooks/useAccessCodes";
import { supabase } from "../../utils/supabaseClient";
import type { Student } from "../../lib/planner";
import { logger } from "../../lib/logger";
import { showError } from "../../lib/toast";

export default function StudentsPage() {
  return <StudentsPageContent />;
}

function StudentsPageContent() {
  const { canManage, isLoading: isRoleLoading, academies } = useMyRole();

  // Auth + active academy resolution (for academy URL + access code fetching)
  const [userId, setUserId] = useState<string | null>(null);
  const [activeAcademyId, setActiveAcademyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setUserId(session?.user?.id ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    import("../../lib/localStorageCrud").then(({ getActiveAcademyId }) => {
      setActiveAcademyId(getActiveAcademyId(userId));
    });
  }, [userId]);

  const activeAcademy =
    academies.find((a) => a.id === activeAcademyId) ?? academies[0];
  const academyIdentifier = activeAcademy?.slug ?? activeAcademy?.id ?? null;
  const academyUrl =
    academyIdentifier && typeof window !== "undefined"
      ? `${window.location.origin}/academy/${academyIdentifier}`
      : undefined;

  // Parent access codes (only fetched for logged-in admins; hook returns []
  // for null userId, and StudentsPageLayout gates UI on canManage anyway).
  const {
    accessCodes,
    hasInitialData: accessCodesReady,
    handleCreate: handleCreateCodes,
    handleRenew: handleRenewCodes,
    handleCreateForStudent,
    handleRenewForStudent,
    handleRevokeForStudent,
  } = useAccessCodes(canManage ? userId : null);

  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // Integrated data for subjects, enrollments, sessions
  const { data } = useIntegratedDataLocal();
  const { subjects = [], enrollments = [], sessions = [] } = data ?? {};

  // Student management
  const {
    students,
    loading: _isLoading,
    error: _error,
    addStudent,
    updateStudent,
    deleteStudent,
    refreshStudents,
    clearError,
  } = useStudentManagementLocal();

  // 학생 추가 핸들러
  const handleAddStudent = async (
    name: string,
    options?: { gender?: string; birthDate?: string },
  ) => {
    try {
      const success = await addStudent(name, options);
      if (success) {
        await refreshStudents();
      }
    } catch (error) {
      logger.error("학생 추가 실패:", undefined, error as Error);
      showError("학생 추가 중 오류가 발생했습니다.");
    }
  };

  // 학생 선택 핸들러
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  // 학생 삭제 핸들러
  const handleDeleteStudent = async (studentId: string) => {
    try {
      const success = await deleteStudent(studentId);
      if (success) {
        if (selectedStudentId === studentId) {
          setSelectedStudentId("");
        }
        await refreshStudents();
      }
    } catch (error) {
      logger.error("학생 삭제 실패:", undefined, error as Error);
      showError("학생 삭제 중 오류가 발생했습니다.");
    }
  };

  // 학생 업데이트 핸들러
  const handleUpdateStudent = async (id: string, updates: Partial<Student>): Promise<boolean> => {
    const success = await updateStudent(id, updates);
    if (success) {
      await refreshStudents();
    }
    return success;
  };

  return (
    <StudentsPageLayout
      students={students}
      subjects={subjects}
      enrollments={enrollments}
      sessions={sessions}
      selectedStudentId={selectedStudentId}
      onSelectStudent={handleSelectStudent}
      onAddStudent={handleAddStudent}
      onDeleteStudent={handleDeleteStudent}
      onUpdateStudent={handleUpdateStudent}
      onClearError={clearError}
      canManage={canManage}
      isRoleLoading={isRoleLoading}
      accessCodes={accessCodes}
      accessCodesReady={canManage ? accessCodesReady : true}
      onCreateCodes={handleCreateCodes}
      onRenewCodes={handleRenewCodes}
      onCreateCodeForStudent={handleCreateForStudent}
      onRenewCodeForStudent={handleRenewForStudent}
      onRevokeCodeForStudent={handleRevokeForStudent}
      academyUrl={academyUrl}
    />
  );
}
