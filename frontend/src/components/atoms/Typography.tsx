import React from 'react';
import styles from './Typography.module.css';

interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label';
  children: React.ReactNode;
  color?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'default'
    | 'muted';
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  decoration?: 'underline' | 'lineThrough' | 'none';
  className?: string;
  style?: React.CSSProperties;
}

export default function Typography({
  variant,
  children,
  color = 'default',
  align = 'left',
  weight = 'normal',
  transform = 'none',
  decoration = 'none',
  className,
  style,
}: TypographyProps) {
  const typographyClasses = [
    styles.typography,
    styles[variant],
    styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`],
    styles[`text${align.charAt(0).toUpperCase() + align.slice(1)}`],
    styles[`font${weight.charAt(0).toUpperCase() + weight.slice(1)}`],
    transform !== 'none' && styles[transform],
    decoration !== 'none' && styles[decoration],
    className,
  ].filter(Boolean).join(' ');

  const Component = variant.startsWith('h')
    ? (variant as 'h1' | 'h2' | 'h3' | 'h4')
    : 'span';

  return <Component className={typographyClasses} style={style}>{children}</Component>;
}
