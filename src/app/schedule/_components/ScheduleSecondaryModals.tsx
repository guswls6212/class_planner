"use client";

/**
 * Schedule 페이지의 보조 모달 cluster.
 *
 * 기존: schedule/page.tsx 의 inline JSX (~73 줄, line 2435-2507):
 * - SlotPickerModal (save + apply 2 instances)
 * - ApplyTemplateConfirm (적용 확인)
 * - TemplatePreviewModal (미리보기)
 * - PdfExportRangeModal (PDF 범위 선택)
 *
 * 본 component: presentation only. EditSessionModal 은 props chain 너무 거대해서
 * 별도 component (iter 19) 로 분리 예정.
 *
 * Sub-proposal: schedule-page-split-refactor PR 21 (loop iter 18, JSX 분리 phase).
 */

import dynamic from "next/dynamic";
import { ApplyTemplateConfirm } from "@/components/molecules/ApplyTemplateConfirm";
import { TemplatePreviewModal } from "@/components/molecules/TemplatePreviewModal";
import PdfExportRangeModal, {
  type PdfExportRange,
} from "@/components/molecules/PdfExportRangeModal";
import type { ScheduleTemplate, TemplateData } from "@/shared/types/templateTypes";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";
import type {
  PdfScope,
  PdfPrintTarget,
} from "../_hooks/usePdfDialog";
import type { PreflightResult } from "@/lib/pdf/preflightCheck";

const SlotPickerModal = dynamic(
  () =>
    import("@/components/molecules/SlotPickerModal").then((m) => ({
      default: m.SlotPickerModal,
    })),
  { ssr: false, loading: () => null },
);

interface Props {
  // === SlotPickerModal save ===
  showSavePickerModal: boolean;
  onCloseSavePickerModal: () => void;
  onSaveSlot: (slotIndex: number, name?: string) => void;
  isTemplateSaving: boolean;

  // === SlotPickerModal apply ===
  showApplyPickerModal: boolean;
  onCloseApplyPickerModal: () => void;
  onApplySlot: (slotIndex: number) => void;
  isApplyingTemplate: boolean;

  // === templates (양쪽 SlotPickerModal 공유) ===
  templates: ScheduleTemplate[];

  // === ApplyTemplateConfirm ===
  applyConfirmTemplate: ScheduleTemplate | null;
  existingSessionCount: number;
  onConfirmApplyTemplate: () => void;
  onCancelApplyTemplate: () => void;

  // === TemplatePreviewModal ===
  previewTemplate: { name: string; templateData: TemplateData } | null;
  onClosePreviewTemplate: () => void;

  // === PdfExportRangeModal ===
  isPdfDialogOpen: boolean;
  onClosePdfDialog: () => void;
  onPdfExport: (range: PdfExportRange) => void;
  pdfViewMode: ScheduleViewMode;
  selectedDate: Date;
  isDownloading: boolean;
  pdfTeachers: { id: string; name: string; color?: string }[];
  pdfStudents: { id: string; name: string; color?: string }[];
  pdfPreflightResult: PreflightResult | undefined;
  pdfPreflightResultAll: PreflightResult | undefined;
  hasStudentFilter: boolean;
  hasTeacherFilter: boolean;
  pdfInitialScope: PdfScope;
  pdfInitialPrintTarget: PdfPrintTarget;
  filterChipLabel: string | undefined;
  hasAnyFilter: boolean;
  filteredCount: number;
  totalCount: number;
}

export default function ScheduleSecondaryModals({
  showSavePickerModal,
  onCloseSavePickerModal,
  onSaveSlot,
  isTemplateSaving,
  showApplyPickerModal,
  onCloseApplyPickerModal,
  onApplySlot,
  isApplyingTemplate,
  templates,
  applyConfirmTemplate,
  existingSessionCount,
  onConfirmApplyTemplate,
  onCancelApplyTemplate,
  previewTemplate,
  onClosePreviewTemplate,
  isPdfDialogOpen,
  onClosePdfDialog,
  onPdfExport,
  pdfViewMode,
  selectedDate,
  isDownloading,
  pdfTeachers,
  pdfStudents,
  pdfPreflightResult,
  pdfPreflightResultAll,
  hasStudentFilter,
  hasTeacherFilter,
  pdfInitialScope,
  pdfInitialPrintTarget,
  filterChipLabel,
  hasAnyFilter,
  filteredCount,
  totalCount,
}: Props) {
  return (
    <>
      {/* T2 (ADR-008): 슬롯 picker — 저장 */}
      <SlotPickerModal
        open={showSavePickerModal}
        onClose={onCloseSavePickerModal}
        onSelect={onSaveSlot}
        templates={templates}
        mode="save"
        isSubmitting={isTemplateSaving}
      />

      {/* T2: 슬롯 picker — 적용 */}
      <SlotPickerModal
        open={showApplyPickerModal}
        onClose={onCloseApplyPickerModal}
        onSelect={onApplySlot}
        templates={templates}
        mode="apply"
        isSubmitting={isApplyingTemplate}
      />

      {/* 템플릿 적용 확인 모달 (교체 충돌 감지) */}
      {applyConfirmTemplate && (
        <ApplyTemplateConfirm
          existingSessionCount={existingSessionCount}
          onConfirm={onConfirmApplyTemplate}
          onCancel={onCancelApplyTemplate}
          isApplying={isApplyingTemplate}
        />
      )}

      {/* 템플릿 미리보기 모달 */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={{
            name: previewTemplate.name,
            template_data: {
              sessions: previewTemplate.templateData.sessions.map((s) => ({
                weekday: s.weekday,
                startsAt: s.startsAt,
                endsAt: s.endsAt,
                subjectName: s.subjectName,
                studentNames: s.studentNames,
              })),
            },
          }}
          onClose={onClosePreviewTemplate}
        />
      )}

      {/* PDF 범위 선택 다이얼로그 */}
      <PdfExportRangeModal
        isOpen={isPdfDialogOpen}
        onClose={onClosePdfDialog}
        onExport={onPdfExport}
        viewMode={pdfViewMode}
        selectedDate={selectedDate}
        isExporting={isDownloading}
        teachers={pdfTeachers}
        students={pdfStudents}
        preflightResult={pdfPreflightResult}
        allPreflightResult={pdfPreflightResultAll}
        hasStudentFilter={hasStudentFilter}
        hasTeacherFilter={hasTeacherFilter}
        initialScope={pdfInitialScope}
        initialPrintTarget={pdfInitialPrintTarget}
        filterChipLabel={filterChipLabel}
        hasAnyFilter={hasAnyFilter}
        filteredCount={filteredCount}
        totalCount={totalCount}
      />
    </>
  );
}
