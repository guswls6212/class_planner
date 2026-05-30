"use client";

/**
 * Schedule 페이지 header 의 actions row — TemplateMenuV2 + ScheduleActionBar.
 *
 * 기존: schedule/page.tsx 의 inline JSX (~36 줄, line 2037-2072) — TemplateMenuV2
 * (canManage + userId + weekly view 조건) + ScheduleActionBar wrapper.
 *
 * 본 component: presentation only. PDF 다이얼로그 / 템플릿 모달 open 콜백을 props 로 주입.
 *
 * Sub-proposal: schedule-page-split-refactor PR 20 (loop iter 17, JSX 분리 phase).
 */

import dynamic from "next/dynamic";
import { TemplateMenuV2 } from "@/components/molecules/TemplateMenuV2";
import type {
  PdfScope,
  PdfPrintTarget,
} from "../_hooks/usePdfDialog";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";

const ScheduleActionBar = dynamic(() => import("./ScheduleActionBar"), {
  ssr: false,
});

interface Props {
  // === Permission / mode ===
  canManage: boolean;
  userId: string | null | undefined;
  viewMode: ScheduleViewMode;
  scheduleTitle: string;

  // === TemplateMenuV2 (canManage + userId + weekly 시에만 렌더) ===
  hasTemplate: boolean;
  onApplyTemplateMenu: () => void;
  onClearWeek: () => void;
  onSaveTemplateMenu: () => void;
  onPreviewTemplate: () => void;

  // === ScheduleActionBar ===
  openPdfDialog: (scope?: PdfScope, printTarget?: PdfPrintTarget) => void;
  hasAnyFilter: boolean;
  filteredCount: number;
  totalCount: number;
  isDownloading: boolean;
  isTemplateSaving: boolean;
  onSaveTemplate: () => void;
  onApplyTemplate: () => void;
}

export default function ScheduleHeaderActions({
  canManage,
  userId,
  viewMode,
  scheduleTitle,
  hasTemplate,
  onApplyTemplateMenu,
  onClearWeek,
  onSaveTemplateMenu,
  onPreviewTemplate,
  openPdfDialog,
  hasAnyFilter,
  filteredCount,
  totalCount,
  isDownloading,
  isTemplateSaving,
  onSaveTemplate,
  onApplyTemplate,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {canManage && userId && viewMode === "weekly" && (
        <TemplateMenuV2
          onApply={onApplyTemplateMenu}
          onClearWeek={onClearWeek}
          onSave={onSaveTemplateMenu}
          onPreview={onPreviewTemplate}
          canManage={canManage}
          hasTemplate={hasTemplate}
        />
      )}
      <ScheduleActionBar
        viewLabel={scheduleTitle}
        onOpenPdfDialog={() => openPdfDialog()}
        onOpenPdfPerTeacher={() => openPdfDialog("per-teacher", "all")}
        onOpenPdfPerStudent={() => openPdfDialog("per-student", "all")}
        onOpenPdfAllPrint={() => openPdfDialog(undefined, "all")}
        hasAnyFilter={hasAnyFilter}
        filteredCount={filteredCount}
        totalCount={totalCount}
        isDownloading={isDownloading}
        onDownloadStart={() => {}}
        onDownloadEnd={() => {}}
        viewMode={viewMode}
        onSaveTemplate={onSaveTemplate}
        onApplyTemplate={onApplyTemplate}
        isSaving={isTemplateSaving}
      />
    </div>
  );
}
