"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";
import { useState } from "react";
import PDFDownloadButton from "../../../components/molecules/PDFDownloadButton";
import PdfGuideModal from "../../../components/molecules/PdfGuideModal";

interface Props {
  viewLabel: string;
  onOpenPdfDialog: () => void;
  /** 강사별로 1장씩 — dropdown 진입점. PdfExportRangeModal 을 per-teacher pre-set 으로 연다. */
  onOpenPdfPerTeacher?: () => void;
  /** 학생별로 1장씩 — dropdown 진입점. PdfExportRangeModal 을 per-student pre-set 으로 연다. */
  onOpenPdfPerStudent?: () => void;
  /** PR #435 A4: 전체 수업 인쇄 (필터 무시). hasAnyFilter 그룹 분리 dropdown 에서 사용. */
  onOpenPdfAllPrint?: () => void;
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
  /** PR #435 A4: 화면 필터 활성 여부 — dropdown 을 그룹 분리 layout 으로 전환 */
  hasAnyFilter?: boolean;
  /** PR #435: 필터 적용 수업 수 */
  filteredCount?: number;
  /** PR #435: 전체 수업 수 */
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
  onOpenPdfPerTeacher,
  onOpenPdfPerStudent,
  onOpenPdfAllPrint,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  userId,
  canManage = true,
  viewMode = "weekly",
  hasAnyFilter = false,
  filteredCount = 0,
  totalCount = 0,
}: Props) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const showPdf = viewMode === "weekly";

  return (
    <div className="flex items-center gap-2">
      {showPdf && (
        <PDFDownloadButton
          onDownload={onOpenPdfDialog}
          onPerTeacher={onOpenPdfPerTeacher}
          onPerStudent={onOpenPdfPerStudent}
          onAllPrint={onOpenPdfAllPrint}
          onOpenGuide={() => setIsGuideOpen(true)}
          isDownloading={isDownloading}
          onDownloadStart={onDownloadStart}
          onDownloadEnd={onDownloadEnd}
          viewLabel={viewLabel}
          hasAnyFilter={hasAnyFilter}
          filteredCount={filteredCount}
          totalCount={totalCount}
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
      <PdfGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
