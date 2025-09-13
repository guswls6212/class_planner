/**
 * 🎣 Custom Hook - useSessionManagement (API Routes 기반)
 *
 * API Routes를 통해 세션 데이터를 관리하는 훅입니다.
 * Clean Architecture 패턴을 유지하면서 클라이언트-서버 분리를 구현합니다.
 */

import { useCallback, useEffect, useState } from "react";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { minutesToTime, timeToMinutes } from "../lib/planner";

// ===== 타입 정의 =====

export interface UseSessionManagementReturn {
  sessions: Session[];
  enrollments: Enrollment[];
  addSession: (sessionData: {
    studentIds: string[];
    subjectId: string;
    weekday: number;
    startTime: string;
    endTime: string;
    room?: string;
  }) => Promise<void>;
  updateSession: (
    sessionId: string,
    sessionData: {
      studentIds: string[];
      subjectId: string;
      weekday: number;
      startTime: string;
      endTime: string;
      room?: string;
    }
  ) => Promise<void>;
  updateSessionPosition: (
    sessionId: string,
    weekday: number,
    time: string,
    yPosition: number
  ) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// ===== 훅 구현 =====

export const useSessionManagement = (
  students: Student[],
  subjects: Subject[]
): UseSessionManagementReturn => {
  // 상태
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ===== 세션 목록 조회 =====

  const refreshSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiCall("/api/sessions");
      const apiSessions = data.data?.sessions || [];
      const apiEnrollments = data.data?.enrollments || [];

      setSessions(apiSessions);
      setEnrollments(apiEnrollments);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "세션 목록 조회 실패";
      setError(errorMessage);
      console.error("세션 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===== 세션 추가 =====

  const addSession = useCallback(
    async (sessionData: {
      studentIds: string[];
      subjectId: string;
      weekday: number;
      startTime: string;
      endTime: string;
      room?: string;
    }) => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiCall("/api/sessions", {
          method: "POST",
          body: JSON.stringify(sessionData),
        });

        // 성공 시 목록 새로고침
        await refreshSessions();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 추가 실패";
        setError(errorMessage);
        console.error("세션 추가 실패:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions]
  );

  // ===== 세션 수정 =====

  const updateSession = useCallback(
    async (
      sessionId: string,
      sessionData: {
        studentIds: string[];
        subjectId: string;
        weekday: number;
        startTime: string;
        endTime: string;
        room?: string;
      }
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiCall(`/api/sessions/${sessionId}`, {
          method: "PUT",
          body: JSON.stringify(sessionData),
        });

        // 성공 시 목록 새로고침
        await refreshSessions();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 수정 실패";
        setError(errorMessage);
        console.error("세션 수정 실패:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions]
  );

  // ===== 세션 위치 업데이트 (드래그앤드롭용) =====

  const updateSessionPosition = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string, // 드롭된 시간 (새로운 시작 시간)
      yPosition: number
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // 기존 세션의 지속 시간 계산
        const existingSession = sessions.find((s) => s.id === sessionId);
        if (!existingSession) {
          throw new Error("세션을 찾을 수 없습니다.");
        }

        const startMinutes = timeToMinutes(existingSession.startsAt);
        const endMinutes = timeToMinutes(existingSession.endsAt);
        const durationMinutes = endMinutes - startMinutes;

        // 새로운 종료 시간 계산
        const newStartMinutes = timeToMinutes(time);
        const newEndMinutes = newStartMinutes + durationMinutes;
        const newEndTime = minutesToTime(newEndMinutes);

        // 픽셀 위치를 논리적 위치로 변환 (1, 2, 3...)
        const logicalPosition = Math.round(yPosition / 47) + 1; // 0px = 1번째, 47px = 2번째, 94px = 3번째

        const data = await apiCall(`/api/sessions/${sessionId}/position`, {
          method: "PUT",
          body: JSON.stringify({
            weekday,
            time,
            endTime: newEndTime,
            yPosition: logicalPosition, // 논리적 위치 저장 (1, 2, 3...)
          }),
        });

        // 성공 시 목록 새로고침
        await refreshSessions();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 위치 업데이트 실패";
        setError(errorMessage);
        console.error("세션 위치 업데이트 실패:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessions, refreshSessions]
  );

  // ===== 세션 삭제 =====

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiCall(`/api/sessions/${sessionId}`, {
          method: "DELETE",
        });

        // 성공 시 목록 새로고침
        await refreshSessions();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "세션 삭제 실패";
        setError(errorMessage);
        console.error("세션 삭제 실패:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions]
  );

  // ===== 초기 데이터 로드 =====

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // ===== 반환값 =====

  return {
    sessions,
    enrollments,
    addSession,
    updateSession,
    updateSessionPosition,
    deleteSession,
    isLoading,
    error,
  };
};
