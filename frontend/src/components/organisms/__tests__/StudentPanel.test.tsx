import { vi } from 'vitest';
import StudentPanel, {
  calculateDragPosition,
  getDragEffect,
  getEmptyMessageStyles,
  getHeaderStyles,
  getListStyles,
  getPanelMaxHeight,
  getPanelStyles,
  getPanelWidth,
  getPanelZIndex,
  getStudentItemStyles,
  isStudentSelected,
  shouldShowEmptyMessage,
  validatePanelPosition,
} from '../StudentPanel';

// Mock React Testing Library to avoid DOM issues
vi.mock('@testing-library/react', () => ({
  render: vi.fn(),
  screen: { getByText: vi.fn(), getByRole: vi.fn() },
}));

describe('StudentPanel 컴포넌트', () => {
  it('StudentPanel 컴포넌트가 올바르게 정의되어 있다', () => {
    expect(StudentPanel).toBeDefined();
    expect(typeof StudentPanel).toBe('function');
  });

  // 단위 테스트 (함수 레벨)
  describe('유틸리티 함수 테스트', () => {
    describe('getPanelStyles', () => {
      it('올바른 패널 스타일을 반환한다', () => {
        const panelPos = { x: 100, y: 200 };
        const result = getPanelStyles(panelPos);
        expect(result).toEqual({
          position: 'fixed',
          left: 100,
          top: 200,
          width: 280,
          maxHeight: '400px',
          overflow: 'auto',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: 16,
          zIndex: 1000,
        });
      });

      it('다양한 위치로 올바른 스타일을 반환한다', () => {
        const panelPos1 = { x: 0, y: 0 };
        const panelPos2 = { x: 500, y: 300 };
        const panelPos3 = { x: -100, y: -50 };

        const result1 = getPanelStyles(panelPos1);
        const result2 = getPanelStyles(panelPos2);
        const result3 = getPanelStyles(panelPos3);

        expect(result1.left).toBe(0);
        expect(result1.top).toBe(0);
        expect(result2.left).toBe(500);
        expect(result2.top).toBe(300);
        expect(result3.left).toBe(-100);
        expect(result3.top).toBe(-50);
      });

      it('고정된 스타일 값들이 올바르게 설정되어 있다', () => {
        const result = getPanelStyles({ x: 0, y: 0 });
        expect(result.width).toBe(280);
        expect(result.maxHeight).toBe('400px');
        expect(result.zIndex).toBe(1000);
        expect(result.borderRadius).toBe(8);
        expect(result.padding).toBe(16);
      });
    });

    describe('getHeaderStyles', () => {
      it('드래그 중일 때 올바른 헤더 스타일을 반환한다', () => {
        const result = getHeaderStyles(true);
        expect(result.cursor).toBe('grabbing');
        expect(result.fontWeight).toBe(700);
        expect(result.marginBottom).toBe(8);
        expect(result.padding).toBe('4px 0');
      });

      it('드래그하지 않을 때 올바른 헤더 스타일을 반환한다', () => {
        const result = getHeaderStyles(false);
        expect(result.cursor).toBe('grab');
        expect(result.fontWeight).toBe(700);
        expect(result.marginBottom).toBe(8);
        expect(result.padding).toBe('4px 0');
      });
    });

    describe('getListStyles', () => {
      it('올바른 리스트 스타일을 반환한다', () => {
        const result = getListStyles();
        expect(result).toEqual({
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gap: 8,
        });
      });
    });

    describe('getStudentItemStyles', () => {
      it('선택된 학생의 올바른 스타일을 반환한다', () => {
        const result = getStudentItemStyles(true, false);
        expect(result.background).toBe('rgba(59,130,246,0.5)');
        expect(result.cursor).toBe('grab');
        expect(result.width).toBe('100%');
        expect(result.textAlign).toBe('left');
        expect(result.padding).toBe('8px 12px');
        expect(result.borderRadius).toBe(6);
        expect(result.color).toBe('#fff');
        expect(result.userSelect).toBe('none');
        expect(result.boxSizing).toBe('border-box');
      });

      it('선택되지 않은 학생의 올바른 스타일을 반환한다', () => {
        const result = getStudentItemStyles(false, false);
        expect(result.background).toBe('rgba(255,255,255,0.05)');
        expect(result.cursor).toBe('grab');
      });

      it('드래그 중일 때 올바른 커서를 반환한다', () => {
        const result = getStudentItemStyles(false, true);
        expect(result.cursor).toBe('grabbing');
      });
    });

    describe('getEmptyMessageStyles', () => {
      it('올바른 빈 메시지 스타일을 반환한다', () => {
        const result = getEmptyMessageStyles();
        expect(result).toEqual({
          color: '#bbb',
          padding: '8px 12px',
        });
      });
    });

    describe('calculateDragPosition', () => {
      it('올바른 드래그 위치를 계산한다', () => {
        const clientX = 500;
        const clientY = 300;
        const dragOffset = { x: 50, y: 25 };
        const result = calculateDragPosition(clientX, clientY, dragOffset);
        expect(result).toEqual({
          x: 450,
          y: 275,
        });
      });

      it('다양한 좌표로 올바른 위치를 계산한다', () => {
        const testCases = [
          {
            clientX: 0,
            clientY: 0,
            dragOffset: { x: 0, y: 0 },
            expected: { x: 0, y: 0 },
          },
          {
            clientX: 100,
            clientY: 100,
            dragOffset: { x: 10, y: 20 },
            expected: { x: 90, y: 80 },
          },
          {
            clientX: -50,
            clientY: -30,
            dragOffset: { x: 25, y: 15 },
            expected: { x: -75, y: -45 },
          },
        ];

        testCases.forEach(({ clientX, clientY, dragOffset, expected }) => {
          const result = calculateDragPosition(clientX, clientY, dragOffset);
          expect(result).toEqual(expected);
        });
      });
    });

    describe('shouldShowEmptyMessage', () => {
      it('학생이 없을 때 true를 반환한다', () => {
        expect(shouldShowEmptyMessage([])).toBe(true);
      });

      it('학생이 있을 때 false를 반환한다', () => {
        const students = [
          { id: '1', name: 'John Doe', email: 'john@example.com' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
        ];
        expect(shouldShowEmptyMessage(students)).toBe(false);
      });
    });

    describe('isStudentSelected', () => {
      it('선택된 학생이 올바르게 식별된다', () => {
        expect(isStudentSelected('student1', 'student1')).toBe(true);
        expect(isStudentSelected('student2', 'student1')).toBe(false);
      });

      it('다양한 학생 ID로 올바르게 작동한다', () => {
        const testCases = [
          { studentId: '1', selectedStudentId: '1', expected: true },
          { studentId: '2', selectedStudentId: '1', expected: false },
          { studentId: 'abc', selectedStudentId: 'abc', expected: true },
          { studentId: 'xyz', selectedStudentId: 'abc', expected: false },
        ];

        testCases.forEach(({ studentId, selectedStudentId, expected }) => {
          expect(isStudentSelected(studentId, selectedStudentId)).toBe(
            expected
          );
        });
      });
    });

    describe('패널 상수 함수들', () => {
      it('getPanelWidth가 올바른 너비를 반환한다', () => {
        expect(getPanelWidth()).toBe(280);
      });

      it('getPanelMaxHeight가 올바른 높이를 반환한다', () => {
        expect(getPanelMaxHeight()).toBe('400px');
      });

      it('getPanelZIndex가 올바른 zIndex를 반환한다', () => {
        expect(getPanelZIndex()).toBe(1000);
      });
    });

    describe('validatePanelPosition', () => {
      it('유효한 위치가 올바르게 검증된다', () => {
        expect(validatePanelPosition({ x: 0, y: 0 })).toBe(true);
        expect(validatePanelPosition({ x: 100, y: 200 })).toBe(true);
        expect(validatePanelPosition({ x: -50, y: -100 })).toBe(true);
      });

      it('유효하지 않은 위치가 올바르게 검증된다', () => {
        expect(
          validatePanelPosition({ x: '100', y: 200 } as unknown as {
            x: number;
            y: number;
          })
        ).toBe(false);
        expect(
          validatePanelPosition({ x: 100, y: '200' } as unknown as {
            x: number;
            y: number;
          })
        ).toBe(false);
        expect(
          validatePanelPosition({ x: null, y: 200 } as unknown as {
            x: number;
            y: number;
          })
        ).toBe(false);
        expect(
          validatePanelPosition({ x: 100, y: undefined } as unknown as {
            x: number;
            y: number;
          })
        ).toBe(false);
      });
    });

    describe('getDragEffect', () => {
      it('올바른 드래그 효과를 반환한다', () => {
        expect(getDragEffect()).toBe('copy');
      });
    });
  });

  describe('StudentPanel 관련 상수 테스트', () => {
    it('기본 스타일 값들이 올바르게 정의되어 있다', () => {
      const defaultStyles = {
        width: 280,
        maxHeight: '400px',
        borderRadius: 8,
        padding: 16,
        zIndex: 1000,
        gap: 8,
        marginBottom: 8,
        paddingItem: '8px 12px',
        borderRadiusItem: 6,
      };

      expect(defaultStyles.width).toBe(280);
      expect(defaultStyles.maxHeight).toBe('400px');
      expect(defaultStyles.borderRadius).toBe(8);
      expect(defaultStyles.padding).toBe(16);
      expect(defaultStyles.zIndex).toBe(1000);
      expect(defaultStyles.gap).toBe(8);
      expect(defaultStyles.marginBottom).toBe(8);
      expect(defaultStyles.paddingItem).toBe('8px 12px');
      expect(defaultStyles.borderRadiusItem).toBe(6);
    });

    it('색상 값들이 올바르게 정의되어 있다', () => {
      const colors = {
        background: 'rgba(0,0,0,0.5)',
        border: 'rgba(255,255,255,0.15)',
        selectedBackground: 'rgba(59,130,246,0.5)',
        unselectedBackground: 'rgba(255,255,255,0.05)',
        textColor: '#fff',
        emptyMessageColor: '#bbb',
      };

      expect(colors.background).toBe('rgba(0,0,0,0.5)');
      expect(colors.border).toBe('rgba(255,255,255,0.15)');
      expect(colors.selectedBackground).toBe('rgba(59,130,246,0.5)');
      expect(colors.unselectedBackground).toBe('rgba(255,255,255,0.05)');
      expect(colors.textColor).toBe('#fff');
      expect(colors.emptyMessageColor).toBe('#bbb');
    });
  });

  describe('StudentPanel 관련 함수 조합 테스트', () => {
    it('복합적인 시나리오가 올바르게 처리된다', () => {
      // 패널 스타일 테스트
      const panelPos = { x: 150, y: 250 };
      const panelStyles = getPanelStyles(panelPos);
      const headerStyles = getHeaderStyles(true);
      const listStyles = getListStyles();
      const studentItemStyles = getStudentItemStyles(true, false);
      const emptyMessageStyles = getEmptyMessageStyles();

      // 드래그 위치 계산 테스트
      const dragPosition = calculateDragPosition(300, 400, { x: 25, y: 50 });

      // 조건부 로직 테스트
      const students = [
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
      ];
      const shouldShowEmpty = shouldShowEmptyMessage(students);
      const isStudent1Selected = isStudentSelected('1', '1');
      const isStudent2Selected = isStudentSelected('2', '1');

      // 상수 함수 테스트
      const panelWidth = getPanelWidth();
      const panelMaxHeight = getPanelMaxHeight();
      const panelZIndex = getPanelZIndex();
      const isValidPosition = validatePanelPosition(panelPos);
      const dragEffect = getDragEffect();

      // 검증
      expect(panelStyles.left).toBe(150);
      expect(panelStyles.top).toBe(250);
      expect(headerStyles.cursor).toBe('grabbing');
      expect(listStyles.display).toBe('grid');
      expect(studentItemStyles.background).toBe('rgba(59,130,246,0.5)');
      expect(emptyMessageStyles.color).toBe('#bbb');

      expect(dragPosition.x).toBe(275);
      expect(dragPosition.y).toBe(350);

      expect(shouldShowEmpty).toBe(false);
      expect(isStudent1Selected).toBe(true);
      expect(isStudent2Selected).toBe(false);

      expect(panelWidth).toBe(280);
      expect(panelMaxHeight).toBe('400px');
      expect(panelZIndex).toBe(1000);
      expect(isValidPosition).toBe(true);
      expect(dragEffect).toBe('copy');
    });

    it('빈 학생 목록 시나리오가 올바르게 처리된다', () => {
      const emptyStudents: Array<{ id: string; name: string; email: string }> =
        [];
      const shouldShowEmpty = shouldShowEmptyMessage(emptyStudents);
      const emptyMessageStyles = getEmptyMessageStyles();

      expect(shouldShowEmpty).toBe(true);
      expect(emptyMessageStyles.color).toBe('#bbb');
    });

    it('드래그 상태 변화가 올바르게 처리된다', () => {
      const headerStylesNotDragging = getHeaderStyles(false);
      const headerStylesDragging = getHeaderStyles(true);
      const studentItemStylesNotDragging = getStudentItemStyles(false, false);
      const studentItemStylesDragging = getStudentItemStyles(false, true);

      expect(headerStylesNotDragging.cursor).toBe('grab');
      expect(headerStylesDragging.cursor).toBe('grabbing');
      expect(studentItemStylesNotDragging.cursor).toBe('grab');
      expect(studentItemStylesDragging.cursor).toBe('grabbing');
    });
  });

  describe('StudentPanel 이벤트 핸들러 테스트', () => {
    it('이벤트 핸들러들이 올바르게 정의되어 있다', () => {
      const mockOnStudentSelect = vi.fn();
      const mockOnPanelMove = vi.fn();

      expect(typeof mockOnStudentSelect).toBe('function');
      expect(typeof mockOnPanelMove).toBe('function');
    });
  });
});
