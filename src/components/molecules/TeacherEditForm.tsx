"use client";

import { Mail, Phone, FileText, Palette } from "lucide-react";
import {
  NAME_MAX_LENGTH,
  formatKoreanPhone,
} from "@/lib/validation/profileSchemas";
import { TeacherColorPicker } from "./TeacherColorPicker";

export interface TeacherEditFormProps {
  canManage: boolean;
  canEditOwn: boolean;
  editName: string;
  editEmail: string;
  editPhone: string;
  editNotes: string;
  /** 색상 (canManage 시에만 변경 가능). 저장 버튼 클릭 시 commit. */
  editColor: string;
  onColorChange: (c: string) => void;
  error?: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TeacherEditForm({
  canManage,
  editName,
  editEmail,
  editPhone,
  editNotes,
  editColor,
  onColorChange,
  error,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onNotesChange,
  onSave,
  onCancel,
}: TeacherEditFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Name input — owner/admin only */}
      {canManage && (
        <div className="flex items-center gap-2">
          <label className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)]">이름</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => onNameChange(e.target.value.slice(0, NAME_MAX_LENGTH))}
            maxLength={NAME_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) onSave();
            }}
            className="flex-1 border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      )}
      {/* Email + Phone grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Mail size={11} strokeWidth={1.5} />
            이메일
          </label>
          <input
            type="email"
            value={editEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="example@mail.com"
            className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Phone size={11} strokeWidth={1.5} />
            전화번호
          </label>
          <input
            type="tel"
            value={editPhone}
            onChange={(e) => onPhoneChange(formatKoreanPhone(e.target.value))}
            placeholder="010-0000-0000"
            className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      {/* 역할 변경은 Settings → 멤버 흐름이 SSOT (ADR-015). detail에서 제거. */}
      {/* Notes */}
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
          <FileText size={11} strokeWidth={1.5} />
          메모
        </label>
        <textarea
          value={editNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="강사 관련 메모..."
          className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>
      {/* 색상 — canManage 시에만 변경 가능. 저장 버튼 클릭 시 commit (autosave 제거, ADR-015). */}
      {canManage && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <Palette size={11} strokeWidth={1.5} />
            색상
          </label>
          <TeacherColorPicker
            selectedColor={editColor}
            canManage={canManage}
            onColorChange={onColorChange}
          />
        </div>
      )}
      {error && (
        <div
          className="rounded-md border border-red-500/40 bg-red-500/[0.08] px-3 py-2 text-xs text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}
      {/* Save / Cancel */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onSave}
          className="flex-1 py-2 bg-accent text-[var(--color-admin-ink)] rounded-md font-medium text-[13px] hover:opacity-90 transition-opacity"
        >
          저장
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] rounded-md text-[13px] hover:opacity-80 transition-opacity"
        >
          취소
        </button>
      </div>
    </div>
  );
}
