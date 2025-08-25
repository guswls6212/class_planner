import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    padding:
      size === 'small'
        ? '6px 12px'
        : size === 'large'
          ? '12px 24px'
          : '8px 16px',
    borderRadius: '4px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: '#3b82f6',
      color: '#fff',
    },
    secondary: {
      background: '#555',
      color: '#fff',
    },
    danger: {
      background: '#dc2626',
      color: '#fff',
    },
  };

  const styles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button style={styles} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
