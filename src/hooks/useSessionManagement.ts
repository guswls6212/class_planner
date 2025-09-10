import type { Enrollment, Session } from "@/shared/types/DomainTypes";
import { useCallback, useEffect, useState } from "react";

export interface UseSessionManagementReturn {
  sessions: Session[];
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  addSession: (session: Omit<Session, "id">) => Promise<boolean>;
  updateSession: (id: string, session: Partial<Session>) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
  addEnrollment: (enrollment: Omit<Enrollment, "id">) => Promise<boolean>;
  removeEnrollment: (id: string) => Promise<boolean>;
  updateEnrollment: (
    id: string,
    enrollment: Partial<Enrollment>
  ) => Promise<boolean>;
  exportSchedule: () => void;
  importSchedule: (file: File) => Promise<void>;
  clearAllSessions: () => Promise<void>;
}

export const useSessionManagement = (): UseSessionManagementReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 로컬 스토리지에서 데이터 로드
      const localSessions = localStorage.getItem("sessions");
      const localEnrollments = localStorage.getItem("enrollments");

      if (localSessions) {
        const sessionsData = JSON.parse(localSessions);
        setSessions(sessionsData);
      }

      if (localEnrollments) {
        const enrollmentsData = JSON.parse(localEnrollments);
        setEnrollments(enrollmentsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  // 세션 추가
  const addSession = useCallback(
    async (sessionData: Omit<Session, "id">): Promise<boolean> => {
      try {
        const newSession: Session = {
          ...sessionData,
          id: crypto.randomUUID(),
        };

        const updatedSessions = [...sessions, newSession];
        setSessions(updatedSessions);
        localStorage.setItem("sessions", JSON.stringify(updatedSessions));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "세션 추가 실패");
        return false;
      }
    },
    [sessions]
  );

  // 세션 업데이트
  const updateSession = useCallback(
    async (id: string, sessionData: Partial<Session>): Promise<boolean> => {
      try {
        const updatedSessions = sessions.map((session) =>
          session.id === id ? { ...session, ...sessionData } : session
        );
        setSessions(updatedSessions);
        localStorage.setItem("sessions", JSON.stringify(updatedSessions));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "세션 업데이트 실패");
        return false;
      }
    },
    [sessions]
  );

  // 세션 삭제
  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const updatedSessions = sessions.filter((session) => session.id !== id);
        setSessions(updatedSessions);
        localStorage.setItem("sessions", JSON.stringify(updatedSessions));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "세션 삭제 실패");
        return false;
      }
    },
    [sessions]
  );

  // 수강신청 추가
  const addEnrollment = useCallback(
    async (enrollmentData: Omit<Enrollment, "id">): Promise<boolean> => {
      try {
        const newEnrollment: Enrollment = {
          ...enrollmentData,
          id: crypto.randomUUID(),
        };

        const updatedEnrollments = [...enrollments, newEnrollment];
        setEnrollments(updatedEnrollments);
        localStorage.setItem("enrollments", JSON.stringify(updatedEnrollments));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "수강신청 추가 실패");
        return false;
      }
    },
    [enrollments]
  );

  // 수강신청 삭제
  const removeEnrollment = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const updatedEnrollments = enrollments.filter(
          (enrollment) => enrollment.id !== id
        );
        setEnrollments(updatedEnrollments);
        localStorage.setItem("enrollments", JSON.stringify(updatedEnrollments));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "수강신청 삭제 실패");
        return false;
      }
    },
    [enrollments]
  );

  // 수강신청 업데이트
  const updateEnrollment = useCallback(
    async (
      id: string,
      enrollmentData: Partial<Enrollment>
    ): Promise<boolean> => {
      try {
        const updatedEnrollments = enrollments.map((enrollment) =>
          enrollment.id === id
            ? { ...enrollment, ...enrollmentData }
            : enrollment
        );
        setEnrollments(updatedEnrollments);
        localStorage.setItem("enrollments", JSON.stringify(updatedEnrollments));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "수강신청 업데이트 실패");
        return false;
      }
    },
    [enrollments]
  );

  // 스케줄 내보내기
  const exportSchedule = useCallback(() => {
    try {
      const data = {
        sessions,
        enrollments,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schedule-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "내보내기 실패");
    }
  }, [sessions, enrollments]);

  // 스케줄 가져오기
  const importSchedule = useCallback(async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.sessions) {
        setSessions(data.sessions);
        localStorage.setItem("sessions", JSON.stringify(data.sessions));
      }

      if (data.enrollments) {
        setEnrollments(data.enrollments);
        localStorage.setItem("enrollments", JSON.stringify(data.enrollments));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오기 실패");
    }
  }, []);

  // 모든 세션 삭제
  const clearAllSessions = useCallback(async (): Promise<void> => {
    try {
      setSessions([]);
      setEnrollments([]);
      localStorage.removeItem("sessions");
      localStorage.removeItem("enrollments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "전체 삭제 실패");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    sessions,
    enrollments,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    addEnrollment,
    removeEnrollment,
    updateEnrollment,
    exportSchedule,
    importSchedule,
    clearAllSessions,
  };
};
