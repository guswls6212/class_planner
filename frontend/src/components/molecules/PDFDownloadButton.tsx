import React from 'react';
import { downloadTimetableAsPDF } from '../../lib/pdf-utils';
import type { Student } from '../../lib/planner';
import Button from '../atoms/Button';

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
      await downloadTimetableAsPDF(timeTableRef.current, studentName);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
    } finally {
      onDownloadEnd();
    }
  };

  return (
    <div style={{ marginBottom: '16px', textAlign: 'right' }}>
      <Button
        variant="primary"
        onClick={handlePDFDownload}
        disabled={isDownloading}
      >
        {isDownloading ? '다운로드 중...' : '시간표 다운로드'}
      </Button>
    </div>
  );
};

export default PDFDownloadButton;
