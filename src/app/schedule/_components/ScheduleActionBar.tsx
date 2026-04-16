"use client";

import React from "react";
import Link from "next/link";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

interface Props {
  viewLabel: string;
  onDownload: () => Promise<void> | void;
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
  onDownload,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  onSaveTemplate,
  onApplyTemplate,
  isSaving,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <PDFDownloadButton
        onDownload={onDownload}
        isDownloading={isDownloading}
        onDownloadStart={onDownloadStart}
        onDownloadEnd={onDownloadEnd}
        viewLabel={viewLabel}
      />
      {userId && (
        <>
          <button
            onClick={onSaveTemplate}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
          >
            현재 주를 템플릿으로 저장
          </button>
          <button
            onClick={onApplyTemplate}
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            저장된 템플릿 적용하기
          </button>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            공유 링크
          </Link>
        </>
      )}
    </div>
  );
}
