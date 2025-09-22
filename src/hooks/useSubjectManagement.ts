/**
 * 🎣 Custom Hook - useSubjectManagement (캐시 우선 과목 데이터 관리)
 *
 * localStorage 캐시를 우선적으로 읽어와 즉시 UI에 표시하고,
 * CRUD 작업은 서버와 동기화하는 효율적인 과목 데이터 관리 훅입니다.
 */

import { useCallback, useMemo } from "react";
import { logger } from "../lib/logger";
import { useCachedData } from "./useCachedData";

// ===== 타입 정의 =====

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface UseSubjectManagementReturn {
  // 상태
  subjects: Subject[];
  errorMessage: string;

  // 액션
  addSubject: (name: string, color: string) => Promise<boolean>;
  updateSubject: (
    id: string,
    updates: { name?: string; color?: string }
  ) => Promise<boolean>;
  deleteSubject: (id: string) => Promise<boolean>;
  getSubject: (id: string) => Subject | null;

  // 유틸리티
  refreshSubjects: () => Promise<void>;
  clearError: () => void;

  // 통계
  subjectCount: number;
}

// ===== 기본 과목 목록 =====

const DEFAULT_SUBJECTS: Subject[] = [
  { id: "default-1", name: "초등수학", color: "#fbbf24" }, // 밝은 노란색
  { id: "default-2", name: "중등수학", color: "#f59e0b" }, // 주황색
  { id: "default-3", name: "중등영어", color: "#3b82f6" }, // 파란색
  { id: "default-4", name: "중등국어", color: "#10b981" }, // 초록색
  { id: "default-5", name: "중등과학", color: "#ec4899" }, // 분홍색
  { id: "default-6", name: "중등사회", color: "#06b6d4" }, // 청록색
  { id: "default-7", name: "고등수학", color: "#ef4444" }, // 빨간색
  { id: "default-8", name: "고등영어", color: "#8b5cf6" }, // 보라색
  { id: "default-9", name: "고등국어", color: "#059669" }, // 진한 초록색
];

// ===== 훅 구현 =====

export const useSubjectManagement = (): UseSubjectManagementReturn => {
  // 🚀 캐시 우선 데이터 관리 훅 사용
  const {
    data: cachedData,
    error,
    refreshFromServer,
    clearError: clearCacheError,
  } = useCachedData();

  // 과목 데이터만 추출
  const subjects: Subject[] = useMemo(() => {
    return cachedData.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      color: subject.color || "#3b82f6", // 기본 색상 제공
    }));
  }, [cachedData.subjects]);

  // 에러 메시지 변환
  const errorMessage = error || "";

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
        "useSubjectManagement - API 호출 실패:",
        undefined,
        error as Error
      );
      throw error;
    }
  };

  // ===== 과목 목록 조회 =====

  const refreshSubjects = useCallback(async () => {
    logger.debug("useSubjectManagement - 서버에서 과목 데이터 새로고침 요청");
    await refreshFromServer();
  }, [refreshFromServer]);

  // ===== 과목 추가 =====

  const addSubject = useCallback(
    async (name: string, color: string): Promise<boolean> => {
      try {
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useSubjectManagement - 과목 추가 시작", {
          name,
          color,
          userId,
        });

        await apiCall(`/api/subjects?userId=${userId}`, {
          method: "POST",
          body: JSON.stringify({ name, color }),
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useSubjectManagement - 과목 추가 성공", { name, color });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 추가 실패";
        logger.error(
          "useSubjectManagement - 과목 추가 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 과목 수정 =====

  const updateSubject = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: string }
    ): Promise<boolean> => {
      try {
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useSubjectManagement - 과목 수정 시작", {
          id,
          updates,
          userId,
        });

        await apiCall(`/api/subjects/${id}?userId=${userId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useSubjectManagement - 과목 수정 성공", { id, updates });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 수정 실패";
        logger.error(
          "useSubjectManagement - 과목 수정 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 과목 삭제 =====

  const deleteSubject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        logger.debug("useSubjectManagement - 과목 삭제 시작", { id, userId });

        await apiCall(`/api/subjects/${id}?userId=${userId}`, {
          method: "DELETE",
        });

        // 성공 시 캐시된 데이터 새로고침
        await refreshFromServer();

        logger.info("useSubjectManagement - 과목 삭제 성공", { id });
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 삭제 실패";
        logger.error(
          "useSubjectManagement - 과목 삭제 실패:",
          undefined,
          err as Error
        );
        return false;
      }
    },
    [refreshFromServer]
  );

  // ===== 과목 조회 =====

  const getSubject = useCallback(
    (id: string): Subject | null => {
      const subject = subjects.find((s) => s.id === id);
      return subject || null;
    },
    [subjects]
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    clearCacheError();
  }, [clearCacheError]);

  // ===== 통계 =====

  const subjectCount = subjects.length;

  // ===== 반환값 =====

  return {
    // 상태
    subjects,
    errorMessage,

    // 액션
    addSubject,
    updateSubject,
    deleteSubject,
    getSubject,

    // 유틸리티
    refreshSubjects,
    clearError,

    // 통계
    subjectCount,
  };
};
