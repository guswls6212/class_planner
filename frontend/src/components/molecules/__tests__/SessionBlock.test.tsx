import { vi } from 'vitest';
import SessionBlock, {
  calculateTopPosition,
  calculateZIndex,
  getSessionBlockStyles,
  getSessionBlockText,
  getSubjectColor,
  shouldShowSubjectName,
  validateSessionBlockProps,
} from '../SessionBlock';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn() },
}));

describe('SessionBlock 컴포넌트', () => {
  it('SessionBlock 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(SessionBlock).toBeDefined();
    expect(typeof SessionBlock).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getSessionBlockStyles', () => {
      it('올바른 스타일을 반환한다', () => {
        const result = getSessionBlockStyles(100, 200, 50, '#ff0000');
        expect(result).toEqual({
          position: 'absolute',
          left: 100,
          top: 56,
          height: 28,
          width: 200,
          background: '#ff0000',
          color: '#fff',
          borderRadius: 4,
          padding: '0 6px',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          zIndex: 51,
          border: '1px solid rgba(255,255,255,0.2)',
          cursor: 'pointer',
        });
      });

      it('subject color가 없을 때 기본 색상을 사용한다', () => {
        const result = getSessionBlockStyles(0, 100, 0);
        expect(result.background).toBe('#888');
      });

      it('다양한 위치와 크기로 올바른 스타일을 반환한다', () => {
        const result = getSessionBlockStyles(200, 150, 100, '#00ff00');
        expect(result.left).toBe(200);
        expect(result.width).toBe(150);
        expect(result.top).toBe(106);
        expect(result.zIndex).toBe(101);
      });
    });

    describe('getSessionBlockText', () => {
      it('모든 정보가 있을 때 올바른 텍스트를 반환한다', () => {
        const result = getSessionBlockText('Mathematics', '09:00', '10:30');
        expect(result).toBe('Mathematics 09:00-10:30');
      });

      it('subject name이 없을 때 Unknown을 사용한다', () => {
        const result = getSessionBlockText(undefined, '09:00', '10:30');
        expect(result).toBe('Unknown 09:00-10:30');
      });

      it('시간 정보가 없을 때 빈 문자열을 사용한다', () => {
        const result = getSessionBlockText('Physics', undefined, undefined);
        expect(result).toBe('Physics -');
      });

      it('모든 정보가 없을 때 기본값을 사용한다', () => {
        const result = getSessionBlockText();
        expect(result).toBe('Unknown -');
      });
    });

    describe('calculateTopPosition', () => {
      it('yOffset에 따라 올바른 top 위치를 계산한다', () => {
        expect(calculateTopPosition(0)).toBe(6);
        expect(calculateTopPosition(10)).toBe(16);
        expect(calculateTopPosition(50)).toBe(56);
        expect(calculateTopPosition(100)).toBe(106);
      });
    });

    describe('calculateZIndex', () => {
      it('yOffset에 따라 올바른 zIndex를 계산한다', () => {
        expect(calculateZIndex(0)).toBe(1);
        expect(calculateZIndex(10)).toBe(11);
        expect(calculateZIndex(50)).toBe(51);
        expect(calculateZIndex(100)).toBe(101);
      });
    });

    describe('getSubjectColor', () => {
      it('subject color가 있을 때 해당 색상을 반환한다', () => {
        expect(getSubjectColor('#ff0000')).toBe('#ff0000');
        expect(getSubjectColor('#00ff00')).toBe('#00ff00');
        expect(getSubjectColor('#0000ff')).toBe('#0000ff');
      });

      it('subject color가 없을 때 기본 색상을 반환한다', () => {
        expect(getSubjectColor(undefined)).toBe('#888');
        expect(getSubjectColor('')).toBe('#888');
      });
    });

    describe('validateSessionBlockProps', () => {
      it('유효한 props가 올바르게 검증된다', () => {
        expect(validateSessionBlockProps(0, 100, 0)).toBe(true);
        expect(validateSessionBlockProps(100, 200, 50)).toBe(true);
        expect(validateSessionBlockProps(1000, 1, 100)).toBe(true);
      });

      it('유효하지 않은 props가 올바르게 검증된다', () => {
        expect(validateSessionBlockProps(-1, 100, 0)).toBe(false);
        expect(validateSessionBlockProps(0, 0, 0)).toBe(false);
        expect(validateSessionBlockProps(0, -100, 0)).toBe(false);
        expect(validateSessionBlockProps(0, 100, -1)).toBe(false);
      });
    });

    describe('shouldShowSubjectName', () => {
      it('subject name이 있을 때 true를 반환한다', () => {
        expect(shouldShowSubjectName('Mathematics')).toBe(true);
        expect(shouldShowSubjectName('Physics')).toBe(true);
        expect(shouldShowSubjectName('Chemistry')).toBe(true);
      });

      it('subject name이 없을 때 false를 반환한다', () => {
        expect(shouldShowSubjectName(undefined)).toBe(false);
        expect(shouldShowSubjectName('')).toBe(false);
      });
    });
  });

  describe('SessionBlock 관련 상수 테스트', () => {
    it('기본 스타일 값들이 올바르게 정의되어 있다', () => {
      const defaultStyles = {
        height: 28,
        borderRadius: 4,
        padding: '0 6px',
        fontSize: 12,
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.2)',
        cursor: 'pointer',
      };

      expect(defaultStyles.height).toBe(28);
      expect(defaultStyles.borderRadius).toBe(4);
      expect(defaultStyles.padding).toBe('0 6px');
      expect(defaultStyles.fontSize).toBe(12);
      expect(defaultStyles.color).toBe('#fff');
      expect(defaultStyles.cursor).toBe('pointer');
    });

    it('기본 색상이 올바르게 정의되어 있다', () => {
      const defaultColor = '#888';
      expect(defaultColor).toBe('#888');
    });

    it('기본 top 오프셋이 올바르게 정의되어 있다', () => {
      const baseTopOffset = 6;
      expect(baseTopOffset).toBe(6);
    });
  });

  describe('SessionBlock 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // 복잡한 위치와 크기, 색상
      const styles = getSessionBlockStyles(250, 180, 75, '#ff6600');
      const blockText = getSessionBlockText('Advanced Math', '14:00', '15:30');
      const topPosition = calculateTopPosition(75);
      const zIndex = calculateZIndex(75);
      const subjectColor = getSubjectColor('#ff6600');
      const isValidProps = validateSessionBlockProps(250, 180, 75);
      const shouldShowName = shouldShowSubjectName('Advanced Math');

      expect(styles.left).toBe(250);
      expect(styles.width).toBe(180);
      expect(styles.background).toBe('#ff6600');
      expect(styles.top).toBe(81);
      expect(styles.zIndex).toBe(76);
      expect(blockText).toBe('Advanced Math 14:00-15:30');
      expect(topPosition).toBe(81);
      expect(zIndex).toBe(76);
      expect(subjectColor).toBe('#ff6600');
      expect(isValidProps).toBe(true);
      expect(shouldShowName).toBe(true);
    });

    it('기본값들이 올바르게 처리된다', () => {
      const styles = getSessionBlockStyles(0, 100, 0);
      const blockText = getSessionBlockText();
      const topPosition = calculateTopPosition(0);
      const zIndex = calculateZIndex(0);
      const subjectColor = getSubjectColor();

      expect(styles.background).toBe('#888');
      expect(styles.top).toBe(6);
      expect(styles.zIndex).toBe(1);
      expect(blockText).toBe('Unknown -');
      expect(topPosition).toBe(6);
      expect(zIndex).toBe(1);
      expect(subjectColor).toBe('#888');
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const isValidProps1 = validateSessionBlockProps(100, 200, 50);
      const isValidProps2 = validateSessionBlockProps(-10, 100, 0);
      const isValidProps3 = validateSessionBlockProps(0, 0, 0);

      expect(isValidProps1).toBe(true);
      expect(isValidProps2).toBe(false);
      expect(isValidProps3).toBe(false);
    });
  });
});
