import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudentAccessCodeBadge } from "../StudentAccessCodeBadge";
import type { AccessCodeEntry } from "@/hooks/useAccessCodes";

const NOW = new Date("2026-05-03T12:00:00Z").getTime();

function makeCode(daysOffset: number): AccessCodeEntry {
  return {
    id: "tok-1",
    label: "테스트",
    filter_student_id: "stu-1",
    access_code: "ABC123",
    expires_at: new Date(NOW + daysOffset * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe("StudentAccessCodeBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("inline variant (default)", () => {
    it("코드 텍스트를 표시한다", () => {
      render(<StudentAccessCodeBadge code={makeCode(180)} />);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
    });

    it("정상 만료(8일 이상): amber 색상", () => {
      render(<StudentAccessCodeBadge code={makeCode(180)} />);
      const el = screen.getByText("ABC123");
      expect(el.className).toMatch(/text-amber-400/);
      expect(el.title).toBe("180일 남음");
    });

    it("만료 임박(1-7일): orange 색상", () => {
      render(<StudentAccessCodeBadge code={makeCode(3)} />);
      const el = screen.getByText("ABC123");
      expect(el.className).toMatch(/text-orange-400/);
      expect(el.title).toBe("3일 남음");
    });

    it("만료(0일 이하): red 색상 + '만료됨' title", () => {
      render(<StudentAccessCodeBadge code={makeCode(-1)} />);
      const el = screen.getByText("ABC123");
      expect(el.className).toMatch(/text-red-500/);
      expect(el.title).toBe("만료됨");
    });
  });

  describe("large variant", () => {
    it("코드 + D-{days} 표기", () => {
      render(<StudentAccessCodeBadge code={makeCode(180)} variant="large" />);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText("D-180")).toBeInTheDocument();
    });

    it("만료 시 '만료됨' 라벨", () => {
      render(<StudentAccessCodeBadge code={makeCode(0)} variant="large" />);
      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText("만료됨")).toBeInTheDocument();
    });
  });
});
