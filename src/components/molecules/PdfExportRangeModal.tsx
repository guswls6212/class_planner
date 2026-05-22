"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";
import type { ScheduleViewMode } from "@/hooks/useScheduleView";
import {
  addWeeks,
  formatLocalISO,
  getMonthWeekRange,
  getWeekStart,
} from "@/lib/dateUtils";
import type { PreflightResult } from "@/lib/pdf/preflightCheck";

export interface PdfExportRange {
  startDate: string;
  endDate: string;
  perTeacher?: boolean;
  perStudent?: boolean;
  showStudentNames?: boolean;
  selectedTeacherIds?: string[];   // undefined = all (backward compat)
  selectedStudentIds?: string[];   // undefined = all (backward compat)
  /** PR #432 (UAT 2026-05-22): 화면 필터 적용 여부. true(default)=필터된 수업만 인쇄, false=전체 인쇄 */
  applyFilter?: boolean;
}

type Scope = "current" | "range" | "per-teacher" | "per-student";
type PrintTarget = "filtered" | "all";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExport: (range: PdfExportRange) => void;
  viewMode: ScheduleViewMode;
  selectedDate: Date;
  isExporting?: boolean;
  teachers?: { id: string; name: string; color?: string }[];
  students?: { id: string; name: string; color?: string }[];
  preflightResult?: PreflightResult;
  hasStudentFilter?: boolean;
  hasTeacherFilter?: boolean;
  /** Dropdown에서 진입 시 모드 pre-set (per-teacher | per-student). 미설정 시 current. */
  initialScope?: Scope;
  /** PR #432: 화면 필터 활성 여부. true 시 "인쇄 대상" 라디오 그룹 표시 */
  hasAnyFilter?: boolean;
  /** PR #432: 필터 적용된 수업 수 (현재 화면 표시) */
  filteredCount?: number;
  /** PR #432: 전체 수업 수 (필터 무관) */
  totalCount?: number;
}

const STUDENT_PAGE_GUARD_THRESHOLD = 30;

// 무한 re-render 회피 — Props default `= []` 는 매 render 마다 new reference
// → useEffect dep `[scope, teachers, students]` 변경 인지 → 발동 → setState
// → re-render → 무한 hang (vitest jsdom 환경에서 silent CPU 100% lockup).
// Module-level stable reference 로 dep 변화 차단.
const EMPTY_TEACHERS: { id: string; name: string; color?: string }[] = [];
const EMPTY_STUDENTS: { id: string; name: string; color?: string }[] = [];

export default function PdfExportRangeModal({
  isOpen,
  onClose,
  onExport,
  viewMode,
  selectedDate,
  isExporting = false,
  teachers = EMPTY_TEACHERS,
  students = EMPTY_STUDENTS,
  preflightResult,
  hasStudentFilter = false,
  hasTeacherFilter = false,
  initialScope,
  hasAnyFilter = false,
  filteredCount = 0,
  totalCount = 0,
}: Props) {
  const { containerRef } = useModalA11y({ isOpen, onClose });
  const isMonthly = viewMode === "monthly";
  const [scope, setScope] = useState<Scope>(initialScope ?? "current");
  const [printTarget, setPrintTarget] = useState<PrintTarget>("filtered");
  const [showStudentNames, setShowStudentNames] = useState(false);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(
    () => teachers.map((t) => t.id)
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    () => students.map((s) => s.id)
  );

  // Dropdown 재진입 시 initialScope 반영 (예: 전체 인쇄 → 학생별로 재오픈).
  useEffect(() => {
    if (isOpen && initialScope) setScope(initialScope);
  }, [isOpen, initialScope]);

  useEffect(() => {
    if (hasStudentFilter && scope === "per-teacher") {
      setScope("current");
    }
    if (hasTeacherFilter && scope === "per-student") {
      setScope("current");
    }
    // PR #432-follow-up: "필터 적용 수업만" 선택 + 강사별/학생별 = 의미 모호 → current 로 reset
    if (
      hasAnyFilter &&
      printTarget === "filtered" &&
      (scope === "per-teacher" || scope === "per-student")
    ) {
      setScope("current");
    }
  }, [hasStudentFilter, hasTeacherFilter, hasAnyFilter, printTarget, scope]);

  useEffect(() => {
    if (scope === "per-teacher") {
      setSelectedTeacherIds(teachers.map((t) => t.id));
    }
    if (scope === "per-student") {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  }, [scope, teachers, students]);

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
  const noTeachers = teachers.length === 0;
  const noStudents = students.length === 0;
  // PR #432-follow-up: 필터 적용 수업만 + 강사별/학생별 = 의미 모호 → disable
  const splitDisabledByFilter = hasAnyFilter && printTarget === "filtered";
  const noTeachersSelected = scope === "per-teacher" && selectedTeacherIds.length === 0;
  const noStudentsSelected = scope === "per-student" && selectedStudentIds.length === 0;
  const studentPageExplosion =
    scope === "per-student" && selectedStudentIds.length > STUDENT_PAGE_GUARD_THRESHOLD;

  // PR #432: 화면 필터 활성 시 사용자가 "필터된 수업만 / 전체 수업" 선택. 필터 미활성 시 default true.
  const applyFilter = hasAnyFilter ? printTarget === "filtered" : true;

  const handleExport = () => {
    if (
      studentPageExplosion &&
      !window.confirm(
        `${selectedStudentIds.length}명의 학생 각각 1페이지로 출력합니다. 계속할까요?`,
      )
    ) {
      return;
    }
    if (isMonthly) {
      const { start, end } = getMonthWeekRange(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1
      );
      onExport({ startDate: formatLocalISO(start), endDate: formatLocalISO(end), applyFilter });
      return;
    }
    if (scope === "current") {
      onExport({ startDate: formatLocalISO(weekStart), endDate: formatLocalISO(weekEnd), applyFilter });
      return;
    }
    if (scope === "per-teacher") {
      const weekStartStr = formatLocalISO(weekStart);
      const weekEndStr = formatLocalISO(weekEnd);
      onExport({
        startDate: weekStartStr,
        endDate: weekEndStr,
        perTeacher: true,
        showStudentNames,
        selectedTeacherIds,
        applyFilter,
      });
      return;
    }
    if (scope === "per-student") {
      const weekStartStr = formatLocalISO(weekStart);
      const weekEndStr = formatLocalISO(weekEnd);
      onExport({
        startDate: weekStartStr,
        endDate: weekEndStr,
        perStudent: true,
        selectedStudentIds,
        applyFilter,
      });
      return;
    }
    onExport({ startDate: rangeStart, endDate: rangeEnd, applyFilter });
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

        {hasAnyFilter && (
          <div className="mb-4">
            <div className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1.5">
              인쇄 대상
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pdf-print-target"
                  aria-label="필터 적용 수업만"
                  checked={printTarget === "filtered"}
                  onChange={() => setPrintTarget("filtered")}
                />
                <span className="text-sm text-[var(--color-text-primary)]">
                  필터 적용 수업만
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  ({filteredCount} 수업)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pdf-print-target"
                  aria-label="전체 수업 (필터 무시)"
                  checked={printTarget === "all"}
                  onChange={() => setPrintTarget("all")}
                />
                <span className="text-sm text-[var(--color-text-primary)]">
                  전체 수업
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  (필터 무시 — {totalCount} 수업)
                </span>
              </label>
            </div>
            <div className="border-t border-[var(--color-border)] mt-3" />
          </div>
        )}

        {preflightResult && preflightResult.warnings.length > 0 && printTarget === "filtered" && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm"
          >
            <p className="font-medium text-amber-800 dark:text-amber-300 mb-1.5">
              ⚠ 출력 시 확인
              {hasAnyFilter && (
                <span className="ml-1 font-normal text-amber-700/80 dark:text-amber-400/80 text-xs">
                  ({filteredCount} 수업 기준)
                </span>
              )}
            </p>
            <ul className="space-y-1">
              {preflightResult.warnings.map((w, i) => (
                <li key={i} className="text-amber-700 dark:text-amber-400">
                  • {w.message}
                </li>
              ))}
            </ul>
            {preflightResult.suggestSplit === "per-teacher" && !hasStudentFilter && (
              <button
                type="button"
                onClick={() => setScope("per-teacher")}
                className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2 hover:no-underline"
              >
                강사별 분할로 전환
              </button>
            )}
          </div>
        )}

        {hasAnyFilter && printTarget === "all" && (
          <div className="mb-4 text-xs text-[var(--color-text-muted)]">
            전체 {totalCount} 수업 인쇄 — 화면 필터 무시 (preflight 경고 미반영)
          </div>
        )}

        {isMonthly ? (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="radio" checked readOnly aria-label="해당 월 전체 출력" />
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
                aria-label="현재 뷰만 출력"
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
                aria-label="여러 주 범위 출력"
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
            {!hasStudentFilter && (
              <>
                <label
                  className={`flex items-center gap-2 cursor-pointer ${noTeachers || splitDisabledByFilter ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="pdf-scope"
                    aria-label="강사별로 1장씩"
                    value="per-teacher"
                    checked={scope === "per-teacher"}
                    onChange={() => setScope("per-teacher")}
                    disabled={noTeachers || splitDisabledByFilter}
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    강사별로 1장씩
                  </span>
                  {noTeachers ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      (강사가 없습니다)
                    </span>
                  ) : splitDisabledByFilter ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      (전체 수업 선택 시 활용)
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {scope === "per-teacher" && selectedTeacherIds.length > 0
                        ? selectedTeacherIds.length === teachers.length
                          ? `(전체 ${teachers.length}명)`
                          : `(${selectedTeacherIds.length}명 선택)`
                        : "(강사 수만큼 파일 다운로드)"}
                    </span>
                  )}
                </label>
                {scope === "per-teacher" && (
                  <div className="ml-6 mt-2 flex flex-col gap-2">
                    {/* 강사 chip 선택 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[var(--color-text-muted)]">출력할 강사</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTeacherIds(
                              selectedTeacherIds.length === teachers.length
                                ? []
                                : teachers.map((t) => t.id)
                            )
                          }
                          className="text-xs text-[var(--color-accent)] hover:underline underline-offset-2"
                        >
                          {selectedTeacherIds.length === teachers.length ? "전체 해제" : "전체 선택"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {teachers.map((teacher) => {
                          const isSelected = selectedTeacherIds.includes(teacher.id);
                          return (
                            <button
                              key={teacher.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setSelectedTeacherIds((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== teacher.id)
                                    : [...prev, teacher.id]
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isSelected
                                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                                  : "border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 hover:opacity-75"
                              }`}
                            >
                              {teacher.color && (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: teacher.color }}
                                />
                              )}
                              {teacher.name}
                            </button>
                          );
                        })}
                      </div>
                      {noTeachersSelected && (
                        <p className="text-xs text-red-500 mt-1">강사를 1명 이상 선택해주세요.</p>
                      )}
                    </div>

                    {/* 학생 이름 포함 */}
                    <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStudentNames}
                        onChange={(e) => setShowStudentNames(e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-accent)]"
                      />
                      학생 이름 포함
                    </label>
                  </div>
                )}
              </>
            )}
            {!hasTeacherFilter && (
              <>
                <label
                  className={`flex items-center gap-2 cursor-pointer ${noStudents || splitDisabledByFilter ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="pdf-scope"
                    aria-label="학생별로 1장씩"
                    value="per-student"
                    checked={scope === "per-student"}
                    onChange={() => setScope("per-student")}
                    disabled={noStudents || splitDisabledByFilter}
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    학생별로 1장씩
                  </span>
                  {noStudents ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      (학생이 없습니다)
                    </span>
                  ) : splitDisabledByFilter ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      (전체 수업 선택 시 활용)
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {scope === "per-student" && selectedStudentIds.length > 0
                        ? selectedStudentIds.length === students.length
                          ? `(전체 ${students.length}명)`
                          : `(${selectedStudentIds.length}명 선택)`
                        : "(학생 수만큼 파일 다운로드)"}
                    </span>
                  )}
                </label>
                {scope === "per-student" && (
                  <div className="ml-6 mt-2 flex flex-col gap-2">
                    {/* 학생 chip 선택 */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[var(--color-text-muted)]">출력할 학생</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudentIds(
                              selectedStudentIds.length === students.length
                                ? []
                                : students.map((s) => s.id)
                            )
                          }
                          className="text-xs text-[var(--color-accent)] hover:underline underline-offset-2"
                        >
                          {selectedStudentIds.length === students.length ? "전체 해제" : "전체 선택"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {students.map((student) => {
                          const isSelected = selectedStudentIds.includes(student.id);
                          return (
                            <button
                              key={student.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setSelectedStudentIds((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== student.id)
                                    : [...prev, student.id]
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                                isSelected
                                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                                  : "border-[var(--color-border)] text-[var(--color-text-muted)] opacity-50 hover:opacity-75"
                              }`}
                            >
                              {student.color && (
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: student.color }}
                                />
                              )}
                              {student.name}
                            </button>
                          );
                        })}
                      </div>
                      {noStudentsSelected && (
                        <p className="text-xs text-red-500 mt-1">학생을 1명 이상 선택해주세요.</p>
                      )}
                      {studentPageExplosion && (
                        <p
                          role="status"
                          className="text-xs text-amber-700 dark:text-amber-300 mt-1"
                        >
                          ⚠ {selectedStudentIds.length}명 → {selectedStudentIds.length}개 파일 다운로드. 출력 시 한 번 더 확인합니다.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
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
            disabled={rangeInvalid || noTeachersSelected || noStudentsSelected || isExporting}
            className="px-4 py-2 rounded-md bg-accent text-sm text-white font-medium disabled:opacity-50 transition-colors"
          >
            {isExporting ? "출력 중..." : "출력"}
          </button>
        </div>
      </div>
    </div>
  );
}
