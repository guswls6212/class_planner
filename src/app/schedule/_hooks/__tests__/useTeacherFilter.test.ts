import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTeacherFilter } from "../useTeacherFilter";

describe("useTeacherFilter", () => {
  it("초기 상태는 빈 배열", () => {
    const { result } = renderHook(() => useTeacherFilter(null));
    expect(result.current.selectedTeacherIds).toEqual([]);
  });

  it("toggleTeacher — 없으면 추가", () => {
    const { result } = renderHook(() => useTeacherFilter("user1"));
    act(() => result.current.toggleTeacher("tch1"));
    expect(result.current.selectedTeacherIds).toContain("tch1");
  });

  it("toggleTeacher — 있으면 제거", () => {
    const { result } = renderHook(() => useTeacherFilter("user1"));
    act(() => result.current.toggleTeacher("tch1"));
    act(() => result.current.toggleTeacher("tch1"));
    expect(result.current.selectedTeacherIds).not.toContain("tch1");
  });

  it("clearFilter — 모든 선택 해제", () => {
    const { result } = renderHook(() => useTeacherFilter("user1"));
    act(() => result.current.toggleTeacher("tch1"));
    act(() => result.current.toggleTeacher("tch2"));
    act(() => result.current.clearFilter());
    expect(result.current.selectedTeacherIds).toHaveLength(0);
  });
});
