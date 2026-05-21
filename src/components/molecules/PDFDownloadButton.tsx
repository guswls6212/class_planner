"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Info } from "lucide-react";
import { showError } from "../../lib/toast";

interface PDFDownloadButtonProps {
  /** 전체 인쇄 — 기본 PdfExportRangeModal 열기 */
  onDownload: () => Promise<void> | void;
  /** 인쇄 가이드 modal 열기 — 없으면 menu 항목 미렌더 (teacher-schedule 같이 가이드 없는 환경) */
  onOpenGuide?: () => void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
}

/**
 * PDF 다운로드 dropdown menu.
 *
 * UAT 2026-05-21 — ADR-020 후속:
 *   - C variant (Solid Hierarchy): primary amber button
 *   - P2 (dropdown 안 가이드): "인쇄 가이드" 가 menu 마지막 항목 → InfoTrigger 폐기
 *   - "강사별 / 학생별" 옵션 placeholder — 동작은 후속 PR (#427) 에서 PdfExportRangeModal 통합 시 활성
 */
const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  onOpenGuide,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel = "시간표",
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const handleFullPrint = async () => {
    setOpen(false);
    onDownloadStart();
    try {
      await onDownload();
    } catch {
      showError("PDF 다운로드에 실패했습니다.");
    } finally {
      onDownloadEnd();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isDownloading}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${viewLabel} PDF`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-md bg-[var(--color-accent)] hover:opacity-90 text-white disabled:opacity-50 transition-colors"
      >
        <Download size={14} strokeWidth={2} />
        <span>{isDownloading ? "다운로드 중..." : "PDF"}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-[1000] w-56 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-2xl py-1"
        >
          <MenuItem
            icon={<Download size={13} />}
            label="전체 인쇄"
            onClick={() => void handleFullPrint()}
          />
          <MenuItem
            icon={<Download size={13} />}
            label="강사별 (준비 중)"
            disabled
          />
          <MenuItem
            icon={<Download size={13} />}
            label="학생별 (준비 중)"
            disabled
          />
          {onOpenGuide && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <MenuItem
                icon={<Info size={13} />}
                label="인쇄 가이드"
                onClick={() => {
                  setOpen(false);
                  onOpenGuide();
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left px-3 py-2 text-sm inline-flex items-center gap-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      {label}
    </button>
  );
}

export default PDFDownloadButton;
