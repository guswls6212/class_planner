/**
 * 🎣 Custom Hook - useStudentManagementLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 학생 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncStudentCreate,
  syncStudentDelete,
  syncStudentUpdate,
} from "../lib/apiSync";
import {
  addStudentToLocal,
  deleteStudentFromLocal,
  getAllStudentsFromLocal,
  getStudentFromLocal,
  updateStudentInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";

// ===== 타입 정의 =====

export interface Student {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;
  grade?: string;
  school?: string;
  phone?: string;
}

export interface UseStudentManagementLocalReturn {
  // 상태
  students: Student[];
  loading: boolean;
  error: string | null;

  // 액션
  addStudent: (
    name: string,
    options?: { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
  ) => Promise<boolean>;
  updateStudent: (
    id: string,
    updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
  ) => Promise<boolean>;
  deleteStudent: (id: string) => Promise<boolean>;
  getStudent: (id: string) => Student | null;

  // 유틸리티
  refreshStudents: () => void;
  clearError: () => void;

  // 통계
  studentCount: number;
}

// ===== 훅 구현 =====

export const useStudentManagementLocal =
  (): UseStudentManagementLocalReturn => {
    // 🚀 localStorage 직접 조작 방식
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // localStorage에서 학생 데이터 로드
    const loadStudentsFromLocal = useCallback(() => {
      try {
        const localStudents = getAllStudentsFromLocal();
        setStudents(localStudents);
        setError(null);

        logger.debug(
          "useStudentManagementLocal - localStorage에서 학생 데이터 로드",
          {
            count: localStudents.length,
          }
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "학생 데이터 로드 실패";
        setError(errorMessage);
        logger.error(
          "useStudentManagementLocal - 데이터 로드 실패:",
          undefined,
          err as Error
        );
      }
    }, []);

    // 초기 데이터 로드
    useEffect(() => {
      loadStudentsFromLocal();
    }, [loadStudentsFromLocal]);

    // localStorage 변경 이벤트 리스너 (다른 탭 동기화)
    useEffect(() => {
      const handleStorageChange = () => {
        loadStudentsFromLocal();
      };

      // 다른 탭에서의 변경사항 감지
      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("classPlannerDataChanged", handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(
          "classPlannerDataChanged",
          handleStorageChange
        );
      };
    }, [loadStudentsFromLocal]);

    // ===== 학생 추가 =====

    const addStudent = useCallback(
      async (
        name: string,
        options?: { gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
      ): Promise<boolean> => {
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 추가 시작", { name });

          // localStorage에 즉시 추가
          const result = addStudentToLocal(name, options);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadStudentsFromLocal();

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncStudentCreate(userId, { name: name.trim(), ...options });

            logger.info("useStudentManagementLocal - 학생 추가 성공", {
              name,
              studentId: result.data.id,
            });

            return true;
          } else {
            setError(result.error || "학생 추가 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 추가 실패";
          setError(errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 추가 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal]
    );

    // ===== 학생 수정 =====

    const updateStudent = useCallback(
      async (
        id: string,
        updates: { name?: string; gender?: string; birthDate?: string; grade?: string; school?: string; phone?: string }
      ): Promise<boolean> => {
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 수정 시작", {
            id,
            updates,
          });

          // localStorage에 즉시 수정
          const result = updateStudentInLocal(id, updates);

          if (result.success && result.data) {
            // UI 즉시 업데이트
            loadStudentsFromLocal();

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncStudentUpdate(userId, id, updates);

            logger.info("useStudentManagementLocal - 학생 수정 성공", {
              id,
              updates,
            });

            return true;
          } else {
            setError(result.error || "학생 수정 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 수정 실패";
          setError(errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 수정 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal]
    );

    // ===== 학생 삭제 =====

    const deleteStudent = useCallback(
      async (id: string): Promise<boolean> => {
        try {
          setLoading(true);
          setError(null);

          logger.debug("useStudentManagementLocal - 학생 삭제 시작", { id });

          // localStorage에서 즉시 삭제
          const result = deleteStudentFromLocal(id);

          if (result.success) {
            // UI 즉시 업데이트
            loadStudentsFromLocal();

            // 서버 동기화 (fire-and-forget)
            const userId = localStorage.getItem("supabase_user_id");
            syncStudentDelete(userId, id);

            logger.info("useStudentManagementLocal - 학생 삭제 성공", { id });

            return true;
          } else {
            setError(result.error || "학생 삭제 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "학생 삭제 실패";
          setError(errorMessage);
          logger.error(
            "useStudentManagementLocal - 학생 삭제 실패:",
            undefined,
            err as Error
          );
          return false;
        } finally {
          setLoading(false);
        }
      },
      [loadStudentsFromLocal]
    );

    // ===== 학생 조회 =====

    const getStudent = useCallback((id: string): Student | null => {
      return getStudentFromLocal(id);
    }, []);

    // ===== 학생 목록 새로고침 =====

    const refreshStudents = useCallback(() => {
      loadStudentsFromLocal();
    }, [loadStudentsFromLocal]);

    // ===== 에러 초기화 =====

    const clearError = useCallback(() => {
      setError(null);
    }, []);

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
