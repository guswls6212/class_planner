import { describe, expect, it } from 'vitest';
import {
  getTimeSlotClasses,
  getTimeSlotStyles,
  getTimeSlotText,
  validateTimeFormat,
} from '../TimeSlot.utils';

describe('TimeSlot Utils', () => {
  describe('getTimeSlotStyles', () => {
    it('기본 스타일을 올바르게 반환한다', () => {
      const styles = getTimeSlotStyles();

      expect(styles.backgroundColor).toBe('var(--color-background)');
      expect(styles.textAlign).toBe('center');
      expect(styles.fontSize).toBe('12px');
      expect(styles.color).toBe('var(--color-text-secondary)');
      expect(styles.border).toBe('1px solid var(--color-border)');
      expect(styles.display).toBe('flex');
      expect(styles.alignItems).toBe('center');
      expect(styles.justifyContent).toBe('center');
      expect(styles.minHeight).toBe('60px');
    });

    it('커스텀 스타일을 올바르게 병합한다', () => {
      const customStyle = { backgroundColor: 'red', fontSize: '16px' };
      const styles = getTimeSlotStyles(customStyle);

      expect(styles.backgroundColor).toBe('red');
      expect(styles.fontSize).toBe('16px');
      expect(styles.textAlign).toBe('center'); // 기본값 유지
    });

    it('모든 스타일 속성이 올바른 타입을 가진다', () => {
      const styles = getTimeSlotStyles();

      expect(typeof styles.backgroundColor).toBe('string');
      expect(typeof styles.textAlign).toBe('string');
      expect(typeof styles.fontSize).toBe('string');
      expect(typeof styles.color).toBe('string');
      expect(typeof styles.border).toBe('string');
      expect(typeof styles.display).toBe('string');
      expect(typeof styles.alignItems).toBe('string');
      expect(typeof styles.justifyContent).toBe('string');
      expect(typeof styles.minHeight).toBe('string');
    });
  });

  describe('getTimeSlotClasses', () => {
    it('기본 클래스만 있을 때 올바르게 반환한다', () => {
      const classes = getTimeSlotClasses('time-slot');
      expect(classes).toBe('time-slot');
    });

    it('커스텀 클래스가 있을 때 올바르게 병합한다', () => {
      const classes = getTimeSlotClasses('time-slot', 'custom-time');
      expect(classes).toBe('time-slot custom-time');
    });

    it('빈 커스텀 클래스를 올바르게 처리한다', () => {
      const classes = getTimeSlotClasses('time-slot', '');
      expect(classes).toBe('time-slot');
    });

    it('여러 커스텀 클래스를 올바르게 처리한다', () => {
      const classes = getTimeSlotClasses('time-slot', 'custom-time highlight');
      expect(classes).toBe('time-slot custom-time highlight');
    });
  });

  describe('validateTimeFormat', () => {
    it('올바른 시간 형식을 검증한다', () => {
      const validTimes = [
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
      ];

      validTimes.forEach(time => {
        expect(validateTimeFormat(time)).toBe(true);
      });
    });

    it('잘못된 시간 형식을 검증한다', () => {
      const invalidTimes = [
        '9:00', // 한 자리 시간
        '09:0', // 한 자리 분
        '09:00:00', // 초 포함
        '09-00', // 잘못된 구분자
        '09:00am', // AM/PM 포함
        '25:00', // 잘못된 시간
        '09:60', // 잘못된 분
        '', // 빈 문자열
        'abc', // 문자열
      ];

      invalidTimes.forEach(time => {
        expect(validateTimeFormat(time)).toBe(false);
      });
    });

    it('시간 범위가 올바른지 검증한다', () => {
      const validHourRanges = [
        '00:00',
        '01:00',
        '02:00',
        '03:00',
        '04:00',
        '05:00',
        '06:00',
        '07:00',
        '08:00',
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
        '18:00',
        '19:00',
        '20:00',
        '21:00',
        '22:00',
        '23:00',
      ];

      validHourRanges.forEach(time => {
        expect(validateTimeFormat(time)).toBe(true);
      });
    });
  });

  describe('getTimeSlotText', () => {
    it('올바른 시간 형식을 반환한다', () => {
      const validTimes = ['09:00', '10:00', '11:00', '12:00'];

      validTimes.forEach(time => {
        expect(getTimeSlotText(time)).toBe(time);
      });
    });

    it('잘못된 시간 형식에 대해 에러를 던진다', () => {
      const invalidTimes = ['9:00', '09:0', '09:00:00', 'abc'];

      invalidTimes.forEach(time => {
        expect(() => getTimeSlotText(time)).toThrow();
      });
    });

    it('에러 메시지가 올바른 형식을 가진다', () => {
      const invalidTime = '9:00';

      expect(() => getTimeSlotText(invalidTime)).toThrow(
        `Invalid time format: ${invalidTime}. Expected format: HH:MM`
      );
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동한다', () => {
      const time = '14:30';
      const customStyle = { backgroundColor: 'blue' };
      const customClass = 'highlight';

      // 1. 시간 형식 검증
      expect(validateTimeFormat(time)).toBe(true);

      // 2. 시간 텍스트 가져오기
      const timeText = getTimeSlotText(time);
      expect(timeText).toBe(time);

      // 3. 스타일 생성
      const styles = getTimeSlotStyles(customStyle);
      expect(styles.backgroundColor).toBe('blue');
      expect(styles.fontSize).toBe('12px'); // 기본값 유지

      // 4. 클래스 생성
      const classes = getTimeSlotClasses('time-slot', customClass);
      expect(classes).toBe('time-slot highlight');
    });

    it('에러 상황을 올바르게 처리한다', () => {
      const invalidTime = '25:00';

      // 1. 형식 검증 실패
      expect(validateTimeFormat(invalidTime)).toBe(false);

      // 2. 에러 발생
      expect(() => getTimeSlotText(invalidTime)).toThrow();

      // 3. 기본 스타일은 여전히 작동
      const styles = getTimeSlotStyles();
      expect(styles.backgroundColor).toBe('var(--color-background)');
    });
  });
});
