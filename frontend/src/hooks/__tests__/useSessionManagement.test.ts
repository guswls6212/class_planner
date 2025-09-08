import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../utils/supabaseClient';
import type { Student, Subject } from '../lib/planner';
import { useSessionManagement } from '../useSessionManagement';

// Supabase 모킹
vi.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(), // 🆕 getSession 함수 추가
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(),
    })),
  },
}));

describe('useSessionManagement', () => {
  const mockStudents: Student[] = [
    { id: '1', name: '김요섭' },
    { id: '2', name: '이민수' },
  ];

  const mockSubjects: Subject[] = [
    { id: '1', name: '중등수학', color: '#f59e0b' },
    { id: '2', name: '영어', color: '#3b82f6' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태가 올바르게 설정되어야 함', async () => {
    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    // 초기 로딩이 완료될 때까지 기다림
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.enrollments).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('세션 추가가 정상적으로 작동해야 함', async () => {
    const mockUser = { id: 'user123' };
    const mockSupabase = vi.mocked(supabase);

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              data: {
                students: [],
                subjects: [],
                sessions: [],
                enrollments: [],
                lastModified: new Date().toISOString(),
                version: '1.0',
              },
            },
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown);

    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    await act(async () => {
      await result.current.addSession({
        studentIds: ['1'],
        subjectId: '1',
        weekday: 0,
        startTime: '09:00',
        endTime: '10:00',
        room: 'A101',
      });
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].weekday).toBe(0);
    expect(result.current.sessions[0].startsAt).toBe('09:00');
    expect(result.current.sessions[0].endsAt).toBe('10:00');
    expect(result.current.sessions[0].room).toBe('A101');
  });

  it('세션 업데이트가 정상적으로 작동해야 함', async () => {
    const mockUser = { id: 'user123' };
    const mockSupabase = vi.mocked(supabase);

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    const existingSession = {
      id: 'session1',
      enrollmentIds: ['enrollment1'],
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:00',
      room: 'A101',
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              data: {
                students: [],
                subjects: [],
                sessions: [existingSession],
                enrollments: [
                  { id: 'enrollment1', studentId: '1', subjectId: '1' },
                ],
                lastModified: new Date().toISOString(),
                version: '1.0',
              },
            },
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown);

    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    // 초기 로딩 완료 대기
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      await result.current.updateSession('session1', {
        studentIds: ['1'],
        subjectId: '1',
        weekday: 1,
        startTime: '10:00',
        endTime: '11:00',
        room: 'B102',
      });
    });

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].weekday).toBe(1);
    expect(result.current.sessions[0].startsAt).toBe('10:00');
    expect(result.current.sessions[0].endsAt).toBe('11:00');
    expect(result.current.sessions[0].room).toBe('B102');
  });

  it('세션 삭제가 정상적으로 작동해야 함', async () => {
    const mockUser = { id: 'user123' };
    const mockSupabase = vi.mocked(supabase);

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    const existingSession = {
      id: 'session1',
      enrollmentIds: ['enrollment1'],
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:00',
      room: 'A101',
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              data: {
                students: [],
                subjects: [],
                sessions: [existingSession],
                enrollments: [
                  { id: 'enrollment1', studentId: '1', subjectId: '1' },
                ],
                lastModified: new Date().toISOString(),
                version: '1.0',
              },
            },
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown);

    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    // 초기 로딩 완료 대기
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      await result.current.deleteSession('session1');
    });

    expect(result.current.sessions).toHaveLength(0);
  });

  it('로그인되지 않은 사용자의 경우 서버 저장을 건너뛰어야 함', async () => {
    const mockSupabase = vi.mocked(supabase);

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    await act(async () => {
      await result.current.addSession({
        studentIds: ['1'],
        subjectId: '1',
        weekday: 0,
        startTime: '09:00',
        endTime: '10:00',
      });
    });

    // 로컬 상태는 업데이트되지만 서버 저장은 건너뛰어야 함
    expect(result.current.sessions).toHaveLength(1);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('에러 발생 시 적절한 에러 메시지를 표시해야 함', async () => {
    const mockSupabase = vi.mocked(supabase);

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    });

    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user123' } } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: { message: 'Save failed' } }),
    } as unknown);

    const { result } = renderHook(() =>
      useSessionManagement(mockStudents, mockSubjects),
    );

    await act(async () => {
      try {
        await result.current.addSession({
          studentIds: ['1'],
          subjectId: '1',
          weekday: 0,
          startTime: '09:00',
          endTime: '10:00',
        });
      } catch {
        // 에러는 훅 내부에서 처리됨
      }
    });

    expect(result.current.error).toBe(
      '서버에서 데이터를 불러오는데 실패했습니다. 로컬 데이터를 사용합니다.',
    );
  });
});
