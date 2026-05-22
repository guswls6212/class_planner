/**
 * PDFDownloadButton 테스트 (단순 버튼, UAT 2026-05-22 dropdown 제거 후).
 *
 * 핵심 검증:
 * 1. 초기 렌더 — toggle 없는 단일 button + 'PDF' 라벨
 * 2. 클릭 → onDownload 호출
 * 3. isDownloading=true → button 비활성 + '다운로드 중...' 라벨
 * 4. viewLabel prop 반영 — aria-label
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PDFDownloadButton from "../PDFDownloadButton";

describe("PDFDownloadButton (단순 버튼)", () => {
  it("초기 렌더 — 단일 button + 'PDF' 라벨", () => {
    render(<PDFDownloadButton onDownload={vi.fn()} isDownloading={false} />);
    const btn = screen.getByRole("button", { name: /시간표 PDF/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  it("클릭 → onDownload 호출", () => {
    const onDownload = vi.fn();
    render(<PDFDownloadButton onDownload={onDownload} isDownloading={false} />);
    fireEvent.click(screen.getByRole("button", { name: /시간표 PDF/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("isDownloading=true → button 비활성 + '다운로드 중...' 라벨", () => {
    render(<PDFDownloadButton onDownload={vi.fn()} isDownloading={true} />);
    const btn = screen.getByRole("button", { name: /시간표 PDF/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText("다운로드 중...")).toBeInTheDocument();
  });

  it("viewLabel prop 반영 — aria-label", () => {
    render(
      <PDFDownloadButton
        onDownload={vi.fn()}
        isDownloading={false}
        viewLabel="주간"
      />,
    );
    expect(screen.getByRole("button", { name: /주간 PDF/i })).toBeInTheDocument();
  });
});
