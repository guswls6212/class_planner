"use client";

import { useState } from "react";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

/**
 * Schedule 의 template dialog state aggregator.
 *
 * 기존: schedule/page.tsx 의 5 state 가 분산 (showSave/Apply Picker + applyConfirm + isApplying + previewTemplate).
 * 본 hook: state 만 추출. handler (handleApplyTemplate / doApplyTemplate / handleSaveSlot /
 * handleApplySlot / handlePreviewTemplate) 는 page 안 유지 (dependency 8+ — sessions /
 * subjects / students / teachers / enrollments / updateData / weekFilteredSessions /
 * currentWeekStart / showToast — hook param 너무 큼).
 *
 * Sub-proposal: schedule-page-split-refactor PR 3 (Layer 1 — independent, scope 좁음).
 */
export interface UseTemplateStateReturn {
  showSavePickerModal: boolean;
  showApplyPickerModal: boolean;
  applyConfirmTemplate: ScheduleTemplate | null;
  isApplyingTemplate: boolean;
  previewTemplate: ScheduleTemplate | null;
  setShowSavePickerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowApplyPickerModal: React.Dispatch<React.SetStateAction<boolean>>;
  setApplyConfirmTemplate: React.Dispatch<React.SetStateAction<ScheduleTemplate | null>>;
  setIsApplyingTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  setPreviewTemplate: React.Dispatch<React.SetStateAction<ScheduleTemplate | null>>;
}

export function useTemplateState(): UseTemplateStateReturn {
  const [showSavePickerModal, setShowSavePickerModal] = useState(false);
  const [showApplyPickerModal, setShowApplyPickerModal] = useState(false);
  const [applyConfirmTemplate, setApplyConfirmTemplate] = useState<ScheduleTemplate | null>(null);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ScheduleTemplate | null>(null);

  return {
    showSavePickerModal,
    showApplyPickerModal,
    applyConfirmTemplate,
    isApplyingTemplate,
    previewTemplate,
    setShowSavePickerModal,
    setShowApplyPickerModal,
    setApplyConfirmTemplate,
    setIsApplyingTemplate,
    setPreviewTemplate,
  };
}
