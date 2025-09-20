/**
 * 🎣 Custom Hook - useIntegratedData (JSONB 기반 통합 데이터 관리)
 *
 * JSONB 구조를 활용하여 students, subjects, sessions, enrollments를
 * 한 번의 API 호출로 효율적으로 관리하는 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import { logger } from "../lib/logger";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { getKSTTime } from "../lib/timeUtils";
import { migrateSessionsToLogicalPosition } from "../lib/yPositionMigration";

// ===== 타입 정의 =====

export interface IntegratedData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  version: string;
  lastModified: string;
}

export interface UseIntegratedDataReturn {
  // 상태
  data: IntegratedData;
  loading: boolean;
  error: string | null;

  // 액션
  refreshData: () => Promise<void>;
  updateData: (newData: Partial<IntegratedData>) => Promise<boolean>;
  clearError: () => void;

  // 통계
  studentCount: number;
  subjectCount: number;
  sessionCount: number;
  enrollmentCount: number;
}

// ===== 훅 구현 =====

export const useIntegratedData = (): UseIntegratedDataReturn => {
  // 상태
  const [data, setData] = useState<IntegratedData>({
    students: [],
    subjects: [],
    sessions: [],
    enrollments: [],
    version: "1.0",
    lastModified: getKSTTime(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 헬퍼 함수
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      // 인증 토큰 가져오기
      const authToken = localStorage.getItem(
        "sb-kcyqftasdxtqslrhbctv-auth-token"
      );
      const authData = authToken ? JSON.parse(authToken) : null;
      const accessToken = authData?.access_token;

      logger.debug("토큰 상태 확인", {
        authToken: authToken ? "존재" : "없음",
        authData: authData ? "파싱됨" : "파싱 실패",
        accessToken: accessToken ? "존재" : "없음",
        tokenPreview: accessToken
          ? accessToken.substring(0, 20) + "..."
          : "없음",
      });

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          ...options.headers,
        },
        ...options,
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      logger.error("API 호출 실패:", undefined, error);
      throw error;
    }
  };

  // ===== 통합 데이터 조회 =====

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 사용자 ID 가져오기
      const userId =
        localStorage.getItem("supabase_user_id") || "default-user-id";
      logger.debug("useIntegratedData - 사용자 ID:", { userId });

      const responseData = await apiCall(`/api/data?userId=${userId}`);
      const apiData = responseData.data || {};

      logger.debug("useIntegratedData - API 응답:", { apiData });

      // 세션 데이터 마이그레이션 (픽셀 → 논리적 위치)
      const migratedSessions = migrateSessionsToLogicalPosition(
        apiData.sessions || []
      );

      setData({
        students: apiData.students || [],
        subjects: apiData.subjects || [],
        sessions: migratedSessions,
        enrollments: apiData.enrollments || [],
        version: apiData.version || "1.0",
        lastModified: apiData.lastModified || getKSTTime(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "통합 데이터 조회 실패";
      setError(errorMessage);
      logger.error("통합 데이터 조회 실패:", undefined, err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== 통합 데이터 업데이트 =====

  const updateData = useCallback(
    async (newData: Partial<IntegratedData>): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        // 사용자 ID 가져오기
        const userId =
          localStorage.getItem("supabase_user_id") || "default-user-id";

        // 새 데이터에 세션이 포함되어 있으면 마이그레이션 적용
        const migratedNewData = {
          ...newData,
          ...(newData.sessions && {
            sessions: migrateSessionsToLogicalPosition(newData.sessions),
          }),
        };

        const updatedData = {
          ...data,
          ...migratedNewData,
          lastModified: getKSTTime(),
        };

        const responseData = await apiCall(`/api/data?userId=${userId}`, {
          method: "PUT",
          body: JSON.stringify(updatedData),
        });

        // 성공 시 로컬 상태 업데이트
        setData(updatedData);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "통합 데이터 업데이트 실패";
        setError(errorMessage);
        logger.error("통합 데이터 업데이트 실패:", undefined, err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [data]
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ===== 통계 =====

  const studentCount = data.students.length;
  const subjectCount = data.subjects.length;
  const sessionCount = data.sessions.length;
  const enrollmentCount = data.enrollments.length;

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

    // 통계
    studentCount,
    subjectCount,
    sessionCount,
    enrollmentCount,
  };
};
