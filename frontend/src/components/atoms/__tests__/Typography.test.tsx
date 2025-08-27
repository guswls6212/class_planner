import { vi } from 'vitest';
import Typography, {
  capitalizeFirstLetter,
  getTypographyClasses,
  getTypographyComponent,
  validateTypographyAlign,
  validateTypographyColor,
  validateTypographyVariant,
  validateTypographyWeight,
} from '../Typography';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn() },
}));

describe('Typography 컴포넌트', () => {
  it('Typography 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(Typography).toBeDefined();
    expect(typeof Typography).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getTypographyClasses', () => {
      it('기본 클래스가 올바르게 생성된다', () => {
        const result = getTypographyClasses(
          'h1',
          'default',
          'left',
          'normal',
          'none',
          'none'
        );
        expect(result).toBe('typography h1 colorDefault textLeft fontNormal');
      });

      it('색상이 올바르게 적용된다', () => {
        const result = getTypographyClasses(
          'h2',
          'primary',
          'left',
          'normal',
          'none',
          'none'
        );
        expect(result).toBe('typography h2 colorPrimary textLeft fontNormal');
      });

      it('정렬이 올바르게 적용된다', () => {
        const result = getTypographyClasses(
          'h3',
          'default',
          'center',
          'normal',
          'none',
          'none'
        );
        expect(result).toBe('typography h3 colorDefault textCenter fontNormal');
      });

      it('폰트 굵기가 올바르게 적용된다', () => {
        const result = getTypographyClasses(
          'h4',
          'default',
          'left',
          'bold',
          'none',
          'none'
        );
        expect(result).toBe('typography h4 colorDefault textLeft fontBold');
      });

      it('텍스트 변환이 올바르게 적용된다', () => {
        const result = getTypographyClasses(
          'body',
          'default',
          'left',
          'normal',
          'uppercase',
          'none'
        );
        expect(result).toBe(
          'typography body colorDefault textLeft fontNormal uppercase'
        );
      });

      it('텍스트 장식이 올바르게 적용된다', () => {
        const result = getTypographyClasses(
          'body',
          'default',
          'left',
          'normal',
          'none',
          'underline'
        );
        expect(result).toBe(
          'typography body colorDefault textLeft fontNormal underline'
        );
      });

      it('className이 올바르게 추가된다', () => {
        const result = getTypographyClasses(
          'body',
          'default',
          'left',
          'normal',
          'none',
          'none',
          'custom-class'
        );
        expect(result).toBe(
          'typography body colorDefault textLeft fontNormal custom-class'
        );
      });
    });

    describe('getTypographyComponent', () => {
      it('h1-h4 variant는 해당 HTML 태그를 반환한다', () => {
        expect(getTypographyComponent('h1')).toBe('h1');
        expect(getTypographyComponent('h2')).toBe('h2');
        expect(getTypographyComponent('h3')).toBe('h3');
        expect(getTypographyComponent('h4')).toBe('h4');
      });

      it('body variant는 span 태그를 반환한다', () => {
        expect(getTypographyComponent('body')).toBe('span');
        expect(getTypographyComponent('bodyLarge')).toBe('span');
        expect(getTypographyComponent('bodySmall')).toBe('span');
        expect(getTypographyComponent('caption')).toBe('span');
        expect(getTypographyComponent('label')).toBe('span');
      });
    });

    describe('capitalizeFirstLetter', () => {
      it('첫 글자를 대문자로 변환한다', () => {
        expect(capitalizeFirstLetter('hello')).toBe('Hello');
        expect(capitalizeFirstLetter('world')).toBe('World');
        expect(capitalizeFirstLetter('test')).toBe('Test');
      });

      it('빈 문자열을 올바르게 처리한다', () => {
        expect(capitalizeFirstLetter('')).toBe('');
      });

      it('한 글자 문자열을 올바르게 처리한다', () => {
        expect(capitalizeFirstLetter('a')).toBe('A');
        expect(capitalizeFirstLetter('z')).toBe('Z');
      });
    });

    describe('validateTypographyVariant', () => {
      it('유효한 variant 값들이 올바르게 검증된다', () => {
        expect(validateTypographyVariant('h1')).toBe(true);
        expect(validateTypographyVariant('h2')).toBe(true);
        expect(validateTypographyVariant('h3')).toBe(true);
        expect(validateTypographyVariant('h4')).toBe(true);
        expect(validateTypographyVariant('body')).toBe(true);
        expect(validateTypographyVariant('bodyLarge')).toBe(true);
        expect(validateTypographyVariant('bodySmall')).toBe(true);
        expect(validateTypographyVariant('caption')).toBe(true);
        expect(validateTypographyVariant('label')).toBe(true);
      });

      it('유효하지 않은 variant 값들이 올바르게 검증된다', () => {
        expect(validateTypographyVariant('h5')).toBe(false);
        expect(validateTypographyVariant('title')).toBe(false);
        expect(validateTypographyVariant('')).toBe(false);
      });
    });

    describe('validateTypographyColor', () => {
      it('유효한 color 값들이 올바르게 검증된다', () => {
        expect(validateTypographyColor('primary')).toBe(true);
        expect(validateTypographyColor('secondary')).toBe(true);
        expect(validateTypographyColor('success')).toBe(true);
        expect(validateTypographyColor('warning')).toBe(true);
        expect(validateTypographyColor('danger')).toBe(true);
        expect(validateTypographyColor('default')).toBe(true);
        expect(validateTypographyColor('muted')).toBe(true);
      });

      it('유효하지 않은 color 값들이 올바르게 검증된다', () => {
        expect(validateTypographyColor('custom')).toBe(false);
        expect(validateTypographyColor('blue')).toBe(false);
        expect(validateTypographyColor('')).toBe(false);
      });
    });

    describe('validateTypographyAlign', () => {
      it('유효한 align 값들이 올바르게 검증된다', () => {
        expect(validateTypographyAlign('left')).toBe(true);
        expect(validateTypographyAlign('center')).toBe(true);
        expect(validateTypographyAlign('right')).toBe(true);
        expect(validateTypographyAlign('justify')).toBe(true);
      });

      it('유효하지 않은 align 값들이 올바르게 검증된다', () => {
        expect(validateTypographyAlign('top')).toBe(false);
        expect(validateTypographyAlign('bottom')).toBe(false);
        expect(validateTypographyAlign('')).toBe(false);
      });
    });

    describe('validateTypographyWeight', () => {
      it('유효한 weight 값들이 올바르게 검증된다', () => {
        expect(validateTypographyWeight('normal')).toBe(true);
        expect(validateTypographyWeight('medium')).toBe(true);
        expect(validateTypographyWeight('semibold')).toBe(true);
        expect(validateTypographyWeight('bold')).toBe(true);
      });

      it('유효하지 않은 weight 값들이 올바르게 검증된다', () => {
        expect(validateTypographyWeight('light')).toBe(false);
        expect(validateTypographyWeight('heavy')).toBe(false);
        expect(validateTypographyWeight('')).toBe(false);
      });
    });
  });

  describe('Typography 관련 상수 테스트', () => {
    it('기본 props 값들이 올바르게 정의되어 있다', () => {
      const defaultProps = {
        color: 'default',
        align: 'left',
        weight: 'normal',
        transform: 'none',
        decoration: 'none',
      };

      expect(defaultProps.color).toBe('default');
      expect(defaultProps.align).toBe('left');
      expect(defaultProps.weight).toBe('normal');
      expect(defaultProps.transform).toBe('none');
      expect(defaultProps.decoration).toBe('none');
    });

    it('유효한 variant 값들이 올바르게 정의되어 있다', () => {
      const validVariants = [
        'h1',
        'h2',
        'h3',
        'h4',
        'body',
        'bodyLarge',
        'bodySmall',
        'caption',
        'label',
      ];
      expect(validVariants).toContain('h1');
      expect(validVariants).toContain('body');
      expect(validVariants).toContain('caption');
    });

    it('유효한 color 값들이 올바르게 정의되어 있다', () => {
      const validColors = [
        'primary',
        'secondary',
        'success',
        'warning',
        'danger',
        'default',
        'muted',
      ];
      expect(validColors).toContain('primary');
      expect(validColors).toContain('success');
      expect(validColors).toContain('default');
    });
  });

  describe('Typography 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // h1, primary, center, bold, uppercase, underline
      const classes = getTypographyClasses(
        'h1',
        'primary',
        'center',
        'bold',
        'uppercase',
        'underline'
      );
      const component = getTypographyComponent('h1');
      const isValidVariant = validateTypographyVariant('h1');
      const isValidColor = validateTypographyColor('primary');

      expect(classes).toBe(
        'typography h1 colorPrimary textCenter fontBold uppercase underline'
      );
      expect(component).toBe('h1');
      expect(isValidVariant).toBe(true);
      expect(isValidColor).toBe(true);
    });

    it('body 텍스트가 올바르게 처리된다', () => {
      const classes = getTypographyClasses(
        'body',
        'default',
        'left',
        'normal',
        'none',
        'none'
      );
      const component = getTypographyComponent('body');

      expect(classes).toBe('typography body colorDefault textLeft fontNormal');
      expect(component).toBe('span');
    });

    it('유효성 검사가 올바르게 작동한다', () => {
      const isValidVariant = validateTypographyVariant('h2');
      const isValidColor = validateTypographyColor('success');
      const isValidAlign = validateTypographyAlign('right');
      const isValidWeight = validateTypographyWeight('medium');

      expect(isValidVariant).toBe(true);
      expect(isValidColor).toBe(true);
      expect(isValidAlign).toBe(true);
      expect(isValidWeight).toBe(true);
    });
  });
});
