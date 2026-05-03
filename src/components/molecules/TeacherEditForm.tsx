"use client";

import { Mail, Phone, User, FileText } from "lucide-react";
import type { TeacherRole } from "@/lib/planner";

const ROLE_LABELS: Record<Exclude<TeacherRole, "owner">, string> = {
  admin: "관리자",
  member: "강사",
};

export interface TeacherEditFormProps {
  canManage: boolean;
  canEditOwn: boolean;
  editName: string;
  editEmail: string;
  editPhone: string;
  editRole: TeacherRole | null;
  editNotes: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onRoleChange: (v: TeacherRole | null) => void;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TeacherEditForm({
  canManage,
  editName,
  editEmail,
  editPhone,
  editRole,
  editNotes,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onRoleChange,
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
            onChange={(e) => onNameChange(e.target.value)}
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
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="010-0000-0000"
            className="border border-[var(--color-border)] rounded-md px-2 py-1 text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>
      {/* Role pills — owner/admin only */}
      {canManage && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
            <User size={11} strokeWidth={1.5} />
            역할
          </label>
          <div className="flex gap-2">
            {(["admin", "member"] as Exclude<TeacherRole, "owner">[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRoleChange(editRole === r ? null : r)}
                aria-pressed={editRole === r}
                className={[
                  "px-3 py-1 rounded-full text-[12px] transition-all border",
                  editRole === r
                    ? "border-[var(--color-accent)] bg-[rgba(167,139,250,0.15)] text-[var(--color-text-primary)] font-medium"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]",
                ].join(" ")}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
          {editRole === "owner" && (
            <p className="text-[11px] text-[var(--color-text-muted)]">
              원장 역할은 시스템이 부여합니다.
            </p>
          )}
        </div>
      )}
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
