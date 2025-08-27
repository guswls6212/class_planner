import React from 'react';

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

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const getButtonClasses = (
  size: string,
  variant: string,
  loading: boolean
): string => {
  return ['button', size, variant, loading && 'loading']
    .filter(Boolean)
    .join(' ');
};

// eslint-disable-next-line react-refresh/only-export-components
export const isButtonDisabled = (
  disabled: boolean,
  loading: boolean
): boolean => {
  return disabled || loading;
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldShowIcon = (
  icon: React.ReactNode,
  position: string
): boolean => {
  return Boolean(icon && position);
};

// eslint-disable-next-line react-refresh/only-export-components
export const getIconClasses = (position: string): string => {
  return `icon ${position}`;
};

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
  const buttonClasses = getButtonClasses(size, variant, loading);
  const isDisabled = isButtonDisabled(disabled, loading);

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={isDisabled}
      type="button"
    >
      {shouldShowIcon(icon, iconPosition) && iconPosition === 'left' && (
        <span className={getIconClasses('left')}>{icon}</span>
      )}
      {children}
      {shouldShowIcon(icon, iconPosition) && iconPosition === 'right' && (
        <span className={getIconClasses('right')}>{icon}</span>
      )}
    </button>
  );
}
