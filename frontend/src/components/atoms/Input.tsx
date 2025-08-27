import React from 'react';

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

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const getInputClasses = (
  size: string,
  error: string | undefined,
  type: string,
  className?: string
): string => {
  return [
    'input',
    size,
    error && 'error',
    type === 'search' && 'search',
    className,
  ]
    .filter(Boolean)
    .join(' ');
};

// eslint-disable-next-line react-refresh/only-export-components
export const getWrapperClasses = (icon: React.ReactNode): string => {
  return ['inputWrapper', icon && 'inputWithIcon'].filter(Boolean).join(' ');
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowIcon = (icon: React.ReactNode): boolean => {
  return Boolean(icon);
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowError = (error: string | undefined): boolean => {
  return Boolean(error);
};

// eslint-disable-next-line react-refresh/only-export-components
export const handleInputChange = (
  value: string,
  disabled: boolean,
  onChange: (value: string) => void
): void => {
  if (!disabled) {
    onChange(value);
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateInputType = (type: string): boolean => {
  const validTypes = ['text', 'email', 'password', 'number', 'search'];
  return validTypes.includes(type);
};

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
  const inputClasses = getInputClasses(size, error, type, className);
  const wrapperClasses = getWrapperClasses(icon);

  return (
    <div className={wrapperClasses}>
      {shouldShowIcon(icon) && <span className="icon">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => handleInputChange(e.target.value, disabled, onChange)}
        disabled={disabled}
        className={inputClasses}
      />
      {shouldShowError(error) && <div className="errorMessage">{error}</div>}
    </div>
  );
}
