import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary" | "danger" | "transparent";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "data-testid"?: string;
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
}) => {
  const buttonClasses = [
    "inline-flex items-center justify-center rounded-md font-medium cursor-pointer transition-all duration-200 no-underline font-inherit border-none disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
    SIZE_CLASSES[size] ?? SIZE_CLASSES.medium,
    loading ? "relative cursor-not-allowed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled || loading}
      style={style}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      data-testid={dataTestId}
    >
      {loading && <span data-testid="spinner" className="mr-2">⏳</span>}
      {children}
    </button>
  );
};

export default Button;
