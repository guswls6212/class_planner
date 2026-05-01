import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PdfGuideModal from "../PdfGuideModal";

describe("PdfGuideModal", () => {
  it("isOpen=false 시 아무것도 렌더하지 않는다", () => {
    const { container } = render(<PdfGuideModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("isOpen=true 시 PDF 출력 가이드 제목이 보인다", () => {
    render(<PdfGuideModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/PDF 출력 가이드/)).toBeInTheDocument();
  });

  it("한계 정보 표 내 'lane 4 이상'과 관련된 안내 문구가 있다", () => {
    render(<PdfGuideModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText(/동시간 4건 이상/).length).toBeGreaterThanOrEqual(1);
  });

  it("닫기 버튼 클릭 시 onClose가 호출된다", () => {
    const onClose = vi.fn();
    render(<PdfGuideModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /닫기/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
