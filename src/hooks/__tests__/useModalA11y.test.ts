import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useModalA11y } from "../useModalA11y";

describe("useModalA11y", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("isOpen=false일 때 에러 없이 렌더된다", () => {
    expect(() => {
      renderHook(() => useModalA11y({ isOpen: false, onClose: vi.fn() }));
    }).not.toThrow();
  });

  it("isOpen=false일 때 containerRef를 반환한다", () => {
    const { result } = renderHook(() =>
      useModalA11y({ isOpen: false, onClose: vi.fn() })
    );
    expect(result.current.containerRef).toBeDefined();
  });

  it("Escape 키 입력 시 onClose를 호출한다", () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y({ isOpen: true, onClose }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isOpen=false일 때 Escape 키 입력 시 onClose를 호출하지 않는다", () => {
    const onClose = vi.fn();
    renderHook(() => useModalA11y({ isOpen: false, onClose }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("Tab 키: 마지막 포커서블 요소에서 첫 번째로 포커스를 감싼다", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModalA11y({ isOpen: true, onClose }));

    // Create a container with two buttons
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "첫 번째";
    const btn2 = document.createElement("button");
    btn2.textContent = "두 번째";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    // Attach the ref
    Object.defineProperty(result.current.containerRef, "current", {
      value: container,
      writable: true,
    });

    // Focus the last element
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Tab from last element should wrap to first
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
      );
    });

    expect(document.activeElement).toBe(btn1);

    document.body.removeChild(container);
  });

  it("Shift+Tab 키: 첫 번째 포커서블 요소에서 마지막으로 포커스를 감싼다", () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModalA11y({ isOpen: true, onClose }));

    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "첫 번째";
    const btn2 = document.createElement("button");
    btn2.textContent = "두 번째";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    Object.defineProperty(result.current.containerRef, "current", {
      value: container,
      writable: true,
    });

    // Focus the first element
    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Shift+Tab from first element should wrap to last
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(document.activeElement).toBe(btn2);

    document.body.removeChild(container);
  });

  it("모달 닫힐 때 이전에 포커스된 요소로 포커스를 복원한다", () => {
    const onClose = vi.fn();
    const triggerBtn = document.createElement("button");
    triggerBtn.textContent = "트리거";
    document.body.appendChild(triggerBtn);
    triggerBtn.focus();
    expect(document.activeElement).toBe(triggerBtn);

    const { unmount } = renderHook(() =>
      useModalA11y({ isOpen: true, onClose })
    );

    act(() => {
      vi.runAllTimers();
    });

    // Unmount (simulates modal close)
    unmount();

    expect(document.activeElement).toBe(triggerBtn);

    document.body.removeChild(triggerBtn);
  });
});
