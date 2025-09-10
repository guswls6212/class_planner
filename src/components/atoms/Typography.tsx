import React from 'react';

interface TypographyProps {
  variant:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'body'
    | 'bodyLarge'
    | 'bodySmall'
    | 'caption'
    | 'label';
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

// 유틸리티 함수들 (테스트 가능)

export const getTypographyClasses = (
  variant: string,
  color: string,
  align: string,
  weight: string,
  transform: string,
  decoration: string,
  className?: string
): string => {
  return [
    'typography',
    variant,
    `color${color.charAt(0).toUpperCase() + color.slice(1)}`,
    `text${align.charAt(0).toUpperCase() + align.slice(1)}`,
    `font${weight.charAt(0).toUpperCase() + weight.slice(1)}`,
    transform !== 'none' && transform,
    decoration !== 'none' && decoration,
    className,
  ]
    .filter(Boolean)
    .join(' ');
};


export const getTypographyComponent = (variant: string): React.ElementType => {
  return variant.startsWith('h') ? (variant as React.ElementType) : 'span';
};


export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};


export const validateTypographyVariant = (variant: string): boolean => {
  const validVariants = [
    'h1',
    'h2',
    'h3',
    'h4',
    'body',
    'bodyLarge',
    'bodySmall',
    'caption',
    'label',
  ];
  return validVariants.includes(variant);
};


export const validateTypographyColor = (color: string): boolean => {
  const validColors = [
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'default',
    'muted',
  ];
  return validColors.includes(color);
};


export const validateTypographyAlign = (align: string): boolean => {
  const validAligns = ['left', 'center', 'right', 'justify'];
  return validAligns.includes(align);
};


export const validateTypographyWeight = (weight: string): boolean => {
  const validWeights = ['normal', 'medium', 'semibold', 'bold'];
  return validWeights.includes(weight);
};

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
  const typographyClasses = getTypographyClasses(
    variant,
    color,
    align,
    weight,
    transform,
    decoration,
    className
  );
  const Component = getTypographyComponent(variant);

  return (
    <Component className={typographyClasses} style={style}>
      {children}
    </Component>
  );
}
