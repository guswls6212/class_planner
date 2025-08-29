import { vi } from 'vitest';
import {
  clamp,
  DAY_END_MIN,
  DAY_START_MIN,
  minutesToTime,
  sessionsOverlapSameStudent,
  SLOT_MIN,
  SLOT_PX,
  snapToSlot,
  store,
  timeToMinutes,
  uid,
  weekdays,
  type Enrollment,
  type Session,
  type Student,
  type Subject,
} from '../planner';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('planner.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uid', () => {
    it('고유한 ID를 생성한다', () => {
      const id = uid();
      expect(id).toBe('mock-uuid-123');
      expect(global.crypto.randomUUID).toHaveBeenCalled();
    });
  });

  describe('상수들', () => {
    it('weekdays가 올바른 요일 배열을 가진다', () => {
      expect(weekdays).toEqual(['월', '화', '수', '목', '금', '토', '일']);
      expect(weekdays).toHaveLength(7);
    });

    it('시간 관련 상수들이 올바른 값을 가진다', () => {
      expect(SLOT_MIN).toBe(15);
      expect(DAY_START_MIN).toBe(540); // 9 * 60
      expect(DAY_END_MIN).toBe(1440); // 24 * 60
      expect(SLOT_PX).toBe(16);
    });
  });

  describe('timeToMinutes', () => {
    it('시간 문자열을 분으로 변환한다', () => {
      expect(timeToMinutes('09:00')).toBe(540);
      expect(timeToMinutes('12:30')).toBe(750);
      expect(timeToMinutes('23:59')).toBe(1439);
      expect(timeToMinutes('00:00')).toBe(0);
    });

    it('다양한 시간 형식을 처리한다', () => {
      expect(timeToMinutes('1:5')).toBe(65);
      expect(timeToMinutes('10:15')).toBe(615);
    });
  });

  describe('minutesToTime', () => {
    it('분을 시간 문자열로 변환한다', () => {
      expect(minutesToTime(540)).toBe('09:00');
      expect(minutesToTime(750)).toBe('12:30');
      expect(minutesToTime(1439)).toBe('23:59');
      expect(minutesToTime(0)).toBe('00:00');
    });

    it('다양한 분 값을 처리한다', () => {
      expect(minutesToTime(65)).toBe('01:05');
      expect(minutesToTime(615)).toBe('10:15');
      expect(minutesToTime(1440)).toBe('24:00');
    });
  });

  describe('clamp', () => {
    it('값을 최소값과 최대값 사이로 제한한다', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('경계값을 올바르게 처리한다', () => {
      expect(clamp(0, 0, 0)).toBe(0);
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
    });
  });

  describe('snapToSlot', () => {
    it('분을 15분 단위로 스냅한다', () => {
      expect(snapToSlot(0)).toBe(0);
      expect(snapToSlot(7)).toBe(0);
      expect(snapToSlot(15)).toBe(15);
      expect(snapToSlot(22)).toBe(15);
      expect(snapToSlot(30)).toBe(30);
      expect(snapToSlot(45)).toBe(45);
      expect(snapToSlot(60)).toBe(60);
    });

    it('음수 값도 처리한다', () => {
      expect(snapToSlot(-5)).toBe(-15);
      expect(snapToSlot(-15)).toBe(-15);
    });
  });

  describe('sessionsOverlapSameStudent', () => {
    const mockEnrollments: Enrollment[] = [
      { id: 'enrollment1', studentId: 'student1', subjectId: 'subject1' },
      { id: 'enrollment2', studentId: 'student2', subjectId: 'subject2' },
    ];

    it('같은 학생의 겹치는 세션을 감지한다', () => {
      const sessionA = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      };
      const sessionB = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '09:30',
        endsAt: '10:30',
      };

      expect(
        sessionsOverlapSameStudent(sessionA, sessionB, mockEnrollments)
      ).toBe(true);
    });

    it('다른 요일의 세션은 겹치지 않는다', () => {
      const sessionA = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      };
      const sessionB = {
        enrollmentIds: ['enrollment1'],
        weekday: 1,
        startsAt: '09:00',
        endsAt: '10:00',
      };

      expect(
        sessionsOverlapSameStudent(sessionA, sessionB, mockEnrollments)
      ).toBe(false);
    });

    it('다른 학생의 세션은 겹치지 않는다', () => {
      const sessionA = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      };
      const sessionB = {
        enrollmentIds: ['enrollment2'],
        weekday: 0,
        startsAt: '09:30',
        endsAt: '10:30',
      };

      expect(
        sessionsOverlapSameStudent(sessionA, sessionB, mockEnrollments)
      ).toBe(false);
    });

    it('시간이 겹치지 않는 세션은 겹치지 않는다', () => {
      const sessionA = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      };
      const sessionB = {
        enrollmentIds: ['enrollment1'],
        weekday: 0,
        startsAt: '10:00',
        endsAt: '11:00',
      };

      expect(
        sessionsOverlapSameStudent(sessionA, sessionB, mockEnrollments)
      ).toBe(false);
    });

    it('존재하지 않는 enrollment는 겹치지 않는다', () => {
      const sessionA = {
        enrollmentIds: ['nonexistent'],
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
      };
      const sessionB = {
        enrollmentIds: ['nonexistent'],
        weekday: 0,
        startsAt: '09:30',
        endsAt: '10:30',
      };

      expect(
        sessionsOverlapSameStudent(sessionA, sessionB, mockEnrollments)
      ).toBe(false);
    });
  });

  describe('store', () => {
    describe('get', () => {
      it('localStorage에서 값을 가져온다', () => {
        mockLocalStorage.getItem.mockReturnValue('{"test": "value"}');

        const result = store.get('test-key', {});

        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
        expect(result).toEqual({ test: 'value' });
      });

      it('값이 없으면 fallback을 반환한다', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const fallback = { default: 'value' };
        const result = store.get('nonexistent-key', fallback);

        expect(result).toBe(fallback);
      });

      it('잘못된 JSON이면 fallback을 반환한다', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-json');

        const fallback = { default: 'value' };
        const result = store.get('invalid-key', fallback);

        expect(result).toBe(fallback);
      });

      it('빈 문자열이면 fallback을 반환한다', () => {
        mockLocalStorage.getItem.mockReturnValue('');

        const fallback = { default: 'value' };
        const result = store.get('empty-key', fallback);

        expect(result).toBe(fallback);
      });
    });

    describe('set', () => {
      it('localStorage에 값을 저장한다', () => {
        const testValue = { test: 'value', number: 123 };

        store.set('test-key', testValue);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(testValue)
        );
      });

      it('다양한 타입의 값을 저장한다', () => {
        store.set('string-key', 'test string');
        store.set('number-key', 42);
        store.set('boolean-key', true);
        store.set('array-key', [1, 2, 3]);

        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'string-key',
          '"test string"'
        );
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'number-key',
          '42'
        );
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'boolean-key',
          'true'
        );
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'array-key',
          '[1,2,3]'
        );
      });
    });
  });

  describe('타입 정의', () => {
    it('Student 타입이 올바르게 정의되어 있다', () => {
      const student: Student = {
        id: 'student1',
        name: '김철수',
        gender: 'male',
      };

      expect(student.id).toBe('student1');
      expect(student.name).toBe('김철수');
      expect(student.gender).toBe('male');
    });

    it('Subject 타입이 올바르게 정의되어 있다', () => {
      const subject: Subject = {
        id: 'subject1',
        name: '수학',
        color: '#ff0000',
      };

      expect(subject.id).toBe('subject1');
      expect(subject.name).toBe('수학');
      expect(subject.color).toBe('#ff0000');
    });

    it('Enrollment 타입이 올바르게 정의되어 있다', () => {
      const enrollment: Enrollment = {
        id: 'enrollment1',
        studentId: 'student1',
        subjectId: 'subject1',
      };

      expect(enrollment.id).toBe('enrollment1');
      expect(enrollment.studentId).toBe('student1');
      expect(enrollment.subjectId).toBe('subject1');
    });

    it('Session 타입이 올바르게 정의되어 있다', () => {
      const session: Session = {
        id: 'session1',
        enrollmentId: 'enrollment1',
        weekday: 0,
        startsAt: '09:00',
        endsAt: '10:00',
        room: 'A101',
      };

      expect(session.id).toBe('session1');
      expect(session.enrollmentId).toBe('enrollment1');
      expect(session.weekday).toBe(0);
      expect(session.startsAt).toBe('09:00');
      expect(session.endsAt).toBe('10:00');
      expect(session.room).toBe('A101');
    });
  });
});
