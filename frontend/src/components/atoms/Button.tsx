import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'danger' | 'transparent';
  size?: 'small' | 'medium';
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  className = '',
  style = {},
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: size === 'small' ? '12px' : '14px',
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          padding: size === 'small' ? '4px 8px' : '8px 16px',
          background: 'var(--color-primary)',
          color: 'white',
        };
      case 'danger':
        return {
          ...baseStyles,
          padding: size === 'small' ? '4px 8px' : '8px 16px',
          background: 'var(--color-danger)',
          color: 'white',
        };
      case 'transparent':
        return {
          ...baseStyles,
          padding: '0',
          background: 'transparent',
          color: 'var(--color-text-primary)',
        };
      default:
        return baseStyles;
    }
  };

  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        ...getButtonStyles(),
        ...style,
      }}
    >
      {children}
    </button>
  );
};

export default Button;
