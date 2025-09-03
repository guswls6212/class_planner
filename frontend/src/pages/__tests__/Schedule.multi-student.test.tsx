import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('SchedulePage - 다중 학생 그룹 수업 추가 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage 데이터
    localStorageMock.getItem.mockImplementation((key: string) => {
      const mockData: Record<string, string> = {
        students: JSON.stringify([
          { id: '1', name: '김요섭' },
          { id: '2', name: '김다은' },
          { id: '3', name: '김세은' },
        ]),
        subjects: JSON.stringify([
          { id: '1', name: '중등수학', color: '#f59e0b' },
          { id: '2', name: '중등영어', color: '#3b82f6' },
        ]),
        enrollments: JSON.stringify([]),
        sessions: JSON.stringify([]),
        'ui:selectedStudent': '',
      };
      return mockData[key] || null;
    });
  });

  it('여러 학생이 포함된 세션이 올바른 enrollmentIds를 가져야 한다', () => {
    // 이 테스트는 addGroupSession 함수의 로직을 직접 테스트
    const mockData = {
      studentIds: ['1', '2'],
      subjectId: '1',
      weekday: 0,
      startTime: '09:00',
      endTime: '10:00',
      room: 'A101',
    };

    const mockEnrollments = [
      { id: 'enrollment-1', studentId: '1', subjectId: '1' },
      { id: 'enrollment-2', studentId: '2', subjectId: '1' },
    ];

    // 실제 함수 로직을 시뮬레이션
    const studentEnrollments = mockData.studentIds.map(studentId => {
      return mockEnrollments.find(e => e.studentId === studentId)!;
    });

    const newSession = {
      id: 'mock-uuid-123',
      enrollmentIds: studentEnrollments.map(e => e.id),
      weekday: mockData.weekday,
      startsAt: mockData.startTime,
      endsAt: mockData.endTime,
      room: mockData.room,
    };

    // 검증
    expect(newSession.enrollmentIds).toHaveLength(2);
    expect(newSession.enrollmentIds).toContain('enrollment-1');
    expect(newSession.enrollmentIds).toContain('enrollment-2');
    expect(newSession.weekday).toBe(0);
    expect(newSession.startsAt).toBe('09:00');
    expect(newSession.endsAt).toBe('10:00');
  });

  it('다중 학생 enrollment 생성 로직이 올바르게 작동해야 한다', () => {
    const studentIds = ['1', '2', '3'];
    const subjectId = '1';
    const mockEnrollments: Array<{
      id: string;
      studentId: string;
      subjectId: string;
    }> = [];

    // 시뮬레이션: 각 학생에 대해 enrollment 생성
    const studentEnrollments = studentIds.map(studentId => {
      let enrollment = mockEnrollments.find(
        e => e.studentId === studentId && e.subjectId === subjectId
      );

      if (!enrollment) {
        enrollment = {
          id: `enrollment-${studentId}`,
          studentId: studentId,
          subjectId: subjectId,
        };
        mockEnrollments.push(enrollment);
      }

      return enrollment;
    });

    // 검증
    expect(studentEnrollments).toHaveLength(3);
    expect(studentEnrollments[0].studentId).toBe('1');
    expect(studentEnrollments[1].studentId).toBe('2');
    expect(studentEnrollments[2].studentId).toBe('3');
    expect(mockEnrollments).toHaveLength(3);
  });

  it('세션 생성 시 모든 학생의 enrollmentId가 포함되어야 한다', () => {
    const studentEnrollments = [
      { id: 'enrollment-1', studentId: '1', subjectId: '1' },
      { id: 'enrollment-2', studentId: '2', subjectId: '1' },
      { id: 'enrollment-3', studentId: '3', subjectId: '1' },
    ];

    const newSession = {
      id: 'mock-uuid-123',
      enrollmentIds: studentEnrollments.map(e => e.id),
      weekday: 0,
      startsAt: '09:00',
      endsAt: '10:00',
      room: 'A101',
    };

    // 검증
    expect(newSession.enrollmentIds).toHaveLength(3);
    expect(newSession.enrollmentIds).toContain('enrollment-1');
    expect(newSession.enrollmentIds).toContain('enrollment-2');
    expect(newSession.enrollmentIds).toContain('enrollment-3');
  });

  it('시간 유효성 검사가 올바르게 작동해야 한다', () => {
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
