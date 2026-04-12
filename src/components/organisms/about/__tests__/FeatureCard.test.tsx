import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeatureCard from "../FeatureCard";

describe("FeatureCard", () => {
  const defaultProps = {
    emoji: "👥",
    title: "학생 관리",
    description: "학생 정보를 체계적으로 관리합니다.",
    featureKey: "student",
    onSelect: vi.fn(),
  };

  it("renders emoji, title, description", () => {
    render(<FeatureCard {...defaultProps} />);
    expect(screen.getByText("👥")).toBeDefined();
    expect(screen.getByText("학생 관리")).toBeDefined();
    expect(screen.getByText("학생 정보를 체계적으로 관리합니다.")).toBeDefined();
  });

  it("calls onSelect with featureKey on click", () => {
    const onSelect = vi.fn();
    render(<FeatureCard {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("학생 관리").closest("div")!);
    expect(onSelect).toHaveBeenCalledWith("student");
  });
});
