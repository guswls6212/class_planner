import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStudentFilter } from "../useStudentFilter";

describe("useStudentFilter", () => {
  it("초기 상태는 빈 배열", () => {
    const { result } = renderHook(() => useStudentFilter(null));
    expect(result.current.selectedStudentIds).toEqual([]);
  });

  it("toggleStudent — 없으면 추가", () => {
    const { result } = renderHook(() => useStudentFilter("user1"));
    act(() => result.current.toggleStudent("stu1"));
    expect(result.current.selectedStudentIds).toContain("stu1");
  });

  it("toggleStudent — 있으면 제거", () => {
    const { result } = renderHook(() => useStudentFilter("user1"));
    act(() => result.current.toggleStudent("stu1"));
    act(() => result.current.toggleStudent("stu1"));
    expect(result.current.selectedStudentIds).not.toContain("stu1");
  });

  it("clearFilter — 모든 선택 해제", () => {
    const { result } = renderHook(() => useStudentFilter("user1"));
    act(() => result.current.toggleStudent("stu1"));
    act(() => result.current.toggleStudent("stu2"));
    act(() => result.current.clearFilter());
    expect(result.current.selectedStudentIds).toHaveLength(0);
  });
});
