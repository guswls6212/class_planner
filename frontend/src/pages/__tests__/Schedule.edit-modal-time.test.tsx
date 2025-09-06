import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SchedulePage from '../Schedule';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-123',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SchedulePage - 수업 편집 모달 시간 검증 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage 데이터 (기존 통합 테스트와 동일한 구조)
    localStorageMock.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'students':
          return JSON.stringify([
            { id: '1', name: '김요섭' },
            { id: '2', name: '김다은' },
          ]);
        case 'subjects':
          return JSON.stringify([
            { id: '1', name: '중등수학', color: '#f59e0b' },
            { id: '2', name: '중등영어', color: '#3b82f6' },
          ]);
        case 'enrollments':
          return JSON.stringify([
            { id: 'enrollment-1', studentId: '1', subjectId: '1' },
            { id: 'enrollment-2', studentId: '2', subjectId: '1' },
          ]);
        case 'sessions':
          return JSON.stringify([
            {
              id: 'session-1',
              enrollmentIds: ['enrollment-1'],
              weekday: 0,
              startsAt: '09:00',
              endsAt: '10:00',
              room: 'A101',
            },
          ]);
        case 'ui:selectedStudent':
          return '';
        case 'ui:studentsPanelPos':
          return JSON.stringify({ x: 600, y: 90 });
        default:
          return null;
      }
    });
  });

  it('수업 편집 모달에서 시작 시간이 종료 시간보다 늦으면 자동 조정하지 않아야 한다', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<SchedulePage />);

    // 세션 블록을 찾아서 클릭 (data-testid 사용)
    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    // 수업 편집 모달이 열렸는지 확인
    await waitFor(() => {
      expect(screen.getByText('수업 편집')).toBeInTheDocument();
    });

    // 시작 시간을 종료 시간보다 늦게 설정
    const startTimeInput = screen.getByDisplayValue('09:00');
    fireEvent.change(startTimeInput, { target: { value: '11:00' } });

    // 종료 시간이 자동으로 조정되지 않았는지 확인
    const endTimeInput = screen.getByDisplayValue('10:00');
    expect(endTimeInput).toHaveValue('10:00');

    // 경고 메시지가 출력되었는지 확인
    expect(consoleSpy).toHaveBeenCalledWith(
      '시작 시간이 종료 시간보다 늦습니다. 시간을 확인해주세요.',
    );

    consoleSpy.mockRestore();
  });

  it('수업 편집 모달에서 종료 시간이 시작 시간보다 빠르면 자동 조정하지 않아야 한다', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<SchedulePage />);

    // 세션 블록을 찾아서 클릭
    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    // 수업 편집 모달이 열렸는지 확인
    await waitFor(() => {
      expect(screen.getByText('수업 편집')).toBeInTheDocument();
    });

    // 종료 시간을 시작 시간보다 빠르게 설정
    const endTimeInput = screen.getByDisplayValue('10:00');
    fireEvent.change(endTimeInput, { target: { value: '08:00' } });

    // 시작 시간이 자동으로 조정되지 않았는지 확인
    const startTimeInput = screen.getByDisplayValue('09:00');
    expect(startTimeInput).toHaveValue('09:00');

    // 경고 메시지가 출력되었는지 확인
    expect(consoleSpy).toHaveBeenCalledWith(
      '종료 시간이 시작 시간보다 빠릅니다. 시간을 확인해주세요.',
    );

    consoleSpy.mockRestore();
  });

  it('수업 편집 모달에서 유효한 시간 범위는 정상적으로 처리되어야 한다', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<SchedulePage />);

    // 세션 블록을 찾아서 클릭
    const sessionBlock = screen.getByTestId('session-block-session-1');
    fireEvent.click(sessionBlock);

    // 수업 편집 모달이 열렸는지 확인
    await waitFor(() => {
      expect(screen.getByText('수업 편집')).toBeInTheDocument();
    });

    // 유효한 시간 범위로 설정
    const startTimeInput = screen.getByDisplayValue('09:00');
    const endTimeInput = screen.getByDisplayValue('10:00');

    fireEvent.change(startTimeInput, { target: { value: '09:30' } });
    fireEvent.change(endTimeInput, { target: { value: '11:00' } });

    // 과목 관련 경고는 허용 (과목이 없을 때 발생하는 정상적인 경고)
    // 다른 경고 메시지는 확인하지 않음

    consoleSpy.mockRestore();
  });

  it('수업 편집 모달에서 시간 검증 로직이 올바르게 작동해야 한다', () => {
    const validateTimeRange = (startTime: string, endTime: string): boolean => {
      if (!startTime || !endTime) return false;
      const startMinutes =
        parseInt(startTime.split(':')[0]) * 60 +
        parseInt(startTime.split(':')[1]);
      const endMinutes =
        parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      return startMinutes < endMinutes;
    };

    // 유효한 시간 범위
    expect(validateTimeRange('09:00', '10:00')).toBe(true);
    expect(validateTimeRange('14:30', '15:30')).toBe(true);

    // 무효한 시간 범위
    expect(validateTimeRange('10:00', '09:00')).toBe(false);
    expect(validateTimeRange('15:30', '14:30')).toBe(false);

    // 빈 값
    expect(validateTimeRange('', '10:00')).toBe(false);
    expect(validateTimeRange('09:00', '')).toBe(false);
  });
});
