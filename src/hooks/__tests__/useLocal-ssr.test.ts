import { useLocal } from "@/hooks/useLocal";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// localStorage Mock
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// window 객체 Mock
const windowMock = {
  localStorage: localStorageMock,
};

describe("useLocal Hook - SSR 안전성 테스트", () => {
  beforeEach(() => {
    // localStorage Mock 초기화
    vi.clearAllMocks();

    // window 객체 Mock 설정
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    // Mock 정리
    vi.restoreAllMocks();
  });

  it("SSR 환경에서 localStorage가 없을 때 초기값을 사용해야 한다", () => {
    // Arrange - localStorage가 없는 환경 시뮬레이션
    Object.defineProperty(window, "localStorage", {
      value: undefined,
      writable: true,
    });

    const initialValue = "initial-value";
    const key = "test-key";

    // Act - 훅 실행 (SSR 환경)
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값이 사용되어야 함
    expect(result.current[0]).toBe(initialValue);
  });

  it("클라이언트에서 localStorage 접근이 실패해도 초기값을 유지해야 한다", () => {
    // Arrange - localStorage 접근 실패 시뮬레이션
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage access denied");
    });

    const initialValue = "initial-value";
    const key = "test-key";

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값이 유지되어야 함
    expect(result.current[0]).toBe(initialValue);
  });

  it("클라이언트에서 localStorage 저장이 실패해도 에러가 발생하지 않아야 한다", () => {
    // Arrange - localStorage 저장 실패 시뮬레이션
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error("localStorage write denied");
    });

    const initialValue = "initial-value";
    const key = "test-key";

    // Act - 훅 실행 및 값 변경
    const { result } = renderHook(() => useLocal(key, initialValue));

    // 값 변경 시도 (저장 실패해도 에러가 발생하지 않아야 함)
    expect(() => {
      result.current[1]("new-value");
    }).not.toThrow();

    // Assert - 에러가 발생하지 않았는지만 확인
    expect(result.current).toBeDefined();
  });

  it("Hydration 완료 후 localStorage에서 값을 올바르게 로드해야 한다", () => {
    // Arrange - localStorage에 저장된 값
    const storedValue = "stored-value";
    const initialValue = "initial-value";
    const key = "test-key";

    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue));

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - localStorage.getItem이 호출되었는지 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);

    // 훅이 정상적으로 작동하는지 확인
    expect(result.current).toBeDefined();
    expect(result.current[0]).toBeDefined();
  });

  it("Hydration 완료 후 localStorage에 값을 올바르게 저장해야 한다", () => {
    // Arrange
    const initialValue = "initial-value";
    const key = "test-key";

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - localStorage.setItem이 호출되었는지 확인
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      key,
      JSON.stringify(initialValue)
    );

    // 훅이 정상적으로 작동하는지 확인
    expect(result.current).toBeDefined();
  });

  it("복잡한 객체 데이터를 안전하게 처리해야 한다", () => {
    // Arrange - 복잡한 객체 데이터
    const initialValue = { name: "initial", count: 0 };
    const key = "complex-data";

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값 사용
    expect(result.current[0]).toEqual(initialValue);

    // localStorage.getItem 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });

  it("배열 데이터를 안전하게 처리해야 한다", () => {
    // Arrange - 배열 데이터
    const initialValue: string[] = [];
    const key = "array-data";

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값 사용
    expect(result.current[0]).toEqual(initialValue);

    // localStorage.getItem 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });

  it("잘못된 JSON 데이터를 안전하게 처리해야 한다", () => {
    // Arrange - 잘못된 JSON 데이터
    const initialValue = "initial-value";
    const invalidJson = "{ invalid json }";
    const key = "invalid-json";

    localStorageMock.getItem.mockReturnValue(invalidJson);

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값 유지
    expect(result.current[0]).toBe(initialValue);

    // localStorage.getItem 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });

  it("null 값을 안전하게 처리해야 한다", () => {
    // Arrange - null 값
    const initialValue = "initial-value";
    const key = "null-value";

    localStorageMock.getItem.mockReturnValue(null);

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값 유지
    expect(result.current[0]).toBe(initialValue);

    // localStorage.getItem 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });

  it("빈 문자열을 안전하게 처리해야 한다", () => {
    // Arrange - 빈 문자열
    const initialValue = "initial-value";
    const key = "empty-string";

    localStorageMock.getItem.mockReturnValue("");

    // Act - 훅 실행
    const { result } = renderHook(() => useLocal(key, initialValue));

    // Assert - 초기값 유지
    expect(result.current[0]).toBe(initialValue);

    // localStorage.getItem 호출 확인
    expect(localStorageMock.getItem).toHaveBeenCalledWith(key);
  });
});
