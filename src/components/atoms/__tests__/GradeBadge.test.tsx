import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GradeBadge } from "../GradeBadge";

describe("GradeBadge", () => {
  it("grade 값이 있으면 텍스트를 렌더한다", () => {
    render(<GradeBadge grade="고1" />);
    expect(screen.getByText("고1")).toBeInTheDocument();
  });

  it("grade 가 falsy 이면 아무것도 렌더하지 않는다", () => {
    const { container: nullCase } = render(<GradeBadge grade={null} />);
    expect(nullCase.firstChild).toBeNull();

    const { container: undefCase } = render(<GradeBadge grade={undefined} />);
    expect(undefCase.firstChild).toBeNull();

    const { container: emptyCase } = render(<GradeBadge grade="" />);
    expect(emptyCase.firstChild).toBeNull();
  });

  it("testIdSuffix 가 있으면 student-grade-chip-{suffix} 컨벤션으로 data-testid 부여", () => {
    render(<GradeBadge grade="중2" testIdSuffix="abc-123" />);
    expect(screen.getByTestId("student-grade-chip-abc-123")).toHaveTextContent("중2");
  });

  it("testIdSuffix 미제공 시 grade-badge data-testid 부여", () => {
    render(<GradeBadge grade="초5" />);
    expect(screen.getByTestId("grade-badge")).toHaveTextContent("초5");
  });

  it("amber 토큰 + 컴팩트 스타일 보존 (StudentsPageLayout 베이스라인 동일)", () => {
    render(<GradeBadge grade="고3" testIdSuffix="x" />);
    const badge = screen.getByTestId("student-grade-chip-x");
    expect(badge.className).toMatch(/bg-amber-500\/15/);
    expect(badge.className).toMatch(/text-amber-400/);
    expect(badge.className).toMatch(/text-\[10px\]/);
  });
});
