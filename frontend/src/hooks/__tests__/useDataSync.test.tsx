/**
 * useDataSync 훅 테스트
 */

import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { supabase } from '../../utils/supabaseClient';
import { useDataSync } from '../useDataSync';

// Supabase 모킹
vi.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
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

describe('useDataSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태가 올바르게 설정되어야 함', () => {
    const { result } = renderHook(() => useDataSync());

    expect(result.current.syncModal.isOpen).toBe(false);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncModal.scenario).toBe('noData');
  });

  it('동기화 모달을 열고 닫을 수 있어야 함', () => {
    const { result } = renderHook(() => useDataSync());

    act(() => {
      result.current.openSyncModal('newUser');
    });

    expect(result.current.syncModal.isOpen).toBe(true);
    expect(result.current.syncModal.scenario).toBe('newUser');

    act(() => {
      result.current.closeSyncModal();
    });

    expect(result.current.syncModal.isOpen).toBe(false);
  });

  it('데이터 요약 정보를 올바르게 생성해야 함', () => {
    const { result } = renderHook(() => useDataSync());

    const testData = {
      students: [
        { id: '1', name: '학생1' },
        { id: '2', name: '학생2' },
      ],
      subjects: [{ id: '1', name: '수학', color: '#f59e0b' }],
      sessions: [
        {
          id: '1',
          enrollmentIds: ['1'],
          weekday: 0,
          startsAt: '11:45',
          endsAt: '12:45',
        },
      ],
      enrollments: [{ id: '1', studentId: '1', subjectId: '1' }],
      lastModified: '2024-01-01T00:00:00Z',
      version: '1.0',
    };

    const summary = result.current.getDataSummary(testData);

    expect(summary.students).toBe(2);
    expect(summary.subjects).toBe(1);
    expect(summary.sessions).toBe(1);
    expect(summary.lastModified).toBe('2024-01-01T00:00:00Z');
  });

  it('동기화 시나리오를 올바르게 판단해야 함', async () => {
    const mockUser = { id: 'user123' };
    const mockServerData = { data: { data: { students: [] } } };

    (
      supabase.auth.getUser as unknown as {
        mockResolvedValue: (value: unknown) => void;
      }
    ).mockResolvedValue({
      data: { user: mockUser },
    });

    (
      supabase.from as unknown as { mockReturnValue: (value: unknown) => void }
    ).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(mockServerData),
        }),
      }),
    });

    const { result } = renderHook(() => useDataSync());

    let scenario;
    await act(async () => {
      scenario = await result.current.checkSyncNeeded();
    });

    expect(scenario).toBe('normalLogin');
  });
});
