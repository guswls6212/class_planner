"use client";

import type { ReactNode } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 모달 title element id (aria-labelledby). */
  ariaLabelledBy?: string;
  /** Tailwind max-width class. default: "max-w-md". */
  maxWidth?: string;
  /** z-index (numeric). default 1100. */
  zIndex?: number;
  /** Backdrop 클릭 시 close 호출. default true. */
  closeOnBackdropClick?: boolean;
  /** 모달 body 외 wrapper에 추가할 클래스. */
  className?: string;
  /** 모달 body 추가 클래스 (rounded card 안쪽). */
  bodyClassName?: string;
  /** data-testid for the container div. */
  "data-testid"?: string;
  children: ReactNode;
}

/**
 * Modal 컨테이너 SSOT — backdrop + centered card + a11y (focus trap / Escape).
 *
 * 사용처: SubjectAddDetailModal, TeacherAddDetailModal, StudentAddDetailModal,
 * EditSessionModal (desktop), GroupSessionModal (desktop) 등. 모바일 BottomSheet은
 * 자체 컴포넌트 — 본 Modal은 desktop 표준 dialog.
 *
 * useModalA11y 통합 — focus trap + Escape close + 초기 focus 처리.
 *
 * 예:
 *   <Modal isOpen={open} onClose={close} ariaLabelledBy="my-title">
 *     <h2 id="my-title">제목</h2>
 *     ...
 *   </Modal>
 */
export function Modal({
  isOpen,
  onClose,
  ariaLabelledBy,
  maxWidth = "max-w-md",
  zIndex = 1100,
  closeOnBackdropClick = true,
  className = "",
  bodyClassName = "",
  "data-testid": dataTestId,
  children,
}: ModalProps) {
  const { containerRef } = useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 ${className}`}
      style={{ zIndex }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className={`relative w-full ${maxWidth} rounded-2xl border border-white/[0.08] bg-[var(--color-bg-primary)] shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${bodyClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        data-testid={dataTestId}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
