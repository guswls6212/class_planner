import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock useMyRole — controls academies + role state
const mockUseMyRole = vi.fn();
vi.mock("@/hooks/useMyRole", () => ({
  useMyRole: () => mockUseMyRole(),
}));

// Mock supabase (UserSection calls getUser; Sidebar isLoggedIn calls getSession + onAuthStateChange)
// Default: logged-in session — academy switcher 가시성은 isLoggedIn에 종속.
// 비로그인 케이스는 mockResolvedValueOnce로 case별 override.
vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "user-test", email: "test@test.com" },
          },
        },
      }),
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
import { supabase } from "@/utils/supabaseClient";

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

  it("academies가 비어 있으면 'CP' 라벨로 폴백한다", async () => {
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
    // isLoggedIn 비동기 갱신(getSession Promise resolve) 대기
    const button = await screen.findByRole("button", { name: "학원" });
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

describe("Sidebar — Toggle Button (Supabase style)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMyRole.mockReturnValue({
      role: null,
      isLoading: false,
      canManage: true,
      academies: [],
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
    mockGetActiveAcademyId.mockReturnValue(null);
    window.localStorage.getItem = vi.fn(() => null);
    window.localStorage.setItem = vi.fn();
  });

  it("토글 버튼은 작은 정사각형(w-7 h-7)으로 렌더링된다", () => {
    renderSidebar();
    const toggleBtn = screen.getByRole("button", { name: "사이드바 펼치기" });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.className).toMatch(/\bw-7\b/);
    expect(toggleBtn.className).toMatch(/\bh-7\b/);
  });

  it("토글 버튼 클릭으로 사이드바가 펼쳐진다", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "사이드바 펼치기" }));
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "사이드바 접기" }),
      ).toBeInTheDocument();
    });
  });

  it("⌘+B 단축키로 사이드바를 토글한다", async () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "b", metaKey: true });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "사이드바 접기" }),
      ).toBeInTheDocument();
    });
  });

  it("Ctrl+B 단축키로도 사이드바를 토글한다 (대소문자 무관)", async () => {
    renderSidebar();
    expect(
      screen.getByRole("button", { name: "사이드바 펼치기" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "B", ctrlKey: true });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "사이드바 접기" }),
      ).toBeInTheDocument();
    });
  });
});

describe("Sidebar — User Bottom Section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    mockGetActiveAcademyId.mockReturnValue(null);
    // Start sidebar EXPANDED so UserBottomSection is rendered
    window.localStorage.getItem = vi.fn((key: string) => {
      if (key === "sidebar_expanded") return "true";
      return null;
    });
    window.localStorage.setItem = vi.fn();
    // Default: not logged in (each test overrides as needed)
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function mockLoggedInAs(email: string, role: "owner" | "admin" | "member") {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { email } },
    } as Awaited<ReturnType<typeof supabase.auth.getUser>>);
    mockUseMyRole.mockReturnValue({
      role,
      isLoading: false,
      canManage: role === "owner" || role === "admin",
      academies: [],
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });
  }

  it("로그인 + 펼친 상태에서 이메일이 사이드바 하단에 표시된다", async () => {
    mockLoggedInAs("owner@test.com", "owner");
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText("owner@test.com")).toBeInTheDocument();
    });
  });

  it("owner 역할이면 '원장' 라벨이 표시된다", async () => {
    mockLoggedInAs("owner@test.com", "owner");
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText("원장")).toBeInTheDocument();
    });
  });

  it("admin 역할이면 '관리자' 라벨이 표시된다", async () => {
    mockLoggedInAs("admin@test.com", "admin");
    renderSidebar();
    await waitFor(() => {
      expect(screen.getByText("관리자")).toBeInTheDocument();
    });
  });

  it("member 역할이면 '강사' 라벨이 표시된다 (nav 아이템 '강사'는 필터됨)", async () => {
    mockLoggedInAs("teacher@test.com", "member");
    renderSidebar();
    await waitFor(() => {
      // member는 adminOnly nav (학생/과목/강사) 필터됨 → "강사" 텍스트는 UserBottomSection에만 존재
      expect(screen.getByText("강사")).toBeInTheDocument();
    });
  });

  it("로그아웃 버튼이 사이드바 하단에 표시된다", async () => {
    mockLoggedInAs("owner@test.com", "owner");
    renderSidebar();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "로그아웃" }),
      ).toBeInTheDocument();
    });
  });

  it("로그인하지 않은 상태에서는 UserBottomSection이 렌더되지 않는다", async () => {
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
    // wait briefly to let getUser resolve and component re-render
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });

  it("사이드바가 접힌 상태에서는 UserBottomSection이 숨겨진다", async () => {
    // Override: collapsed sidebar
    window.localStorage.getItem = vi.fn(() => null);
    mockLoggedInAs("owner@test.com", "owner");
    renderSidebar();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("owner@test.com")).not.toBeInTheDocument();
    expect(screen.queryByText("원장")).not.toBeInTheDocument();
  });
});

describe("Sidebar — Anonymous Mode + Loading State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveAcademyId.mockReturnValue(null);
    window.localStorage.getItem = vi.fn(() => null);
  });

  it("비로그인 사용자는 academy switcher 영역이 미렌더된다", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);

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

    // isLoggedIn 비동기 갱신 대기
    await new Promise((resolve) => setTimeout(resolve, 50));

    // switcher 버튼(aria-label="학원" 또는 academy 이름)이 존재하지 않아야 함
    expect(
      screen.queryByRole("button", { name: "학원" })
    ).not.toBeInTheDocument();
  });

  it("로그인 + isLoading=true이면 dropdown에 '학원 정보를 불러오는 중...' 표시", async () => {
    mockUseMyRole.mockReturnValue({
      role: null,
      isLoading: true,
      canManage: true,
      academies: [],
      linkedTeacherId: null,
      linkedTeacherName: null,
      linkedTeacherColor: null,
    });

    renderSidebar();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "학원" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "학원" }));
    expect(screen.getByText("학원 정보를 불러오는 중...")).toBeInTheDocument();
  });

  it("로그인 + isLoading=false + academies=[]이면 dropdown에 '참여 중인 학원이 없어요' 표시", async () => {
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
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "학원" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "학원" }));
    expect(screen.getByText("참여 중인 학원이 없어요")).toBeInTheDocument();
  });
});
