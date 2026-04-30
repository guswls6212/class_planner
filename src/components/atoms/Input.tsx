import React from "react";

interface InputProps {
  id?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  size?: "small" | "medium" | "large";
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_CLASSES: Record<string, string> = {
  small: "p-1 text-xs min-h-[28px]",
  medium: "p-2 text-sm min-h-[36px]",
  large: "p-4 text-base min-h-[44px]",
};

export const Input: React.FC<InputProps> = ({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  onKeyPress,
  onKeyDown,
  size = "medium",
  error = false,
  disabled = false,
  required = false,
  maxLength,
  className = "",
  style = {},
}) => {
  const inputClasses = [
    "w-full rounded border border-[--color-border] bg-[--color-bg-secondary] text-[--color-text-primary] transition-all duration-150 box-border",
    "hover:border-[--color-border-light] hover:bg-[--color-bg-tertiary]",
    "focus:outline-none focus:border-[--color-primary] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:bg-[--color-bg-primary]",
    "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[--color-bg-tertiary]",
    SIZE_CLASSES[size] ?? SIZE_CLASSES.medium,
    error
      ? "border-[--color-danger] focus:border-[--color-danger] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onKeyDown={onKeyDown}
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      className={inputClasses}
      style={style}
    />
  );
};

export default Input;
