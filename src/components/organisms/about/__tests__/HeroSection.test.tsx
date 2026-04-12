import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HeroSection from "../HeroSection";

describe("HeroSection", () => {
  it("renders the main heading", () => {
    render(<HeroSection />);
    expect(screen.getByText(/클래스 플래너 소개/)).toBeDefined();
  });

  it("renders the subtitle", () => {
    render(<HeroSection />);
    expect(screen.getByText(/교육을 더 쉽게/)).toBeDefined();
  });
});
