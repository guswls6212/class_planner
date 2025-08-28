import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'danger' | 'transparent';
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  'data-testid'?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  className = '',
  style = {},
  'data-testid': dataTestId,
}) => {
  // CSS Module 클래스들을 조합
  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      onClick={onClick}
      className={buttonClasses}
      style={style}
      data-testid={dataTestId}
    >
      {children}
    </button>
  );
};

export default Button;
