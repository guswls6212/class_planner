import React from 'react';
import styles from './Input.module.css';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  error?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  size = 'medium',
  error,
  icon,
  className,
}: InputProps) {
  const inputClasses = [
    styles.input,
    styles[size],
    error && styles.error,
    type === 'search' && styles.search,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const wrapperClasses = [styles.inputWrapper, icon && styles.inputWithIcon]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClasses}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => {
          if (!disabled) {
            onChange(e.target.value);
          }
        }}
        disabled={disabled}
        className={inputClasses}
      />
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
}
