/**
 * 🎣 Custom Hook - useTeacherManagementLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * fire-and-forget으로 서버와 동기화하는 강사 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncTeacherCreate,
  syncTeacherDelete,
  syncTeacherUpdate,
} from "../lib/apiSync";
import {
  addTeacherToLocal,
  deleteTeacherFromLocal,
  getAllTeachersFromLocal,
  getTeacherFromLocal,
  updateTeacherInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import type { Teacher } from "../lib/planner";

// ===== 타입 정의 =====

export interface UseTeacherManagementLocalReturn {
  // 상태
  teachers: Teacher[];
  errorMessage: string;

  // 액션
  addTeacher: (
    name: string,
    color: string,
    userId?: string | null
  ) => Promise<boolean>;
  updateTeacher: (
    id: string,
    updates: { name?: string; color?: string; userId?: string | null }
  ) => Promise<boolean>;
  deleteTeacher: (id: string) => Promise<boolean>;
  getTeacher: (id: string) => Teacher | null;

  // 유틸리티
  refreshTeachers: () => void;
  clearError: () => void;

  // 통계
  teacherCount: number;
}

// ===== 훅 구현 =====

export const useTeacherManagementLocal =
  (): UseTeacherManagementLocalReturn => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [error, setError] = useState<string | null>(null);

    const loadTeachersFromLocal = useCallback(() => {
      try {
        const localTeachers = getAllTeachersFromLocal();
        setTeachers(localTeachers);
        logger.debug("useTeacherManagementLocal - 강사 데이터 로드", {
          count: localTeachers.length,
        });
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "강사 데이터 로드 실패";
        setError(errorMessage);
        logger.error(
          "useTeacherManagementLocal - 데이터 로드 실패:",
          undefined,
          err as Error
        );
        setTeachers([]);
      }
    }, []);

    useEffect(() => {
      loadTeachersFromLocal();
    }, [loadTeachersFromLocal]);

    useEffect(() => {
      const handleStorageChange = () => {
        loadTeachersFromLocal();
      };

      window.addEventListener("storage", handleStorageChange);
      window.addEventListener("classPlannerDataChanged", handleStorageChange);

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        window.removeEventListener(
          "classPlannerDataChanged",
          handleStorageChange
        );
      };
    }, [loadTeachersFromLocal]);

    // ===== 강사 추가 =====

    const addTeacher = useCallback(
      async (
        name: string,
        color: string,
        userId?: string | null
      ): Promise<boolean> => {
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 추가 시작", {
            name,
            color,
          });

          const result = addTeacherToLocal(name, color, userId);

          if (result.success && result.data) {
            loadTeachersFromLocal();

            const currentUserId = localStorage.getItem("supabase_user_id");
            syncTeacherCreate(currentUserId, { name, color, userId });

            logger.info("useTeacherManagementLocal - 강사 추가 성공", {
              name,
              teacherId: result.data.id,
            });

            return true;
          } else {
            setError(result.error || "강사 추가 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 추가 실패";
          setError(errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 추가 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사 수정 =====

    const updateTeacher = useCallback(
      async (
        id: string,
        updates: { name?: string; color?: string; userId?: string | null }
      ): Promise<boolean> => {
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 수정 시작", {
            id,
            updates,
          });

          const result = updateTeacherInLocal(id, updates);

          if (result.success && result.data) {
            loadTeachersFromLocal();

            const userId = localStorage.getItem("supabase_user_id");
            syncTeacherUpdate(userId, id, updates);

            logger.info("useTeacherManagementLocal - 강사 수정 성공", {
              id,
              updates,
            });

            return true;
          } else {
            setError(result.error || "강사 수정 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 수정 실패";
          setError(errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 수정 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사 삭제 =====

    const deleteTeacher = useCallback(
      async (id: string): Promise<boolean> => {
        try {
          setError(null);

          logger.debug("useTeacherManagementLocal - 강사 삭제 시작", { id });

          const result = deleteTeacherFromLocal(id);

          if (result.success) {
            loadTeachersFromLocal();

            const userId = localStorage.getItem("supabase_user_id");
            syncTeacherDelete(userId, id);

            logger.info("useTeacherManagementLocal - 강사 삭제 성공", { id });

            return true;
          } else {
            setError(result.error || "강사 삭제 실패");
            return false;
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "강사 삭제 실패";
          setError(errorMessage);
          logger.error(
            "useTeacherManagementLocal - 강사 삭제 실패:",
            undefined,
            err as Error
          );
          return false;
        }
      },
      [loadTeachersFromLocal]
    );

    // ===== 강사 조회 =====

    const getTeacher = useCallback((id: string): Teacher | null => {
      return getTeacherFromLocal(id);
    }, []);

    // ===== 유틸리티 =====

    const refreshTeachers = useCallback(() => {
      loadTeachersFromLocal();
    }, [loadTeachersFromLocal]);

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const teacherCount = teachers.length;

    return {
      teachers,
      errorMessage: error || "",

      addTeacher,
      updateTeacher,
      deleteTeacher,
      getTeacher,

      refreshTeachers,
      clearError,

      teacherCount,
    };
  };
