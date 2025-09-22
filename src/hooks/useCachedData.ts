/**
 * 🎣 Custom Hook - useCachedData (localStorage 캐시 우선 데이터 관리)
 *
 * localStorage의 classPlannerData를 우선적으로 읽어와서 즉시 UI에 반영하고,
 * 백그라운드에서 서버 데이터와 동기화하는 훅입니다.
 */

import { useCallback, useEffect, useState } from "react";
import { logger } from "../lib/logger";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { getKSTTime } from "../lib/timeUtils";
import { migrateSessionsToLogicalPosition } from "../lib/yPositionMigration";

// ===== 타입 정의 =====

export interface CachedData {
  students: Student[];
  subjects: Subject[];
  sessions: Session[];
  enrollments: Enrollment[];
  version: string;
  lastModified: string;
}

export interface UseCachedDataReturn {
  // 상태
  data: CachedData;
  loading: boolean;
  error: string | null;
  isFromCache: boolean; // 캐시에서 로드되었는지 여부

  // 액션
  refreshFromServer: () => Promise<void>;
  clearError: () => void;

  // 통계
  studentCount: number;
  subjectCount: number;
  sessionCount: number;
  enrollmentCount: number;
}

// ===== 기본 데이터 구조 =====

const DEFAULT_DATA: CachedData = {
  students: [],
  subjects: [],
  sessions: [],
  enrollments: [],
  version: "1.0",
  lastModified: getKSTTime(),
};

// ===== 훅 구현 =====

export const useCachedData = (): UseCachedDataReturn => {
  // 상태
  const [data, setData] = useState<CachedData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // localStorage에서 캐시된 데이터 읽기
  const loadFromCache = useCallback((): CachedData | null => {
    try {
      if (typeof window === "undefined") return null;

      const cachedDataString = localStorage.getItem("classPlannerData");
      if (!cachedDataString) {
        logger.debug("useCachedData - localStorage에 캐시된 데이터 없음");
        return null;
      }

      const cachedData = JSON.parse(cachedDataString);

      // 세션 데이터 마이그레이션 (픽셀 → 논리적 위치)
      const migratedSessions = migrateSessionsToLogicalPosition(
        cachedData.sessions || []
      );

      const result = {
        students: cachedData.students || [],
        subjects: cachedData.subjects || [],
        sessions: migratedSessions,
        enrollments: cachedData.enrollments || [],
        version: cachedData.version || "1.0",
        lastModified: cachedData.lastModified || getKSTTime(),
      };

      logger.info("useCachedData - localStorage에서 캐시 데이터 로드 성공", {
        studentCount: result.students.length,
        subjectCount: result.subjects.length,
        sessionCount: result.sessions.length,
        enrollmentCount: result.enrollments.length,
        lastModified: result.lastModified,
      });

      return result;
    } catch (error) {
      logger.error(
        "useCachedData - 캐시 데이터 로드 실패:",
        undefined,
        error as Error
      );
      return null;
    }
  }, []);

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

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      logger.error("useCachedData - API 호출 실패:", undefined, error as Error);
      throw error;
    }
  };

  // 서버에서 최신 데이터 가져오기
  const refreshFromServer = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 사용자 ID 가져오기
      const userId = localStorage.getItem("supabase_user_id");
      if (!userId) {
        throw new Error("사용자 ID가 없습니다. 다시 로그인해주세요.");
      }

      logger.debug("useCachedData - 서버에서 최신 데이터 조회 시작", {
        userId,
      });

      const responseData = await apiCall(`/api/data?userId=${userId}`);
      const apiData = responseData.data || {};

      // 세션 데이터 마이그레이션 (픽셀 → 논리적 위치)
      const migratedSessions = migrateSessionsToLogicalPosition(
        apiData.sessions || []
      );

      const serverData = {
        students: apiData.students || [],
        subjects: apiData.subjects || [],
        sessions: migratedSessions,
        enrollments: apiData.enrollments || [],
        version: apiData.version || "1.0",
        lastModified: apiData.lastModified || getKSTTime(),
      };

      // 서버 데이터로 상태 업데이트
      setData(serverData);
      setIsFromCache(false);

      // localStorage 캐시 업데이트
      localStorage.setItem("classPlannerData", JSON.stringify(serverData));

      logger.info("useCachedData - 서버 데이터 동기화 완료", {
        studentCount: serverData.students.length,
        subjectCount: serverData.subjects.length,
        sessionCount: serverData.sessions.length,
        enrollmentCount: serverData.enrollments.length,
        lastModified: serverData.lastModified,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "서버 데이터 조회 실패";
      setError(errorMessage);
      logger.error(
        "useCachedData - 서버 데이터 조회 실패:",
        undefined,
        err as Error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 초기 데이터 로드 (캐시 우선)
  useEffect(() => {
    const initializeData = async () => {
      logger.debug("useCachedData - 초기 데이터 로드 시작");

      // 1단계: 캐시된 데이터부터 로드 (즉시 UI 표시)
      const cachedData = loadFromCache();
      if (cachedData) {
        setData(cachedData);
        setIsFromCache(true);
        logger.info("useCachedData - 캐시된 데이터로 즉시 UI 표시");
      }

      // 2단계: 백그라운드에서 서버 데이터 동기화
      if (typeof window !== "undefined") {
        try {
          await refreshFromServer();
        } catch (error) {
          // 서버 동기화 실패해도 캐시된 데이터는 유지
          logger.warn(
            "useCachedData - 서버 동기화 실패, 캐시된 데이터 유지",
            undefined,
            error as Error
          );
        }
      }
    };

    initializeData();
  }, [loadFromCache, refreshFromServer]);

  // 통계 계산
  const studentCount = data.students.length;
  const subjectCount = data.subjects.length;
  const sessionCount = data.sessions.length;
  const enrollmentCount = data.enrollments.length;

  return {
    // 상태
    data,
    loading,
    error,
    isFromCache,

    // 액션
    refreshFromServer,
    clearError,

    // 통계
    studentCount,
    subjectCount,
    sessionCount,
    enrollmentCount,
  };
};
