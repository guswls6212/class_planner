import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider, useTheme } from '../ThemeContext';

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

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('기본적으로 다크 테마로 설정된다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('dark');
  });

  it('localStorage에서 저장된 테마를 불러온다', () => {
    mockLocalStorage.getItem.mockReturnValue('light');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('theme');
    expect(result.current.theme).toBe('light');
  });

  it('테마 토글 기능이 작동한다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 초기 상태는 dark
    expect(result.current.theme).toBe('dark');

    // 토글 실행
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('light');

    // 다시 토글 실행
    act(() => {
      result.current.toggleTheme();
    });
    expect(result.current.theme).toBe('dark');
  });

  it('테마 변경 시 localStorage에 저장된다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 토글 실행
    act(() => {
      result.current.toggleTheme();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('useTheme이 Provider 외부에서 사용되면 에러가 발생한다', () => {
    // 에러를 캐치하기 위한 콘솔 에러 모킹
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });

  it('여러 번 토글해도 올바르게 작동한다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 여러 번 토글
    act(() => result.current.toggleTheme()); // dark -> light
    expect(result.current.theme).toBe('light');

    act(() => result.current.toggleTheme()); // light -> dark
    expect(result.current.theme).toBe('dark');

    act(() => result.current.toggleTheme()); // dark -> light
    expect(result.current.theme).toBe('light');

    act(() => result.current.toggleTheme()); // light -> dark
    expect(result.current.theme).toBe('dark');
  });

  it('localStorage에 잘못된 값이 저장되어 있어도 기본값을 사용한다', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-theme');

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 잘못된 값이 있어도 기본값인 dark를 사용
    expect(result.current.theme).toBe('dark');
  });

  it('localStorage가 null을 반환해도 기본값을 사용한다', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.theme).toBe('dark');
  });

  it('테마 변경 시 localStorage에 저장된다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 토글 실행
    act(() => {
      result.current.toggleTheme();
    });

    // localStorage에 저장되었는지 확인
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('Context 값이 올바르게 제공된다', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('toggleTheme');
    expect(typeof result.current.toggleTheme).toBe('function');
  });
});
