import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePanelPosition } from '../usePanelPosition';

// localStorage 모킹
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// window.innerWidth, innerHeight 모킹
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1920,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 1080,
});

describe('usePanelPosition - 패널 위치 관리 훅', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('초기 위치 설정', () => {
    it('localStorage에 저장된 위치가 없으면 화면 중앙에 위치한다', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => usePanelPosition());

      // 패널 크기: 280x400
      const expectedX = Math.max(0, (1920 - 280) / 2); // 820
      const expectedY = Math.max(0, (1080 - 400) / 2); // 340

      expect(result.current.position).toEqual({ x: expectedX, y: expectedY });
    });

    it('localStorage에 저장된 위치가 있으면 해당 위치를 사용한다', () => {
      const savedPosition = { x: 150, y: 200 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPosition));

      const { result } = renderHook(() => usePanelPosition());

      expect(result.current.position).toEqual(savedPosition);
    });

    it('localStorage의 잘못된 JSON을 파싱할 수 없으면 기본 위치를 사용한다', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => usePanelPosition());

      const expectedX = Math.max(0, (1920 - 280) / 2);
      const expectedY = Math.max(0, (1080 - 400) / 2);

      expect(result.current.position).toEqual({ x: expectedX, y: expectedY });
    });
  });

  describe('위치 업데이트', () => {
    it('updatePosition이 호출되면 위치가 업데이트되고 localStorage에 저장된다', () => {
      const { result } = renderHook(() => usePanelPosition());

      const newPosition = { x: 300, y: 400 };

      act(() => {
        result.current.updatePosition(newPosition);
      });

      expect(result.current.position).toEqual(newPosition);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ui:studentsPanelPos',
        JSON.stringify(newPosition),
      );
    });

    it('여러 번 위치를 업데이트해도 정상적으로 작동한다', () => {
      const { result } = renderHook(() => usePanelPosition());

      const positions = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
      ];

      positions.forEach(position => {
        act(() => {
          result.current.updatePosition(position);
        });
      });

      expect(result.current.position).toEqual(positions[2]);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('초기화 상태', () => {
    it('isInitialized가 true로 설정된다', () => {
      const { result } = renderHook(() => usePanelPosition());

      // useEffect가 실행된 후 true로 설정
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('화면 크기 변화 대응', () => {
    it('작은 화면에서도 기본 위치가 올바르게 계산된다', () => {
      // 작은 화면으로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 600,
      });

      const { result } = renderHook(() => usePanelPosition());

      const expectedX = Math.max(0, (800 - 280) / 2); // 260
      const expectedY = Math.max(0, (600 - 400) / 2); // 100

      expect(result.current.position).toEqual({ x: expectedX, y: expectedY });
    });

    it('매우 작은 화면에서도 패널이 화면 밖으로 나가지 않는다', () => {
      // 매우 작은 화면으로 설정
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 200,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 300,
      });

      const { result } = renderHook(() => usePanelPosition());

      // 패널이 화면 크기보다 클 때는 0으로 설정
      expect(result.current.position.x).toBe(0);
      expect(result.current.position.y).toBe(0);
    });
  });

  describe('localStorage 키 관리', () => {
    it('올바른 키로 localStorage에 저장한다', () => {
      const { result } = renderHook(() => usePanelPosition());

      const newPosition = { x: 500, y: 600 };

      act(() => {
        result.current.updatePosition(newPosition);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ui:studentsPanelPos',
        JSON.stringify(newPosition),
      );
    });

    it('올바른 키로 localStorage에서 읽어온다', () => {
      const savedPosition = { x: 150, y: 200 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedPosition));

      renderHook(() => usePanelPosition());

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'ui:studentsPanelPos',
      );
    });
  });
});
