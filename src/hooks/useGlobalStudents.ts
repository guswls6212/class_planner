import type { Student } from "@/shared/types/DomainTypes";
import { useCallback, useEffect, useState } from "react";

export interface UseGlobalStudentsReturn {
  students: Student[];
  loading: boolean;
  error: string | null;
}

export const useGlobalStudents = (): UseGlobalStudentsReturn => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 로컬 스토리지에서 학생 데이터 로드
      const localStudents = localStorage.getItem("students");

      if (localStudents) {
        const studentsData = JSON.parse(localStudents);
        setStudents(studentsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "학생 데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return {
    students,
    loading,
    error,
  };
};
