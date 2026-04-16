/**
 * Landing Page 테스트 (Phase 3 리라이트)
 * 참고: setupTests.ts에서 localStorage, next/navigation, next/link를 글로벌 모킹
 *   - localStorage.getItem은 vi.fn() → 기본 undefined 반환 (비로그인 상태)
 *   - useRouter는 vi.fn() → { push, replace, ... } 반환
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "../page";

describe("Landing Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: localStorage.getItem은 undefined 반환 → 비로그인 상태
  });

  it("에러 없이 렌더링되어야 한다", () => {
    expect(() => {
      render(<LandingPage />);
    }).not.toThrow();
  });

  it("HeroSection이 렌더링되어야 한다", () => {
    render(<LandingPage />);

    expect(screen.getByText("무료 시간표 관리 도구")).toBeInTheDocument();
    expect(screen.getByText(/5분이면 충분합니다/)).toBeInTheDocument();
  });

  it("메인 CTA '무료로 시작하기' 링크가 있어야 한다", () => {
    render(<LandingPage />);

    const ctaLinks = screen.getAllByText("무료로 시작하기");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("'자세히 보기' 링크가 #how-it-works를 가리켜야 한다", () => {
    render(<LandingPage />);

    const anchor = screen.getByText(/자세히 보기/);
    expect(anchor).toBeInTheDocument();
    expect(anchor.getAttribute("href")).toBe("#how-it-works");
  });

  it("StepsSection이 렌더링되어야 한다", () => {
    render(<LandingPage />);

    expect(screen.getByText("이렇게 만들어집니다")).toBeInTheDocument();
    expect(screen.getByText("3단계면 시간표 완성")).toBeInTheDocument();
    expect(screen.getByText("학생·과목 등록")).toBeInTheDocument();
    expect(screen.getByText("시간표에 배치")).toBeInTheDocument();
    expect(screen.getByText("PDF로 출력")).toBeInTheDocument();
  });

  it("BottomCTA가 렌더링되어야 한다", () => {
    render(<LandingPage />);

    expect(screen.getByText("지금 바로 시작하세요")).toBeInTheDocument();
    expect(
      screen.getByText("회원가입 없이 바로 사용할 수 있습니다. 무료.")
    ).toBeInTheDocument();
  });

  it("ScheduleMockup에 aria-hidden 컨테이너가 있어야 한다", () => {
    const { container } = render(<LandingPage />);

    const mockup = container.querySelector("[aria-hidden='true']");
    expect(mockup).toBeInTheDocument();
  });

  it("로그인 시 랜딩 콘텐츠 대신 null을 렌더링해야 한다", () => {
    // localStorage.getItem이 supabase_user_id에 대해 truthy 값을 반환하도록 설정
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      "test-user-id"
    );

    const { container } = render(<LandingPage />);

    // null 렌더링 시 랜딩 콘텐츠가 없어야 함
    expect(container.querySelector("#how-it-works")).toBeNull();
    expect(
      screen.queryByText("무료 시간표 관리 도구")
    ).not.toBeInTheDocument();
  });
});
