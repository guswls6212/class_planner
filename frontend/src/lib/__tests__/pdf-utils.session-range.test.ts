import { beforeEach, describe, expect, it } from 'vitest';
import {
  adjustSessionPositions,
  calculateSessionTimeRange,
  extractTimeHeaders,
  hideTimeHeadersOutsideSessionRange,
  restoreHiddenTimeHeaders,
} from '../pdf-utils';

// Mock DOM 요소 생성 함수
function createMockElement(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('PDF Utils - Session Range Functions', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    // 기본 시간표 구조 생성
    mockElement = createMockElement(`
      <div class="time-table-grid">
        <!-- 시간 헤더들 -->
        <div style="text-align: center; height: 40px;">09:00</div>
        <div style="text-align: center; height: 40px;">09:30</div>
        <div style="text-align: center; height: 40px;">10:00</div>
        <div style="text-align: center; height: 40px;">10:30</div>
        <div style="text-align: center; height: 40px;">11:00</div>
        <div style="text-align: center; height: 40px;">11:30</div>
        <div style="text-align: center; height: 40px;">12:00</div>
        <div style="text-align: center; height: 40px;">12:30</div>
        <div style="text-align: center; height: 40px;">13:00</div>
        <div style="text-align: center; height: 40px;">13:30</div>
        <div style="text-align: center; height: 40px;">14:00</div>
        <div style="text-align: center; height: 40px;">14:30</div>
        <div style="text-align: center; height: 40px;">15:00</div>
        <div style="text-align: center; height: 40px;">15:30</div>
        <div style="text-align: center; height: 40px;">16:00</div>
        <div style="text-align: center; height: 40px;">16:30</div>
        <div style="text-align: center; height: 40px;">17:00</div>
        <div style="text-align: center; height: 40px;">17:30</div>
        <div style="text-align: center; height: 40px;">18:00</div>
        <div style="text-align: center; height: 40px;">18:30</div>
        <div style="text-align: center; height: 40px;">19:00</div>
        <div style="text-align: center; height: 40px;">19:30</div>
        <div style="text-align: center; height: 40px;">20:00</div>
        <div style="text-align: center; height: 40px;">20:30</div>
        <div style="text-align: center; height: 40px;">21:00</div>
        <div style="text-align: center; height: 40px;">21:30</div>
        <div style="text-align: center; height: 40px;">22:00</div>
        <div style="text-align: center; height: 40px;">22:30</div>
        <div style="text-align: center; height: 40px;">23:00</div>
        <div style="text-align: center; height: 40px;">23:30</div>
        
        <!-- 세션 블록들 -->
        <div class="session-block" data-session-id="1" data-starts-at="10:00" data-ends-at="11:00" style="left: 200px;"></div>
        <div class="session-block" data-session-id="2" data-starts-at="14:00" data-ends-at="16:00" style="left: 600px;"></div>
        <div class="session-block" data-session-id="3" data-starts-at="18:00" data-ends-at="20:00" style="left: 1000px;"></div>
      </div>
    `);
  });

  describe('calculateSessionTimeRange', () => {
    it('should calculate correct session time range from session blocks', () => {
      const result = calculateSessionTimeRange(mockElement);

      expect(result.hasSessions).toBe(true);
      expect(result.startTime).toBe('10:00'); // 가장 빠른 시작 시간
      expect(result.endTime).toBe('20:00'); // 가장 늦은 종료 시간
    });

    it('should return default range when no sessions exist', () => {
      const emptyElement = createMockElement('<div></div>');
      const result = calculateSessionTimeRange(emptyElement);

      expect(result.hasSessions).toBe(false);
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('24:00');
    });

    it('should handle sessions without time attributes', () => {
      const elementWithoutTime = createMockElement(`
        <div class="session-block" data-session-id="1" style="left: 200px;"></div>
      `);
      const result = calculateSessionTimeRange(elementWithoutTime);

      expect(result.hasSessions).toBe(false);
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('24:00');
    });
  });

  describe('extractTimeHeaders', () => {
    it('should extract only time headers, excluding weekday headers', () => {
      const elementWithWeekdays = createMockElement(`
        <div class="time-table-grid">
          <div style="text-align: center; height: 40px;">월</div>
          <div style="text-align: center; height: 40px;">10:00</div>
          <div style="text-align: center; height: 40px;">화</div>
          <div style="text-align: center; height: 40px;">11:00</div>
          <div class="time-table-row">
            <div style="text-align: center; height: 40px;">수</div>
          </div>
        </div>
      `);

      const timeHeaders = extractTimeHeaders(elementWithWeekdays);
      const timeTexts = timeHeaders.map(h => h.textContent?.trim());

      expect(timeHeaders).toHaveLength(2);
      expect(timeTexts).toEqual(['10:00', '11:00']);
      expect(timeTexts).not.toContain('월');
      expect(timeTexts).not.toContain('화');
      expect(timeTexts).not.toContain('수');
    });

    it('should exclude elements within time-table-row', () => {
      const elementWithNested = createMockElement(`
        <div class="time-table-grid">
          <div style="text-align: center; height: 40px;">10:00</div>
          <div class="time-table-row">
            <div style="text-align: center; height: 40px;">11:00</div>
          </div>
        </div>
      `);

      const timeHeaders = extractTimeHeaders(elementWithNested);
      const timeTexts = timeHeaders.map(h => h.textContent?.trim());

      expect(timeHeaders).toHaveLength(1);
      expect(timeTexts).toEqual(['10:00']);
      expect(timeTexts).not.toContain('11:00');
    });
  });

  describe('hideTimeHeadersOutsideSessionRange', () => {
    it('should hide headers outside session range and return count of hidden headers before start time', () => {
      const result = hideTimeHeadersOutsideSessionRange(
        mockElement,
        '14:00',
        '16:00',
      );

      // 14:00 이전 헤더들 (09:00~13:30)이 숨겨져야 함
      expect(result).toBe(10); // 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30

      const timeHeaders = extractTimeHeaders(mockElement);
      const visibleHeaders = timeHeaders.filter(
        h => (h as HTMLElement).style.display !== 'none',
      );
      const hiddenHeaders = timeHeaders.filter(
        h => (h as HTMLElement).style.display === 'none',
      );

      // 14:00~16:00 범위의 헤더만 보여야 함
      expect(visibleHeaders).toHaveLength(5); // 14:00, 14:30, 15:00, 15:30, 16:00
      expect(hiddenHeaders).toHaveLength(25); // 나머지 모든 헤더 (34개 전체 - 5개 보이는 헤더 - 4개 세션 블록)
    });

    it('should handle empty session range', () => {
      const result = hideTimeHeadersOutsideSessionRange(
        mockElement,
        '09:00',
        '09:00',
      );

      expect(result).toBe(0);
    });

    it('should handle full day range', () => {
      const result = hideTimeHeadersOutsideSessionRange(
        mockElement,
        '09:00',
        '24:00',
      );

      expect(result).toBe(0); // 숨겨진 헤더 없음

      const timeHeaders = extractTimeHeaders(mockElement);
      const hiddenHeaders = timeHeaders.filter(
        h => (h as HTMLElement).style.display === 'none',
      );
      expect(hiddenHeaders).toHaveLength(0);
    });
  });

  describe('restoreHiddenTimeHeaders', () => {
    it('should restore all hidden time headers', () => {
      // 먼저 일부 헤더를 숨김
      hideTimeHeadersOutsideSessionRange(mockElement, '14:00', '16:00');

      // 숨겨진 헤더 확인
      const timeHeaders = extractTimeHeaders(mockElement);
      const hiddenBeforeRestore = timeHeaders.filter(
        h => (h as HTMLElement).style.display === 'none',
      );
      expect(hiddenBeforeRestore.length).toBeGreaterThan(0);

      // 복원 실행
      restoreHiddenTimeHeaders(mockElement);

      // 모든 헤더가 복원되었는지 확인
      const hiddenAfterRestore = timeHeaders.filter(
        h => (h as HTMLElement).style.display === 'none',
      );
      expect(hiddenAfterRestore).toHaveLength(0);
    });

    it('should handle elements without hidden headers', () => {
      // 헤더를 숨기지 않은 상태에서 복원 실행
      expect(() => {
        restoreHiddenTimeHeaders(mockElement);
      }).not.toThrow();
    });
  });

  describe('adjustSessionPositions', () => {
    it('should adjust session positions based on hidden headers count', () => {
      const sessionBlocks = mockElement.querySelectorAll('.session-block');
      const firstSession = sessionBlocks[0] as HTMLElement;
      const originalLeft = firstSession.style.left;

      // 5개의 헤더가 숨겨졌다고 가정 (5 * 100px = 500px 이동)
      adjustSessionPositions(mockElement, 5);

      const newLeft = firstSession.style.left;
      const originalValue = parseInt(originalLeft) || 0;
      const newValue = parseInt(newLeft) || 0;

      expect(newValue).toBe(Math.max(0, originalValue - 500));
    });

    it('should not move sessions to negative positions', () => {
      const sessionBlocks = mockElement.querySelectorAll('.session-block');
      const firstSession = sessionBlocks[0] as HTMLElement;
      firstSession.style.left = '100px'; // 작은 값으로 설정

      // 10개의 헤더가 숨겨졌다고 가정 (10 * 100px = 1000px 이동)
      adjustSessionPositions(mockElement, 10);

      const newLeft = firstSession.style.left;
      const newValue = parseInt(newLeft) || 0;

      expect(newValue).toBe(0); // 음수가 되지 않아야 함
    });

    it('should handle sessions without left style', () => {
      const sessionBlocks = mockElement.querySelectorAll('.session-block');
      const firstSession = sessionBlocks[0] as HTMLElement;
      firstSession.style.left = ''; // left 스타일 제거

      expect(() => {
        adjustSessionPositions(mockElement, 5);
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should work together: calculate range, hide headers, adjust positions, and restore', () => {
      // 1. 세션 범위 계산
      const sessionRange = calculateSessionTimeRange(mockElement);
      expect(sessionRange.startTime).toBe('10:00');
      expect(sessionRange.endTime).toBe('20:00');

      // 2. 시간 헤더 숨김
      const hiddenCount = hideTimeHeadersOutsideSessionRange(
        mockElement,
        sessionRange.startTime,
        sessionRange.endTime,
      );

      // 3. 세션 위치 조정
      adjustSessionPositions(mockElement, hiddenCount);

      // 4. 조정된 위치 확인
      const sessionBlocks = mockElement.querySelectorAll('.session-block');
      const firstSession = sessionBlocks[0] as HTMLElement;
      expect(firstSession.style.left).not.toBe('200px'); // 위치가 조정되었는지 확인

      // 5. 복원
      restoreHiddenTimeHeaders(mockElement);

      // 6. 복원 확인
      const timeHeaders = extractTimeHeaders(mockElement);
      const hiddenAfterRestore = timeHeaders.filter(
        h => (h as HTMLElement).style.display === 'none',
      );
      expect(hiddenAfterRestore).toHaveLength(0);
    });
  });
});
