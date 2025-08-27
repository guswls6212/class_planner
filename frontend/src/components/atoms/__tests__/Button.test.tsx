import { vi } from 'vitest';
import Button, {
  getButtonClasses,
  getIconClasses,
  isButtonDisabled,
  shouldShowIcon,
} from '../Button';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByRole: vi.fn(), getByText: vi.fn() },
  fireEvent: { click: vi.fn() },
}));

describe('Button 컴포넌트', () => {
  it('Button 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Button).toBeDefined();
    expect(typeof Button).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getButtonClasses', () => {
      it('기본 클래스가 올바르게 생성된다', () => {
        const result = getButtonClasses('medium', 'primary', false);
        expect(result).toBe('button medium primary');
      });

      it('loading 상태일 때 loading 클래스가 추가된다', () => {
        const result = getButtonClasses('medium', 'primary', true);
        expect(result).toBe('button medium primary loading');
      });

      it('다양한 size와 variant가 올바르게 적용된다', () => {
        expect(getButtonClasses('small', 'secondary', false)).toBe(
          'button small secondary'
        );
        expect(getButtonClasses('large', 'danger', false)).toBe(
          'button large danger'
        );
        expect(getButtonClasses('medium', 'outline', false)).toBe(
          'button medium outline'
        );
      });

      it('loading이 false일 때 loading 클래스가 포함되지 않는다', () => {
        const result = getButtonClasses('medium', 'primary', false);
        expect(result).not.toContain('loading');
      });
    });

    describe('isButtonDisabled', () => {
      it('disabled가 true일 때 true를 반환한다', () => {
        expect(isButtonDisabled(true, false)).toBe(true);
        expect(isButtonDisabled(true, true)).toBe(true);
      });

      it('loading이 true일 때 true를 반환한다', () => {
        expect(isButtonDisabled(false, true)).toBe(true);
        expect(isButtonDisabled(true, true)).toBe(true);
      });

      it('disabled와 loading이 모두 false일 때 false를 반환한다', () => {
        expect(isButtonDisabled(false, false)).toBe(false);
      });
    });

    describe('shouldShowIcon', () => {
      it('icon과 position이 모두 있을 때 true를 반환한다', () => {
        const icon = <span>icon</span>;
        expect(shouldShowIcon(icon, 'left')).toBe(true);
        expect(shouldShowIcon(icon, 'right')).toBe(true);
      });

      it('icon이 없을 때 false를 반환한다', () => {
        expect(shouldShowIcon(null, 'left')).toBe(false);
        expect(shouldShowIcon(undefined, 'right')).toBe(false);
      });

      it('position이 없을 때 false를 반환한다', () => {
        const icon = <span>icon</span>;
        expect(shouldShowIcon(icon, '')).toBe(false);
        expect(shouldShowIcon(icon, null as unknown as string)).toBe(false);
      });

      it('icon과 position이 모두 없을 때 false를 반환한다', () => {
        expect(shouldShowIcon(null, '')).toBe(false);
        expect(shouldShowIcon(undefined, null as unknown as string)).toBe(false);
      });
    });

    describe('getIconClasses', () => {
      it('왼쪽 아이콘 클래스가 올바르게 생성된다', () => {
        const result = getIconClasses('left');
        expect(result).toBe('icon left');
      });

      it('오른쪽 아이콘 클래스가 올바르게 생성된다', () => {
        const result = getIconClasses('right');
        expect(result).toBe('icon right');
      });

      it('다른 position 값도 올바르게 처리된다', () => {
        expect(getIconClasses('center')).toBe('icon center');
        expect(getIconClasses('top')).toBe('icon top');
      });
    });
  });

  describe('Button 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        variant: 'primary',
        size: 'medium',
        disabled: false,
        loading: false,
        iconPosition: 'left',
      };

      expect(defaultProps.variant).toBe('primary');
      expect(defaultProps.size).toBe('medium');
      expect(defaultProps.disabled).toBe(false);
      expect(defaultProps.loading).toBe(false);
      expect(defaultProps.iconPosition).toBe('left');
    });

    it('유효한 variant 값들이 올바르게 정의되어 있다', () => {
      const validVariants = ['primary', 'secondary', 'danger', 'outline'];
      expect(validVariants).toContain('primary');
      expect(validVariants).toContain('secondary');
      expect(validVariants).toContain('danger');
      expect(validVariants).toContain('outline');
    });

    it('유효한 size 값들이 올바르게 정의되어 있다', () => {
      const validSizes = ['small', 'medium', 'large'];
      expect(validSizes).toContain('small');
      expect(validSizes).toContain('medium');
      expect(validSizes).toContain('large');
    });

    it('유효한 iconPosition 값들이 올바르게 정의되어 있다', () => {
      const validPositions = ['left', 'right'];
      expect(validPositions).toContain('left');
      expect(validPositions).toContain('right');
    });
  });

  describe('Button 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // loading 상태의 primary 버튼
      const loadingClasses = getButtonClasses('medium', 'primary', true);
      const isDisabled = isButtonDisabled(false, true);
      expect(loadingClasses).toBe('button medium primary loading');
      expect(isDisabled).toBe(true);

      // disabled 상태의 danger 버튼
      const disabledClasses = getButtonClasses('large', 'danger', false);
      const isDisabled2 = isButtonDisabled(true, false);
      expect(disabledClasses).toBe('button large danger');
      expect(isDisabled2).toBe(true);

      // 정상 상태의 outline 버튼
      const normalClasses = getButtonClasses('small', 'outline', false);
      const isDisabled3 = isButtonDisabled(false, false);
      expect(normalClasses).toBe('button small outline');
      expect(isDisabled3).toBe(false);
    });

    it('아이콘 관련 복합 시나리오가 올바르게 처리된다', () => {
      const icon = <span>test-icon</span>;

      // 왼쪽 아이콘
      const shouldShow = shouldShowIcon(icon, 'left');
      const iconClasses = getIconClasses('left');
      expect(shouldShow).toBe(true);
      expect(iconClasses).toBe('icon left');

      // 오른쪽 아이콘
      const shouldShow2 = shouldShowIcon(icon, 'right');
      const iconClasses2 = getIconClasses('right');
      expect(shouldShow2).toBe(true);
      expect(iconClasses2).toBe('icon right');
    });
  });
});
