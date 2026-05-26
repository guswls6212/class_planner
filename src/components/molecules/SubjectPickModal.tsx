"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

interface SubjectOption {
  id: string;
  name: string;
  color: string;
}

interface SubjectPickModalProps {
  open: boolean;
  subjects: SubjectOption[];
  initialSelectedIds: string[];
  onSave: (selectedIds: string[]) => Promise<void> | void;
  onClose: () => void;
}

export function SubjectPickModal({
  open,
  subjects,
  initialSelectedIds,
  onSave,
  onClose,
}: SubjectPickModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelectedIds(initialSelectedIds);
  }, [open, initialSelectedIds]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, saving, onClose]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIds);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-pick-modal-title"
      data-testid="subject-pick-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-amber-500/40 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2
            id="subject-pick-modal-title"
            className="text-[14px] font-semibold text-amber-200"
          >
            담당 과목 선택
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="닫기"
            className="text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-1.5 max-h-80 overflow-y-auto">
          {subjects.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-4">
              아직 등록된 과목이 없어요. 과목 페이지에서 먼저 등록해주세요.
            </p>
          ) : (
            subjects.map((s) => {
              const isSelected = selectedIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  data-testid={`subject-pick-${s.id}`}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center justify-between gap-2 p-2 rounded transition-colors text-left ${
                    isSelected
                      ? "bg-amber-500/15 ring-1 ring-amber-500/30"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[12px] text-zinc-200">{s.name}</span>
                  </span>
                  {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded text-[12px] text-zinc-300 hover:bg-white/5 disabled:opacity-50"
            data-testid="subject-pick-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-900 font-medium text-[12px] disabled:opacity-50"
            data-testid="subject-pick-save"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
