import React from 'react';

interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  children: React.ReactNode;
  color?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'default';
  align?: 'left' | 'center' | 'right';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  style?: React.CSSProperties;
}

export default function Typography({
  variant,
  children,
  color = 'default',
  align = 'left',
  weight = 'normal',
  style,
}: TypographyProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    h1: {
      fontSize: '32px',
      lineHeight: '40px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600,
    },
    h3: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 600,
    },
    h4: {
      fontSize: '18px',
      lineHeight: '24px',
      fontWeight: 500,
    },
    body: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
    },
    caption: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 400,
    },
    label: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
    },
  };

  const colorStyles: Record<string, React.CSSProperties> = {
    primary: { color: '#3b82f6' },
    secondary: { color: '#6b7280' },
    success: { color: '#10b981' },
    warning: { color: '#f59e0b' },
    danger: { color: '#dc2626' },
    default: { color: '#111827' },
  };

  const weightStyles: Record<string, React.CSSProperties> = {
    normal: { fontWeight: 400 },
    medium: { fontWeight: 500 },
    semibold: { fontWeight: 600 },
    bold: { fontWeight: 700 },
  };

  const styles: React.CSSProperties = {
    margin: 0,
    textAlign: align,
    ...variantStyles[variant],
    ...colorStyles[color],
    ...weightStyles[weight],
    ...style, // 인라인 스타일을 마지막에 적용하여 우선순위 부여
  };

  const Component = variant.startsWith('h')
    ? (variant as 'h1' | 'h2' | 'h3' | 'h4')
    : 'span';

  return <Component style={styles}>{children}</Component>;
}
