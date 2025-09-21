/**
 * 🎣 Custom Hook - useStudentManagement (API Routes 기반)
 *
 * API Routes를 통해 학생 데이터를 관리하는 훅입니다.
 * Clean Architecture 패턴을 유지하면서 클라이언트-서버 분리를 구현합니다.
 */

import { useCallback, useEffect, useState } from "react";
import { logger } from "../lib/logger";

// ===== 타입 정의 =====

export interface Student {
  id: string;
  name: string;
  gender?: string;
}

export interface UseStudentManagementReturn {
  // 상태
  students: Student[];
  loading: boolean;
  error: string | null;

  // 액션
  addStudent: (name: string, gender?: string) => Promise<boolean>;
  updateStudent: (
    id: string,
    updates: { name?: string; gender?: string }
  ) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  getStudent: (id: string) => Promise<Student | null>;

  // 유틸리티
  refreshStudents: () => Promise<void>;
  clearError: () => void;

  // 통계
  studentCount: number;
}

// ===== 훅 구현 =====

export const useStudentManagementClean = (): UseStudentManagementReturn => {
  // 상태
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 헬퍼 함수
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await globalThis.fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      logger.error("API 호출 실패:", undefined, error as Error);
      throw error;
    }
  };

  // ===== 학생 목록 조회 =====

  const refreshStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 사용자 ID 가져오기
      const userId =
        localStorage.getItem("supabase_user_id") || "default-user-id";

      const data = await apiCall(`/api/students?userId=${userId}`);
      setStudents(data.data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "학생 목록 조회 실패";
      setError(errorMessage);
      logger.error("학생 목록 조회 실패:", undefined, err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 학생 추가 =====

  const addStudent = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        await apiCall(`/api/students?userId=${userId}`, {
          method: "POST",
          body: JSON.stringify({ name }),
        });

        // 성공 시 목록 새로고침
        await refreshStudents();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 추가 실패";
        setError(errorMessage);
        logger.error("학생 추가 실패:", undefined, err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStudents]
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

        await apiCall(`/api/students/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        // 성공 시 목록 새로고침
        await refreshStudents();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 수정 실패";
        setError(errorMessage);
        logger.error("학생 수정 실패:", undefined, err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStudents]
  );

  // ===== 학생 삭제 =====

  const deleteStudent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        // localStorage에서 userId 가져오기
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        await apiCall(`/api/students/${id}?userId=${userId}`, {
          method: "DELETE",
        });

        // 성공 시 목록 새로고침
        await refreshStudents();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 삭제 실패";
        setError(errorMessage);
        logger.error("학생 삭제 실패:", undefined, err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshStudents]
  );

  // ===== 학생 조회 =====

  const getStudent = useCallback(
    async (id: string): Promise<Student | null> => {
      try {
        const data = await apiCall(`/api/students/${id}`);
        return data.data || null;
      } catch (err) {
        logger.error("학생 조회 실패:", undefined, err as Error);
        return null;
      }
    },
    []
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  // ===== 통계 =====

  const studentCount = students.length;

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
    studentCount,
  };
};
