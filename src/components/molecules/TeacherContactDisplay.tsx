"use client";

import { Mail, Phone, User, FileText } from "lucide-react";
import type { TeacherRole } from "@/lib/planner";

const ROLE_LABELS: Record<TeacherRole, string> = {
  owner: "원장",
  admin: "관리자",
  member: "강사",
};

export interface TeacherContactDisplayProps {
  email: string | null | undefined;
  phone: string | null | undefined;
  role: TeacherRole | null | undefined;
  notes: string | null | undefined;
}

export function TeacherContactDisplay({ email, phone, role, notes }: TeacherContactDisplayProps) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
          <Mail size={11} strokeWidth={1.5} />
          이메일
        </dt>
        <dd className="text-[var(--color-text-primary)]">{email || "—"}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
          <Phone size={11} strokeWidth={1.5} />
          전화번호
        </dt>
        <dd className="text-[var(--color-text-primary)]">{phone || "—"}</dd>
      </div>
      <div className="flex items-start gap-2">
        <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 pt-0.5">
          <User size={11} strokeWidth={1.5} />
          역할
        </dt>
        <dd className="flex flex-col gap-1">
          {role ? (
            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[12px] border border-[var(--color-accent)] bg-[rgba(167,139,250,0.12)] text-[var(--color-text-primary)]">
              {ROLE_LABELS[role]}
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)]">
            역할 변경: Settings → 멤버
          </span>
        </dd>
      </div>
      {notes && (
        <div className="flex items-start gap-2">
          <dt className="w-14 flex-shrink-0 text-[11px] text-[var(--color-text-muted)] flex items-center gap-1 pt-0.5">
            <FileText size={11} strokeWidth={1.5} />
            메모
          </dt>
          <dd className="text-[var(--color-text-primary)] text-[13px] whitespace-pre-wrap">{notes}</dd>
        </div>
      )}
    </dl>
  );
}
