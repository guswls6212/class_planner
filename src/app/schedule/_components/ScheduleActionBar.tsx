"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { useState } from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import PdfGuideModal from "../../../components/molecules/PdfGuideModal";
import { InfoTrigger } from "../../../components/atoms/InfoTrigger";

interface Props {
  viewLabel: string;
  onOpenPdfDialog: () => void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  userId: string | null;
  /** Whether the current user can manage academy resources (owner/admin). Members hide the share-link entry. */
  canManage?: boolean;
  /** @deprecated Retained to keep the page-level call site unchanged. TemplateMenuV2 owns this action now. */
  onSaveTemplate?: () => void;
  /** @deprecated 동일 사유. */
  onApplyTemplate?: () => void;
  /** @deprecated 동일 사유. */
  isSaving?: boolean;
}

export default function ScheduleActionBar({
  viewLabel,
  onOpenPdfDialog,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  canManage = true,
}: Props) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <PDFDownloadButton
        onDownload={onOpenPdfDialog}
        isDownloading={isDownloading}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
        viewLabel={viewLabel}
      />
      <InfoTrigger size="md" label="PDF 출력 가이드" onClick={() => setIsGuideOpen(true)} />
      {userId && canManage && (
        <Link
          href="/settings"
          aria-label="공유 링크"
          title="공유 링크"
          className="inline-flex items-center justify-center w-8 h-8 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <Share2 size={15} strokeWidth={2} />
        </Link>
      )}
      <PdfGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
