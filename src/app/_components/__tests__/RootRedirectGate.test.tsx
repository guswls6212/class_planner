/**
 * RootRedirectGate — 루트(`/`) 게이트 단위 테스트.
 *
 * `/` 는 모두의 랜딩. 자동 이동은 **로그인 직후**(sessionStorage `cp_just_logged_in`) 또는
 * pending invite 일 때만. 재방문 로그인 사용자(마커만 있음)는 이동하지 않고 "내 시간표로 가기"
 * 바로가기만 노출한다(ADR-025 — 랜딩 접근성). next/navigation 은 안정 spy 로 로컬 모킹.
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RootRedirectGate from "../RootRedirectGate";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const getItem = window.localStorage.getItem as ReturnType<typeof vi.fn>;

describe("RootRedirectGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getItem.mockReturnValue(null); // 기본: 비로그인
    sessionStorage.clear();
  });

  afterEach(() => {
    getItem.mockReset();
    sessionStorage.clear();
  });

  it("비로그인 — 이동 안 함 + 바로가기 없음(null)", () => {
    const { container } = render(<RootRedirectGate />);
    expect(container.firstChild).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("로그인 직후(cp_just_logged_in + 마커) — /schedule 이동 + 신호 소비", () => {
    getItem.mockImplementation((k: string) =>
      k === "supabase_user_id" ? "user-123" : null
    );
    sessionStorage.setItem("cp_just_logged_in", "1");
    render(<RootRedirectGate />);
    expect(replace).toHaveBeenCalledWith("/schedule");
    expect(sessionStorage.getItem("cp_just_logged_in")).toBeNull(); // 1회성 소비
  });

  it("재방문 로그인(마커만, 신호 없음) — 이동 안 하고 '내 시간표로 가기' 노출", () => {
    getItem.mockImplementation((k: string) =>
      k === "supabase_user_id" ? "user-123" : null
    );
    const { getByText } = render(<RootRedirectGate />);
    expect(replace).not.toHaveBeenCalled();
    expect(getByText(/내 시간표로 가기/)).toBeInTheDocument();
  });

  it("pending_invite_token 우선 — invite 로 이동(로그인 직후보다 우선)", () => {
    getItem.mockImplementation((k: string) => {
      if (k === "pending_invite_token") return "tok-abc";
      if (k === "supabase_user_id") return "user-123";
      return null;
    });
    sessionStorage.setItem("cp_just_logged_in", "1");
    render(<RootRedirectGate />);
    expect(replace).toHaveBeenCalledWith("/invite/tok-abc");
    expect(replace).not.toHaveBeenCalledWith("/schedule");
  });
});
