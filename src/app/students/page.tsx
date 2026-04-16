"use client";

import { useState } from "react";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useIntegratedDataLocal } from "../../hooks/useIntegratedDataLocal";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import type { Student } from "../../lib/planner";
import { logger } from "../../lib/logger";
import { showError } from "../../lib/toast";

export default function StudentsPage() {
  return <StudentsPageContent />;
}

function StudentsPageContent() {
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
  const handleAddStudent = async (name: string) => {
    try {
      const success = await addStudent(name);
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
    />
  );
}
