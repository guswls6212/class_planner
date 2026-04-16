import React from "react";
import TeacherInputSection from "../molecules/TeacherInputSection";
import TeacherList from "../molecules/TeacherList";

interface Teacher {
  id: string;
  name: string;
  color: string;
}

interface TeacherManagementSectionProps {
  teachers: Teacher[];
  onAddTeacher: (name: string, color: string) => Promise<boolean>;
  onDeleteTeacher: (teacherId: string) => void;
  onUpdateTeacher: (teacherId: string, name: string, color: string) => void;
  errorMessage?: string;
}

const TeacherManagementSection: React.FC<TeacherManagementSectionProps> = ({
  teachers,
  onAddTeacher,
  onDeleteTeacher,
  onUpdateTeacher,
  errorMessage,
}) => {
  return (
    <section
      className="teacher-management-section"
      data-testid="teacher-management-section"
    >
      <h2>강사 목록</h2>

      <TeacherInputSection
        onAddTeacher={onAddTeacher}
        errorMessage={errorMessage}
        teachers={teachers}
      />

      <TeacherList
        teachers={teachers}
        onDeleteTeacher={onDeleteTeacher}
        onUpdateTeacher={onUpdateTeacher}
      />
    </section>
  );
};

export default TeacherManagementSection;
