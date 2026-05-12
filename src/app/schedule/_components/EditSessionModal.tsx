"use client";
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Trash2, X, ChevronDown, Calendar, Clock, AlertCircle } from "lucide-react";
import { IconButton } from "@/components/atoms/IconButton";
import { EmptyState } from "@/components/atoms/EmptyState";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { BottomSheet } from "../../../components/molecules/BottomSheet";
import { buildDuplicateNameSet } from "../../../lib/duplicateLabel";
import TeacherPillPicker from "../../../components/molecules/TeacherPillPicker";
import { StudentChip } from "../../../components/molecules/StudentChip";

/**
 * 학년 배지가 별도 노출되는 row variant 전용 부제 — GroupSessionModal 동일 패턴.
 * helper 를 별도 export 로 두지 않는 이유: Turbopack 이 dynamic import chain 의
 * helper 모듈을 분리한 청크가 RSC stream 시점에 미로드 상태인 사고 회피.
 */
function formatStudentSubtitleExceptGrade(
  s: StudentOption,
  dupSet: Set<string>,
): string {
  const isDup = dupSet.has(s.name);
  if (isDup) {
    const identity: string[] = [];
    if (s.gender === "male") identity.push("남");
    else if (s.gender === "female") identity.push("여");
    if (s.birthDate) identity.push(s.birthDate);
    if (identity.length > 0) return identity.join(" · ");
  }
  if (s.school) return s.school;
  return "";
}
import { NAME_MAX_LENGTH } from "../../../lib/validation/profileSchemas";

type StudentOption = {
  id: string;
  name: string;
  gender?: string | null;
  birthDate?: string | null;
  grade?: string | null;
  school?: string | null;
};
type SubjectOption = { id: string; name: string; color?: string };
type TeacherOption = {
  id: string;
  name: string;
  color: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  subjectIds?: string[];
};

interface EditSessionModalProps {
  isOpen: boolean;
  selectedStudents: StudentOption[];
  onRemoveStudent: (studentId: string) => void;
  editStudentInputValue: string;
  onEditStudentInputChange: (value: string) => void;
  onEditStudentInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddStudentClick: () => void;
  editSearchResults: StudentOption[];
  onSelectSearchStudent: (studentId: string) => void;
  subjects: SubjectOption[];
  teachers: TeacherOption[];
  tempSubjectId: string;
  onSubjectChange: (subjectId: string) => void;
  tempTeacherId: string;
  onTeacherChange: (teacherId: string | null) => void;
  weekdays: string[];
  defaultWeekday: number;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  timeError: string;
  onDelete: () => Promise<void> | void;
  onCancel: () => void;
  onSave: (weekday: number) => Promise<void> | void;
  onSubjectColorChange?: (subjectId: string, newColor: string) => void;
  /**
   * 현재 주 시작 날짜 (YYYY-MM-DD, 월요일). 헤더 chip에 "5월 15일 (목)" 식 표시 + 캘린더 popover의
   * 선택 날짜 강조에 사용. 미지정 시 캘린더는 weekday-only (이전 동작 호환).
   */
  weekStartDate?: string;
}

// ── 캘린더 helper (Variant V3: 1달 캘린더) ──────────────────────────
function parseWeekStart(weekStartDate: string | undefined): Date | null {
  if (!weekStartDate) return null;
  try {
    // KST 기준 정오로 anchor — timezone 경계 회피
    return new Date(`${weekStartDate}T12:00:00+09:00`);
  } catch {
    return null;
  }
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

/** JS getDay()(일=0) → class-planner weekday (월=0, …, 일=6). */
function getWeekdayFromDate(d: Date): number {
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function formatChipLabel(
  weekStartDate: string | undefined,
  weekday: number,
  weekdaysLabels: string[],
): string {
  const week = parseWeekStart(weekStartDate);
  if (!week) return weekdaysLabels[weekday] ?? "";
  const d = addDays(week, weekday);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdaysLabels[weekday]})`;
}

const DEFAULT_COLOR = "#6366f1";

// 과목에 어울리는 대표 프리셋 팔레트
const PRESET_COLORS = [
  { hex: "#F59E0B", label: "앰버" },
  { hex: "#EF4444", label: "빨강" },
  { hex: "#EC4899", label: "핑크" },
  { hex: "#A855F7", label: "보라" },
  { hex: "#6366F1", label: "인디고" },
  { hex: "#3B82F6", label: "파랑" },
  { hex: "#06B6D4", label: "하늘" },
  { hex: "#14B8A6", label: "청록" },
  { hex: "#22C55E", label: "초록" },
  { hex: "#84CC16", label: "연두" },
  { hex: "#F97316", label: "주황" },
  { hex: "#64748B", label: "회색" },
];

const EditSessionModal: React.FC<EditSessionModalProps> = ({
  isOpen,
  selectedStudents,
  onRemoveStudent,
  editStudentInputValue,
  onEditStudentInputChange,
  onEditStudentInputKeyDown,
  onAddStudentClick,
  editSearchResults,
  onSelectSearchStudent,
  subjects,
  teachers,
  tempSubjectId,
  onSubjectChange,
  tempTeacherId,
  onTeacherChange,
  weekdays,
  defaultWeekday,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  timeError,
  onDelete,
  onCancel,
  onSave,
  onSubjectColorChange,
  weekStartDate,
}) => {
  const { containerRef } = useModalA11y({ isOpen, onClose: onCancel });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const colorInputRef = useRef<HTMLInputElement>(null);
  const swatchPanelRef = useRef<HTMLDivElement>(null);

  // ADR-015: 동명이인 학생 부제 — 같은 이름이 검색 결과에 2명+이면 식별 정보 노출.
  // 검색 결과(row variant)는 부가정보 인라인, 선택 칩(compact)은 호버 툴팁이 식별 담당.
  const studentDupNames = useMemo(
    () => buildDuplicateNameSet(editSearchResults),
    [editSearchResults],
  );

  const currentSubject = subjects.find((s) => s.id === tempSubjectId);

  // 원본 색상 (모달 열릴 때 스냅샷) — 취소 시 복원에 사용
  const [originalColor, setOriginalColor] = useState(currentSubject?.color ?? DEFAULT_COLOR);
  const [previewColor, setPreviewColor] = useState(originalColor);
  const [showSwatches, setShowSwatches] = useState(false);

  // 요일 선택 — controlled. defaultWeekday는 모달이 열릴 때만 반영.
  const [weekday, setWeekday] = useState<number>(defaultWeekday);

  // 모달이 열릴 때만 원본/프리뷰 초기화
  useEffect(() => {
    if (isOpen) {
      const c = currentSubject?.color ?? DEFAULT_COLOR;
      setOriginalColor(c);
      setPreviewColor(c);
      setShowSwatches(false);
      setWeekday(defaultWeekday);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 과목 변경 시 해당 과목 색으로 previewColor 갱신 (원본도 리셋)
  useEffect(() => {
    const c = currentSubject?.color ?? DEFAULT_COLOR;
    setOriginalColor(c);
    setPreviewColor(c);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempSubjectId]);

  // 스와치 패널 외부 클릭 시 닫기
  useEffect(() => {
    if (!showSwatches) return;
    const handleOutside = (e: MouseEvent) => {
      if (swatchPanelRef.current && !swatchPanelRef.current.contains(e.target as Node)) {
        setShowSwatches(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showSwatches]);

  // 색상은 previewColor에만 반영 — persist는 저장 시에만
  const handleColorSelect = (color: string) => {
    setPreviewColor(color);
  };

  // 취소: previewColor를 원본으로 되돌리고 닫기
  const handleCancel = useCallback(() => {
    setPreviewColor(originalColor);
    setShowSwatches(false);
    onCancel();
  }, [originalColor, onCancel]);

  // 저장: 학생 0명 가드 + 색상 변경 시 persist + onSave 호출
  // 학생 0명 → onSave 호출 X (이전 사고: 0명 저장 → 빈 enrollmentIds로 세션 자동 삭제)
  const handleSave = useCallback(() => {
    if (selectedStudents.length === 0) return;
    if (previewColor !== originalColor && tempSubjectId && onSubjectColorChange) {
      onSubjectColorChange(tempSubjectId, previewColor);
    }
    onSave(weekday);
  }, [selectedStudents.length, previewColor, originalColor, tempSubjectId, onSubjectColorChange, onSave, weekday]);

  const studentNames = selectedStudents.map((s) => s.name).join(" · ") || "학생 없음";

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // 시간 차이 → "8시간", "1시간 30분", "30분" 등. invalid (start ≥ end) 시 빈 문자열.
  const formatDuration = (start: string, end: string): string => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff <= 0) return "";
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };
  const duration = formatDuration(startTime, endTime);

  const fieldClass =
    "w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-hover)]/50 transition-colors";

  // ── 헤더 chip popover state ────────────────────────────────────────
  // 한 번에 하나만 열림. chip 클릭 toggle, 다른 chip 클릭 시 자동 close.
  const [openPopover, setOpenPopover] = useState<"weekday" | "time" | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ── 캘린더 (V3 month) ─────────────────────────────────────────────
  const weekStartObj = useMemo(() => parseWeekStart(weekStartDate), [weekStartDate]);
  // 선택된 날짜 = 이번 주의 weekday 위치 (다른 주는 시각 강조 X)
  const selectedDate = useMemo(
    () => (weekStartObj ? addDays(weekStartObj, weekday) : null),
    [weekStartObj, weekday],
  );
  // viewMonth — 캘린더가 보여줄 달. open 때마다 selected의 달로 초기화.
  const [viewMonth, setViewMonth] = useState<Date>(() =>
    selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : new Date(),
  );
  // popover open 또는 weekday 변경 시 viewMonth를 selected 달로 sync
  useEffect(() => {
    if (openPopover === "weekday" && selectedDate) {
      setViewMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPopover]);

  // popover 외부 클릭 시 닫기
  useEffect(() => {
    if (!openPopover) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [openPopover]);

  // ── Validation ─────────────────────────────────────────────────────
  // 학생 0명 시 저장 차단 — 기존 사고(0명 저장 → 세션 자동 삭제) 방지.
  const studentCount = selectedStudents.length;
  const isSaveDisabled = studentCount === 0;

  // ── 색상 선택 패널 ──────────────────────────────────────────────
  const colorPanel = onSubjectColorChange && tempSubjectId ? (
    <div className="relative" ref={swatchPanelRef}>
      {/* 색상 트리거 — IconButton (tinted variant, subject color). */}
      <IconButton
        variant="tinted"
        tintColor={previewColor}
        onClick={() => setShowSwatches((v) => !v)}
        aria-label="과목 색상 변경"
        title="색상 선택"
      >
        <span
          className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-white/20"
          style={{ backgroundColor: previewColor }}
        />
      </IconButton>

      {/* 스와치 패널 (드롭다운) */}
      {showSwatches && (
        <div
          className="absolute right-0 top-full mt-2 z-[100] rounded-2xl border border-white/10 bg-[var(--color-bg-primary)] p-3 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
          style={{ minWidth: 220 }}
        >
          {/* 패널 제목 + 색상 의미 설명 */}
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2.5 px-0.5">
            과목 대표색 (텍스트 · 강조)
          </p>

          {/* 프리셋 스와치 그리드 */}
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {PRESET_COLORS.map(({ hex, label }) => {
              const isActive = previewColor.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleColorSelect(hex)}
                  className="relative w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/40"
                  style={{ backgroundColor: hex }}
                  aria-label={label}
                  title={label}
                >
                  {isActive && (
                    <span className="absolute inset-0 rounded-full ring-[3px] ring-white/80" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 현재 선택 색 미리보기 */}
          <div className="flex items-center gap-2 mb-2.5 px-0.5">
            <span
              className="w-5 h-5 rounded-md flex-shrink-0 ring-1 ring-white/20"
              style={{ backgroundColor: previewColor }}
            />
            <span className="text-[12px] font-mono text-[var(--color-text-secondary)]">
              {previewColor.toUpperCase()}
            </span>
          </div>

          {/* 세밀한 선택 버튼 */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            className="w-full rounded-xl border border-[var(--color-border)] py-2 text-[12px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            + 직접 색상 선택
          </button>
          <input
            ref={colorInputRef}
            type="color"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            value={previewColor}
            onChange={(e) => handleColorSelect(e.target.value)}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  ) : null;

  // ── Form content ────────────────────────────────────────────────
  const formContent = (
    <div className="flex flex-col">
      {/* Header — variant C: Top Accent Band + Glass.
          subject color는 상단 4px 띠 + colorPanel chip 두 군데로 압축.
          본문 텍스트는 neutral 으로 유지해 redundancy 제거. */}
      <div
        className="relative px-5 pt-5 pb-4"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)), var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-0 h-1"
          style={{
            backgroundColor: previewColor,
            boxShadow: `0 1px 12px ${hexToRgba(previewColor, 0.45)}`,
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold leading-tight truncate text-[var(--color-text-primary)]">
              {currentSubject?.name ?? "과목 미선택"}
            </div>
            <p className="text-[12px] truncate text-[var(--color-text-muted)] mt-0.5">
              {studentNames}
            </p>
            {/* 헤더 chip — 요일/시간 inline edit (Variant C 채택, 2026-05-12).
                기존 read-only 카드를 클릭 가능 chip + popover로 교체. body의 요일/시간
                select 제거 (헤더가 SSOT). 한 번에 하나의 popover만 열림. */}
            <div className="inline-flex items-center mt-2 gap-1.5 relative" ref={popoverRef}>
              {/* Weekday chip — chip label은 weekStartDate 있으면 "X월 Y일 (요일)" 형식. */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === "weekday" ? null : "weekday")}
                aria-label={`요일: ${weekdays[weekday]}, 클릭해서 변경`}
                aria-expanded={openPopover === "weekday"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                  openPopover === "weekday"
                    ? "border-[#fbbf24] bg-[rgba(245,158,11,0.18)]"
                    : "border-[var(--color-border)] bg-[rgba(245,158,11,0.12)] hover:bg-[rgba(245,158,11,0.18)]"
                }`}
              >
                <Calendar size={12} strokeWidth={2} className="text-[#fbbf24]" />
                <span className="text-[13px] font-bold text-[#fbbf24]">
                  {formatChipLabel(weekStartDate, weekday, weekdays)}
                </span>
                <ChevronDown size={11} className="text-[#fbbf24] opacity-60" />
              </button>

              {/* Time chip */}
              <button
                type="button"
                onClick={() => setOpenPopover(openPopover === "time" ? null : "time")}
                aria-label={`수업 시간: ${startTime}부터 ${endTime}까지, 클릭해서 변경`}
                aria-expanded={openPopover === "time"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors ${
                  openPopover === "time"
                    ? "border-[var(--color-accent-hover)] bg-white/[0.08]"
                    : "border-[var(--color-border)] bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <Clock size={12} strokeWidth={2} className="text-[var(--color-text-muted)]" />
                <span className="text-[13px] font-bold text-[var(--color-text-primary)] tabular-nums">
                  {startTime} – {endTime}
                </span>
                {duration && (
                  <span className="text-[11px] text-[var(--color-text-muted)] ml-0.5">· {duration}</span>
                )}
                <ChevronDown size={11} className="text-[var(--color-text-muted)] opacity-60" />
              </button>

              {/* Weekday popover — V3 month calendar (사용자 결정 2026-05-12).
                  weekStartDate prop이 있으면 month grid. 없으면 fallback으로 7-grid. */}
              {openPopover === "weekday" && (
                <div
                  className="absolute left-0 top-full mt-2 z-[60] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl p-3"
                  style={{ minWidth: weekStartObj ? 280 : 240 }}
                >
                  {weekStartObj ? (
                    <>
                      {/* Month navigation header */}
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() =>
                            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                          }
                          aria-label="이전 달"
                          className="w-7 h-7 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          ‹
                        </button>
                        <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                          {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                          }
                          aria-label="다음 달"
                          className="w-7 h-7 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-overlay-light)] hover:text-[var(--color-text-primary)] transition-colors"
                        >
                          ›
                        </button>
                      </div>

                      {/* Weekday header */}
                      <div className="grid grid-cols-7 gap-0.5 mb-1">
                        {weekdays.map((label) => (
                          <div
                            key={label}
                            className="text-[10px] text-[var(--color-text-muted)] text-center py-1"
                          >
                            {label}
                          </div>
                        ))}
                      </div>

                      {/* Month grid cells */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {(() => {
                          const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
                          const firstWeekday = getWeekdayFromDate(firstDay);
                          const daysInMonth = new Date(
                            viewMonth.getFullYear(),
                            viewMonth.getMonth() + 1,
                            0,
                          ).getDate();
                          const cells: { date: Date | null; label: number | null }[] = [];
                          for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, label: null });
                          for (let day = 1; day <= daysInMonth; day++) {
                            cells.push({
                              date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day),
                              label: day,
                            });
                          }
                          while (cells.length < 42) cells.push({ date: null, label: null });

                          const today = new Date();
                          const todayString = today.toDateString();
                          const selectedString = selectedDate?.toDateString();

                          return cells.map((cell, idx) => {
                            if (!cell.date) return <div key={idx} className="h-8" />;
                            const isToday = cell.date.toDateString() === todayString;
                            const isSelected =
                              selectedString && cell.date.toDateString() === selectedString;
                            let cls = "text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-light)]";
                            if (isSelected) {
                              cls = "bg-[#fbbf24] text-[var(--color-admin-ink)] font-bold";
                            } else if (isToday) {
                              cls = "ring-1 ring-[#fbbf24] text-[#fbbf24] hover:bg-[var(--color-overlay-light)]";
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setWeekday(getWeekdayFromDate(cell.date!));
                                  setOpenPopover(null);
                                }}
                                className={`h-8 rounded text-[12px] transition-colors ${cls}`}
                              >
                                {cell.label}
                              </button>
                            );
                          });
                        })()}
                      </div>
                      <div className="mt-2 text-[10px] text-[var(--color-text-muted)] text-center">
                        다른 날짜 클릭 → 그 요일로 적용 (주간 반복)
                      </div>
                    </>
                  ) : (
                    // Fallback — weekStartDate prop 없을 때 기존 7-grid
                    <>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-0.5">
                        요일 선택
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {weekdays.map((label, idx) => {
                          const isActive = idx === weekday;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setWeekday(idx);
                                setOpenPopover(null);
                              }}
                              className={`h-9 rounded-lg text-[13px] font-semibold transition-colors ${
                                isActive
                                  ? "bg-[#fbbf24] text-[var(--color-admin-ink)]"
                                  : "bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-overlay-light)]"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Time popover — controlled inputs(부모로 즉시 위임), timeError도 함께 표시 */}
              {openPopover === "time" && (
                <div
                  className="absolute left-0 top-full mt-2 z-[60] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-2xl p-3"
                  style={{ minWidth: 280 }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 px-0.5">
                    수업 시간
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      aria-label="시작 시간"
                      className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-lg px-2.5 py-1.5 text-[13px] border border-[var(--color-border)] outline-none focus:border-[var(--color-accent-hover)]/50"
                      value={startTime}
                      onChange={(e) => onStartTimeChange(e.target.value)}
                    />
                    <span className="text-[var(--color-text-muted)]">—</span>
                    <input
                      type="time"
                      aria-label="종료 시간"
                      className="flex-1 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-lg px-2.5 py-1.5 text-[13px] border border-[var(--color-border)] outline-none focus:border-[var(--color-accent-hover)]/50"
                      value={endTime}
                      onChange={(e) => onEndTimeChange(e.target.value)}
                    />
                  </div>
                  {timeError && (
                    <p className="mt-2 text-[11px] text-[var(--color-danger)]" role="alert">{timeError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {colorPanel}
            <IconButton
              aria-label="수업 삭제"
              variant="danger"
              onClick={onDelete}
            >
              <Trash2 size={14} strokeWidth={2} />
            </IconButton>
            <IconButton aria-label="닫기" onClick={handleCancel}>
              <X size={15} strokeWidth={2} />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Form body — 과목 → 강사 → 학생 순 (Variant C 채택, 2026-05-12).
          학생 picker가 본문 비중 가장 큼 → 마지막에 배치해 위 두 필수 메타가 항상 위에 보임. */}
      <div className="px-5 py-4 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
        {/* Subject */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-modal-subject" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            과목 <span className="text-[var(--color-danger)]">*</span>
          </label>
          <select
            id="edit-modal-subject"
            className={fieldClass}
            value={tempSubjectId}
            onChange={(e) => onSubjectChange(e.target.value)}
          >
            <option value="">과목 선택</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Teacher (always shown, pills) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">강사</label>
          <TeacherPillPicker
            teachers={teachers}
            selectedTeacherId={tempTeacherId || null}
            onSelect={(id) => onTeacherChange(id ?? null)}
            subjectId={tempSubjectId || null}
            subjectName={currentSubject?.name}
          />
        </div>

        {/* Students — variant D: Combobox + pinned-open dropdown.
            검색 안 해도 미선택 학생 리스트가 항상 보임. 검색어 시 즉시 필터.
            검색 결과 0 + 검색어 있을 때만 "+ 새 학생으로 추가" CTA 노출. */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">학생</span>
            <span className="text-[10.5px] text-[var(--color-text-muted)]">
              선택 <span className="text-[var(--color-text-primary)] font-semibold">{selectedStudents.length}</span>
            </span>
          </div>

          {/* Combobox trigger — chip + 검색 input */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-2 flex flex-wrap items-center gap-1.5 focus-within:border-[var(--color-accent-hover)]/50 transition-colors min-h-[44px]">
            {selectedStudents.length === 0 && !editStudentInputValue && (
              <span className="text-[12px] text-[var(--color-text-muted)] px-1">선택된 학생 없음</span>
            )}
            {selectedStudents.map((student) => (
              <StudentChip
                key={student.id}
                student={student}
                variant="compact"
                onRemove={() => onRemoveStudent(student.id)}
              />
            ))}
            <input
              id="edit-modal-students"
              type="text"
              placeholder={selectedStudents.length === 0 ? "학생 검색 또는 새 이름 입력…" : "검색…"}
              className="flex-1 min-w-[100px] bg-transparent border-0 outline-none px-1 py-1 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
              value={editStudentInputValue}
              onChange={(e) => onEditStudentInputChange(e.target.value.slice(0, NAME_MAX_LENGTH))}
              onKeyDown={onEditStudentInputKeyDown}
              maxLength={NAME_MAX_LENGTH}
            />
          </div>

          {/* "+ 새 학생으로 추가" CTA — 검색어 있고 매칭 결과 없을 때만 */}
          {editStudentInputValue?.trim() && editSearchResults.length === 0 && (
            <button
              type="button"
              onClick={onAddStudentClick}
              className="self-start rounded-xl bg-[var(--color-primary)] px-3 py-2 text-[12.5px] font-semibold text-white hover:opacity-90 transition-opacity"
            >
              ＋ &lsquo;{editStudentInputValue}&rsquo; 새 학생으로 추가
            </button>
          )}

          {/* Pinned-open dropdown — 미선택 학생 리스트 (검색어 있으면 필터된 결과).
              overscroll-contain: nested scroll trap 회피. mouse wheel 이 outer
              form body 로 전파되지 않고 dropdown 안에서만 동작. */}
          {editSearchResults.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-lg max-h-[260px] overflow-y-auto overscroll-contain">
              <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] sticky top-0 bg-[var(--color-bg-primary)] z-10 border-b border-[var(--color-border)]">
                {editStudentInputValue?.trim()
                  ? `검색 결과 (${editSearchResults.length})`
                  : `선택 가능 (${editSearchResults.length})`}
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {editSearchResults.map((student) => {
                  const subtitle = formatStudentSubtitleExceptGrade(student, studentDupNames);
                  return (
                    <StudentChip
                      key={student.id}
                      student={student}
                      variant="row"
                      metaRight={subtitle || undefined}
                      onClick={() => onSelectSearchStudent(student.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* "더 추가할 학생 없음" — 미선택 0 + 검색어 X + 이미 1명+ 선택됨 */}
          {!editStudentInputValue?.trim() &&
            editSearchResults.length === 0 &&
            selectedStudents.length > 0 && (
              <EmptyState>더 추가할 학생이 없습니다</EmptyState>
            )}
        </div>

        {/* 요일/시간 select 제거 — 헤더 chip이 SSOT (2026-05-12 Variant C 채택).
            기존 weekday/time select는 헤더 chip + popover로 이전됨. */}
      </div>

      {/* Footer — V1-disabled validation: 학생 0명 시 저장 차단 + 좌측 helper text.
          이전 사고(0명 저장 → 세션 자동 삭제) 방지. handleSave에도 가드 이중 방어. */}
      <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
        <div className="text-[11px] text-[var(--color-text-muted)] min-h-[18px]">
          {isSaveDisabled && (
            <span className="inline-flex items-center gap-1.5 text-[#fbbf24]">
              <AlertCircle size={12} strokeWidth={2} />
              학생 1명 이상 선택 필요
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaveDisabled}
            aria-disabled={isSaveDisabled}
            className={`rounded-xl px-6 py-2 text-[13px] font-semibold transition-opacity ${
              isSaveDisabled
                ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] cursor-not-allowed"
                : "bg-[var(--color-primary)] text-white hover:opacity-90"
            }`}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );

  if (!isDesktop && isOpen) {
    return (
      <BottomSheet isOpen={isOpen} onClose={handleCancel} title="수업 편집" aria-labelledby="edit-session-modal-title">
        {formContent}
      </BottomSheet>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="fixed left-1/2 top-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-modal-title"
        data-testid="edit-session-modal"
        ref={containerRef}
      >
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] backdrop-blur-xl overflow-hidden">
          <h4 id="edit-session-modal-title" className="sr-only">수업 편집</h4>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default EditSessionModal;
