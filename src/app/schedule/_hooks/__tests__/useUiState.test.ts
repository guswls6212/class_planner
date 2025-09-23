import { act, renderHook } from "@testing-library/react";
import { useUiState } from "../../_hooks/useUiState";

describe("useUiState", () => {
  it("초기 상태를 올바르게 제공한다", () => {
    const { result } = renderHook(() => useUiState());
    expect(result.current.isStudentDragging).toBe(false);
    expect(result.current.gridVersion).toBe(0);
  });

  it("setter와 bumpGridVersion으로 상태를 갱신할 수 있다", () => {
    const { result } = renderHook(() => useUiState());
    act(() => {
      result.current.setIsStudentDragging(true);
      result.current.setGridVersion(2);
    });
    expect(result.current.isStudentDragging).toBe(true);
    expect(result.current.gridVersion).toBe(2);

    act(() => {
      // gridVersion 증가 유틸
      // @ts-ignore
      result.current.bumpGridVersion?.();
    });
    expect(result.current.gridVersion).toBe(3);
  });
});
