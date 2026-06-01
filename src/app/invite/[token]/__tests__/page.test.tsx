import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../../../utils/supabaseClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../../../../utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// 초대 플로우 자체를 검증 — features.ts 게이팅(teamInvites 숨김)은 mock 으로 우회
vi.mock("@/hooks/useHiddenRedirect", () => ({
  useHiddenRedirect: () => false,
}));

global.fetch = vi.fn();

const validInviteBody = {
  valid: true,
  academyName: "수학의 정석",
  role: "member",
  inviteEmail: "teacher@example.com",
  expiresAt: "2099-01-01",
};

function makeInviteRes(body = validInviteBody) {
  return { ok: true, json: async () => body };
}

function makeAcceptRes(body: object, ok = true) {
  return { ok, json: async () => body };
}

describe("Invite Accept Page", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
    // Re-set default no-session state and onAuthStateChange stub after clearing
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("유효한 초대 링크면 학원명과 역할을 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeInviteRes());

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "abc123" })} />);

    await waitFor(() => {
      expect(screen.getByText("수학의 정석")).toBeInTheDocument();
    });
  });

  it("만료된 초대면 에러 메시지를 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeInviteRes({ valid: false, reason: "expired" } as unknown as typeof validInviteBody)
    );

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "expired-token" })} />);

    await waitFor(() => {
      expect(screen.getByText(/만료/)).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────
  // State machine tests
  // ──────────────────────────────────────────────────────

  it("State A: 비로그인 상태면 Google 가입 버튼과 '링크만 받기' 버튼을 보여준다", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeInviteRes());

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "tok-a" })} />);

    await waitFor(() => {
      expect(screen.getByText(/Google로 가입하기/)).toBeInTheDocument();
      expect(screen.getByText(/시간표 보기 링크만 받기/)).toBeInTheDocument();
    });
  });

  it("State C: 로그인 이메일이 초대 이메일과 다르면 이메일 불일치 오류 배너를 보여준다", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { user: { id: "uid-1", email: "other@example.com" } },
      },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(makeInviteRes());

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "tok-c" })} />);

    await waitFor(() => {
      expect(screen.getByText(/다른 이메일로 로그인됨/)).toBeInTheDocument();
    });
    // Accept button must NOT be present in state-c
    expect(screen.queryByText("초대 수락")).not.toBeInTheDocument();
  });

  it("State B → State D: accept가 alreadyMember:true를 반환하면 '이미 멤버' 배너를 보여준다", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { user: { id: "uid-2", email: "teacher@example.com" } },
      },
    });

    // First call: invite check (no inviteEmail so no initial mismatch)
    // Second call: accept returns alreadyMember
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        makeInviteRes({ ...validInviteBody, inviteEmail: null as unknown as string })
      )
      .mockResolvedValueOnce(makeAcceptRes({ alreadyMember: true }));

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "tok-d" })} />);

    // Wait for state-b: accept button appears
    const acceptBtn = await screen.findByText("초대 수락");
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.getByText("이미 멤버입니다")).toBeInTheDocument();
    });
  });

  it("State B → State C: accept가 403 email_mismatch를 반환하면 이메일 불일치 화면으로 전환된다", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { user: { id: "uid-3", email: "teacher@example.com" } },
      },
    });

    // First call: invite check (no inviteEmail so state-b, no initial mismatch)
    // Second call: accept returns 403 email_mismatch
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        makeInviteRes({
          valid: true,
          academyName: "수학의 정석",
          role: "member",
          inviteEmail: null as unknown as string,
          expiresAt: "2099-01-01",
        })
      )
      .mockResolvedValueOnce(
        makeAcceptRes(
          { error_code: "email_mismatch", error: "이메일이 일치하지 않습니다." },
          false
        )
      );

    const { default: InvitePage } = await import("../page");
    render(<InvitePage params={Promise.resolve({ token: "tok-c2" })} />);

    const acceptBtn = await screen.findByText("초대 수락");
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.getByText(/다른 이메일로 로그인됨/)).toBeInTheDocument();
    });
    // After transitioning to state-c, the generic error banner must be cleared
    expect(
      screen.queryByText("이메일이 일치하지 않습니다.")
    ).not.toBeInTheDocument();
  });
});
