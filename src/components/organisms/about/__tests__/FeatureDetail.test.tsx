import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FeatureDetail from "../FeatureDetail";

describe("FeatureDetail", () => {
  it("renders student feature detail", () => {
    render(<FeatureDetail selectedFeature="student" onClose={vi.fn()} />);
    expect(screen.getByText("학생 관리 상세")).toBeDefined();
  });

  it("renders subject feature detail", () => {
    render(<FeatureDetail selectedFeature="subject" onClose={vi.fn()} />);
    expect(screen.getByText("과목 관리 상세")).toBeDefined();
  });

  it("renders schedule feature detail", () => {
    render(<FeatureDetail selectedFeature="schedule" onClose={vi.fn()} />);
    expect(screen.getByText("시간표 관리 상세")).toBeDefined();
  });

  it("renders sync feature detail", () => {
    render(<FeatureDetail selectedFeature="sync" onClose={vi.fn()} />);
    expect(screen.getByText("데이터 동기화 상세")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<FeatureDetail selectedFeature="student" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("닫기"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
