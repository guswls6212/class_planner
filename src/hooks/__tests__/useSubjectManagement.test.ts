/**
 * useSubjectManagement 테스트 (252줄 - 큰 파일)
 */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies
vi.mock("../../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => "test-user-id"),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: [] }),
    headers: new Headers(),
    redirected: false,
    status: 200,
    statusText: "OK",
    type: "basic",
    url: "",
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
  } as any)
);

describe("useSubjectManagement", () => {
  let useSubjectManagement: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamic import
    const module = await import("../useSubjectManagement");
    useSubjectManagement = module.useSubjectManagement;
  });

  it("과목 관리 훅이 에러 없이 초기화되어야 한다", () => {
    expect(() => {
      renderHook(() => useSubjectManagement());
    }).not.toThrow();
  });

  it("기본 구조를 반환해야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(result.current).toBeDefined();
    expect(typeof result.current).toBe("object");
  });

  it("필수 CRUD 함수들이 존재해야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(typeof result.current.addSubject).toBe("function");
    expect(typeof result.current.updateSubject).toBe("function");
    expect(typeof result.current.deleteSubject).toBe("function");
    expect(typeof result.current.refreshSubjects).toBe("function");
  });

  it("과목 데이터 배열이 있어야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(Array.isArray(result.current.subjects)).toBe(true);
  });

  it("과목 수 카운트가 있어야 한다", () => {
    const { result } = renderHook(() => useSubjectManagement());

    expect(typeof result.current.subjectCount).toBe("number");
  });
});
