import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithOAuth: vi.fn(),
    },
  },
}));

global.fetch = vi.fn();

describe("Invite Accept Page", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("유효한 초대 링크면 학원명과 역할을 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        academyName: "수학의 정석",
        role: "admin",
        expiresAt: "2099-01-01",
      }),
    });

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "abc123" })} />);

    await waitFor(() => {
      expect(screen.getByText("수학의 정석")).toBeInTheDocument();
    });
  });

  it("만료된 초대면 에러 메시지를 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, reason: "expired" }),
    });

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "expired-token" })} />);

    await waitFor(() => {
      expect(screen.getByText(/만료/)).toBeInTheDocument();
    });
  });
});
