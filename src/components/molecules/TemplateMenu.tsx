"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  onSave: () => void;
  onApply: () => void;
  isSaving?: boolean;
}

export function TemplateMenu({ onSave, onApply, isSaving = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  const handleSave = () => {
    onSave();
    close();
  };

  const handleApply = () => {
    onApply();
    close();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        템플릿
        <ChevronDown size={14} strokeWidth={2} />
      </button>

      {isOpen && (
        <>
          <div
            data-testid="template-menu-backdrop"
            className="fixed inset-0 z-[999]"
            onClick={close}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-[1000] min-w-[11rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-admin-md p-1"
          >
            <button
              role="menuitem"
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex w-full px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              현재 주를 템플릿으로 저장
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={handleApply}
              className="flex w-full px-3 py-2 rounded-md text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-overlay-light)] transition-colors"
            >
              저장된 템플릿 적용하기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
