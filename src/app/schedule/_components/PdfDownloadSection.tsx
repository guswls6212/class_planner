import React from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

type Props = {
  onDownload: () => Promise<void> | void;
  isDownloading: boolean;
  /** @deprecated 단순 버튼 전환 후 미사용 — 호출처 호환용 */
  onDownloadStart?: () => void;
  /** @deprecated 동일 */
  onDownloadEnd?: () => void;
  viewLabel?: string;
};

export default function PdfDownloadSection({
  onDownload,
  isDownloading,
  viewLabel,
}: Props) {
  return (
    <PDFDownloadButton
      onDownload={onDownload}
      isDownloading={isDownloading}
      viewLabel={viewLabel}
    />
  );
}
