import React from "react";
import type { Student } from "../../lib/planner";
import StudentInputSection from "../molecules/StudentInputSection";
import StudentList from "../molecules/StudentList";

interface StudentManagementSectionProps {
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
  className?: string;
  style?: React.CSSProperties;
}

export const StudentManagementSection: React.FC<
  StudentManagementSectionProps
> = ({
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
  className = "",
  style = {},
}) => {
  return (
    <section
      className={`student-management-section ${className}`}
      style={style}
    >
      <h2>학생 목록</h2>

      <StudentInputSection
        newStudentName={newStudentName}
        onNewStudentNameChange={onNewStudentNameChange}
        onAddStudent={onAddStudent}
        errorMessage={errorMessage}
        students={students}
      />

      <StudentList
        students={students}
        selectedStudentId={selectedStudentId}
        onSelectStudent={onSelectStudent}
        onDeleteStudent={onDeleteStudent}
        onUpdateStudent={onUpdateStudent}
        isLoading={isLoading}
      />

      {selectedStudentId && (
        <div style={{ marginTop: 16 }}>
          <h3>
            선택된 학생:{" "}
            {students.find((s) => s.id === selectedStudentId)?.name}
          </h3>
        </div>
      )}
    </section>
  );
};

export default StudentManagementSection;
