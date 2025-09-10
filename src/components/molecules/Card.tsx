import React from 'react';
import Typography from '../atoms/Typography';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  style?: React.CSSProperties; // 커스텀 스타일을 위한 style prop
  className?: string; // CSS 클래스를 위한 className prop
}

// 유틸리티 함수들 (테스트 가능)

export const getVariantStyles = (variant: string): React.CSSProperties => {
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
  return variantStyles[variant] || variantStyles.default;
};


export const getPaddingStyles = (padding: string): React.CSSProperties => {
  const paddingStyles: Record<string, React.CSSProperties> = {
    small: { padding: '12px' },
    medium: { padding: '16px' },
    large: { padding: '24px' },
  };
  return paddingStyles[padding] || paddingStyles.medium;
};


export const getBaseStyles = (onClick?: () => void): React.CSSProperties => {
  return {
    borderRadius: '8px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
  };
};


export const getHoverStyles = (
  onClick?: () => void,
  variant?: string
): React.CSSProperties => {
  if (!onClick) return {};

  return {
    transform: 'translateY(-2px)',
    boxShadow:
      variant === 'elevated'
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };
};


export const shouldShowTitle = (title?: string): boolean => {
  return Boolean(title);
};


export const isClickable = (onClick?: () => void): boolean => {
  return Boolean(onClick);
};


export const validateCardVariant = (variant: string): boolean => {
  const validVariants = ['default', 'elevated', 'outlined'];
  return validVariants.includes(variant);
};


export const validateCardPadding = (padding: string): boolean => {
  const validPaddings = ['small', 'medium', 'large'];
  return validPaddings.includes(padding);
};

export default function Card({
  title,
  children,
  variant = 'default',
  padding = 'medium',
  onClick,
  style,
  className,
}: CardProps) {
  const variantStyles = getVariantStyles(variant);
  const paddingStyles = getPaddingStyles(padding);
  const baseStyles = getBaseStyles(onClick);
  const hoverStyles = getHoverStyles(onClick, variant);

  const styles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles,
    ...paddingStyles,
    ...style, // 커스텀 스타일을 마지막에 적용하여 우선순위 부여
  };

  return (
    <div
      className={className}
      style={styles}
      onClick={onClick}
      onMouseEnter={e => {
        if (isClickable(onClick)) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={e => {
        if (isClickable(onClick)) {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = variantStyles.boxShadow || '';
        }
      }}
    >
      {shouldShowTitle(title) && (
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
