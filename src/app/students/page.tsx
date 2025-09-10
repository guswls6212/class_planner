"use client";

import { useState } from "react";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagement } from "../../hooks/useStudentManagement";
import type { Student } from "../../lib/planner";

export default function StudentsPage() {
  const [students, setStudents] = useLocal<Student[]>("students", []);
  const [newStudentName, setNewStudentName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // 커스텀 훅 사용
  const studentManagement = useStudentManagement(
    students,
    setStudents,
    setNewStudentName
  );

  // 학생 추가 핸들러
  const handleAddStudent = (name: string) => {
    studentManagement.addStudent(name);
  };

  // 학생 선택 핸들러
  const handleSelectStudent = (studentId: string) => {
    const newSelectedId = studentManagement.selectStudent(studentId);
    setSelectedStudentId(newSelectedId);
  };

  // 학생 삭제 핸들러
  const handleDeleteStudent = (studentId: string) => {
    studentManagement.deleteStudent(studentId);
    // 선택된 학생이 삭제되면 선택 해제
    if (selectedStudentId === studentId) {
      setSelectedStudentId("");
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
    />
  );
}
