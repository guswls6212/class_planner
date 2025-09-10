import React from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "transparent";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "medium",
  disabled = false,
  onClick,
  className = "",
  style = {},
}) => {
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
};

export default Button;
