import { describe, expect, it } from 'vitest';
import {
  getWeekdayHeaderClasses,
  getWeekdayHeaderStyles,
  getWeekdayIndex,
  getWeekdayName,
  validateWeekdayIndex,
} from '../WeekdayHeader.utils';

describe('WeekdayHeader Utils', () => {
  describe('getWeekdayHeaderStyles', () => {
    it('기본 스타일을 올바르게 반환한다', () => {
      const styles = getWeekdayHeaderStyles();

      expect(styles.backgroundColor).toBe('var(--color-background)');
      expect(styles.fontWeight).toBe('bold');
      expect(styles.fontSize).toBe('14px');
      expect(styles.color).toBe('var(--color-text)');
      expect(styles.border).toBe('1px solid var(--color-border)');
      expect(styles.minHeight).toBe('60px');
    });

    it('커스텀 스타일을 올바르게 병합한다', () => {
      const customStyle = { color: 'red', fontSize: '16px' };
      const styles = getWeekdayHeaderStyles(customStyle);

      expect(styles.color).toBe('red');
      expect(styles.fontSize).toBe('16px');
      expect(styles.fontWeight).toBe('bold'); // 기본값 유지
    });
  });

  describe('getWeekdayHeaderClasses', () => {
    it('기본 클래스만 있을 때 올바르게 반환한다', () => {
      const classes = getWeekdayHeaderClasses('weekday-header');
      expect(classes).toBe('weekday-header');
    });

    it('커스텀 클래스가 있을 때 올바르게 병합한다', () => {
      const classes = getWeekdayHeaderClasses(
        'weekday-header',
        'custom-header',
      );
      expect(classes).toBe('weekday-header custom-header');
    });
  });

  describe('getWeekdayName', () => {
    it('올바른 요일 인덱스에 대해 요일 이름을 반환한다', () => {
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

      weekdays.forEach((name, index) => {
        expect(getWeekdayName(index)).toBe(name);
      });
    });

    it('잘못된 요일 인덱스에 대해 에러를 던진다', () => {
      const invalidIndices = [-1, 7, 10, 100];

      invalidIndices.forEach(index => {
        expect(() => getWeekdayName(index)).toThrow();
      });
    });

    it('에러 메시지가 올바른 형식을 가진다', () => {
      const invalidIndex = 7;

      expect(() => getWeekdayName(invalidIndex)).toThrow(
        `Invalid weekday index: ${invalidIndex}. Must be between 0 and 6.`,
      );
    });
  });

  describe('validateWeekdayIndex', () => {
    it('올바른 요일 인덱스를 검증한다', () => {
      const validIndices = [0, 1, 2, 3, 4, 5, 6];

      validIndices.forEach(index => {
        expect(validateWeekdayIndex(index)).toBe(true);
      });
    });

    it('잘못된 요일 인덱스를 검증한다', () => {
      const invalidIndices = [-1, 7, 10, 100];

      invalidIndices.forEach(index => {
        expect(validateWeekdayIndex(index)).toBe(false);
      });
    });
  });

  describe('getWeekdayIndex', () => {
    it('올바른 요일 이름에 대해 인덱스를 반환한다', () => {
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

      weekdays.forEach((name, index) => {
        expect(getWeekdayIndex(name)).toBe(index);
      });
    });

    it('잘못된 요일 이름에 대해 에러를 던진다', () => {
      const invalidNames = ['월요일', 'Monday', 'Mon', '', 'abc'];

      invalidNames.forEach(name => {
        expect(() => getWeekdayIndex(name)).toThrow();
      });
    });

    it('에러 메시지가 올바른 형식을 가진다', () => {
      const invalidName = '월요일';

      expect(() => getWeekdayIndex(invalidName)).toThrow(
        `Invalid weekday name: ${invalidName}. Must be one of: 일, 월, 화, 수, 목, 금, 토`,
      );
    });
  });

  describe('통합 테스트', () => {
    it('전체 워크플로우가 올바르게 작동한다', () => {
      const weekdayIndex = 2;
      const customStyle = { color: 'blue' };
      const customClass = 'highlight';

      // 1. 요일 인덱스 검증
      expect(validateWeekdayIndex(weekdayIndex)).toBe(true);

      // 2. 요일 이름 가져오기
      const weekdayName = getWeekdayName(weekdayIndex);
      expect(weekdayName).toBe('화');

      // 3. 스타일 생성
      const styles = getWeekdayHeaderStyles(customStyle);
      expect(styles.color).toBe('blue');
      expect(styles.fontWeight).toBe('bold'); // 기본값 유지

      // 4. 클래스 생성
      const classes = getWeekdayHeaderClasses('weekday-header', customClass);
      expect(classes).toBe('weekday-header highlight');

      // 5. 요일 이름으로 인덱스 가져오기
      const retrievedIndex = getWeekdayIndex(weekdayName);
      expect(retrievedIndex).toBe(weekdayIndex);
    });

    it('에러 상황을 올바르게 처리한다', () => {
      const invalidIndex = 10;

      // 1. 인덱스 검증 실패
      expect(validateWeekdayIndex(invalidIndex)).toBe(false);

      // 2. 에러 발생
      expect(() => getWeekdayName(invalidIndex)).toThrow();

      // 3. 기본 스타일은 여전히 작동
      const styles = getWeekdayHeaderStyles();
      expect(styles.backgroundColor).toBe('var(--color-background)');
    });
  });
});
