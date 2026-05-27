"use client";

import { useCallback, useState } from "react";

/**
 * Schedule 의 PDF dialog state aggregator.
 *
 * 기존: schedule/page.tsx 의 isDownloading + isPdfDialogOpen + pdfInitialScope +
 * pdfInitialPrintTarget + openPdfDialog 가 page-local.
 * 본 hook: dialog state 만 추출. handlePdfExport (200+ 줄) 는 page 안 유지
 * (displaySessions / enrollments / students / teachers / subjects / timeRange /
 * sessionMatchesFilters / renderSchedulePdf 등 의존성 다수 — hook 추출 비효율).
 *
 * Sub-proposal: schedule-page-split-refactor PR 2 (Layer 1 — independent, scope 좁음).
 */
export type PdfScope = "per-teacher" | "per-student" | undefined;
export type PdfPrintTarget = "filtered" | "all" | undefined;

export interface UsePdfDialogReturn {
  isDownloading: boolean;
  isPdfDialogOpen: boolean;
  pdfInitialScope: PdfScope;
  pdfInitialPrintTarget: PdfPrintTarget;
  setIsDownloading: React.Dispatch<React.SetStateAction<boolean>>;
  openPdfDialog: (scope?: PdfScope, printTarget?: PdfPrintTarget) => void;
  closePdfDialog: () => void;
}

export function usePdfDialog(): UsePdfDialogReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [pdfInitialScope, setPdfInitialScope] = useState<PdfScope>(undefined);
  const [pdfInitialPrintTarget, setPdfInitialPrintTarget] = useState<PdfPrintTarget>(undefined);

  const openPdfDialog = useCallback((scope?: PdfScope, printTarget?: PdfPrintTarget) => {
    setPdfInitialScope(scope);
    setPdfInitialPrintTarget(printTarget);
    setIsPdfDialogOpen(true);
  }, []);

  const closePdfDialog = useCallback(() => {
    setIsPdfDialogOpen(false);
  }, []);

  return {
    isDownloading,
    isPdfDialogOpen,
    pdfInitialScope,
    pdfInitialPrintTarget,
    setIsDownloading,
    openPdfDialog,
    closePdfDialog,
  };
}
