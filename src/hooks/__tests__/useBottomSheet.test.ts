import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBottomSheet } from "../useBottomSheet";

describe("useBottomSheet", () => {
  it("starts closed with translateY 0", () => {
    const { result } = renderHook(() => useBottomSheet());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.translateY).toBe(0);
  });

  it("opens and resets translateY", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.translateY).toBe(0);
  });

  it("closes and resets translateY", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => {
      result.current.open();
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.translateY).toBe(0);
  });

  it("calls onClose callback when closed", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useBottomSheet(onClose));
    act(() => result.current.close());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("tracks drag downward and updates translateY", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => {
      result.current.dragHandleProps.onTouchStart({
        touches: [{ clientY: 200 }],
      } as unknown as React.TouchEvent);
    });
    act(() => {
      result.current.dragHandleProps.onTouchMove({
        touches: [{ clientY: 250 }],
      } as unknown as React.TouchEvent);
    });
    expect(result.current.translateY).toBe(50);
  });

  it("closes when drag exceeds 100px threshold on touchEnd", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.open());
    act(() => {
      result.current.dragHandleProps.onTouchStart({
        touches: [{ clientY: 100 }],
      } as unknown as React.TouchEvent);
    });
    act(() => {
      result.current.dragHandleProps.onTouchMove({
        touches: [{ clientY: 210 }],
      } as unknown as React.TouchEvent);
    });
    act(() => result.current.dragHandleProps.onTouchEnd());
    expect(result.current.isOpen).toBe(false);
  });

  it("snaps back when drag is below 100px threshold", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => result.current.open());
    act(() => {
      result.current.dragHandleProps.onTouchStart({
        touches: [{ clientY: 100 }],
      } as unknown as React.TouchEvent);
    });
    act(() => {
      result.current.dragHandleProps.onTouchMove({
        touches: [{ clientY: 180 }],
      } as unknown as React.TouchEvent);
    });
    act(() => result.current.dragHandleProps.onTouchEnd());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.translateY).toBe(0);
  });

  it("ignores upward drag (negative diff)", () => {
    const { result } = renderHook(() => useBottomSheet());
    act(() => {
      result.current.dragHandleProps.onTouchStart({
        touches: [{ clientY: 300 }],
      } as unknown as React.TouchEvent);
    });
    act(() => {
      result.current.dragHandleProps.onTouchMove({
        touches: [{ clientY: 200 }],
      } as unknown as React.TouchEvent);
    });
    expect(result.current.translateY).toBe(0);
  });
});
