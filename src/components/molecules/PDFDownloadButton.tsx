"use client";
import React from "react";
import { showError } from "../../lib/toast";
import Button from "../atoms/Button";

interface PDFDownloadButtonProps {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
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
    <div className="mb-4 text-right">
      <Button
        variant="primary"
        onClick={handlePDFDownload}
        disabled={isDownloading}
      >
        {isDownloading ? "다운로드 중..." : "시간표 다운로드"}
      </Button>
    </div>
  );
};

export default PDFDownloadButton;
