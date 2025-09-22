import React from "react";
import type { Student } from "../../lib/planner";
import StudentManagementSection from "../organisms/StudentManagementSection";

interface StudentsPageLayoutProps {
  students: Student[];
  newStudentName: string;
  selectedStudentId: string;
  onNewStudentNameChange: (name: string) => void;
  onAddStudent: (name: string) => void;
  onSelectStudent: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onUpdateStudent?: (studentId: string, name: string) => void;
  errorMessage?: string;
  isLoading?: boolean;
  error?: string;
  onClearError: () => void;
}

const StudentsPageLayout: React.FC<StudentsPageLayoutProps> = ({
  students,
  newStudentName,
  selectedStudentId,
  onNewStudentNameChange,
  onAddStudent,
  onSelectStudent,
  onDeleteStudent,
  onUpdateStudent,
  errorMessage,
  isLoading = false,
  error: _error,
  onClearError: _onClearError,
}) => {
  return (
    <div
      data-testid="students-page"
      className="grid"
      style={{
        gridTemplateColumns: "340px 1fr", // ⚠️ 중요: 좌측 340px 고정 너비
        gap: 16,
        padding: 16,
      }}
    >
      <StudentManagementSection
        students={students}
        newStudentName={newStudentName}
        selectedStudentId={selectedStudentId}
        onNewStudentNameChange={onNewStudentNameChange}
        onAddStudent={onAddStudent}
        onSelectStudent={onSelectStudent}
        onDeleteStudent={onDeleteStudent}
        onUpdateStudent={onUpdateStudent}
        errorMessage={errorMessage}
        isLoading={isLoading}
      />
    </div>
  );
};

export default StudentsPageLayout;
