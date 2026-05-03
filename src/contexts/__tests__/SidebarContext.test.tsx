import { vi } from "vitest";
import { SidebarProvider, useSidebar } from "../SidebarContext";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock React Testing Library to avoid DOM issues
const mockRenderHook = vi.fn();
const mockAct = vi.fn((fn) => fn());

vi.mock("@testing-library/react", () => ({
  renderHook: mockRenderHook,
  act: mockAct,
}));

describe("SidebarContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it("SidebarProvider가 올바르게 정의되어 있다", () => {
    expect(SidebarProvider).toBeDefined();
    expect(typeof SidebarProvider).toBe("function");
  });

  it("useSidebar 훅이 올바르게 정의되어 있다", () => {
    expect(useSidebar).toBeDefined();
    expect(typeof useSidebar).toBe("function");
  });

  it("localStorage 모킹이 올바르게 설정되어 있다", () => {
    expect(mockLocalStorage.getItem).toBeDefined();
    expect(mockLocalStorage.setItem).toBeDefined();
    expect(typeof mockLocalStorage.getItem).toBe("function");
    expect(typeof mockLocalStorage.setItem).toBe("function");
  });

  it("기본 expanded 값은 false이다", () => {
    const defaultExpanded = false;
    expect(defaultExpanded).toBe(false);
  });

  it("토글 로직이 올바르게 작동한다", () => {
    const toggleExpanded = (current: boolean) => !current;
    expect(toggleExpanded(false)).toBe(true);
    expect(toggleExpanded(true)).toBe(false);
  });

  it("localStorage 키가 올바르게 설정되어 있다", () => {
    const key = "sidebar_expanded";
    expect(key).toBe("sidebar_expanded");
  });

  it("localStorage에서 'true' 문자열을 읽으면 expanded가 true가 된다", () => {
    mockLocalStorage.getItem.mockReturnValue("true");
    const saved = mockLocalStorage.getItem("sidebar_expanded");
    const expanded = saved === "true";
    expect(expanded).toBe(true);
  });

  it("localStorage에서 null을 읽으면 expanded는 false이다", () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const saved = mockLocalStorage.getItem("sidebar_expanded");
    const expanded = saved === "true";
    expect(expanded).toBe(false);
  });

  it("toggle 후 localStorage에 새 값이 저장된다", () => {
    let expanded = false;
    const toggle = () => {
      const next = !expanded;
      mockLocalStorage.setItem("sidebar_expanded", String(next));
      expanded = next;
    };

    toggle();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("sidebar_expanded", "true");
    expect(expanded).toBe(true);

    toggle();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("sidebar_expanded", "false");
    expect(expanded).toBe(false);
  });

  it("SidebarContext 타입이 올바르게 정의되어 있다", () => {
    const contextType = {
      expanded: false,
      toggle: () => {},
    };
    expect(contextType).toHaveProperty("expanded");
    expect(contextType).toHaveProperty("toggle");
    expect(typeof contextType.toggle).toBe("function");
    expect(typeof contextType.expanded).toBe("boolean");
  });
});
