import React from "react";
import TeacherManagementSection from "./TeacherManagementSection";

interface Teacher {
  id: string;
  name: string;
  color: string;
}

interface TeachersPageLayoutProps {
  teachers: Teacher[];
  onAddTeacher: (name: string, color: string) => Promise<boolean>;
  onDeleteTeacher: (teacherId: string) => void;
  onUpdateTeacher: (teacherId: string, name: string, color: string) => void;
  errorMessage?: string;
}

const TeachersPageLayout: React.FC<TeachersPageLayoutProps> = ({
  teachers,
  onAddTeacher,
  onDeleteTeacher,
  onUpdateTeacher,
  errorMessage,
}) => {
  return (
    <div
      data-testid="teachers-page"
      className="grid"
      style={{
        gridTemplateColumns: "340px 1fr",
        gap: 16,
        padding: 16,
      }}
    >
      <TeacherManagementSection
        teachers={teachers}
        onAddTeacher={onAddTeacher}
        onDeleteTeacher={onDeleteTeacher}
        onUpdateTeacher={onUpdateTeacher}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default TeachersPageLayout;
