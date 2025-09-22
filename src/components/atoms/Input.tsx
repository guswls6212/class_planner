import React from "react";
import styles from "./Input.module.css";

interface InputProps {
  id?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  size?: "small" | "medium" | "large";
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  onKeyPress,
  size = "medium",
  error = false,
  disabled = false,
  required = false,
  maxLength,
  className = "",
  style = {},
}) => {
  // CSS Module 클래스들을 조합
  const inputClasses = [
    styles.input,
    styles[size],
    error && styles.error,
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
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      className={inputClasses}
      style={style}
    />
  );
};

export default Input;
