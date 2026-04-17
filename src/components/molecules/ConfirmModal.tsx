import React from "react";
import { useModalA11y } from "../../hooks/useModalA11y";
import Button from "../atoms/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
  variant = "danger",
}) => {
  // Hook must be called before early return (Rules of Hooks).
  // useModalA11y provides: Escape key handling, focus trap, return-focus on close.
  const { containerRef } = useModalA11y({ isOpen, onClose: onCancel });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5"
      data-testid="confirm-modal-backdrop"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="w-full max-w-[400px] max-h-[90vh] overflow-hidden rounded-lg border border-[--color-border] bg-[--color-bg-primary] shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
      >
        <div className="px-5 pt-5">
          <h3 id="confirm-modal-title" className="text-lg font-semibold text-[--color-text-primary]">
            {title}
          </h3>
        </div>

        <div className="px-5 py-4">
          <p id="confirm-modal-message" className="text-sm leading-relaxed text-[--color-text-secondary]">
            {message}
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button
            variant="transparent"
            size="small"
            onClick={onCancel}
            className="min-w-[60px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "warning" ? "primary" : variant === "info" ? "secondary" : variant}
            size="small"
            onClick={onConfirm}
            className="min-w-[60px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
