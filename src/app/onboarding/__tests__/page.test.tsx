/**
 * Onboarding page (ADR-019) 회귀 가드.
 *
 * 검증 포인트:
 *  - 역할 라디오 (owner/admin/member) 렌더되지 않음
 *  - "원장으로 등록됩니다" amber Crown 안내 박스 렌더
 *  - "원장으로 학원 만들기" CTA 버튼 텍스트
 *  - secondary "초대 받았어요" toggle → invite section 표시
 *  - 학원명 input + submit → /api/onboarding POST (body에 role 없음)
 *  - 초대 코드 입력 + URL 형태 → token 추출 후 /invite/<token> redirect
 *
 * 격리: setupTests.ts 의 글로벌 useRouter mock + afterEach(vi.clearAllMocks).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "../page";

// useRouter 인스턴스 캡처를 위한 spy
const pushSpy = vi.fn();
const replaceSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
    replace: replaceSpy,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// AuthContext: 로그인된 session 제공
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({
    session: {
      user: {
        id: "test-user-id",
        email: "tester@example.com",
        user_metadata: { full_name: "테스터" },
      },
    },
    loading: false,
  }),
}));

vi.mock("../../../lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// fetch mock — URL 기반 분기 (useEffect deps 변경으로 인한 재호출에도 안정).
// useAuth mock 의 session 객체가 매 render 마다 새 reference 반환되어 effect deps
// 가 매번 다르게 인식되므로 mockResolvedValueOnce 큐 패턴은 불안정.
let fetchSpy: ReturnType<typeof vi.fn>;

async function renderPageReady() {
  const view = render(<OnboardingPage />);
  // isChecking → false 까지 (effect의 fetch resolve) 대기
  await screen.findByLabelText("학원명");
  return view;
}

describe("OnboardingPage — ADR-019 회귀 가드", () => {
  beforeEach(() => {
    pushSpy.mockReset();
    replaceSpy.mockReset();
    fetchSpy = vi.fn().mockImplementation(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("/api/onboarding/status")) {
        return {
          ok: true,
          json: async () => ({ success: true, hasAcademy: false }),
        };
      }
      if (u.includes("/api/onboarding")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            academyId: "academy-id",
            isNew: true,
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  it("역할 라디오 (owner/admin/member) 가 렌더되지 않아야 한다", async () => {
    await renderPageReady();

    // 이전 fieldset legend "역할" 검증 — 사라진 게 정상
    expect(screen.queryByText("역할")).toBeNull();
    expect(screen.queryByRole("radio", { name: /원장/ })).toBeNull();
    expect(screen.queryByRole("radio", { name: /관리자/ })).toBeNull();
    expect(screen.queryByRole("radio", { name: /강사/ })).toBeNull();
  });

  it("원장 자동 안내 박스 (role='note') 가 표시되어야 한다", async () => {
    await renderPageReady();

    const note = screen.getByRole("note", { name: /원장 자동 등록 안내/ });
    expect(note).toBeInTheDocument();
    expect(note.textContent).toContain("원장으로 등록됩니다");
  });

  it("CTA 버튼 텍스트는 '원장으로 학원 만들기' 이어야 한다", async () => {
    await renderPageReady();

    expect(
      screen.getByRole("button", { name: "원장으로 학원 만들기" }),
    ).toBeInTheDocument();
  });

  it("학원명 input + submit 시 /api/onboarding POST 본문에 role 키가 없어야 한다", async () => {
    await renderPageReady();

    fireEvent.change(screen.getByLabelText("학원명"), {
      target: { value: "테스트학원" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "원장으로 학원 만들기" }),
    );

    // onboarding POST 호출 (URL 에 /api/onboarding 포함 + /status 미포함) 까지 대기.
    // useAuth mock session 객체가 매 render 새 reference 라 status fetch 가 여러
    // 번 발생할 수 있어 횟수 기반 검증 대신 specific call 을 find 한다.
    let postCall: unknown[] | undefined;
    await vi.waitFor(() => {
      postCall = fetchSpy.mock.calls.find((c) => {
        const u = String(c[0]);
        return u.includes("/api/onboarding") && !u.includes("/status");
      });
      expect(postCall).toBeDefined();
    });

    const [url, init] = postCall as [string, RequestInit];
    expect(url).toContain("/api/onboarding");
    const body = JSON.parse(init.body as string);
    expect(body.academyName).toBe("테스트학원");
    expect(body).not.toHaveProperty("role"); // ADR-019: client는 role 안 보냄
  });

  it("'초대 받았어요' toggle 클릭 시 invite section 이 표시되어야 한다", async () => {
    await renderPageReady();

    const toggle = screen.getByTestId("invite-toggle");
    expect(toggle).toBeInTheDocument();
    expect(screen.queryByTestId("invite-section")).toBeNull();

    fireEvent.click(toggle);

    expect(screen.getByTestId("invite-section")).toBeInTheDocument();
    expect(screen.getByLabelText("초대 코드")).toBeInTheDocument();
  });

  it("초대 코드 입력 후 '초대 확인' 시 /invite/<token> 으로 push 되어야 한다", async () => {
    await renderPageReady();

    fireEvent.click(screen.getByTestId("invite-toggle"));
    fireEvent.change(screen.getByLabelText("초대 코드"), {
      target: { value: "abc-token-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초대 확인" }));

    expect(pushSpy).toHaveBeenCalledWith("/invite/abc-token-123");
  });

  it("URL 형태 입력 시 path 의 token 만 추출되어 redirect", async () => {
    await renderPageReady();

    fireEvent.click(screen.getByTestId("invite-toggle"));
    fireEvent.change(screen.getByLabelText("초대 코드"), {
      target: { value: "https://example.com/invite/xyz-789?ref=email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "초대 확인" }));

    expect(pushSpy).toHaveBeenCalledWith("/invite/xyz-789");
  });

  it("'닫기' 클릭 시 invite section 이 숨겨지고 toggle 복귀", async () => {
    await renderPageReady();

    fireEvent.click(screen.getByTestId("invite-toggle"));
    expect(screen.getByTestId("invite-section")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByTestId("invite-section")).toBeNull();
    expect(screen.getByTestId("invite-toggle")).toBeInTheDocument();
  });
});
