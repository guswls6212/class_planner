"use client";
import React from "react";
import { Download } from "lucide-react";
import { trackClick } from "@/lib/analytics/tracker";

interface PDFDownloadButtonProps {
  /** PDF 다운로드 → PdfExportRangeModal 열기 */
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  viewLabel?: string;
}

/**
 * PDF 다운로드 버튼 (단순 버튼).
 *
 * UAT 2026-05-22 사용자 보고: dropdown 단계 불필요 — 클릭 즉시 모달 진입.
 * 강사별/학생별 분할, 인쇄 대상 선택은 모두 모달 안에서 처리.
 */
const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  isDownloading,
  viewLabel = "시간표",
}) => {
  return (
    <button
      type="button"
      onClick={() => {
        trackClick("pdf_download", { view: viewLabel });
        void onDownload();
      }}
      disabled={isDownloading}
      aria-label={`${viewLabel} PDF`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-md bg-[var(--color-accent)] hover:opacity-90 text-white disabled:opacity-50 transition-colors"
    >
      <Download size={14} strokeWidth={2} />
      <span>{isDownloading ? "다운로드 중..." : "PDF"}</span>
    </button>
  );
};

export default PDFDownloadButton;
