import { useCallback, useEffect, useState } from 'react';
import type { Enrollment, Session, Student, Subject } from '../lib/planner';
import type { ClassPlannerData } from '../types/dataSyncTypes';
import { supabase } from '../utils/supabaseClient';

export interface UseSessionManagementReturn {
  sessions: Session[];
  enrollments: Enrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<Enrollment[]>>;
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
  _subjects: Subject[],
): UseSessionManagementReturn => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 사용자 데이터 로드
   */
  const loadUserData = useCallback(async () => {
    console.log('🔄 loadUserData 함수 시작');
    try {
      setIsLoading(true);
      setError(null);
      console.log('✅ 로딩 상태 설정 완료');

      // 먼저 로컬 스토리지에서 데이터 로드 (빠른 UI 응답)
      console.log('🔄 로컬 스토리지에서 데이터 로드 중...');

      const localSessions = localStorage.getItem('sessions');
      const localEnrollments = localStorage.getItem('enrollments');

      if (localSessions) {
        try {
          const sessions = JSON.parse(localSessions);
          setSessions(sessions);
          console.log('✅ 로컬 세션 데이터 로드 완료:', sessions.length);
        } catch (e) {
          console.warn('⚠️ 로컬 세션 데이터 파싱 실패:', e);
        }
      }

      if (localEnrollments) {
        try {
          const enrollments = JSON.parse(localEnrollments);
          setEnrollments(enrollments);
          console.log('✅ 로컬 수강신청 데이터 로드 완료:', enrollments.length);
        } catch (e) {
          console.warn('⚠️ 로컬 수강신청 데이터 파싱 실패:', e);
        }
      }

      // Supabase 인증 확인 (타임아웃 설정)
      console.log('🔄 Supabase 인증 확인 중...');

      const getSessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getSession 타임아웃 (5초)')), 5000),
      );

      try {
        const {
          data: { session },
          error: sessionError,
        } = (await Promise.race([getSessionPromise, timeoutPromise])) as {
          data: { session: { user: { id: string } } | null };
          error: { message: string } | null;
        };

        if (sessionError) {
          console.error('❌ 세션 확인 실패:', sessionError);
          setError('인증 세션 확인에 실패했습니다. 로컬 데이터를 사용합니다.');
          // 에러가 있어도 로컬 데이터는 이미 로드했으므로 계속 진행
          return;
        }

        const user = session?.user;
        console.log(
          '✅ 사용자 인증 확인 완료:',
          user ? '로그인됨' : '로그아웃됨',
        );

        if (!user) {
          console.log('🔔 로그인되지 않은 사용자 - 로컬 데이터 사용');
          setError(null); // 로그아웃 상태는 에러가 아님
          return;
        }

        // 로그인된 사용자의 경우 Supabase에서 데이터 동기화
        console.log('🔄 Supabase에서 데이터 동기화 중...');

        const { data, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        console.log('✅ Supabase 쿼리 완료:', { data: !!data, error: !!error });

        if (error) {
          console.log('❌ Supabase 에러 발생:', error);
          if (error.code === 'PGRST116') {
            console.log('사용자 데이터 없음 - 로컬 데이터 유지');
            setError(null); // 데이터가 없는 것은 에러가 아님
            return;
          }
          setError(
            '서버에서 데이터를 불러오는데 실패했습니다. 로컬 데이터를 사용합니다.',
          );
          // 에러가 있어도 로컬 데이터는 이미 로드했으므로 계속 진행
          return;
        }

        if (data?.data) {
          console.log('🔄 Supabase 데이터 파싱 중...');
          const userData = data.data as ClassPlannerData;

          // Supabase 데이터가 있으면 로컬 데이터를 덮어쓰기
          setSessions(userData.sessions || []);
          setEnrollments(userData.enrollments || []);

          console.log('✅ Supabase 데이터 동기화 완료:', {
            sessionsCount: userData.sessions?.length || 0,
            enrollmentsCount: userData.enrollments?.length || 0,
          });
        } else {
          console.log('❌ Supabase 데이터가 없음 - 로컬 데이터 유지');
        }
      } catch (timeoutError) {
        console.warn(
          '⚠️ Supabase 인증 타임아웃 - 로컬 데이터 사용:',
          timeoutError,
        );
        setError('서버 연결이 지연되고 있습니다. 로컬 데이터를 사용합니다.');
        // 타임아웃이 발생해도 로컬 데이터는 이미 로드했으므로 계속 진행
      }
    } catch (err) {
      console.error('❌ 데이터 로드 실패:', err);
      setError('데이터 로드에 실패했습니다.');
    } finally {
      console.log('🔄 로딩 상태 해제 중...');
      setIsLoading(false);
      console.log('✅ 로딩 상태 해제 완료');
    }
  }, []);

  /**
   * 데이터를 서버에 저장
   */
  const saveToServer = useCallback(
    async (sessionsData: Session[], enrollmentsData: Enrollment[]) => {
      console.log('🔄 saveToServer 함수 시작');
      try {
        console.log('🔄 사용자 정보 확인 중...');

        // 타임아웃을 추가한 getUser 호출
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getUser 타임아웃 (5초)')), 5000),
        );

        const {
          data: { user },
        } = (await Promise.race([getUserPromise, timeoutPromise])) as {
          data: { user: { id: string } | null };
        };

        if (!user) {
          console.log(
            '❌ 로그인되지 않은 사용자 - 서버 저장 건너뜀 (로컬 데이터는 정상 추가됨)',
          );
          return; // 로그인하지 않은 상태에서는 서버 저장만 건너뛰고 성공으로 처리
        }
        console.log('✅ 사용자 정보 확인 완료:', user.id);

        console.log('🔄 기존 데이터 조회 중...');
        // 현재 사용자 데이터 가져오기
        const { data: existingData } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', user.id)
          .single();

        const currentData = (existingData?.data as ClassPlannerData) || {
          students: [],
          subjects: [],
          sessions: [],
          enrollments: [],
          lastModified: new Date().toISOString(),
          version: '1.0',
        };
        console.log('✅ 기존 데이터 조회 완료');

        console.log('🔄 데이터 업데이트 중...');
        // 세션과 수강신청 데이터만 업데이트
        const updatedData: ClassPlannerData = {
          ...currentData,
          sessions: sessionsData,
          enrollments: enrollmentsData,
          lastModified: new Date().toISOString(),
        };
        console.log('✅ 데이터 업데이트 완료');

        console.log('🔄 기존 user_data 테이블에 저장 중...');

        const { error } = await supabase.from('user_data').upsert(
          {
            user_id: user.id,
            data: updatedData,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          },
        );

        if (error) {
          console.error('❌ 서버 저장 오류:', error);
          throw error;
        }

        console.log('✅ 기존 user_data 테이블 저장 완료');
      } catch (err) {
        console.error('❌ 서버 저장 실패:', err);
        throw err;
      }
    },
    [],
  );

  /**
   * 세션 추가
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
        console.log('✅ 로딩 상태 설정 완료');

        // 새로운 수강신청 생성
        const newEnrollments: Enrollment[] = [];
        const studentEnrollments: Enrollment[] = [];
        console.log('🔄 수강신청 생성 시작');

        for (const studentId of sessionData.studentIds) {
          console.log('🔄 학생 ID 처리 중:', studentId);
          // 기존 수강신청 확인
          const existingEnrollment = enrollments.find(
            e =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId,
          );

          if (existingEnrollment) {
            console.log('✅ 기존 수강신청 발견:', existingEnrollment.id);
            studentEnrollments.push(existingEnrollment);
          } else {
            console.log('🔄 새로운 수강신청 생성 중');
            const newEnrollment: Enrollment = {
              id: crypto.randomUUID(),
              studentId,
              subjectId: sessionData.subjectId,
            };
            newEnrollments.push(newEnrollment);
            studentEnrollments.push(newEnrollment);
            console.log('✅ 새로운 수강신청 생성 완료:', newEnrollment.id);
          }
        }

        console.log('🔄 새로운 세션 생성 시작');
        // 새로운 세션 생성
        const newSession: Session = {
          id: crypto.randomUUID(),
          enrollmentIds: studentEnrollments.map(e => e.id),
          weekday: sessionData.weekday,
          startsAt: sessionData.startTime,
          endsAt: sessionData.endTime,
          room: sessionData.room,
        };
        console.log('✅ 새로운 세션 생성 완료:', newSession.id);

        // 상태 업데이트
        console.log('🔄 상태 업데이트 시작');
        const updatedEnrollments = [...enrollments, ...newEnrollments];
        const updatedSessions = [...sessions, newSession];

        setEnrollments(updatedEnrollments);
        setSessions(updatedSessions);
        console.log('✅ 상태 업데이트 완료');

        // 로컬 스토리지에 저장
        console.log('🔄 로컬 스토리지 저장 시작');
        try {
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
          localStorage.setItem(
            'enrollments',
            JSON.stringify(updatedEnrollments),
          );
          console.log('✅ 로컬 스토리지 저장 완료');
        } catch (storageError) {
          console.error('❌ 로컬 스토리지 저장 실패:', storageError);
        }

        // 서버에 저장 (로그인하지 않은 상태에서는 건너뛰기)
        console.log('🔄 서버 저장 시작');
        try {
          await saveToServer(updatedSessions, updatedEnrollments);
          console.log('✅ 서버 저장 완료');
        } catch (serverError) {
          console.warn(
            '⚠️ 서버 저장 실패 (로컬 데이터는 정상 추가됨):',
            serverError,
          );
          // 서버 저장 실패해도 로컬 데이터는 정상적으로 추가되었으므로 에러로 처리하지 않음
        }

        console.log('세션 추가 완료:', {
          sessionId: newSession.id,
          enrollmentIds: newSession.enrollmentIds,
        });
      } catch (err) {
        console.error('세션 추가 실패:', err);
        setError('세션 추가에 실패했습니다.');
        throw err;
      } finally {
        setIsLoading(false);
        console.log('✅ 로딩 상태 해제 완료');
      }
    },
    [sessions, enrollments, saveToServer],
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
      },
    ) => {
      try {
        setIsLoading(true);
        setError(null);

        // 기존 세션 찾기
        const existingSession = sessions.find(s => s.id === sessionId);
        if (!existingSession) {
          throw new Error('세션을 찾을 수 없습니다.');
        }

        // 새로운 수강신청 생성
        const newEnrollments: Enrollment[] = [];
        const studentEnrollments: Enrollment[] = [];

        for (const studentId of sessionData.studentIds) {
          // 기존 수강신청 확인
          const existingEnrollment = enrollments.find(
            e =>
              e.studentId === studentId && e.subjectId === sessionData.subjectId,
          );

          if (existingEnrollment) {
            studentEnrollments.push(existingEnrollment);
          } else {
            const newEnrollment: Enrollment = {
              id: crypto.randomUUID(),
              studentId,
              subjectId: sessionData.subjectId,
            };
            newEnrollments.push(newEnrollment);
            studentEnrollments.push(newEnrollment);
          }
        }

        // 세션 업데이트
        const updatedSession: Session = {
          ...existingSession,
          enrollmentIds: studentEnrollments.map(e => e.id),
          weekday: sessionData.weekday,
          startsAt: sessionData.startTime,
          endsAt: sessionData.endTime,
          room: sessionData.room,
        };

        // 상태 업데이트
        const updatedEnrollments = [...enrollments, ...newEnrollments];
        const updatedSessions = sessions.map(s =>
          s.id === sessionId ? updatedSession : s,
        );

        setEnrollments(updatedEnrollments);
        setSessions(updatedSessions);

        // 로컬 스토리지에 저장
        try {
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
          localStorage.setItem(
            'enrollments',
            JSON.stringify(updatedEnrollments),
          );
        } catch (storageError) {
          console.error('❌ 로컬 스토리지 저장 실패:', storageError);
        }

        // 서버에 저장
        await saveToServer(updatedSessions, updatedEnrollments);

        console.log('세션 업데이트 완료:', {
          sessionId: updatedSession.id,
          enrollmentIds: updatedSession.enrollmentIds,
        });
      } catch (err) {
        console.error('세션 업데이트 실패:', err);
        setError('세션 업데이트에 실패했습니다.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessions, enrollments, saveToServer],
  );

  /**
   * 세션 삭제
   */
  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // 세션 삭제
        const updatedSessions = sessions.filter(s => s.id !== sessionId);
        setSessions(updatedSessions);

        // 로컬 스토리지에 저장
        try {
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
        } catch (storageError) {
          console.error('❌ 로컬 스토리지 저장 실패:', storageError);
        }

        // 서버에 저장
        await saveToServer(updatedSessions, enrollments);

        console.log('세션 삭제 완료:', { sessionId });
      } catch (err) {
        console.error('세션 삭제 실패:', err);
        setError('세션 삭제에 실패했습니다.');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessions, enrollments, saveToServer],
  );

  // 초기 데이터 로드
  useEffect(() => {
    console.log('🔄 useSessionManagement 초기 데이터 로드 시작');
    loadUserData();
  }, [loadUserData]);

  return {
    sessions,
    enrollments,
    setEnrollments,
    addSession,
    updateSession,
    deleteSession,
    isLoading,
    error,
  };
};
