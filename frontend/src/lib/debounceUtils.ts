/**
 * Debounce 유틸리티 함수들
 * DB 쓰기 작업 최적화를 위한 Debounce 구현
 */

import React from 'react';
import type { DebounceConfig } from '../types/dataSyncTypes';

/**
 * Debounce 함수 타입
 */
type DebouncedFunction<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

/**
 * 고급 Debounce 함수 구현
 * leading, trailing, maxWait 옵션 지원
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  config: DebounceConfig
): DebouncedFunction<T> {
  const { delay, maxWait, leading, trailing } = config;

  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | null = null;
  let result: ReturnType<T> | undefined;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    if (args && thisArg) {
      result = func.apply(thisArg, args as Parameters<T>) as ReturnType<T>;
    }
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
    return undefined;
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastCallTime = 0;
    lastArgs = null;
    lastThis = null;
    timeoutId = null;
    maxTimeoutId = null;
  }

  function flush(): ReturnType<T> | undefined {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(
    this: ThisParameterType<T>,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this as ThisParameterType<T>;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as DebouncedFunction<T> & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
    pending: () => boolean;
  };
}

/**
 * 간단한 Debounce 함수 (기본 설정)
 */
export function simpleDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  return debounce(func, {
    delay,
    maxWait: delay * 2,
    leading: false,
    trailing: true,
  });
}

/**
 * 즉시 실행 Debounce 함수 (leading: true)
 */
export function leadingDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  return debounce(func, {
    delay,
    maxWait: delay * 2,
    leading: true,
    trailing: false,
  });
}

/**
 * Throttle 함수 구현 (maxWait와 동일한 delay)
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  return debounce(func, {
    delay,
    maxWait: delay,
    leading: true,
    trailing: true,
  });
}

/**
 * React Hook용 Debounce 훅
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  config: DebounceConfig
): DebouncedFunction<T> {
  const debouncedFunc = debounce(func, config);

  // 컴포넌트 언마운트 시 정리
  React.useEffect(() => {
    return () => {
      (debouncedFunc as unknown as { cancel(): void }).cancel();
    };
  }, [debouncedFunc]);

  return debouncedFunc;
}

/**
 * 데이터 저장용 Debounce 설정
 */
export const DATA_SAVE_DEBOUNCE_CONFIG: DebounceConfig = {
  delay: 1000, // 1초 후 저장
  maxWait: 5000, // 최대 5초 후 강제 저장
  leading: false, // 즉시 실행하지 않음
  trailing: true, // 마지막 호출 후 실행
};

/**
 * 실시간 검색용 Debounce 설정
 */
export const SEARCH_DEBOUNCE_CONFIG: DebounceConfig = {
  delay: 300, // 300ms 후 검색
  maxWait: 1000, // 최대 1초 후 강제 검색
  leading: false,
  trailing: true,
};

/**
 * 드래그 앤 드롭용 Debounce 설정
 */
export const DRAG_DEBOUNCE_CONFIG: DebounceConfig = {
  delay: 500, // 500ms 후 저장
  maxWait: 2000, // 최대 2초 후 강제 저장
  leading: false,
  trailing: true,
};
