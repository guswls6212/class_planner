import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});
const mockSignOut = vi.fn().mockResolvedValue({});

vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      onAuthStateChange: (cb: (event: string, session: null) => void) => {
        mockOnAuthStateChange(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../../../lib/localStorageCrud", () => ({
  clearUserClassPlannerData: vi.fn(),
}));

import { AccountMenu } from "../AccountMenu";

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("비로그인 상태에서 로그인 링크를 렌더한다", async () => {
    render(<AccountMenu />);
    await waitFor(() => {
      expect(screen.getByText("로그인")).toBeDefined();
    });
  });

  it("compact=true 비로그인 상태에서 아무것도 렌더하지 않는다", async () => {
    const { container } = render(<AccountMenu compact />);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it("로그인 상태에서 아바타 버튼을 렌더한다", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: { full_name: "테스트", avatar_url: "" },
        },
      },
    });
    render(<AccountMenu />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "계정 메뉴" })).toBeDefined();
    });
  });

  it("아바타 클릭 시 드롭다운에 이메일과 로그아웃 버튼이 표시된다", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: {},
        },
      },
    });
    render(<AccountMenu />);
    await waitFor(() => screen.getByRole("button", { name: "계정 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    expect(screen.getByText("test@example.com")).toBeDefined();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
  });

  it("compact=false(기본) 드롭다운은 data-anchor='bottom'", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: {},
        },
      },
    });
    render(<AccountMenu compact={false} />);
    await waitFor(() => screen.getByRole("button", { name: "계정 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    const dropdown = screen.getByTestId("account-menu-dropdown");
    expect(dropdown.getAttribute("data-anchor")).toBe("bottom");
  });

  it("compact=true 드롭다운은 data-anchor='left'", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "u1",
          email: "test@example.com",
          user_metadata: {},
        },
      },
    });
    render(<AccountMenu compact />);
    await waitFor(() => screen.getByRole("button", { name: "계정 메뉴" }));
    fireEvent.click(screen.getByRole("button", { name: "계정 메뉴" }));
    const dropdown = screen.getByTestId("account-menu-dropdown");
    expect(dropdown.getAttribute("data-anchor")).toBe("left");
  });
});
