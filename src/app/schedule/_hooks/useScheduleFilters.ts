"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColorByMode } from "@/hooks/useColorBy";
import { useColorBy } from "@/hooks/useColorBy";
import { useStudentFilter } from "./useStudentFilter";
import { useTeacherFilter } from "./useTeacherFilter";

/**
 * Schedule 의 filter state aggregator.
 *
 * 기존: useStudentFilter / useTeacherFilter / useColorBy + page-local selectedSubjectIds 가 분산.
 * 본 hook: 4 filter 의 single source. schedule/page.tsx 의 30-50 줄 감축.
 *
 * Sub-proposal: schedule-page-split-refactor PR 1 (Layer 1 — independent).
 */
export type AutoColorBy = "subject" | "teacher";

export interface UseScheduleFiltersReturn {
  selectedStudentIds: string[];
  selectedSubjectIds: string[];
  selectedTeacherIds: string[];
  colorBy: ColorByMode;
  /** Derived: 단일 teacher filter 만 활성 시 "teacher", 그 외 "subject" (ADR-020 R5). */
  autoColorBy: AutoColorBy;
  toggleStudent: (id: string) => void;
  toggleSubject: (id: string) => void;
  toggleTeacher: (id: string) => void;
  /** Subject filter 의 bulk replace — cascadedFilterOptions narrowing 등에서 직접 호출. */
  setSelectedSubjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  clearStudentFilter: () => void;
  clearTeacherFilter: () => void;
  clearSubjectFilter: () => void;
  clearAll: () => void;
  setColorBy: (mode: ColorByMode) => void;
}

export function useScheduleFilters(userId: string | null): UseScheduleFiltersReturn {
  const { colorBy, setColorBy } = useColorBy();
  const {
    selectedStudentIds,
    toggleStudent,
    clearFilter: clearStudentFilter,
  } = useStudentFilter(userId);
  const {
    selectedTeacherIds,
    toggleTeacher,
    clearFilter: clearTeacherFilter,
  } = useTeacherFilter(userId);

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const toggleSubject = useCallback((id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);
  const clearSubjectFilter = useCallback(() => {
    setSelectedSubjectIds([]);
  }, []);

  const clearAll = useCallback(() => {
    clearStudentFilter();
    clearTeacherFilter();
    clearSubjectFilter();
  }, [clearStudentFilter, clearTeacherFilter, clearSubjectFilter]);

  // ADR-020 R5: 단일 teacher filter 만 활성 시 "teacher", 그 외 "subject".
  const autoColorBy = useMemo<AutoColorBy>(() => {
    const hasStudent = selectedStudentIds.length > 0;
    const hasTeacher = selectedTeacherIds.length > 0;
    const hasSubject = selectedSubjectIds.length > 0;
    if (hasTeacher && !hasStudent && !hasSubject) return "teacher";
    return "subject";
  }, [selectedStudentIds, selectedTeacherIds, selectedSubjectIds]);

  return {
    selectedStudentIds,
    selectedSubjectIds,
    selectedTeacherIds,
    colorBy,
    autoColorBy,
    toggleStudent,
    toggleSubject,
    toggleTeacher,
    setSelectedSubjectIds,
    clearStudentFilter,
    clearTeacherFilter,
    clearSubjectFilter,
    clearAll,
    setColorBy,
  };
}
