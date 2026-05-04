import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionSelection } from "../useSessionSelection";

describe("useSessionSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("초기 상태 — empty + count 0", () => {
    const { result } = renderHook(() => useSessionSelection());
    expect(result.current.selectedSessionIds).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isAtLimit).toBe(false);
  });

  it("toggle — 새 id 추가, 기존 id 제거", () => {
    const { result } = renderHook(() => useSessionSelection());

    act(() => result.current.toggle("a"));
    expect(result.current.selectedSessionIds).toEqual(["a"]);
    expect(result.current.isSelected("a")).toBe(true);

    act(() => result.current.toggle("b"));
    expect(result.current.count).toBe(2);

    act(() => result.current.toggle("a"));
    expect(result.current.selectedSessionIds).toEqual(["b"]);
    expect(result.current.isSelected("a")).toBe(false);
  });

  it("clear — 전체 해제", () => {
    const { result } = renderHook(() => useSessionSelection());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
  });

  it("replace — 통째로 교체 + max로 자름", () => {
    const { result } = renderHook(() => useSessionSelection({ max: 3 }));
    act(() => result.current.replace(["a", "b", "c", "d", "e"]));
    expect(result.current.selectedSessionIds).toEqual(["a", "b", "c"]);
  });

  it("max 도달 시 toggle 무시 + onLimitExceeded 호출", () => {
    const onLimitExceeded = vi.fn();
    const { result } = renderHook(() =>
      useSessionSelection({ max: 2, onLimitExceeded }),
    );
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    expect(result.current.isAtLimit).toBe(true);

    act(() => result.current.toggle("c"));
    expect(result.current.selectedSessionIds).toEqual(["a", "b"]);
    expect(onLimitExceeded).toHaveBeenCalledWith(2);
  });

  it("Esc 키 → clear (input 안에서는 무시)", () => {
    const { result } = renderHook(() => useSessionSelection());
    act(() => result.current.toggle("a"));
    expect(result.current.count).toBe(1);

    // Esc on body — clear
    act(() => {
      const evt = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(evt);
    });
    expect(result.current.count).toBe(0);

    // Esc on input — 무시
    act(() => result.current.toggle("a"));
    const input = document.createElement("input");
    document.body.appendChild(input);
    act(() => {
      const evt = new KeyboardEvent("keydown", { key: "Escape" });
      Object.defineProperty(evt, "target", { value: input });
      window.dispatchEvent(evt);
    });
    // input 내부 키 입력은 무시 (modal 등이 우선)
    expect(result.current.count).toBe(1);
    document.body.removeChild(input);
  });
});
