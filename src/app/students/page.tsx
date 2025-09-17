"use client";

import { useState } from "react";
import { logger } from "../../lib/logger";
import AuthGuard from "../../components/atoms/AuthGuard";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementClean } from "../../hooks/useStudentManagement";

export default function StudentsPage() {
  return (
    <AuthGuard requireAuth={true}>
      <StudentsPageContent />
    </AuthGuard>
  );
}

function StudentsPageContent() {
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // Clean Architecture 훅 사용
  const {
    students,
    loading: isLoading,
    error,
    addStudent,
    deleteStudent,
    refreshStudents,
    clearError,
  } = useStudentManagementClean();

  // 학생 추가 핸들러
  const handleAddStudent = async (name: string) => {
    try {
      const success = await addStudent(name);
      if (success) {
        setNewStudentName(""); // 입력창 초기화
        await refreshStudents(); // 학생 목록 새로고침
      }
    } catch (error) {
      logger.error("학생 추가 실패:", undefined, error);
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
        // 선택된 학생이 삭제되면 선택 해제
        if (selectedStudentId === studentId) {
          setSelectedStudentId("");
        }
        await refreshStudents(); // 학생 목록 새로고침
      }
    } catch (error) {
      logger.error("학생 삭제 실패:", undefined, error);
    }
  };

  return (
    <StudentsPageLayout
      students={students}
      newStudentName={newStudentName}
      selectedStudentId={selectedStudentId}
      onNewStudentNameChange={setNewStudentName}
      onAddStudent={handleAddStudent}
      onSelectStudent={handleSelectStudent}
      onDeleteStudent={handleDeleteStudent}
      isLoading={isLoading}
      error={error}
      onClearError={clearError}
    />
  );
}
