"use client";
import React from "react";
import { Download } from "lucide-react";
import { showError } from "../../lib/toast";
import Button from "../atoms/Button";

interface PDFDownloadButtonProps {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel = "시간표",
}) => {
  const handlePDFDownload = async () => {
    onDownloadStart();
    try {
      await onDownload();
    } catch (error) {
      showError("PDF 다운로드에 실패했습니다.");
    } finally {
      onDownloadEnd();
    }
  };

  return (
    <Button
      variant="primary"
      size="small"
      onClick={handlePDFDownload}
      disabled={isDownloading}
      aria-label={`${viewLabel} PDF 다운로드`}
    >
      <Download size={14} strokeWidth={2} className="mr-1.5" />
      {isDownloading ? "다운로드 중..." : `${viewLabel} PDF 다운로드`}
    </Button>
  );
};

export default PDFDownloadButton;
