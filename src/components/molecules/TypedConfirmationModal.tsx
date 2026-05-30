"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, UserX } from "lucide-react";

interface TypedConfirmationModalProps {
  isOpen: boolean;
  /** "박코치님을 학원에서 제외하시겠습니까?" */
  title: string;
  /** 부제목 — "관리자 권한 즉시 회수 · 강사 row 와 담당 수업 보존" 등 */
  description?: string;
  /** 사용자가 정확히 타이핑해야 하는 텍스트 (멤버 이름 또는 별칭) */
  confirmText: string;
  /** confirm 버튼 라벨 (기본 "제외하기") */
  confirmLabel?: string;
  /** 진행 중 isCreating/isDeleting 등의 disabled 상태 표시용 */
  isProcessing?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/**
 * 위험 액션용 "이름 타이핑 확인" 모달 (GitHub repo delete 패턴).
 * mockup B (design-explorations/member-removal-ux) Variant B 구현.
 *
 * 사용자가 confirmText 를 정확히 타이핑할 때까지 confirm 버튼 disabled.
 * Esc 키 닫기 + 백드롭 클릭 닫기 + 첫 input autofocus.
 */
export default function TypedConfirmationModal({
  isOpen,
  title,
  description,
  confirmText,
  confirmLabel = "제외하기",
  isProcessing = false,
  onConfirm,
  onClose,
}: TypedConfirmationModalProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTyped("");
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const match = typed.trim() === confirmText.trim();

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
      data-testid="typed-confirm-backdrop"
    >
      <div
        className="bg-[var(--color-bg-secondary)] rounded-2xl p-5 w-full max-w-md mx-4 border border-red-500/30"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="typed-confirm-title"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 flex-shrink-0">
            <UserX className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3
              id="typed-confirm-title"
              className="text-base font-bold text-[var(--color-text-primary)]"
            >
              {title}
            </h3>
            {description && (
              <p className="text-[12px] text-[var(--color-text-muted)] mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <p className="text-[12px] text-[var(--color-text-secondary)] mb-2 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />
          확인을 위해{" "}
          <code className="px-1.5 py-0.5 rounded bg-black/30 text-red-300 font-mono">
            {confirmText}
          </code>{" "}
          를 정확히 입력해주세요
        </p>
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-red-400/50"
          placeholder={confirmText}
          aria-label="확인 입력"
          data-testid="typed-confirm-input"
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-overlay-light)] transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!match || isProcessing}
            data-testid="typed-confirm-submit"
            className="flex-1 py-2 bg-red-500/90 text-white rounded-lg text-sm font-semibold hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
