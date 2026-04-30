"use client";
import { useState } from "react";
import { Download, Trash2, Save, Eye, ChevronDown } from "lucide-react";

interface Props {
  onApply: () => void;
  onClearWeek: () => void;
  onSave: () => void;
  onPreview: () => void;
  canManage: boolean;
  hasTemplate: boolean;
}

export function TemplateMenuV2({ onApply, onClearWeek, onSave, onPreview, canManage, hasTemplate }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const wrap = (fn: () => void) => () => { fn(); close(); };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 border border-[var(--color-accent)] text-[var(--color-text-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors text-sm"
      >
        템플릿
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg py-2">
            <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              이 주에 작업
            </div>
            <MenuItem icon={Download} label="템플릿 적용하기" onClick={wrap(onApply)} disabled={!hasTemplate} />
            <MenuItem icon={Trash2} label="시간표 비우기" onClick={wrap(onClearWeek)} />

            <div className="my-1 border-t border-[var(--color-border)]" />

            <div className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              템플릿 자체
            </div>
            <MenuItem icon={Save} label="현재 주를 템플릿으로 저장" onClick={wrap(onSave)} disabled={!canManage} />
            <MenuItem icon={Eye} label="미리보기" onClick={wrap(onPreview)} disabled={!hasTemplate} />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, disabled }: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      <Icon size={16} strokeWidth={1.75} className="text-[var(--color-text-secondary)] shrink-0" />
      <span>{label}</span>
    </button>
  );
}
