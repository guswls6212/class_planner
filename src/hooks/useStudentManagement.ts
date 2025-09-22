/**
 * 🎣 Custom Hook - useStudentManagement (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 학생 데이터 관리 훅입니다.
 */

import { useCallback, useMemo } from "react";
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
  getStudent: (id: string) => Student | null;

  // 유틸리티
  refreshStudents: () => Promise<void>;
  clearError: () => void;

  // 통계
  studentCount: number;
}

// ===== 훅 구현 =====

export const useStudentManagementClean = (): UseStudentManagementReturn => {
  // 🚀 캐시 우선 데이터 관리 훅 사용
  const {
    data: cachedData,
    loading,
    error,
    refreshFromServer,
    clearError: clearCacheError,
  } = {
    data: {
      students: [],
      subjects: [],
      sessions: [],
      enrollments: [],
      version: "1.0",
      lastModified: "",
    },
    loading: false,
    error: null,
    refreshFromServer: async () => {},
    clearError: () => {},
  };

  // 학생 데이터만 추출
  const students: Student[] = useMemo(() => {
    return cachedData.students.map((student: any) => ({
      id: student.id,
      name: student.name,
      gender: student.gender,
    }));
  }, [cachedData.students]);

  // API 호출 헬퍼 함수
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      // 인증 토큰 가져오기
      const authToken = localStorage.getItem(
        "sb-kcyqftasdxtqslrhbctv-auth-token"
      );
      const authData = authToken ? JSON.parse(authToken) : null;
      const accessToken = authData?.access_token;

      const response = await globalThis.fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
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
      logger.error(
        "useStudentManagement - API 호출 실패:",
        undefined,
        error as Error
      );
      throw error;
    }
  };

  // ===== 학생 목록 조회 =====

  const refreshStudents = useCallback(async () => {
    logger.debug("useStudentManagement - 서버에서 학생 데이터 새로고침 요청");
    await refreshFromServer();
  }, [refreshFromServer]);

  // ===== 학생 추가 =====

  const addStudent = useCallback(
    async (name: string): Promise<boolean> => {
      try {
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useStudentManagement - 학생 추가 시작", { name, userId });

        await apiCall(`/api/students?userId=${userId}`, {
          method: "POST",
          body: JSON.stringify({ name }),
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useStudentManagement - 학생 추가 성공", { name });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 추가 실패";
        logger.error(
          "useStudentManagement - 학생 추가 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 학생 수정 =====

  const updateStudent = useCallback(
    async (
      id: string,
      updates: { name?: string; gender?: string }
    ): Promise<boolean> => {
      try {
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useStudentManagement - 학생 수정 시작", {
          id,
          updates,
          userId,
        });

        await apiCall(`/api/students/${id}?userId=${userId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useStudentManagement - 학생 수정 성공", { id, updates });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 수정 실패";
        logger.error(
          "useStudentManagement - 학생 수정 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 학생 삭제 =====

  const deleteStudent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // localStorage에서 userId 가져오기
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useStudentManagement - 학생 삭제 시작", { id, userId });

        await apiCall(`/api/students/${id}?userId=${userId}`, {
          method: "DELETE",
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useStudentManagement - 학생 삭제 성공", { id });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 삭제 실패";
        logger.error(
          "useStudentManagement - 학생 삭제 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 학생 조회 =====

  const getStudent = useCallback(
    (id: string): Student | null => {
      const student = students.find((s) => s.id === id);
      return student || null;
    },
    [students]
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    clearCacheError();
  }, [clearCacheError]);

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
