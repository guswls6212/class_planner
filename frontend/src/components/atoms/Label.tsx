import React from 'react';
import styles from './Label.module.css';

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  variant?: 'default' | 'checkbox' | 'inline' | 'group';
  helpText?: string;
  error?: boolean;
  success?: boolean;
  warning?: boolean;
}

export default function Label({
  children,
  htmlFor,
  required = false,
  size = 'medium',
  disabled = false,
  variant = 'default',
  helpText,
  error = false,
  success = false,
  warning = false,
}: LabelProps) {
  const labelClasses = [
    styles.label,
    styles[size],
    styles[variant],
    error && styles.error,
    success && styles.success,
    warning && styles.warning,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [variant === 'group' && styles.labelGroup]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      <label htmlFor={htmlFor} className={labelClasses}>
        {children}
        {required && <span className={styles.required}>*</span>}
      </label>
      {helpText && <div className={styles.helpText}>{helpText}</div>}
    </div>
  );
}
