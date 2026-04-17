"use client";

import React, { useMemo, useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";
import {
  addWeeks,
  formatLocalISO,
  getMonthWeekRange,
  getWeekStart,
} from "@/lib/dateUtils";

export interface PdfExportRange {
  startDate: string;
  endDate: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (range: PdfExportRange) => void;
  viewMode: ScheduleViewMode;
  selectedDate: Date;
  isExporting?: boolean;
}

type Scope = "current" | "range";

export default function PdfExportRangeModal({
  isOpen,
  onClose,
  onExport,
  viewMode,
  selectedDate,
  isExporting = false,
}: Props) {
  const { containerRef } = useModalA11y({ isOpen, onClose });
  const isMonthly = viewMode === "monthly";
  const [scope, setScope] = useState<Scope>("current");

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const [rangeStart, setRangeStart] = useState(() => formatLocalISO(weekStart));
  const [rangeEnd, setRangeEnd] = useState(() => formatLocalISO(addWeeks(weekStart, 3)));

  if (!isOpen) return null;

  const rangeInvalid = scope === "range" && rangeEnd < rangeStart;

  const handleExport = () => {
    if (isMonthly) {
      const { start, end } = getMonthWeekRange(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1
      );
      onExport({ startDate: formatLocalISO(start), endDate: formatLocalISO(end) });
      return;
    }
    if (scope === "current") {
      onExport({ startDate: formatLocalISO(weekStart), endDate: formatLocalISO(weekEnd) });
      return;
    }
    onExport({ startDate: rangeStart, endDate: rangeEnd });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={onClose}
      data-testid="pdf-export-modal-backdrop"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-export-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--color-bg-primary)] rounded-lg p-6 min-w-[320px] max-w-[440px] shadow-xl"
      >
        <h3
          id="pdf-export-title"
          className="text-lg font-semibold text-[var(--color-text-primary)] mb-4"
        >
          PDF 출력 범위
        </h3>

        {isMonthly ? (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="radio" checked readOnly />
            <span className="text-sm text-[var(--color-text-primary)]">
              해당 월 전체 출력
            </span>
          </label>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pdf-scope"
                checked={scope === "current"}
                onChange={() => setScope("current")}
              />
              <span className="text-sm text-[var(--color-text-primary)]">
                현재 뷰만 출력
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="pdf-scope"
                checked={scope === "range"}
                onChange={() => setScope("range")}
              />
              <span className="text-sm text-[var(--color-text-primary)]">
                여러 주 범위 출력
              </span>
            </label>
            {scope === "range" && (
              <div className="flex flex-col gap-2 ml-6 mt-1">
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="w-12 shrink-0">시작일</span>
                  <input
                    type="date"
                    aria-label="시작일"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <span className="w-12 shrink-0">종료일</span>
                  <input
                    type="date"
                    aria-label="종료일"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                  />
                </label>
                {rangeInvalid && (
                  <p className="text-xs text-red-500">
                    종료일이 시작일보다 빨라야 합니다.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={rangeInvalid || isExporting}
            className="px-4 py-2 rounded-md bg-accent text-sm text-white font-medium disabled:opacity-50 transition-colors"
          >
            {isExporting ? "출력 중..." : "출력"}
          </button>
        </div>
      </div>
    </div>
  );
}
