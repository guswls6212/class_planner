"use client";

import { useState } from "react";
import type { TemplateData } from "@/shared/types/templateTypes";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; description: string; templateData: TemplateData }) => void;
  templateData: TemplateData;
  isSaving: boolean;
}

export default function SaveTemplateModal({
  isOpen,
  onClose,
  onSave,
  templateData,
  isSaving,
}: SaveTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    onSave({ name: name.trim(), description, templateData });
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setNameError(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-[var(--color-bg-primary)] rounded-2xl p-7 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
          템플릿으로 저장
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">
          현재 시간표를 템플릿으로 저장하여 나중에 재사용할 수 있습니다.
        </p>

        <div className="mb-4">
          <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
            템플릿 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(false);
            }}
            placeholder="템플릿 이름을 입력하세요"
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] ${
              nameError ? "border-red-400" : "border-[var(--color-border)]"
            }`}
          />
          {nameError && (
            <p className="text-xs text-red-500 mt-1">템플릿 이름을 입력해 주세요.</p>
          )}
        </div>

        <div className="mb-5">
          <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
            설명 (선택)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="템플릿에 대한 간단한 설명을 입력하세요"
            rows={2}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] resize-none"
          />
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] mb-5">
          {templateData.sessions.length}개 세션이 저장됩니다.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
