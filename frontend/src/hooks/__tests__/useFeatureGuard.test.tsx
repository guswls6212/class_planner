/**
 * useFeatureGuard 훅 테스트
 */

import { act, renderHook } from '@testing-library/react';
import { supabase } from '../../utils/supabaseClient';
import { useFeatureGuard } from '../useFeatureGuard';

import { vi } from 'vitest';

// Supabase 모킹
vi.mock('../../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

describe('useFeatureGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태가 올바르게 설정되어야 함', () => {
    const { result } = renderHook(() => useFeatureGuard());

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.isPremium).toBe(false);
    expect(result.current.upgradeModal.isOpen).toBe(false);
  });

  it('로그인된 사용자는 프리미엄으로 간주되어야 함', async () => {
    const mockUser = { id: 'user123' };

    (
      supabase.auth.getUser as unknown as {
        mockResolvedValue: (value: unknown) => void;
      }
    ).mockResolvedValue({
      data: { user: mockUser },
    });

    const { result } = renderHook(() => useFeatureGuard());

    await act(async () => {
      // 인증 상태 변화 시뮬레이션
      const mockSubscription = { unsubscribe: vi.fn() };
      (
        supabase.auth.onAuthStateChange as unknown as {
          mockImplementation: (callback: unknown) => unknown;
        }
      ).mockImplementation((callback: unknown) => {
        (callback as (event: string, session: unknown) => void)('SIGNED_IN', {
          user: mockUser,
        });
        return { data: { subscription: mockSubscription } };
      });
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.isPremium).toBe(true);
  });

  it('무료 사용자의 기능 접근을 제한해야 함', async () => {
    // 무료 사용자 상태로 모킹 설정
    (
      supabase.auth.getUser as unknown as {
        mockResolvedValue: (value: unknown) => void;
      }
    ).mockResolvedValue({
      data: { user: null },
    });

    const { result } = renderHook(() => useFeatureGuard());

    // 상태가 안정화될 때까지 기다림
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // 무료 사용자는 학생을 10명까지만 추가 가능
    expect(result.current.checkFeatureAccess('addStudent', 10)).toBe(false);
    expect(result.current.checkFeatureAccess('addStudent', 9)).toBe(true);
  });

  it('프리미엄 사용자는 모든 기능에 접근할 수 있어야 함', async () => {
    const mockUser = { id: 'user123' };

    (
      supabase.auth.getUser as unknown as {
        mockResolvedValue: (value: unknown) => void;
      }
    ).mockResolvedValue({
      data: { user: mockUser },
    });

    const { result } = renderHook(() => useFeatureGuard());

    await act(async () => {
      const mockSubscription = { unsubscribe: vi.fn() };
      (
        supabase.auth.onAuthStateChange as unknown as {
          mockImplementation: (callback: unknown) => unknown;
        }
      ).mockImplementation((callback: unknown) => {
        (callback as (event: string, session: unknown) => void)('SIGNED_IN', {
          user: mockUser,
        });
        return { data: { subscription: mockSubscription } };
      });
    });

    // 프리미엄 사용자는 무제한 접근 가능
    expect(result.current.checkFeatureAccess('addStudent', 100)).toBe(true);
    expect(result.current.checkFeatureAccess('addSubject', 50)).toBe(true);
  });

  it('업그레이드 모달을 열고 닫을 수 있어야 함', () => {
    const { result } = renderHook(() => useFeatureGuard());

    act(() => {
      result.current.showUpgradeModal('addStudent', 10, 10);
    });

    expect(result.current.upgradeModal.isOpen).toBe(true);
    expect(result.current.upgradeModal.featureType).toBe('addStudent');
    expect(result.current.upgradeModal.currentCount).toBe(10);

    act(() => {
      result.current.closeUpgradeModal();
    });

    expect(result.current.upgradeModal.isOpen).toBe(false);
  });

  it('기능별 제한 정보를 올바르게 반환해야 함', () => {
    const { result } = renderHook(() => useFeatureGuard());

    const studentLimit = result.current.getFeatureLimit('addStudent');
    expect(studentLimit.freeLimit).toBe(10);
    expect(studentLimit.premiumLimit).toBe(-1); // 무제한

    const subjectLimit = result.current.getFeatureLimit('addSubject');
    expect(subjectLimit.freeLimit).toBe(20);
    expect(subjectLimit.premiumLimit).toBe(-1);
  });
});
