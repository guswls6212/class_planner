"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../components/atoms/AuthGuard";
import StudentsPageLayout from "../../components/organisms/StudentsPageLayout";
import { useLocal } from "../../hooks/useLocal";
import { useStudentManagement } from "../../hooks/useStudentManagement";
import type { Student } from "../../lib/planner";
import { supabase } from "../../utils/supabaseClient";

export default function StudentsPage() {
  return (
    <AuthGuard requireAuth={true}>
      <StudentsPageContent />
    </AuthGuard>
  );
}

function StudentsPageContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useLocal<string>(
    "ui:selectedStudent",
    ""
  );

  // 학생 데이터 로드
  useEffect(() => {
    const loadStudents = async () => {
      try {
        setIsLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // 로그인된 사용자: user_data JSONB에서 로드
          const { data, error } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", user.id)
            .single();

          if (error) {
            console.error("Supabase 학생 로드 실패:", error);
            return;
          }

          const userData = data?.data || {};
          const loadedStudents = (userData.students || []).map(
            (student: any) => ({
              id: student.id,
              name: student.name,
            })
          );

          setStudents(loadedStudents);
        } else {
          // 로그인 안된 사용자: 빈 배열
          setStudents([]);
        }
      } catch (error) {
        console.error("학생 로드 중 오류:", error);
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, []);

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
      isLoading={isLoading}
    />
  );
}
