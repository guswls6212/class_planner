import React from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const buttonClasses = [
    styles.button,
    styles[size],
    styles[variant],
    loading && styles.loading,
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={buttonClasses} 
      onClick={onClick} 
      disabled={disabled || loading}
      type="button"
    >
      {icon && iconPosition === 'left' && (
        <span className={`${styles.icon} ${styles.left}`}>
          {icon}
        </span>
      )}
      {children}
      {icon && iconPosition === 'right' && (
        <span className={`${styles.icon} ${styles.right}`}>
          {icon}
        </span>
      )}
    </button>
  );
}
