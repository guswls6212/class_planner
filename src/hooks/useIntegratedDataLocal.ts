/**
 * 🎣 Custom Hook - useIntegratedDataLocal (localStorage 직접 조작)
 *
 * localStorage의 classPlannerData를 직접 조작하여 즉시 UI에 반영하고,
 * debounce로 서버와 동기화하는 초고속 통합 데이터 관리 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import {
  syncEnrollmentCreate,
  syncEnrollmentDelete,
  syncSessionCreate,
  syncSessionDelete,
  syncSessionUpdate,
  syncTeacherCreate,
  syncTeacherDelete,
  syncTeacherUpdate,
} from "../lib/apiSync";
import {
  addEnrollmentToLocal,
  addSessionToLocal,
  addTeacherToLocal,
  deleteEnrollmentFromLocal,
  deleteSessionFromLocal,
  deleteTeacherFromLocal,
  getClassPlannerData,
  updateClassPlannerData,
  updateSessionInLocal,
  updateTeacherInLocal,
} from "../lib/localStorageCrud";
import { logger } from "../lib/logger";
import type { Enrollment, Session, Student, Subject, Teacher } from "../lib/planner";

// ===== 타입 정의 =====

export interface IntegratedData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  teachers: Teacher[];
  version: string;
}

export interface UseIntegratedDataLocalReturn {
  // 상태
  data: IntegratedData;
  loading: boolean;
  error: string | null;

  // 액션
  refreshData: () => void;
  updateData: (newData: Partial<IntegratedData>) => Promise<boolean>;
  clearError: () => void;

  // 세션 관련 액션
  addSession: (
    sessionData: Omit<Session, "id" | "createdAt" | "updatedAt">
  ) => Promise<boolean>;
  updateSession: (
    id: string,
    updates: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>
  ) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;

  // 등록 관련 액션
  addEnrollment: (studentId: string, subjectId: string) => Promise<boolean>;
  deleteEnrollment: (id: string) => Promise<boolean>;

  // 강사 관련 액션
  addTeacher: (name: string, color: string, userId?: string | null) => Promise<boolean>;
  updateTeacher: (id: string, updates: { name?: string; color?: string; userId?: string | null }) => Promise<boolean>;
  deleteTeacher: (id: string) => Promise<boolean>;

  // 통계
  studentCount: number;
  subjectCount: number;
  sessionCount: number;
  enrollmentCount: number;
  teacherCount: number;
}

// ===== 훅 구현 =====

export const useIntegratedDataLocal = (): UseIntegratedDataLocalReturn => {
  // 🚀 localStorage 직접 조작 방식
  const [data, setData] = useState<IntegratedData>({
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [],
    teachers: [],
    version: "1.0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // localStorage에서 전체 데이터 로드
  const loadDataFromLocal = useCallback(() => {
    try {
      const localData = getClassPlannerData();
      setData(localData);
      setError(null);

      logger.debug(
        "useIntegratedDataLocal - localStorage에서 전체 데이터 로드",
        {
          studentCount: localData.students.length,
          subjectCount: localData.subjects.length,
          sessionCount: localData.sessions.length,
          enrollmentCount: localData.enrollments.length,
          teacherCount: localData.teachers.length,
        }
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "데이터 로드 실패";
      setError(errorMessage);
      logger.error(
        "useIntegratedDataLocal - 데이터 로드 실패:",
        undefined,
        err as Error
      );
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadDataFromLocal();
  }, [loadDataFromLocal]);

  // localStorage 변경 이벤트 리스너 (다른 탭 동기화)
  useEffect(() => {
    const handleStorageChange = () => {
      loadDataFromLocal();
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
  }, [loadDataFromLocal]);

  // ===== 전체 데이터 업데이트 =====

  const updateData = useCallback(
    async (newData: Partial<IntegratedData>): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        logger.debug("useIntegratedDataLocal - 전체 데이터 업데이트 시작", {
          updates: Object.keys(newData),
        });

        // localStorage에 즉시 업데이트
        const result = updateClassPlannerData(newData);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          logger.info("useIntegratedDataLocal - 전체 데이터 업데이트 성공");

          return true;
        } else {
          setError(result.error || "데이터 업데이트 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "데이터 업데이트 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 데이터 업데이트 실패:",
          undefined,
          err as Error
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadDataFromLocal]
  );

  // ===== 세션 관련 액션 =====

  const addSession = useCallback(
    async (
      sessionData: Omit<Session, "id" | "createdAt" | "updatedAt">
    ): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 세션 추가 시작", {
          sessionData,
        });

        // localStorage에 즉시 추가
        const result = addSessionToLocal(sessionData);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 (fire-and-forget)
          const userId = localStorage.getItem("supabase_user_id");
          syncSessionCreate(userId, sessionData);

          logger.info("useIntegratedDataLocal - 세션 추가 성공", {
            sessionId: result.data.id,
          });

          return true;
        } else {
          setError(result.error || "세션 추가 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 추가 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 세션 추가 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  const updateSession = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Session, "id" | "createdAt" | "updatedAt">>
    ): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 세션 수정 시작", {
          id,
          updates,
        });

        // localStorage에 즉시 수정
        const result = updateSessionInLocal(id, updates);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 (fire-and-forget)
          const userId = localStorage.getItem("supabase_user_id");
          syncSessionUpdate(userId, id, updates);

          logger.info("useIntegratedDataLocal - 세션 수정 성공", {
            id,
            updates,
          });

          return true;
        } else {
          setError(result.error || "세션 수정 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 수정 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 세션 수정 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 세션 삭제 시작", { id });

        // localStorage에서 즉시 삭제
        const result = deleteSessionFromLocal(id);

        if (result.success) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 (fire-and-forget)
          const userId = localStorage.getItem("supabase_user_id");
          syncSessionDelete(userId, id);

          logger.info("useIntegratedDataLocal - 세션 삭제 성공", { id });

          return true;
        } else {
          setError(result.error || "세션 삭제 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 삭제 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 세션 삭제 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  // ===== 등록 관련 액션 =====

  const addEnrollment = useCallback(
    async (studentId: string, subjectId: string): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 등록 추가 시작", {
          studentId,
          subjectId,
        });

        // localStorage에 즉시 추가
        const result = addEnrollmentToLocal(studentId, subjectId);

        if (result.success && result.data) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 (fire-and-forget)
          const userId = localStorage.getItem("supabase_user_id");
          syncEnrollmentCreate(userId, { studentId, subjectId });

          logger.info("useIntegratedDataLocal - 등록 추가 성공", {
            enrollmentId: result.data.id,
            studentId,
            subjectId,
          });

          return true;
        } else {
          setError(result.error || "등록 추가 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "등록 추가 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 등록 추가 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  const deleteEnrollment = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        logger.debug("useIntegratedDataLocal - 등록 삭제 시작", { id });

        // localStorage에서 즉시 삭제
        const result = deleteEnrollmentFromLocal(id);

        if (result.success) {
          // UI 즉시 업데이트
          loadDataFromLocal();

          // 서버 동기화 (fire-and-forget)
          const userId = localStorage.getItem("supabase_user_id");
          syncEnrollmentDelete(userId, id);

          logger.info("useIntegratedDataLocal - 등록 삭제 성공", { id });

          return true;
        } else {
          setError(result.error || "등록 삭제 실패");
          return false;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "등록 삭제 실패";
        setError(errorMessage);
        logger.error(
          "useIntegratedDataLocal - 등록 삭제 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [loadDataFromLocal]
  );

  // ===== 강사 관련 액션 =====

  const addTeacher = useCallback(
    async (name: string, color: string, userId?: string | null): Promise<boolean> => {
      try {
        setError(null);
        const result = addTeacherToLocal(name, color, userId);
        if (result.success && result.data) {
          loadDataFromLocal();
          const currentUserId = localStorage.getItem("supabase_user_id");
          syncTeacherCreate(currentUserId, { name, color, userId });
          return true;
        } else {
          setError(result.error || "강사 추가 실패");
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "강사 추가 실패";
        setError(errorMessage);
        logger.error("useIntegratedDataLocal - 강사 추가 실패:", undefined, err as Error);
        return false;
      }
    },
    [loadDataFromLocal]
  );

  const updateTeacher = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: string; userId?: string | null }
    ): Promise<boolean> => {
      try {
        setError(null);
        const result = updateTeacherInLocal(id, updates);
        if (result.success && result.data) {
          loadDataFromLocal();
          const userId = localStorage.getItem("supabase_user_id");
          syncTeacherUpdate(userId, id, updates);
          return true;
        } else {
          setError(result.error || "강사 수정 실패");
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "강사 수정 실패";
        setError(errorMessage);
        logger.error("useIntegratedDataLocal - 강사 수정 실패:", undefined, err as Error);
        return false;
      }
    },
    [loadDataFromLocal]
  );

  const deleteTeacher = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        const result = deleteTeacherFromLocal(id);
        if (result.success) {
          loadDataFromLocal();
          const userId = localStorage.getItem("supabase_user_id");
          syncTeacherDelete(userId, id);
          return true;
        } else {
          setError(result.error || "강사 삭제 실패");
          return false;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "강사 삭제 실패";
        setError(errorMessage);
        logger.error("useIntegratedDataLocal - 강사 삭제 실패:", undefined, err as Error);
        return false;
      }
    },
    [loadDataFromLocal]
  );

  // ===== 데이터 새로고침 =====

  const refreshData = useCallback(() => {
    loadDataFromLocal();
  }, [loadDataFromLocal]);

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 통계 =====

  const studentCount = data.students.length;
  const subjectCount = data.subjects.length;
  const sessionCount = data.sessions.length;
  const enrollmentCount = data.enrollments.length;
  const teacherCount = data.teachers.length;

  // ===== 반환값 =====

  return {
    // 상태
    data,
    loading,
    error,

    // 액션
    refreshData,
    updateData,
    clearError,

    // 세션 관련 액션
    addSession,
    updateSession,
    deleteSession,

    // 등록 관련 액션
    addEnrollment,
    deleteEnrollment,

    // 강사 관련 액션
    addTeacher,
    updateTeacher,
    deleteTeacher,

    // 통계
    studentCount,
    subjectCount,
    sessionCount,
    enrollmentCount,
    teacherCount,
  };
};
