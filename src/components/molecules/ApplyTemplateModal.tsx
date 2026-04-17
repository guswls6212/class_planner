"use client";

import { useState, useEffect } from "react";
import type { ScheduleTemplate } from "@/shared/types/templateTypes";

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: ScheduleTemplate) => void;
  templates: ScheduleTemplate[];
  isApplying: boolean;
  isLoading: boolean;
}

export default function ApplyTemplateModal({
  isOpen,
  onClose,
  onApply,
  templates,
  isApplying,
  isLoading,
}: ApplyTemplateModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const handleApply = () => {
    if (!selected) return;
    onApply(selected);
  };

  const handleClose = () => {
    setSelectedId(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--color-bg-primary)] rounded-2xl p-7 w-full max-w-sm mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
          템플릿 적용
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          저장된 템플릿을 선택하여 시간표에 적용하세요.
        </p>

        <div className="flex-1 overflow-y-auto mb-4">
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              불러오는 중...
            </p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
              저장된 템플릿이 없습니다
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedId(tpl.id)}
                  disabled={isApplying}
                  className={`text-left w-full p-3 rounded-lg border transition-colors ${
                    selectedId === tpl.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">
                    {tpl.name}
                  </p>
                  {tpl.description && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {tpl.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    세션 {tpl.templateData.sessions.length}개
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
            <p className="font-medium text-amber-800 mb-1">
              {selected.templateData.sessions.length}개 세션을 적용합니다
            </p>
            <p className="text-amber-700">
              현재 주의 기존 세션이 모두 삭제되고 이 템플릿으로 교체됩니다.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={!selected || isApplying}
            className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isApplying ? "적용 중..." : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
