import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    user: { id: "user-1" },
    loading: false,
  }),
}));

global.fetch = vi.fn();

describe("Settings Page", () => {
  // setupTests localStorage = backing store 없는 vi.fn mock → getItem 으로 dev 플래그 제어.
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(localStorage.getItem).mockReturnValue(null); });

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

  it("멤버 초대(팀 섹션)는 기본 숨김 — features.ts gated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            hasAcademy: true,
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
      expect(screen.getByText("학원 설정")).toBeInTheDocument();
    });
    // Phase 2: 팀(멤버 초대)/공유 섹션은 features.ts 로 기본 숨김 (개발자 ?dev=1 시 표시)
    expect(screen.queryByText(/멤버 초대/)).not.toBeInTheDocument();
  });

  it("slug 섹션은 owner에게만 표시된다", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => (k === "cp:show-hidden" ? "1" : null)); // 학부모 URL(parentAccessCodes) 기본 숨김 — dev 모드에서 owner 노출 검증
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            hasAcademy: true,
            academyName: "테스트 학원",
            academyId: "acad-1",
            academySlug: "test-slug",
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
      expect(screen.getByText("학부모 접속 URL")).toBeInTheDocument();
    });
  });

  it("slug 섹션은 admin에게 표시되지 않는다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/api/members")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            hasAcademy: true,
            academyName: "테스트 학원",
            academyId: "acad-1",
            academySlug: "test-slug",
            data: [{ userId: "user-1", role: "admin", email: "test@test.com", name: "테스트", joinedAt: "2026-04-01" }],
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
      expect(screen.queryByText("학부모 접속 URL")).not.toBeInTheDocument();
    });
  });

  it("'튜토리얼 다시 보기' 카드가 로그인 사용자에게 렌더된다 (rank 5-A)", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => (k === "cp:show-hidden" ? "1" : null)); // 튜토리얼은 기본 숨김 — dev 모드에서 기능(카드) 검증
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], hasAcademy: true }),
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tutorial-restart-card")).toBeInTheDocument();
    });
    expect(screen.getByTestId("tutorial-restart-button")).toBeInTheDocument();
  });

  it("'다시 보기' 버튼 click 시 class-planner:start-tour custom event 발화", async () => {
    vi.mocked(localStorage.getItem).mockImplementation((k: string) => (k === "cp:show-hidden" ? "1" : null)); // 튜토리얼은 기본 숨김 — dev 모드에서 '다시 보기' 버튼 동작 검증
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], hasAcademy: true }),
    });

    const listener = vi.fn();
    window.addEventListener("class-planner:start-tour", listener);

    const { default: SettingsPage } = await import("../page");
    const { fireEvent } = await import("@testing-library/react");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tutorial-restart-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("tutorial-restart-button"));
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("class-planner:start-tour", listener);
  });

  it("튜토리얼 카드는 기본 숨김 — tutorial features.ts gated (공부방 단독 배포)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], hasAcademy: true }),
    });

    const { default: SettingsPage } = await import("../page");
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("학원 설정")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("tutorial-restart-card")).not.toBeInTheDocument();
  });
});
