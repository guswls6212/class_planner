import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation usePathname before importing AppShell
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock heavy children to keep tests fast and focused on AppShell shell logic
vi.mock("../../molecules/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar">SIDEBAR</div>,
}));
vi.mock("../../molecules/TopBar", () => ({
  TopBar: () => <div data-testid="topbar">TOPBAR</div>,
}));
vi.mock("../../molecules/BottomTabBar", () => ({
  BottomTabBar: () => <div data-testid="bottombar">BOTTOMBAR</div>,
}));
vi.mock("../../molecules/InlineTour", () => ({
  InlineTour: () => <div data-testid="inline-tour-mount">INLINE_TOUR</div>,
}));
vi.mock("../HelpDrawer", () => ({
  HelpDrawer: () => null,
}));

import { AppShell } from "../AppShell";

const renderShell = () =>
  render(
    <AppShell>
      <div data-testid="page-content">PAGE</div>
    </AppShell>,
  );

describe("AppShell — shell visibility per route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin 라우트(/schedule)에서는 사이드바를 렌더한다", () => {
    mockUsePathname.mockReturnValue("/schedule");
    renderShell();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("/ (home)에서는 shell 숨김", () => {
    mockUsePathname.mockReturnValue("/");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("topbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bottombar")).not.toBeInTheDocument();
  });

  it("/login 에서는 shell 숨김", () => {
    mockUsePathname.mockReturnValue("/login");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("/share/{token} (학부모 공유)에서는 shell 숨김", () => {
    mockUsePathname.mockReturnValue("/share/abc123");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("/invite/{token}에서는 shell 숨김", () => {
    mockUsePathname.mockReturnValue("/invite/xyz");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("/onboarding에서는 shell 숨김", () => {
    mockUsePathname.mockReturnValue("/onboarding");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("/academy/{slug} (학부모 접속 코드 입력) 에서는 shell 숨김 — 회귀 방지", () => {
    mockUsePathname.mockReturnValue("/academy/현진학원");
    renderShell();
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("topbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bottombar")).not.toBeInTheDocument();
    // 컨텐츠 자체는 렌더돼야 함
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("admin 라우트에서 InlineTour 가 mount 됨 (rank 5-A)", () => {
    mockUsePathname.mockReturnValue("/schedule");
    renderShell();
    expect(screen.getByTestId("inline-tour-mount")).toBeInTheDocument();
  });

  it("/ (home) 에서 InlineTour mount X (shell 자체 X)", () => {
    mockUsePathname.mockReturnValue("/");
    renderShell();
    expect(screen.queryByTestId("inline-tour-mount")).not.toBeInTheDocument();
  });
});
