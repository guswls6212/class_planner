"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 *   - Portal — dropdown 을 document.body 에 mount. schedule grid 의 stacking context 가
 *     자식 dropdown 을 가두던 가려짐 fix (z-index 만 올려서는 안 됐던 root cause).
 *   - "강사별 / 학생별" 옵션 placeholder — 동작은 후속 PR (#427) 에서 활성
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );

  // open 시 anchor 위치 계산 + scroll/resize 시 닫기 (재배치 대신 단순화).
  // useLayoutEffect — paint 전 measure 로 e2e timing 안정 (mount 후 한 frame 늦지 않게).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
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

  const menu =
    open && menuPos
      ? createPortal(
          <>
            {/* backdrop — click 시 닫기. z-9998 (menu 보다 낮음) */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="menu"
              className="fixed z-[9999] w-56 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-2xl py-1"
              style={{ top: menuPos.top, right: menuPos.right }}
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
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
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
      {menu}
    </>
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
