import React from 'react';

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export default function Label({
  children,
  htmlFor,
  required = false,
  size = 'medium',
  disabled = false,
}: LabelProps) {
  const styles: React.CSSProperties = {
    display: 'block',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
    fontWeight: 500,
    color: disabled ? '#6b7280' : '#374151',
    marginBottom: size === 'small' ? '4px' : size === 'large' ? '8px' : '6px',
    cursor: disabled ? 'default' : 'pointer',
  };

  return (
    <label htmlFor={htmlFor} style={styles}>
      {children}
      {required && (
        <span
          style={{
            color: '#dc2626',
            marginLeft: '4px',
          }}
        >
          *
        </span>
      )}
    </label>
  );
}
