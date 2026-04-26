"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Trash2, X, ChevronDown } from "lucide-react";
import { useModalA11y } from "../../../hooks/useModalA11y";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { BottomSheet } from "../../../components/molecules/BottomSheet";

type StudentOption = { id: string; name: string };
type SubjectOption = { id: string; name: string; color?: string };
type TeacherOption = { id: string; name: string; color: string };

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
  onTeacherChange: (teacherId: string) => void;
  weekdays: string[];
  defaultWeekday: number;
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  timeError: string;
  onDelete: () => Promise<void> | void;
  onCancel: () => void;
  onSave: () => Promise<void> | void;
  onSubjectColorChange?: (subjectId: string, newColor: string) => void;
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
}) => {
  const { containerRef } = useModalA11y({ isOpen, onClose: onCancel });
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const colorInputRef = useRef<HTMLInputElement>(null);
  const swatchPanelRef = useRef<HTMLDivElement>(null);

  const currentSubject = subjects.find((s) => s.id === tempSubjectId);

  // 원본 색상 (모달 열릴 때 스냅샷) — 취소 시 복원에 사용
  const [originalColor, setOriginalColor] = useState(currentSubject?.color ?? DEFAULT_COLOR);
  const [previewColor, setPreviewColor] = useState(originalColor);
  const [showSwatches, setShowSwatches] = useState(false);

  // 모달이 열릴 때만 원본/프리뷰 초기화
  useEffect(() => {
    if (isOpen) {
      const c = currentSubject?.color ?? DEFAULT_COLOR;
      setOriginalColor(c);
      setPreviewColor(c);
      setShowSwatches(false);
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

  // 저장: 색상이 바뀐 경우에만 persist 후 onSave 호출
  const handleSave = useCallback(() => {
    if (previewColor !== originalColor && tempSubjectId && onSubjectColorChange) {
      onSubjectColorChange(tempSubjectId, previewColor);
    }
    onSave();
  }, [previewColor, originalColor, tempSubjectId, onSubjectColorChange, onSave]);

  const studentNames = selectedStudents.map((s) => s.name).join(" · ") || "학생 없음";

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const fieldClass =
    "w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2.5 text-[13px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-hover)]/50 transition-colors";

  // ── 색상 선택 패널 ──────────────────────────────────────────────
  const colorPanel = onSubjectColorChange && tempSubjectId ? (
    <div className="relative" ref={swatchPanelRef}>
      {/* 팔레트 버튼 (현재 색 미리보기 dot) */}
      <button
        type="button"
        onClick={() => setShowSwatches((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors"
        aria-label="과목 색상 변경"
        title="색상 선택"
      >
        <span
          className="w-4 h-4 rounded-full ring-2 ring-white/30 flex-shrink-0"
          style={{ backgroundColor: previewColor }}
        />
        <ChevronDown size={11} strokeWidth={2.5} style={{ color: previewColor, opacity: 0.8 }} />
      </button>

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
      {/* Colored Header */}
      <div
        className="relative px-5 pt-5 pb-4"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(previewColor, 0.35)}, ${hexToRgba(previewColor, 0.15)})`,
          borderBottom: `1px solid ${hexToRgba(previewColor, 0.3)}`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white/20"
                style={{ backgroundColor: previewColor }}
              />
              <span
                className="text-[18px] font-extrabold leading-tight truncate"
                style={{ color: previewColor }}
              >
                {currentSubject?.name ?? "과목 미선택"}
              </span>
            </div>
            <p className="text-[12px] truncate" style={{ color: hexToRgba(previewColor, 0.8) }}>
              {studentNames}
            </p>
            <div
              className="inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: hexToRgba(previewColor, 0.2), color: previewColor, border: `1px solid ${hexToRgba(previewColor, 0.3)}` }}
            >
              {weekdays[defaultWeekday]} {startTime}–{endTime}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {colorPanel}
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.3)] text-[#f87171] hover:bg-[rgba(239,68,68,0.25)] transition-colors"
              aria-label="수업 삭제"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-[var(--color-text-muted)] transition-colors"
              aria-label="닫기"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Form body */}
      <div className="px-5 py-4 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
        {/* Students */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">학생</span>
          <div className="min-h-[40px] flex flex-wrap gap-1.5 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2">
            {selectedStudents.length === 0 && (
              <span className="text-[12px] text-[var(--color-text-muted)]">선택된 학생 없음</span>
            )}
            {selectedStudents.map((student) => (
              <span
                key={student.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 px-2.5 py-1 text-[12px] font-medium text-[var(--color-primary-light,#a5b4fc)]"
              >
                {student.name}
                <button
                  type="button"
                  className="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-white/20 transition-colors"
                  onClick={() => onRemoveStudent(student.id)}
                  aria-label={`${student.name} 제거`}
                >
                  <X size={9} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id="edit-modal-students"
              type="text"
              placeholder="학생 이름 검색..."
              className={`${fieldClass} flex-1`}
              value={editStudentInputValue}
              onChange={(e) => onEditStudentInputChange(e.target.value)}
              onKeyDown={onEditStudentInputKeyDown}
            />
            <button
              type="button"
              className="flex-shrink-0 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:opacity-90 transition-opacity"
              onClick={onAddStudentClick}
              disabled={!editStudentInputValue?.trim()}
            >
              추가
            </button>
          </div>
          {editStudentInputValue?.trim() && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden shadow-lg">
              {editSearchResults.length === 0 ? (
                <div className="p-3 text-center text-[12px] text-[var(--color-text-secondary)]">검색 결과가 없습니다</div>
              ) : (
                editSearchResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="flex w-full items-center gap-2.5 border-b border-[var(--color-border)] bg-transparent px-3 py-2.5 text-left text-[13px] text-[var(--color-text-primary)] last:border-b-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
                    onClick={() => onSelectSearchStudent(student.id)}
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/15 text-[10px] font-bold text-[#a5b4fc]">
                      {student.name[0]}
                    </span>
                    {student.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Subject + Teacher */}
        <div className="grid grid-cols-2 gap-3">
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

          {teachers.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-modal-teacher" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">강사</label>
              <select id="edit-modal-teacher" className={fieldClass} value={tempTeacherId} onChange={(e) => onTeacherChange(e.target.value)}>
                <option value="">선택사항</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-modal-weekday" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                요일 <span className="text-[var(--color-danger)]">*</span>
              </label>
              <select id="edit-modal-weekday" className={fieldClass} defaultValue={defaultWeekday}>
                {weekdays.map((w, idx) => <option key={idx} value={idx}>{w}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Weekday (when teachers shown) + Time */}
        <div className="grid grid-cols-2 gap-3">
          {teachers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-modal-weekday" className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                요일 <span className="text-[var(--color-danger)]">*</span>
              </label>
              <select id="edit-modal-weekday" className={fieldClass} defaultValue={defaultWeekday}>
                {weekdays.map((w, idx) => <option key={idx} value={idx}>{w}</option>)}
              </select>
            </div>
          )}
          <div className={`flex flex-col gap-1.5 ${teachers.length > 0 ? "" : "col-span-2"}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              수업 시간 <span className="text-[var(--color-danger)]">*</span>
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2">
              <input
                id="edit-modal-start-time"
                type="time"
                aria-label="시작 시간"
                className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--color-text-primary)] outline-none"
                value={startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
              />
              <span className="text-[var(--color-text-muted)] text-[12px]">—</span>
              <input
                id="edit-modal-end-time"
                type="time"
                aria-label="종료 시간"
                className="flex-1 bg-transparent text-[14px] font-semibold text-[var(--color-text-primary)] outline-none"
                value={endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
              />
            </div>
            {timeError && (
              <p className="text-[11px] text-[var(--color-danger)]" role="alert">{timeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)] flex items-center justify-end gap-2">
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
          className="rounded-xl px-6 py-2 text-[13px] font-semibold text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity"
          style={{ backgroundColor: previewColor }}
        >
          저장
        </button>
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
