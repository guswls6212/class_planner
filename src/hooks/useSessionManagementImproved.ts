/**
 * useSessionManagement 개선된 버전
 * Supabase 세션 CRUD 테이블을 사용한 세션 관리
 */

import { useCallback, useEffect, useState } from "react";
import type { Enrollment, Session, Student, Subject } from "../lib/planner";
import { supabase } from "../utils/supabaseClient";

// 🆕 다음 시간 계산 헬퍼 함수
const getNextHour = (time: string): string => {
  const [hours, minutes] = time.split(":").map(Number);
  const nextHour = hours + 1;
  return `${nextHour.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

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
  ) => Promise<void>; // 🆕 세션 위치 업데이트 함수
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
            // 새로운 수강신청 ID 생성 (로컬에서 관리)
            const newEnrollmentId = `${studentId}-${sessionData.subjectId}`;
            enrollmentIds.push(newEnrollmentId);
          }
        }

        console.log("🔄 세션 생성 시작");

        // 새로운 세션 객체 생성
        const newSession: Session = {
          id: crypto.randomUUID(),
          enrollmentIds,
          weekday: sessionData.weekday,
          startsAt: sessionData.startTime,
          endsAt: sessionData.endTime,
          room: sessionData.room,
        };

        // 새로운 수강신청들 생성
        const newEnrollments: Enrollment[] = sessionData.studentIds.map(
          (studentId) => ({
            id: `${studentId}-${sessionData.subjectId}`,
            studentId,
            subjectId: sessionData.subjectId,
          })
        );

        // user_data 테이블 업데이트
        const { data: existingData, error: selectError } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
          throw selectError;
        }

        const userData = (existingData?.data as any) || {};
        const updatedSessions = [...(userData.sessions || []), newSession];
        const updatedEnrollments = [
          ...(userData.enrollments || []),
          ...newEnrollments.filter(
            (newEnrollment) =>
              !(userData.enrollments || []).some(
                (existing: any) => existing.id === newEnrollment.id
              )
          ),
        ];

        const { error: updateError } = await supabase.from("user_data").upsert({
          user_id: user.id,
          data: {
            ...userData,
            sessions: updatedSessions,
            enrollments: updatedEnrollments,
            lastModified: new Date().toISOString(),
          },
        });

        if (updateError) {
          throw updateError;
        }

        // 로컬 상태 업데이트
        setSessions((prev) => [...prev, newSession]);
        setEnrollments((prev) => [
          ...prev,
          ...newEnrollments.filter(
            (newEnrollment) =>
              !prev.some((existing) => existing.id === newEnrollment.id)
          ),
        ]);

        console.log("✅ 세션 추가 완료:", {
          sessionId: newSession.id,
          enrollmentIds: newSession.enrollmentIds,
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
            // 새로운 수강신청 ID 생성 (로컬에서 관리)
            const newEnrollmentId = `${studentId}-${sessionData.subjectId}`;
            enrollmentIds.push(newEnrollmentId);
          }
        }

        // 새로운 수강신청들 생성
        const newEnrollments: Enrollment[] = sessionData.studentIds.map(
          (studentId) => ({
            id: `${studentId}-${sessionData.subjectId}`,
            studentId,
            subjectId: sessionData.subjectId,
          })
        );

        // user_data 테이블 업데이트
        const { data: existingData, error: selectError } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
          throw selectError;
        }

        const userData = (existingData?.data as any) || {};

        // 세션 업데이트
        const updatedSessions = (userData.sessions || []).map((session: any) =>
          session.id === sessionId
            ? {
                ...session,
                enrollmentIds,
                weekday: sessionData.weekday,
                startsAt: sessionData.startTime,
                endsAt: sessionData.endTime,
                room: sessionData.room,
              }
            : session
        );

        // 수강신청 업데이트 (기존 세션 관련 수강신청 제거 후 새로 추가)
        const updatedEnrollments = [
          ...(userData.enrollments || []).filter(
            (enrollment: any) => !enrollment.id.startsWith(sessionId)
          ),
          ...newEnrollments.filter(
            (newEnrollment) =>
              !(userData.enrollments || []).some(
                (existing: any) => existing.id === newEnrollment.id
              )
          ),
        ];

        const { error: updateError } = await supabase.from("user_data").upsert({
          user_id: user.id,
          data: {
            ...userData,
            sessions: updatedSessions,
            enrollments: updatedEnrollments,
            lastModified: new Date().toISOString(),
          },
        });

        if (updateError) {
          throw updateError;
        }

        // 로컬 상태 업데이트
        setSessions(updatedSessions);
        setEnrollments(updatedEnrollments);

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
   * 🆕 세션 위치 업데이트 (드래그 앤 드롭으로 이동 - 시간은 유지)
   */
  const updateSessionPosition = useCallback(
    async (
      sessionId: string,
      weekday: number,
      time: string, // 드롭된 시간 (참고용, 실제로는 사용하지 않음)
      yPosition: number
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // 로그인 안된 사용자: localStorage에서 업데이트
          console.log("🔄 localStorage에서 세션 위치 업데이트");
          const updatedSessions = sessions.map((session) => {
            if (session.id === sessionId) {
              return {
                ...session,
                weekday,
                // 🆕 시간은 유지하고 yPosition만 변경
                yPosition: Math.round(yPosition / 47) * 47, // 47px 단위로 정렬
              };
            }
            return session;
          });
          setSessions(updatedSessions);
          return;
        }

        // 로그인된 사용자: Supabase에서 업데이트
        console.log("🔄 Supabase에서 세션 위치 업데이트 (시간 유지):", {
          sessionId,
          weekday,
          yPosition,
        });

        // user_data 테이블에서 현재 데이터 가져오기
        const { data: userData, error: userDataError } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", user.id)
          .single();

        if (userDataError) {
          throw userDataError;
        }

        const data = userData?.data || {};
        const currentSessions = data.sessions || [];

        // 세션 위치 업데이트 (시간은 유지하고 위치만 변경)
        const updatedSessions = currentSessions.map((session: any) => {
          if (session.id === sessionId) {
            return {
              ...session,
              weekday,
              // 🆕 시간은 유지하고 yPosition만 변경
              yPosition: Math.round(yPosition / 47) * 47, // 47px 단위로 정렬
            };
          }
          return session;
        });

        // Supabase에 업데이트된 데이터 저장
        const { error: updateError } = await supabase.from("user_data").upsert({
          user_id: user.id,
          data: {
            ...data,
            sessions: updatedSessions,
            lastModified: new Date().toISOString(),
          },
        });

        if (updateError) {
          throw updateError;
        }

        // 로컬 상태 업데이트
        setSessions(updatedSessions);

        console.log("세션 위치 업데이트 완료 (시간 유지):", {
          sessionId,
          weekday,
          yPosition,
        });
      } catch (err) {
        console.error("세션 위치 업데이트 실패:", err);
        setError("세션 위치 업데이트에 실패했습니다.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessions]
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

      // user_data 테이블에서 세션 삭제
      const { data: existingData, error: selectError } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", user.id)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        throw selectError;
      }

      const userData = (existingData?.data as any) || {};

      // 세션 삭제
      const updatedSessions = (userData.sessions || []).filter(
        (session: any) => session.id !== sessionId
      );

      // 관련 수강신청도 삭제
      const updatedEnrollments = (userData.enrollments || []).filter(
        (enrollment: any) => !enrollment.id.startsWith(sessionId)
      );

      const { error: updateError } = await supabase.from("user_data").upsert({
        user_id: user.id,
        data: {
          ...userData,
          sessions: updatedSessions,
          enrollments: updatedEnrollments,
          lastModified: new Date().toISOString(),
        },
      });

      if (updateError) {
        throw updateError;
      }

      // 로컬 상태 업데이트
      setSessions(updatedSessions);
      setEnrollments(updatedEnrollments);

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

          // user_data 테이블에서 JSONB 데이터 로드
          const { data: userData, error: userDataError } = await supabase
            .from("user_data")
            .select("data")
            .eq("user_id", session.user.id)
            .single();

          if (userDataError) {
            console.error("Supabase 사용자 데이터 로드 실패:", userDataError);
            setError("사용자 데이터를 불러오는데 실패했습니다.");
            return;
          }

          // JSONB 데이터에서 세션과 수강신청 추출
          const data = userData?.data || {};
          const sessions = data.sessions || [];
          const enrollments = data.enrollments || [];

          console.log("📊 로드된 데이터:", {
            sessions: sessions.length,
            enrollments: enrollments.length,
          });

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
    updateSessionPosition, // 🆕 세션 위치 업데이트 함수 추가
    deleteSession,
    isLoading,
    error,
  };
};
