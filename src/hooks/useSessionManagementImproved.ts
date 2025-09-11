/**
 * useSessionManagement 개선된 버전
 * Supabase 세션 CRUD 테이블을 사용한 세션 관리
 */

import { useCallback, useEffect, useState } from "react";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { supabase } from "../utils/supabaseClient";

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
  deleteSession: (sessionId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const useSessionManagement = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _students: Student[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _subjects: Subject[]
): UseSessionManagementReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 사용자 데이터 로드 (로그인 상태에 따라 분기)
   */
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 먼저 현재 세션 상태를 정확히 확인
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.log("세션 확인 중 오류:", sessionError);
        // 세션 오류 시 모든 Supabase 관련 로컬 스토리지 정리
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            localStorage.removeItem(key);
            console.log("만료된 세션 정보 제거:", key);
          }
        });
      }

      if (!session || sessionError) {
        console.log("유효한 세션이 없음 - localStorage 데이터 사용");
        // localStorage에서 데이터 로드
        const localSessions = localStorage.getItem("sessions");
        const localEnrollments = localStorage.getItem("enrollments");

        if (localSessions) {
          const sessionsData = JSON.parse(localSessions);
          setSessions(sessionsData);
          console.log("로컬 세션 데이터 로드됨:", sessionsData.length, "개");
        }

        if (localEnrollments) {
          const enrollmentsData = JSON.parse(localEnrollments);
          setEnrollments(enrollmentsData);
          console.log(
            "로컬 수강신청 데이터 로드됨:",
            enrollmentsData.length,
            "개"
          );
        }

        console.log("✅ 로컬 데이터 로드 완료");
        return;
      }

      console.log("유효한 세션 확인됨:", session.user.email);

      console.log("🔄 Supabase 세션 데이터 로드 시작");

      // 세션 데이터 로드
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("weekday", { ascending: true })
        .order("starts_at", { ascending: true });

      if (sessionsError) {
        console.error("세션 데이터 로드 실패:", sessionsError);
        throw sessionsError;
      }

      // 수강신청 데이터 로드
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", session.user.id);

      if (enrollmentsError) {
        console.error("수강신청 데이터 로드 실패:", enrollmentsError);
        throw enrollmentsError;
      }

      // 데이터 변환
      const convertedSessions: Session[] = (sessionsData || []).map(
        (session) => ({
          id: session.id,
          enrollmentIds: session.enrollment_ids || [],
          weekday: session.weekday,
          startsAt: session.starts_at,
          endsAt: session.ends_at,
          room: session.room,
        })
      );

      const convertedEnrollments: Enrollment[] = (enrollmentsData || []).map(
        (enrollment) => ({
          id: enrollment.id,
          studentId: enrollment.student_id,
          subjectId: enrollment.subject_id,
        })
      );

      setSessions(convertedSessions);
      setEnrollments(convertedEnrollments);

      console.log("✅ Supabase 세션 데이터 로드 완료:", {
        sessionsCount: convertedSessions.length,
        enrollmentsCount: convertedEnrollments.length,
      });
    } catch (err) {
      console.error("사용자 데이터 로드 실패:", err);
      setError("데이터 로드에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 세션 추가 (Supabase 세션 테이블에)
   */
  const addSession = useCallback(
    async (sessionData: {
      studentIds: string[];
      subjectId: string;
      weekday: number;
      startTime: string;
      endTime: string;
      room?: string;
    }) => {
      console.log("🔄 addSession 함수 시작:", sessionData);
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // 로그인 안된 사용자: localStorage에 저장
          console.log("🔄 localStorage에 세션 저장");
          const newSession: Session = {
            id: crypto.randomUUID(),
            enrollmentIds: sessionData.studentIds.map(
              (studentId) => `${studentId}-${sessionData.subjectId}`
            ),
            weekday: sessionData.weekday,
            startsAt: sessionData.startTime,
            endsAt: sessionData.endTime,
            room: sessionData.room,
          };

          const newSessions = [...sessions, newSession];
          setSessions(newSessions);
          localStorage.setItem("sessions", JSON.stringify(newSessions));

          // 수강신청도 localStorage에 저장
          const newEnrollments: Enrollment[] = sessionData.studentIds.map(
            (studentId) => ({
              id: `${studentId}-${sessionData.subjectId}`,
              studentId,
              subjectId: sessionData.subjectId,
            })
          );

          const updatedEnrollments = [...enrollments, ...newEnrollments];
          setEnrollments(updatedEnrollments);
          localStorage.setItem(
            "enrollments",
            JSON.stringify(updatedEnrollments)
          );

          return;
        }

        console.log("🔄 수강신청 생성 시작");

        // 수강신청 생성 또는 조회
        const enrollmentIds: string[] = [];
        for (const studentId of sessionData.studentIds) {
          // 기존 수강신청 확인
          const existingEnrollment = enrollments.find(
            (e) =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId
          );

          if (existingEnrollment) {
            enrollmentIds.push(existingEnrollment.id);
          } else {
            // 새로운 수강신청 생성
            const { data: newEnrollment, error: enrollmentError } =
              await supabase
                .from("enrollments")
                .insert({
                  user_id: user.id,
                  student_id: studentId,
                  subject_id: sessionData.subjectId,
                })
                .select()
                .single();

            if (enrollmentError) {
              throw enrollmentError;
            }

            enrollmentIds.push(newEnrollment.id);
          }
        }

        console.log("🔄 세션 생성 시작");

        // 세션 생성
        const { data: newSession, error: sessionError } = await supabase
          .from("sessions")
          .insert({
            user_id: user.id,
            enrollment_ids: enrollmentIds,
            weekday: sessionData.weekday,
            starts_at: sessionData.startTime,
            ends_at: sessionData.endTime,
            room: sessionData.room,
          })
          .select()
          .single();

        if (sessionError) {
          throw sessionError;
        }

        // 로컬 상태 업데이트
        const convertedSession: Session = {
          id: newSession.id,
          enrollmentIds: newSession.enrollment_ids || [],
          weekday: newSession.weekday,
          startsAt: newSession.starts_at,
          endsAt: newSession.ends_at,
          room: newSession.room,
        };

        setSessions((prev) => [...prev, convertedSession]);

        console.log("✅ 세션 추가 완료:", {
          sessionId: convertedSession.id,
          enrollmentIds: convertedSession.enrollmentIds,
        });
      } catch (err) {
        console.error("세션 추가 실패:", err);
        setError("세션 추가에 실패했습니다.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [enrollments]
  );

  /**
   * 세션 업데이트
   */
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

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // 로그인 안된 사용자: localStorage에서 업데이트
          console.log("🔄 localStorage에서 세션 업데이트");
          const updatedSessions = sessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  enrollmentIds: sessionData.studentIds.map(
                    (studentId) => `${studentId}-${sessionData.subjectId}`
                  ),
                  weekday: sessionData.weekday,
                  startsAt: sessionData.startTime,
                  endsAt: sessionData.endTime,
                  room: sessionData.room,
                }
              : session
          );

          setSessions(updatedSessions);
          localStorage.setItem("sessions", JSON.stringify(updatedSessions));

          // 수강신청도 업데이트
          const updatedEnrollments = enrollments.filter(
            (e) => !e.id.startsWith(sessionId)
          );

          const newEnrollments: Enrollment[] = sessionData.studentIds.map(
            (studentId) => ({
              id: `${studentId}-${sessionData.subjectId}`,
              studentId,
              subjectId: sessionData.subjectId,
            })
          );

          const finalEnrollments = [...updatedEnrollments, ...newEnrollments];
          setEnrollments(finalEnrollments);
          localStorage.setItem("enrollments", JSON.stringify(finalEnrollments));

          return;
        }

        // 수강신청 처리 (addSession과 동일한 로직)
        const enrollmentIds: string[] = [];
        for (const studentId of sessionData.studentIds) {
          const existingEnrollment = enrollments.find(
            (e) =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId
          );

          if (existingEnrollment) {
            enrollmentIds.push(existingEnrollment.id);
          } else {
            const { data: newEnrollment, error: enrollmentError } =
              await supabase
                .from("enrollments")
                .insert({
                  user_id: user.id,
                  student_id: studentId,
                  subject_id: sessionData.subjectId,
                })
                .select()
                .single();

            if (enrollmentError) {
              throw enrollmentError;
            }

            enrollmentIds.push(newEnrollment.id);
          }
        }

        // 세션 업데이트
        const { error: sessionError } = await supabase
          .from("sessions")
          .update({
            enrollment_ids: enrollmentIds,
            weekday: sessionData.weekday,
            starts_at: sessionData.startTime,
            ends_at: sessionData.endTime,
            room: sessionData.room,
          })
          .eq("id", sessionId)
          .eq("user_id", user.id);

        if (sessionError) {
          throw sessionError;
        }

        // 로컬 상태 업데이트
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  enrollmentIds,
                  weekday: sessionData.weekday,
                  startsAt: sessionData.startTime,
                  endsAt: sessionData.endTime,
                  room: sessionData.room,
                }
              : s
          )
        );

        console.log("세션 업데이트 완료:", { sessionId });
      } catch (err) {
        console.error("세션 업데이트 실패:", err);
        setError("세션 업데이트에 실패했습니다.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [enrollments]
  );

  /**
   * 세션 삭제
   */
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // 로그인 안된 사용자: localStorage에서 삭제
        console.log("🔄 localStorage에서 세션 삭제");
        const updatedSessions = sessions.filter((s) => s.id !== sessionId);
        setSessions(updatedSessions);
        localStorage.setItem("sessions", JSON.stringify(updatedSessions));

        // 관련 수강신청도 삭제
        const updatedEnrollments = enrollments.filter(
          (e) => !e.id.startsWith(sessionId)
        );
        setEnrollments(updatedEnrollments);
        localStorage.setItem("enrollments", JSON.stringify(updatedEnrollments));

        console.log("세션 삭제 완료:", { sessionId });
        return;
      }

      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId)
        .eq("user_id", user.id);

      if (error) {
        throw error;
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      console.log("세션 삭제 완료:", { sessionId });
    } catch (err) {
      console.error("세션 삭제 실패:", err);
      setError("세션 삭제에 실패했습니다.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 데이터 로드 - 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    const initializeSessions = async () => {
      console.log("🔄 useSessionManagement - 초기화 시작");

      try {
        setIsLoading(true);
        setError(null);

        // localStorage에 Supabase 토큰이 있는지 먼저 확인
        const hasAuthToken = Object.keys(localStorage).some(
          (key) => key.startsWith("sb-") && key.includes("auth-token")
        );

        console.log("🔍 인증 토큰 존재 여부:", hasAuthToken);

        if (!hasAuthToken) {
          console.log("🔍 인증 토큰 없음 - 로그인이 필요합니다");
          // 로그인하지 않은 사용자는 데이터 없음
          setSessions([]);
          setEnrollments([]);
          setIsLoading(false);
          return;
        } else {
          console.log("🔍 인증 토큰 있음 - Supabase 세션 확인 후 데이터 로드");

          // 인증 토큰이 있으면 Supabase 세션 확인
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("getSession 타임아웃 (5초)")),
              5000
            )
          );

          const {
            data: { session },
            error: sessionError,
          } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

          if (sessionError) {
            console.log("세션 확인 중 오류:", sessionError);
            // 세션 오류 시 모든 Supabase 관련 로컬 스토리지 정리
            Object.keys(localStorage).forEach((key) => {
              if (key.startsWith("sb-") || key.includes("supabase")) {
                localStorage.removeItem(key);
                console.log("만료된 세션 정보 제거:", key);
              }
            });
          }

          if (!session || sessionError) {
            console.log("유효한 세션이 없음 - 로그인이 필요합니다");
            // 세션이 없으면 데이터 없음
            setSessions([]);
            setEnrollments([]);
            setIsLoading(false);
            return;
          }

          console.log("유효한 세션 확인됨:", session.user.email);
          console.log("🔄 Supabase 세션 데이터 로드 시작");

          // 세션 데이터 로드
          const { data: sessionsData, error: sessionsError } = await supabase
            .from("sessions")
            .select("*")
            .eq("user_id", session.user.id)
            .order("weekday", { ascending: true })
            .order("starts_at", { ascending: true });

          if (sessionsError) {
            console.error("Supabase 세션 로드 실패:", sessionsError);
            setError("세션 데이터를 불러오는데 실패했습니다.");
            return;
          }

          // 수강신청 데이터 로드
          const { data: enrollmentsData, error: enrollmentsError } =
            await supabase
              .from("enrollments")
              .select("*")
              .eq("user_id", session.user.id);

          if (enrollmentsError) {
            console.error("Supabase 수강신청 로드 실패:", enrollmentsError);
            setError("수강신청 데이터를 불러오는데 실패했습니다.");
            return;
          }

          // 데이터 변환
          const sessions = (sessionsData || []).map((session) => ({
            id: session.id,
            enrollmentIds: session.enrollment_ids || [],
            weekday: session.weekday,
            startsAt: session.starts_at,
            endsAt: session.ends_at,
            room: session.room,
          }));

          const enrollments = (enrollmentsData || []).map((enrollment) => ({
            id: enrollment.id,
            studentId: enrollment.student_id,
            subjectId: enrollment.subject_id,
          }));

          setSessions(sessions);
          setEnrollments(enrollments);

          console.log("✅ Supabase 데이터 로드 완료:", {
            sessions: sessions.length,
            enrollments: enrollments.length,
          });
        }
      } catch (err) {
        console.error("❌ 데이터 로드 중 오류 발생:", err);
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    initializeSessions();
  }, []); // 빈 의존성 배열로 마운트 시 한 번만 실행

  return {
    sessions,
    enrollments,
    addSession,
    updateSession,
    deleteSession,
    isLoading,
    error,
  };
};
