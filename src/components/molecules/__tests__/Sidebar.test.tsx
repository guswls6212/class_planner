import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock useMyRole — controls academies + role state
const mockUseMyRole = vi.fn();
vi.mock("@/hooks/useMyRole", () => ({
  useMyRole: () => mockUseMyRole(),
}));

// Mock supabase (UserSection calls getUser; Sidebar isLoggedIn calls getSession + onAuthStateChange)
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Mock signOut (used by UserSection)
vi.mock("../../../lib/auth/signOut", () => ({
  signOut: vi.fn(),
}));

// Mock localStorageCrud (dynamic import inside the component)
const mockGetActiveAcademyId = vi.fn();
const mockSetActiveAcademyIdLib = vi.fn();
vi.mock("@/lib/localStorageCrud", () => ({
  getActiveAcademyId: (userId: string) => mockGetActiveAcademyId(userId),
  setActiveAcademyId: (userId: string, academyId: string) =>
    mockSetActiveAcademyIdLib(userId, academyId),
}));

// Mock fetch (set-active-academy)
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: mockReload, href: "http://localhost/" },
  writable: true,
});

import { Sidebar } from "../Sidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";

const renderSidebar = () =>
  render(
    <SidebarProvider>
      <Sidebar />
    </SidebarProvider>
  );

const ACADEMIES_MULTI = [
  { id: "ac-1", name: "유빈학원", slug: "yubin", role: "owner" },
  { id: "ac-2", name: "수학영재학원", slug: "math", role: "admin" },
  { id: "ac-3", name: "과학탐구학원", slug: "sci", role: "member" },
];

describe("Sidebar — Academy Switcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveAcademyId.mockReturnValue("ac-1");
    mockSetActiveAcademyIdLib.mockReturnValue(undefined);
    // Provide a real localStorage backing for supabase_user_id so the
    // useEffect can resolve the active academy.
    window.localStorage.getItem = vi.fn((key: string) => {
      if (key === "supabase_user_id") return "user-test";
      return null;
    });
  });

  it("academies가 비어 있으면 'CP' 라벨로 폴백한다", () => {
    mockUseMyRole.mockReturnValue({
      role: null,
      isLoading: false,
      canManage: true,
      academies: [],
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    renderSidebar();
    const button = screen.getByRole("button", { name: "학원" });
    expect(button.textContent?.trim()).toBe("CP");
  });

  it("active academy 이름의 처음 두 글자를 표시한다", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      isLoading: false,
      canManage: true,
      academies: ACADEMIES_MULTI,
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    renderSidebar();
    // wait for useEffect dynamic import to resolve and set active academy id
    await waitFor(() => {
      expect(mockGetActiveAcademyId).toHaveBeenCalled();
    });
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "유빈학원" });
      expect(button.textContent?.trim()).toBe("유빈");
    });
  });

  it("스위처 버튼을 누르면 학원 목록 드롭다운이 표시된다", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      isLoading: false,
      canManage: true,
      academies: ACADEMIES_MULTI,
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "유빈학원" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "유빈학원" }));

    const dropdownHeader = screen.getByText("내 학원");
    const dropdown = dropdownHeader.parentElement!;
    expect(within(dropdown).getByText("유빈학원")).toBeInTheDocument();
    expect(within(dropdown).getByText("수학영재학원")).toBeInTheDocument();
    expect(within(dropdown).getByText("과학탐구학원")).toBeInTheDocument();
    // role labels (scope to dropdown — sidebar has its own /teachers nav with aria-label "강사")
    expect(within(dropdown).getByText("원장")).toBeInTheDocument();
    expect(within(dropdown).getByText("관리자")).toBeInTheDocument();
    expect(within(dropdown).getByText("강사")).toBeInTheDocument();
  });

  it("다른 학원을 클릭하면 set-active-academy를 호출하고 reload한다", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      isLoading: false,
      canManage: true,
      academies: ACADEMIES_MULTI,
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    mockFetch.mockResolvedValue({ ok: true });

    renderSidebar();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "유빈학원" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "유빈학원" }));

    // Click "수학영재학원" entry in the dropdown
    const item = screen.getByText("수학영재학원").closest("button");
    expect(item).not.toBeNull();
    fireEvent.click(item!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/set-active-academy",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "user-test", academyId: "ac-2" }),
        }),
      );
    });
    await waitFor(() => {
      expect(mockSetActiveAcademyIdLib).toHaveBeenCalledWith("user-test", "ac-2");
    });
    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("동일한 active 학원을 다시 클릭하면 reload하지 않는다", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      isLoading: false,
      canManage: true,
      academies: ACADEMIES_MULTI,
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "유빈학원" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "유빈학원" }));

    // ac-1 is the active one; clicking it should be a no-op for reload
    const items = screen.getAllByText("유빈학원");
    // First match is the dropdown item; second is the button label (or vice versa).
    // Clicking the dropdown item that matches active should NOT trigger reload.
    const activeItem = items.find((el) => el.closest("button")?.className.includes("bg-amber-500/10"));
    if (activeItem) {
      fireEvent.click(activeItem.closest("button")!);
    }

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("드롭다운 외부 mousedown 이벤트가 발생하면 드롭다운이 닫힌다", async () => {
    mockUseMyRole.mockReturnValue({
      role: "owner",
      isLoading: false,
      canManage: true,
      academies: ACADEMIES_MULTI,
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "유빈학원" })).toBeInTheDocument();
    });

    // Open the dropdown
    fireEvent.click(screen.getByRole("button", { name: "유빈학원" }));
    expect(screen.getByText("내 학원")).toBeInTheDocument();

    // Simulate a mousedown outside the switcher element
    fireEvent.mouseDown(document.body);

    // Dropdown should no longer be rendered
    await waitFor(() => {
      expect(screen.queryByText("내 학원")).not.toBeInTheDocument();
    });
  });
});
