/**
 * Landing Page 테스트 (SEO/AEO 리라이트 — 메인 도메인 통합)
 *
 * 루트(`/`)는 server component 로 마케팅 콘텐츠를 SSR 렌더하고, 로그인 리다이렉트는
 * RootRedirectGate(client)로 분리됐다. 따라서:
 *   - 이 파일은 정적 콘텐츠 + SEO 메타데이터 + JSON-LD 를 검증한다.
 *   - 로그인→리다이렉트 동작은 RootRedirectGate.test.tsx 가 담당한다.
 *
 * 참고: setupTests.ts 가 next/navigation, localStorage 를 글로벌 모킹(비로그인 기본).
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LandingPage, { metadata } from "../page";

describe("Landing Page — SEO 메타데이터", () => {
  it("공부방 키워드 중심 title/description 을 노출한다", () => {
    expect(String(metadata.title)).toContain("공부방");
    expect(String(metadata.description)).toContain("엑셀");
    expect(metadata.keywords).toContain("공부방 시간표");
  });

  it("canonical 을 루트(/)로 지정한다", () => {
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it("OpenGraph/Twitter 공유 카드 메타가 있다", () => {
    expect(metadata.openGraph?.title).toContain("엑셀");
    // @ts-expect-error twitter.card 는 union 이라 좁히지 않고 존재만 확인
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });
});

describe("Landing Page — 콘텐츠 렌더", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 기본: localStorage.getItem 은 undefined → 비로그인
  });

  it("에러 없이 렌더링되어야 한다", () => {
    expect(() => render(<LandingPage />)).not.toThrow();
  });

  it("HeroSection(공부방 톤 헤드라인)이 렌더링되어야 한다", () => {
    render(<LandingPage />);
    expect(screen.getByText("공부방·교습소·1인 학원 시간표")).toBeInTheDocument();
    expect(screen.getByText(/엑셀로 두 번 고치지 마세요/)).toBeInTheDocument();
  });

  it("메인 CTA '무료로 시작하기' 링크가 있어야 한다", () => {
    render(<LandingPage />);
    const ctaLinks = screen.getAllByText("무료로 시작하기");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("'자세히 보기' 링크가 #how-it-works를 가리켜야 한다", () => {
    render(<LandingPage />);
    const anchor = screen.getByText(/자세히 보기/);
    expect(anchor.getAttribute("href")).toBe("#how-it-works");
  });

  it("StepsSection이 렌더링되어야 한다", () => {
    render(<LandingPage />);
    expect(screen.getByText("이렇게 만들어집니다")).toBeInTheDocument();
    expect(screen.getByText("등록부터 학부모 공유까지, 4단계")).toBeInTheDocument();
    expect(screen.getByText("학생·과목 등록")).toBeInTheDocument();
    expect(screen.getByText("시간표에 배치")).toBeInTheDocument();
    expect(screen.getByText("PDF로 출력")).toBeInTheDocument();
    expect(screen.getByText("학부모에게 공유")).toBeInTheDocument();
  });

  it("FaqSection(AEO 콘텐츠)이 렌더링되어야 한다", () => {
    render(<LandingPage />);
    expect(screen.getByText("자주 묻는 질문")).toBeInTheDocument();
    expect(screen.getByText("공부방·교습소에서 써도 되나요?")).toBeInTheDocument();
  });

  it("BottomCTA가 렌더링되어야 한다", () => {
    render(<LandingPage />);
    expect(screen.getByText("지금 바로 시작하세요")).toBeInTheDocument();
    expect(
      screen.getByText("회원가입 없이 바로 사용할 수 있습니다.")
    ).toBeInTheDocument();
  });

  it("HeroSection에 SchedulePreview 그리드가 있어야 한다", () => {
    const { container } = render(<LandingPage />);
    expect(
      container.querySelector('[data-testid="schedule-preview"]')
    ).toBeInTheDocument();
  });
});

describe("Landing Page — JSON-LD 구조화 데이터(AEO)", () => {
  it("SoftwareApplication·FAQPage·Organization 3종을 서버 렌더한다", () => {
    const { container } = render(<LandingPage />);
    const scripts = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]')
    );
    expect(scripts.length).toBe(3);

    const types = scripts
      .map((s) => JSON.parse(s.textContent ?? "{}")["@type"])
      .sort();
    expect(types).toEqual(["FAQPage", "Organization", "SoftwareApplication"]);
  });

  it("FAQPage 마크업이 화면 FAQ 와 같은 5문항을 담는다", () => {
    const { container } = render(<LandingPage />);
    const faqScript = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]')
    )
      .map((s) => JSON.parse(s.textContent ?? "{}"))
      .find((j) => j["@type"] === "FAQPage");
    expect(faqScript?.mainEntity).toHaveLength(5);
    expect(faqScript?.mainEntity[0]).toMatchObject({ "@type": "Question" });
  });
});
