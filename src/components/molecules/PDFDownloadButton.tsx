"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, Info } from "lucide-react";
import { showError } from "../../lib/toast";

interface PDFDownloadButtonProps {
  /** 전체 인쇄 — 기본 PdfExportRangeModal 열기 (필터 활성 시 = "필터 적용 수업만") */
  onDownload: () => Promise<void> | void;
  /** 강사별로 1장씩 — PdfExportRangeModal 을 per-teacher pre-set 으로 열기. 미설정 시 "준비 중" placeholder. */
  onPerTeacher?: () => void;
  /** 학생별로 1장씩 — PdfExportRangeModal 을 per-student pre-set 으로 열기. 미설정 시 "준비 중" placeholder. */
  onPerStudent?: () => void;
  /** PR #435 (A4): 전체 수업 인쇄 (필터 무시). hasAnyFilter 시 그룹 분리 dropdown 에서 사용 */
  onAllPrint?: () => void;
  /** 인쇄 가이드 modal 열기 — 없으면 menu 항목 미렌더 (teacher-schedule 같이 가이드 없는 환경) */
  onOpenGuide?: () => void;
  isDownloading: boolean;
  onDownloadStart: () => void;
  onDownloadEnd: () => void;
  viewLabel?: string;
  /** PR #435 (A4): 화면 필터 활성 여부 — true 시 dropdown 을 "필터 적용 / 전체 수업" 그룹으로 분리 */
  hasAnyFilter?: boolean;
  /** PR #435: 필터 적용 수업 수 (그룹 헤더 표시) */
  filteredCount?: number;
  /** PR #435: 전체 수업 수 */
  totalCount?: number;
}

/**
 * PDF 다운로드 dropdown menu.
 *
 * UAT 2026-05-21 — ADR-020 후속:
 *   - C variant (Solid Hierarchy): primary amber button
 *   - P2 (dropdown 안 가이드): "인쇄 가이드" 가 menu 마지막 항목 → InfoTrigger 폐기
 *   - Portal — dropdown 을 document.body 에 mount. schedule grid 의 stacking context 가
 *     자식 dropdown 을 가두던 가려짐 fix (z-index 만 올려서는 안 됐던 root cause).
 *
 * PR #428 — ADR-021 D4 follow-up:
 *   - "강사별 / 학생별" 옵션 활성 (onPerTeacher / onPerStudent props 전달 시).
 *   - 미전달 시 "준비 중" placeholder 유지 (backward compat).
 */
const PDFDownloadButton: React.FC<PDFDownloadButtonProps> = ({
  onDownload,
  onPerTeacher,
  onPerStudent,
  onAllPrint,
  onOpenGuide,
  isDownloading,
  onDownloadStart,
  onDownloadEnd,
  viewLabel = "시간표",
  hasAnyFilter = false,
  filteredCount = 0,
  totalCount = 0,
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

  const handleAllPrint = () => {
    setOpen(false);
    onAllPrint?.();
  };
  const handlePerTeacher = () => {
    setOpen(false);
    onPerTeacher?.();
  };
  const handlePerStudent = () => {
    setOpen(false);
    onPerStudent?.();
  };
  const handleOpenGuide = () => {
    setOpen(false);
    onOpenGuide?.();
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
              {hasAnyFilter ? (
                // PR #435 A4: 필터 활성 시 "필터 적용 / 전체 수업" 그룹 분리
                <>
                  <SectionHeader>필터 적용 ({filteredCount} 수업)</SectionHeader>
                  <MenuItem
                    icon={<Download size={13} />}
                    label="전체 인쇄"
                    onClick={() => void handleFullPrint()}
                    indent
                  />
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <SectionHeader>전체 수업 ({totalCount})</SectionHeader>
                  <MenuItem
                    icon={<Download size={13} />}
                    label={onAllPrint ? "전체 인쇄" : "전체 인쇄 (준비 중)"}
                    disabled={!onAllPrint}
                    onClick={onAllPrint ? handleAllPrint : undefined}
                    indent
                  />
                  <MenuItem
                    icon={<Download size={13} />}
                    label={onPerTeacher ? "강사별로 1장씩" : "강사별 (준비 중)"}
                    disabled={!onPerTeacher}
                    onClick={onPerTeacher ? handlePerTeacher : undefined}
                    indent
                  />
                  <MenuItem
                    icon={<Download size={13} />}
                    label={onPerStudent ? "학생별로 1장씩" : "학생별 (준비 중)"}
                    disabled={!onPerStudent}
                    onClick={onPerStudent ? handlePerStudent : undefined}
                    indent
                  />
                </>
              ) : (
                // 필터 미활성: 기존 단일 그룹 layout
                <>
                  <MenuItem
                    icon={<Download size={13} />}
                    label="전체 인쇄"
                    onClick={() => void handleFullPrint()}
                  />
                  <MenuItem
                    icon={<Download size={13} />}
                    label={onPerTeacher ? "강사별로 1장씩" : "강사별 (준비 중)"}
                    disabled={!onPerTeacher}
                    onClick={onPerTeacher ? handlePerTeacher : undefined}
                  />
                  <MenuItem
                    icon={<Download size={13} />}
                    label={onPerStudent ? "학생별로 1장씩" : "학생별 (준비 중)"}
                    disabled={!onPerStudent}
                    onClick={onPerStudent ? handlePerStudent : undefined}
                  />
                </>
              )}
              {onOpenGuide && (
                <>
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <MenuItem
                    icon={<Info size={13} />}
                    label="인쇄 가이드"
                    onClick={handleOpenGuide}
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
  indent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left py-2 text-sm inline-flex items-center gap-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${indent ? "pl-5 pr-3" : "px-3"}`}
    >
      <span className="text-[var(--color-text-muted)]">{icon}</span>
      {label}
    </button>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
      {children}
    </div>
  );
}

export default PDFDownloadButton;
