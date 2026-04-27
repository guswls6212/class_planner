"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import { TemplateMenu } from "../../../components/molecules/TemplateMenu";

interface Props {
  viewLabel: string;
  onOpenPdfDialog: () => void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  userId: string | null;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
  isSaving: boolean;
}

export default function ScheduleActionBar({
  viewLabel,
  onOpenPdfDialog,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  onSaveTemplate,
  onApplyTemplate,
  isSaving,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <PDFDownloadButton
        onDownload={onOpenPdfDialog}
        isDownloading={isDownloading}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
        viewLabel={viewLabel}
      />
      {userId && (
        <>
          <TemplateMenu
            onSave={onSaveTemplate}
            onApply={onApplyTemplate}
            isSaving={isSaving}
          />
          <Link
            href="/settings"
            aria-label="공유 링크"
            title="공유 링크"
            className="inline-flex items-center justify-center w-8 h-8 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <Share2 size={15} strokeWidth={2} />
          </Link>
        </>
      )}
    </div>
  );
}
