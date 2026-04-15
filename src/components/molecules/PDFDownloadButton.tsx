import React from "react";
import { showError } from "../../lib/toast";
import type { Student } from "../../lib/planner";
import Button from "../atoms/Button";

interface PDFDownloadButtonProps {
  timeTableRef: React.RefObject<HTMLDivElement | null>;
  selectedStudent: Student | undefined;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
}

const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  timeTableRef,
  selectedStudent,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
}) => {
  const handlePDFDownload = async () => {
    if (!timeTableRef.current) return;

    onDownloadStart();
    try {
      const studentName = selectedStudent?.name;
      const { downloadTimetableAsPDF } = await import("../../lib/pdf-utils");
      await downloadTimetableAsPDF(timeTableRef.current, studentName);
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
