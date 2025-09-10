import React from "react";
import styles from "./Input.module.css";

interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  size?: "small" | "medium" | "large";
  error?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChange,
  onKeyPress,
  size = "medium",
  error = false,
  disabled = false,
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
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      disabled={disabled}
      className={inputClasses}
      style={style}
    />
  );
};

export default Input;
