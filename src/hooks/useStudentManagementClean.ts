/**
 * 🎣 Custom Hook - useStudentManagement (Clean Architecture)
 *
 * 새로운 Clean Architecture 구조를 사용하는 학생 관리 훅입니다.
 * 애플리케이션 서비스와 도메인 엔티티를 활용합니다.
 */

import { StudentApplicationServiceImpl } from "@/application/services/StudentApplicationService";
import { repositoryFactory } from "@/infrastructure";
import type { StudentDto } from "@/shared/types/ApplicationTypes";
import { useCallback, useEffect, useState } from "react";

// ===== 훅 인터페이스 =====

export interface UseStudentManagementReturn {
  // 상태
  students: StudentDto[];
  loading: boolean;
  error: string | null;

  // 액션
  addStudent: (name: string, gender?: string) => Promise<boolean>;
  updateStudent: (
    id: string,
    updates: { name?: string; gender?: string }
  ) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  getStudent: (id: string) => Promise<StudentDto | null>;

  // 유틸리티
  refreshStudents: () => Promise<void>;
  clearError: () => void;

  // 통계
  studentCount: number;
  getStudentStatistics: () => Promise<any>;
}

// ===== 훅 구현 =====

export const useStudentManagementClean = (): UseStudentManagementReturn => {
  // 상태
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 애플리케이션 서비스 인스턴스 (싱글톤)
  const [studentService] = useState(() => {
    const studentRepository = repositoryFactory.createStudentRepository();
    return new StudentApplicationServiceImpl(studentRepository);
  });

  // ===== 학생 목록 조회 =====

  const refreshStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await studentService.getAllStudents({
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (result.success && result.students) {
        setStudents(result.students);
      } else {
        setError(result.error || "학생 목록을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [studentService]);

  // ===== 학생 추가 =====

  const addStudent = useCallback(
    async (name: string, gender?: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await studentService.addStudent({ name, gender });

        if (result.success && result.student) {
          // 성공 시 목록 새로고침
          await refreshStudents();
          return true;
        } else {
          setError(result.error || "학생 추가에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [studentService, refreshStudents]
  );

  // ===== 학생 수정 =====

  const updateStudent = useCallback(
    async (
      id: string,
      updates: { name?: string; gender?: string }
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await studentService.updateStudent({ id, ...updates });

        if (result.success && result.student) {
          // 성공 시 목록 새로고침
          await refreshStudents();
          return true;
        } else {
          setError(result.error || "학생 수정에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [studentService, refreshStudents]
  );

  // ===== 학생 삭제 =====

  const deleteStudent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const result = await studentService.deleteStudent({ id });

        if (result.success) {
          // 성공 시 목록 새로고침
          await refreshStudents();
          return true;
        } else {
          setError(result.error || "학생 삭제에 실패했습니다.");
          return false;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [studentService, refreshStudents]
  );

  // ===== 학생 조회 =====

  const getStudent = useCallback(
    async (id: string): Promise<StudentDto | null> => {
      try {
        const result = await studentService.getStudent({ id });

        if (result.success && result.student) {
          return result.student;
        } else {
          setError(result.error || "학생 조회에 실패했습니다.");
          return null;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
        );
        return null;
      }
    },
    [studentService]
  );

  // ===== 학생 통계 =====

  const getStudentStatistics = useCallback(async () => {
    try {
      const result = await studentService.getStudentStatistics();

      if (result.success && result.statistics) {
        return result.statistics;
      } else {
        setError(result.error || "학생 통계 조회에 실패했습니다.");
        return null;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
      return null;
    }
  }, [studentService]);

  // ===== 에러 클리어 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  // ===== 반환값 =====

  return {
    // 상태
    students,
    loading,
    error,

    // 액션
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,

    // 유틸리티
    refreshStudents,
    clearError,

    // 통계
    studentCount: students.length,
    getStudentStatistics,
  };
};
