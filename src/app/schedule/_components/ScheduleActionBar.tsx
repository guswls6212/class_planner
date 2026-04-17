"use client";

import React from "react";
import Link from "next/link";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import { HelpTooltip } from "../../../components/molecules/HelpTooltip";

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
          <div className="flex items-center gap-1">
            <button
              onClick={onSaveTemplate}
              disabled={isSaving}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
            >
              현재 주를 템플릿으로 저장
            </button>
            <HelpTooltip
              label="템플릿 저장 도움말"
              content="이번 주의 수업 배치를 템플릿으로 저장합니다. 나중에 같은 배치를 다른 주에 빠르게 적용할 수 있습니다."
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onApplyTemplate}
              className="px-3 py-1.5 text-xs border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              저장된 템플릿 적용하기
            </button>
            <HelpTooltip
              label="템플릿 적용 도움말"
              content="반복되는 시간표를 저장해두고 다른 주에 동일한 배치를 한 번에 적용합니다. 예: 매주 같은 요일에 같은 학생이 같은 수업을 듣는 경우."
            />
          </div>
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
