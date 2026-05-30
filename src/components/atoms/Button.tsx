"use client";

import React, { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { showSuccess } from "@/lib/toast";

type FeedbackMode = "inline" | "toast" | "both" | "none";

interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "transparent" | "tonal" | "ghost" | "accent";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "data-testid"?: string;
  /** "inline" = button label swap, "toast" = sonner toast, "both" = both */
  feedback?: FeedbackMode;
  /** Label shown when feedback=inline triggers. Default: "✓ 복사됨" */
  successLabel?: string;
  /** Toast text when feedback=toast|both triggers. Default: "완료되었습니다" */
  toastMessage?: string;
  /** How long to show inline success state (ms). Default: 1500 */
  feedbackDuration?: number;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    "bg-[--color-primary] text-white hover:enabled:bg-[--color-primary-dark]",
  secondary:
    "bg-[--color-secondary] text-white hover:enabled:bg-[--color-secondary-dark]",
  danger:
    "bg-[--color-danger] text-white border border-[--color-danger] hover:enabled:bg-[--color-danger-dark] hover:enabled:border-[--color-danger-dark] hover:enabled:shadow-[0_0_0_2px_rgba(220,38,38,0.15)]",
  transparent:
    "bg-transparent text-[--color-text] border border-[--color-border] hover:enabled:bg-[--color-bg-secondary] hover:enabled:border-[--color-border-light] hover:enabled:text-[--color-text-primary]",
  accent:
    "bg-accent text-[--color-admin-ink] hover:enabled:bg-accent-hover",
  tonal:
    "bg-accent/10 text-accent border border-accent/40 hover:enabled:bg-accent/18 hover:enabled:border-accent/60",
  ghost:
    "bg-transparent text-[--color-text-muted] hover:enabled:bg-[--color-overlay-light] hover:enabled:text-[--color-text-secondary]",
};

const SIZE_CLASSES: Record<string, string> = {
  small: "px-3 py-1.5 text-xs min-h-[28px]",
  medium: "px-4 py-2 text-sm min-h-[36px]",
  large: "px-6 py-3 text-base min-h-[44px]",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
  className = "",
  style = {},
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "data-testid": dataTestId,
  feedback: feedbackMode,
  successLabel = "복사됨",
  toastMessage = "완료되었습니다",
  feedbackDuration = 1500,
}) => {
  const [feedbackActive, setFeedbackActive] = useState(false);

  const isShowingSuccess = feedbackActive && (feedbackMode === "inline" || feedbackMode === "both");

  const handleButtonClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      await onClick?.(e);
      if (feedbackMode === "toast" || feedbackMode === "both") {
        showSuccess(toastMessage);
      }
      if (feedbackMode === "inline" || feedbackMode === "both") {
        setFeedbackActive(true);
        setTimeout(() => setFeedbackActive(false), feedbackDuration);
      }
    } catch {
      // error handling is the caller's responsibility
    }
  };

  const buttonClasses = [
    "inline-flex items-center justify-center rounded-md font-medium cursor-pointer transition-all duration-150 no-underline font-inherit border-none disabled:opacity-50 disabled:cursor-not-allowed",
    "active:enabled:scale-[0.97] active:enabled:[box-shadow:inset_0_1px_3px_rgba(0,0,0,0.18)]",
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
    SIZE_CLASSES[size] ?? SIZE_CLASSES.medium,
    loading ? "relative cursor-not-allowed" : "",
    isShowingSuccess ? "!bg-emerald-500/10 !text-emerald-400 !border-emerald-500/25" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={feedbackMode && feedbackMode !== "none" ? handleButtonClick : onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={style}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={dataTestId}
    >
      {loading && (
        <Loader2 data-testid="spinner" className="animate-spin mr-2" size={14} />
      )}
      {isShowingSuccess ? (
        <span className="flex items-center gap-1">
          <Check size={12} strokeWidth={2.5} />
          {successLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
