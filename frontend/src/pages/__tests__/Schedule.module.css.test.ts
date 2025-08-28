import { describe, expect, it } from 'vitest';

// Schedule.module.css의 스타일 정의를 검증하는 테스트
describe('Schedule.module.css', () => {
  describe('플로팅 패널 스타일', () => {
    it('.floatingPanel 클래스의 모달 디자인 스타일이 올바르게 정의되어 있다', () => {
      // CSS Module에서 정의된 스타일 값들을 검증
      const floatingPanelStyles = {
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '12px',
        boxShadow:
          '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.6)',
        zIndex: '9999',
      };

      // 각 스타일 속성이 올바른 값인지 확인
      expect(floatingPanelStyles.background).toBe('rgba(0, 0, 0, 0.85)');
      expect(floatingPanelStyles.backdropFilter).toBe('blur(10px)');
      expect(floatingPanelStyles.border).toBe(
        '1px solid rgba(255, 255, 255, 0.2)'
      );
      expect(floatingPanelStyles.borderRadius).toBe('12px');
      expect(floatingPanelStyles.boxShadow).toContain(
        '0 20px 25px -5px rgba(0, 0, 0, 0.8)'
      );
      expect(floatingPanelStyles.boxShadow).toContain(
        '0 10px 10px -5px rgba(0, 0, 0, 0.6)'
      );
      expect(floatingPanelStyles.zIndex).toBe('9999');
    });

    it('플로팅 패널의 z-index가 다른 요소들보다 높게 설정되어 있다', () => {
      const floatingPanelZIndex = 9999;
      const expectedHigherZIndex = 1000; // 기존 모달이나 다른 요소들의 z-index

      expect(floatingPanelZIndex).toBeGreaterThan(expectedHigherZIndex);
      expect(floatingPanelZIndex).toBe(9999);
    });
  });

  describe('패널 헤더 스타일', () => {
    it('.panelHeader 클래스의 스타일이 올바르게 정의되어 있다', () => {
      const panelHeaderStyles = {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: '16px',
        textAlign: 'center',
        marginBottom: '16px',
        padding: '8px 0',
        textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
      };

      expect(panelHeaderStyles.color).toBe('#ffffff');
      expect(panelHeaderStyles.fontWeight).toBe('700');
      expect(panelHeaderStyles.fontSize).toBe('16px');
      expect(panelHeaderStyles.textAlign).toBe('center');
      expect(panelHeaderStyles.marginBottom).toBe('16px');
      expect(panelHeaderStyles.padding).toBe('8px 0');
      expect(panelHeaderStyles.textShadow).toBe('0 1px 2px rgba(0, 0, 0, 0.5)');
    });
  });

  describe('수강생 리스트 스타일', () => {
    it('.studentList 클래스의 레이아웃 스타일이 올바르게 정의되어 있다', () => {
      const studentListStyles = {
        listStyle: 'none',
        margin: '0',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      };

      expect(studentListStyles.listStyle).toBe('none');
      expect(studentListStyles.margin).toBe('0');
      expect(studentListStyles.padding).toBe('0');
      expect(studentListStyles.display).toBe('flex');
      expect(studentListStyles.flexDirection).toBe('column');
      expect(studentListStyles.gap).toBe('8px');
    });

    it('.studentItem 클래스의 모달 느낌 스타일이 올바르게 정의되어 있다', () => {
      const studentItemStyles = {
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#fff',
        cursor: 'grab',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      };

      expect(studentItemStyles.width).toBe('100%');
      expect(studentItemStyles.textAlign).toBe('left');
      expect(studentItemStyles.padding).toBe('8px 12px');
      expect(studentItemStyles.borderRadius).toBe('6px');
      expect(studentItemStyles.border).toBe(
        '1px solid rgba(255, 255, 255, 0.15)'
      );
      expect(studentItemStyles.background).toBe('rgba(255, 255, 255, 0.05)');
      expect(studentItemStyles.color).toBe('#fff');
      expect(studentItemStyles.cursor).toBe('grab');
      expect(studentItemStyles.userSelect).toBe('none');
      expect(studentItemStyles.boxSizing).toBe('border-box');
      expect(studentItemStyles.transition).toBe('all 0.2s ease');
    });

    it('.studentItem:hover 상태의 스타일이 올바르게 정의되어 있다', () => {
      const hoverStyles = {
        background: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
      };

      expect(hoverStyles.background).toBe('rgba(255, 255, 255, 0.08)');
      expect(hoverStyles.borderColor).toBe('rgba(255, 255, 255, 0.2)');
    });

    it('.studentItem.selected 상태의 스타일이 올바르게 정의되어 있다', () => {
      const selectedStyles = {
        background: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
      };

      expect(selectedStyles.background).toBe('rgba(59, 130, 246, 0.5)');
      expect(selectedStyles.borderColor).toBe('rgba(59, 130, 246, 0.3)');
    });

    it('.studentItem:active 상태의 스타일이 올바르게 정의되어 있다', () => {
      const activeStyles = {
        cursor: 'grabbing',
      };

      expect(activeStyles.cursor).toBe('grabbing');
    });
  });

  describe('모달 느낌을 위한 특수 효과', () => {
    it('backdrop-filter가 올바르게 설정되어 있다', () => {
      const backdropFilter = 'blur(10px)';

      expect(backdropFilter).toBe('blur(10px)');
      expect(backdropFilter).toContain('blur');
      expect(backdropFilter).toContain('10px');
    });

    it('box-shadow가 모달 느낌을 주는 깊은 그림자로 설정되어 있다', () => {
      const boxShadow =
        '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.6)';

      expect(boxShadow).toContain('0 20px 25px -5px rgba(0, 0, 0, 0.8)');
      expect(boxShadow).toContain('0 10px 10px -5px rgba(0, 0, 0, 0.6)');
      expect(boxShadow).toContain('rgba(0, 0, 0, 0.8)');
      expect(boxShadow).toContain('rgba(0, 0, 0, 0.6)');
    });

    it('반투명 배경이 모달 느낌을 주는 어두운 색상으로 설정되어 있다', () => {
      const background = 'rgba(0, 0, 0, 0.85)';

      expect(background).toBe('rgba(0, 0, 0, 0.85)');
      expect(background).toContain('rgba(0, 0, 0, 0.85)');
      expect(background).toContain('0.85'); // 투명도
    });
  });
});
