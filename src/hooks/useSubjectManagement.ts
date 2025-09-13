/**
 * 🎣 Custom Hook - useSubjectManagement (API Routes 기반)
 *
 * API Routes를 통해 과목 데이터를 관리하는 훅입니다.
 * Clean Architecture 패턴을 유지하면서 클라이언트-서버 분리를 구현합니다.
 */

import { useCallback, useEffect, useState } from "react";

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
  getSubject: (id: string) => Promise<Subject | null>;

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
  // 상태
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // API 호출 헬퍼 함수
  const apiCall = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
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
      console.error("API 호출 실패:", error);
      throw error;
    }
  };

  // ===== 과목 목록 조회 =====

  const refreshSubjects = useCallback(async () => {
    try {
      setErrorMessage("");

      // 사용자 ID 가져오기
      const userId =
        localStorage.getItem("supabase_user_id") || "default-user-id";

      const data = await apiCall(`/api/subjects?userId=${userId}`);
      const apiSubjects = data.data || [];

      // API에서 과목이 없으면 기본 과목 사용
      if (apiSubjects.length === 0) {
        setSubjects(DEFAULT_SUBJECTS);
      } else {
        setSubjects(apiSubjects);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "과목 목록 조회 실패";
      setErrorMessage(errorMessage);
      console.error("과목 목록 조회 실패:", err);

      // API 호출 실패 시 기본 과목 사용
      setSubjects(DEFAULT_SUBJECTS);
    }
  }, []);

  // ===== 과목 추가 =====

  const addSubject = useCallback(
    async (name: string, color: string): Promise<boolean> => {
      try {
        setErrorMessage("");

        const userId = localStorage.getItem("supabase_user_id");
        if (!userId) {
          throw new Error("사용자 ID가 없습니다. 로그인이 필요합니다.");
        }

        const data = await apiCall(`/api/subjects?userId=${userId}`, {
          method: "POST",
          body: JSON.stringify({ name, color }),
        });

        // 성공 시 목록 새로고침
        await refreshSubjects();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 추가 실패";
        setErrorMessage(errorMessage);
        console.error("과목 추가 실패:", err);
        return false;
      }
    },
    [refreshSubjects]
  );

  // ===== 과목 수정 =====

  const updateSubject = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: string }
    ): Promise<boolean> => {
      try {
        setErrorMessage("");

        const data = await apiCall(`/api/subjects/${id}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });

        // 성공 시 목록 새로고침
        await refreshSubjects();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 수정 실패";
        setErrorMessage(errorMessage);
        console.error("과목 수정 실패:", err);
        return false;
      }
    },
    [refreshSubjects]
  );

  // ===== 과목 삭제 =====

  const deleteSubject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setErrorMessage("");

        const data = await apiCall(`/api/subjects/${id}`, {
          method: "DELETE",
        });

        // 성공 시 목록 새로고침
        await refreshSubjects();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "과목 삭제 실패";
        setErrorMessage(errorMessage);
        console.error("과목 삭제 실패:", err);
        return false;
      }
    },
    [refreshSubjects]
  );

  // ===== 과목 조회 =====

  const getSubject = useCallback(
    async (id: string): Promise<Subject | null> => {
      try {
        const data = await apiCall(`/api/subjects/${id}`);
        return data.data || null;
      } catch (err) {
        console.error("과목 조회 실패:", err);
        return null;
      }
    },
    []
  );

  // ===== 에러 초기화 =====

  const clearError = useCallback(() => {
    setErrorMessage("");
  }, []);

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshSubjects();
  }, [refreshSubjects]);

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
