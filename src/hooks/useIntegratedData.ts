/**
 * 🎣 Custom Hook - useIntegratedData (캐시 우선 통합 데이터 관리)
 *
 * localStorage 캐시를 우선적으로 읽어와 즉시 UI에 표시하고,
 * 백그라운드에서 서버 데이터와 동기화하는 효율적인 데이터 관리 훅입니다.
 */

import { useCallback } from "react";
import { logger } from "../lib/logger";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { getKSTTime } from "../lib/timeUtils";
import { migrateSessionsToLogicalPosition } from "../lib/yPositionMigration";
import { useCachedData } from "./useCachedData";

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
  // 🚀 캐시 우선 데이터 관리 훅 사용
  const {
    data: cachedData,
    loading,
    error,
    isFromCache,
    refreshFromServer,
    clearError: clearCacheError,
  } = useCachedData();

  // IntegratedData 형식으로 변환
  const data: IntegratedData = {
    students: cachedData.students,
    subjects: cachedData.subjects,
    sessions: cachedData.sessions,
    enrollments: cachedData.enrollments,
    version: cachedData.version,
    lastModified: cachedData.lastModified,
  };

  // refreshData는 서버에서 최신 데이터를 가져오는 함수로 매핑
  const refreshData = useCallback(async () => {
    logger.debug("useIntegratedData - 서버에서 데이터 새로고침 요청");
    await refreshFromServer();
  }, [refreshFromServer]);

  // ===== 통합 데이터 업데이트 =====

  const updateData = useCallback(
    async (newData: Partial<IntegratedData>): Promise<boolean> => {
      try {
        // 사용자 ID 가져오기
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 다시 로그인해주세요.");
        }

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

        logger.debug("useIntegratedData - 데이터 업데이트 시작", {
          userId,
          updatedData: {
            studentCount: updatedData.students.length,
            subjectCount: updatedData.subjects.length,
            sessionCount: updatedData.sessions.length,
            enrollmentCount: updatedData.enrollments.length,
          },
        });

        // 인증 토큰 가져오기
        const authToken = localStorage.getItem(
          "sb-kcyqftasdxtqslrhbctv-auth-token"
        );
        const authData = authToken ? JSON.parse(authToken) : null;
        const accessToken = authData?.access_token;

        // 서버에 업데이트 요청
        const response = await globalThis.fetch(`/api/data?userId=${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          },
          body: JSON.stringify(updatedData),
        });

        const responseData = await response.json();

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || `HTTP ${response.status}`);
        }

        // 성공 시 localStorage 캐시도 업데이트
        localStorage.setItem("classPlannerData", JSON.stringify(updatedData));

        // 서버에서 최신 데이터 다시 로드
        await refreshFromServer();

        logger.info("useIntegratedData - 데이터 업데이트 성공");
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "통합 데이터 업데이트 실패";
        logger.error(
          "useIntegratedData - 데이터 업데이트 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [data, refreshFromServer]
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    clearCacheError();
  }, [clearCacheError]);

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
