import React from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import type { Student } from "../../../lib/planner";

type Props = {
  timeTableRef: React.RefObject<HTMLDivElement | null>;
  selectedStudent?: Student;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
};

export default function PdfDownloadSection({
  timeTableRef,
  selectedStudent,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
}: Props) {
  return (
    <PDFDownloadButton
      timeTableRef={timeTableRef}
      selectedStudent={selectedStudent}
      isDownloading={isDownloading}
      onDownloadStart={onDownloadStart}
      onDownloadEnd={onDownloadEnd}
    />
  );
}
