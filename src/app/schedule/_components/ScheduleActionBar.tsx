"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";

interface Props {
  viewLabel: string;
  onOpenPdfDialog: () => void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  userId: string | null;
  /** Whether the current user can manage academy resources (owner/admin). Members hide the share-link entry. */
  canManage?: boolean;
  /**
   * 현재 view 모드 — PDF 다운로드 button 은 weekly view 에서만 표시.
   * daily/monthly 의 PDF 는 별도 PR 에서 전용 layout 으로 구현 예정.
   */
  viewMode?: "daily" | "weekly" | "monthly";
  /** @deprecated dropdown 제거 후 미사용 — page-level call site 호환용 */
  onOpenPdfPerTeacher?: () => void;
  /** @deprecated 동일 */
  onOpenPdfPerStudent?: () => void;
  /** @deprecated 동일 */
  onOpenPdfAllPrint?: () => void;
  /** @deprecated 동일 */
  hasAnyFilter?: boolean;
  /** @deprecated 동일 */
  filteredCount?: number;
  /** @deprecated 동일 */
  totalCount?: number;
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
  userId,
  canManage = true,
  viewMode = "weekly",
}: Props) {
  const showPdf = viewMode === "weekly";

  return (
    <div className="flex items-center gap-2" data-tour="export">
      {showPdf && (
        <PDFDownloadButton
          onDownload={onOpenPdfDialog}
          isDownloading={isDownloading}
          viewLabel={viewLabel}
        />
      )}
      {userId && canManage && (
        <Link
          href="/settings"
          aria-label="공유 링크"
          title="공유 링크"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
        >
          <Share2 size={15} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
