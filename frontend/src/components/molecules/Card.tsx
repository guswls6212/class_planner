import React from 'react';
import Typography from '../atoms/Typography';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  style?: React.CSSProperties; // 커스텀 스타일을 위한 style prop
}

export default function Card({
  title,
  children,
  variant = 'default',
  padding = 'medium',
  onClick,
  style,
}: CardProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
    },
    elevated: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      boxShadow:
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    outlined: {
      backgroundColor: 'transparent',
      border: '2px solid #e5e7eb',
    },
  };

  const paddingStyles: Record<string, React.CSSProperties> = {
    small: { padding: '12px' },
    medium: { padding: '16px' },
    large: { padding: '24px' },
  };

  const styles: React.CSSProperties = {
    borderRadius: '8px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    ...variantStyles[variant],
    ...paddingStyles[padding],
    ...style, // 커스텀 스타일을 마지막에 적용하여 우선순위 부여
  };

  const hoverStyles: React.CSSProperties = onClick
    ? {
        transform: 'translateY(-2px)',
        boxShadow:
          variant === 'elevated'
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }
    : {};

  return (
    <div
      style={styles}
      onClick={onClick}
      onMouseEnter={e => {
        if (onClick) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow =
            variantStyles[variant].boxShadow || '';
        }
      }}
    >
      {title && (
        <div style={{ marginBottom: '12px' }}>
          <Typography variant="h4" weight="semibold">
            {title}
          </Typography>
        </div>
      )}
      {children}
    </div>
  );
}
