"use client";

import { useState } from "react";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagementLocal } from "../../hooks/useStudentManagementLocal";
import { logger } from "../../lib/logger";

export default function StudentsPage() {
  return <StudentsPageContent />;
}

function StudentsPageContent() {
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // 🚀 localStorage 직접 조작 훅 사용
  const {
    students,
    loading: isLoading,
    error,
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
        setNewStudentName(""); // 입력창 초기화
        await refreshStudents(); // 학생 목록 새로고침
      }
    } catch (error) {
      logger.error("학생 추가 실패:", undefined, error as Error);
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
      logger.error("학생 삭제 실패:", undefined, error as Error);
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
      onUpdateStudent={async (id, name) => {
        await updateStudent(id, { name });
        await refreshStudents();
      }}
      isLoading={isLoading}
      error={error || undefined}
      onClearError={clearError}
    />
  );
}
