import React from "react";
import Button from "../atoms/Button";
import styles from "./ConfirmModal.module.css";

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
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-message"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 id="confirm-modal-title" className={styles.title}>
            {title}
          </h3>
        </div>
        
        <div className={styles.body}>
          <p id="confirm-modal-message" className={styles.message}>
            {message}
          </p>
        </div>
        
        <div className={styles.footer}>
          <Button
            variant="transparent"
            size="small"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="small"
            onClick={onConfirm}
            className={styles.confirmButton}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
