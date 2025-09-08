/**
 * useSessionManagement 개선된 버전
 * Supabase 세션 CRUD 테이블을 사용한 세션 관리
 */

import { useCallback, useEffect, useState } from 'react';
import type { Enrollment, Session, Student, Subject } from '../lib/planner';
import { supabase } from '../utils/supabaseClient';

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
   * 사용자 데이터 로드 (Supabase 세션 테이블에서)
   */
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('로그인되지 않은 사용자 - 로컬 데이터 사용');
        return;
      }

      console.log('🔄 Supabase 세션 데이터 로드 시작');

      // 세션 데이터 로드
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('weekday', { ascending: true })
        .order('starts_at', { ascending: true });

      if (sessionsError) {
        console.error('세션 데이터 로드 실패:', sessionsError);
        throw sessionsError;
      }

      // 수강신청 데이터 로드
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id);

      if (enrollmentsError) {
        console.error('수강신청 데이터 로드 실패:', enrollmentsError);
        throw enrollmentsError;
      }

      // 데이터 변환
      const convertedSessions: Session[] = (sessionsData || []).map(
        session => ({
          id: session.id,
          enrollmentIds: session.enrollment_ids || [],
          weekday: session.weekday,
          startsAt: session.starts_at,
          endsAt: session.ends_at,
          room: session.room,
        })
      );

      const convertedEnrollments: Enrollment[] = (enrollmentsData || []).map(
        enrollment => ({
          id: enrollment.id,
          studentId: enrollment.student_id,
          subjectId: enrollment.subject_id,
        })
      );

      setSessions(convertedSessions);
      setEnrollments(convertedEnrollments);

      console.log('✅ Supabase 세션 데이터 로드 완료:', {
        sessionsCount: convertedSessions.length,
        enrollmentsCount: convertedEnrollments.length,
      });
    } catch (err) {
      console.error('사용자 데이터 로드 실패:', err);
      setError('데이터 로드에 실패했습니다.');
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
      console.log('🔄 addSession 함수 시작:', sessionData);
      try {
        setIsLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('로그인이 필요합니다.');
        }

        console.log('🔄 수강신청 생성 시작');

        // 수강신청 생성 또는 조회
        const enrollmentIds: string[] = [];
        for (const studentId of sessionData.studentIds) {
          // 기존 수강신청 확인
          const existingEnrollment = enrollments.find(
            e =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId
          );

          if (existingEnrollment) {
            enrollmentIds.push(existingEnrollment.id);
          } else {
            // 새로운 수강신청 생성
            const { data: newEnrollment, error: enrollmentError } =
              await supabase
                .from('enrollments')
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

        console.log('🔄 세션 생성 시작');

        // 세션 생성
        const { data: newSession, error: sessionError } = await supabase
          .from('sessions')
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

        setSessions(prev => [...prev, convertedSession]);

        console.log('✅ 세션 추가 완료:', {
          sessionId: convertedSession.id,
          enrollmentIds: convertedSession.enrollmentIds,
        });
      } catch (err) {
        console.error('세션 추가 실패:', err);
        setError('세션 추가에 실패했습니다.');
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
          throw new Error('로그인이 필요합니다.');
        }

        // 수강신청 처리 (addSession과 동일한 로직)
        const enrollmentIds: string[] = [];
        for (const studentId of sessionData.studentIds) {
          const existingEnrollment = enrollments.find(
            e =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId
          );

          if (existingEnrollment) {
            enrollmentIds.push(existingEnrollment.id);
          } else {
            const { data: newEnrollment, error: enrollmentError } =
              await supabase
                .from('enrollments')
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
          .from('sessions')
          .update({
            enrollment_ids: enrollmentIds,
            weekday: sessionData.weekday,
            starts_at: sessionData.startTime,
            ends_at: sessionData.endTime,
            room: sessionData.room,
          })
          .eq('id', sessionId)
          .eq('user_id', user.id);

        if (sessionError) {
          throw sessionError;
        }

        // 로컬 상태 업데이트
        setSessions(prev =>
          prev.map(s =>
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

        console.log('세션 업데이트 완료:', { sessionId });
      } catch (err) {
        console.error('세션 업데이트 실패:', err);
        setError('세션 업데이트에 실패했습니다.');
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
        throw new Error('로그인이 필요합니다.');
      }

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setSessions(prev => prev.filter(s => s.id !== sessionId));

      console.log('세션 삭제 완료:', { sessionId });
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      setError('세션 삭제에 실패했습니다.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

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
