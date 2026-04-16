import React from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

type Props = {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
};

export default function PdfDownloadSection({
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel,
}: Props) {
  return (
    <PDFDownloadButton
      onDownload={onDownload}
      isDownloading={isDownloading}
      onDownloadStart={onDownloadStart}
      onDownloadEnd={onDownloadEnd}
      viewLabel={viewLabel}
    />
  );
}
