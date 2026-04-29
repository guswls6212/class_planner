import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "user-1" } } },
      }),
    },
  },
}));

global.fetch = vi.fn();

describe("Settings Page", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("페이지 제목이 렌더된다 (hasAcademy:true)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], hasAcademy: true }),
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("학원 설정")).toBeInTheDocument();
    });
  });

  it("학원이 없는 사용자에게 '학원 만들기' CTA를 표시한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [], hasAcademy: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("아직 등록된 학원이 없습니다.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "학원 만들기" })).toBeInTheDocument();
    });
  });

  it("초대하기 버튼이 존재한다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ userId: "user-1", role: "owner", email: "test@test.com", name: "테스트", joinedAt: "2026-04-01" }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("+ 초대하기")).toBeInTheDocument();
    });
  });
});
