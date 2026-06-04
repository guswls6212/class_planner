/**
 * RootRedirectGate — 루트(`/`)의 로그인 리다이렉트 게이트 단위 테스트.
 *
 * SSR 마케팅 콘텐츠와 분리된 client 게이트. 게이트는 DOM 을 그리지 않고(null) 로그인
 * 상태일 때만 router.replace 로 보낸다. next/navigation 은 안정 spy 로 로컬 모킹한다
 * (setupTests 의 글로벌 mock 은 매 호출 새 vi.fn 을 반환해 호출 검증이 어려움).
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
  });

  afterEach(() => {
    getItem.mockReset();
  });

  it("비로그인 시 리다이렉트하지 않고 null 을 렌더한다", () => {
    const { container } = render(<RootRedirectGate />);
    expect(container.firstChild).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("로그인(supabase_user_id) 시 /schedule 로 replace", () => {
    getItem.mockImplementation((key: string) =>
      key === "supabase_user_id" ? "user-123" : null
    );
    render(<RootRedirectGate />);
    expect(replace).toHaveBeenCalledWith("/schedule");
  });

  it("pending_invite_token 이 있으면 schedule 보다 invite 를 우선한다", () => {
    getItem.mockImplementation((key: string) => {
      if (key === "pending_invite_token") return "tok-abc";
      if (key === "supabase_user_id") return "user-123";
      return null;
    });
    render(<RootRedirectGate />);
    expect(replace).toHaveBeenCalledWith("/invite/tok-abc");
    expect(replace).not.toHaveBeenCalledWith("/schedule");
  });
});
