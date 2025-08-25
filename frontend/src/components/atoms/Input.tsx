import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  error?: string;
}

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  size = 'medium',
  error,
}: InputProps) {
  const baseStyles: React.CSSProperties = {
    width: '100%',
    padding:
      size === 'small'
        ? '6px 8px'
        : size === 'large'
          ? '12px 16px'
          : '8px 12px',
    fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
    border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`,
    borderRadius: '4px',
    backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    color: disabled ? '#6b7280' : '#111827',
    transition: 'all 0.2s ease',
  };

  const focusStyles: React.CSSProperties = {
    outline: 'none',
    borderColor: error ? '#dc2626' : '#3b82f6',
    boxShadow: `0 0 0 3px ${error ? 'rgba(220, 38, 38, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`,
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={baseStyles}
        onFocus={e => {
          Object.assign(e.target.style, focusStyles);
        }}
        onBlur={e => {
          e.target.style.outline = '';
          e.target.style.borderColor = error ? '#dc2626' : '#d1d5db';
          e.target.style.boxShadow = '';
        }}
      />
      {error && (
        <div
          style={{
            color: '#dc2626',
            fontSize: '12px',
            marginTop: '4px',
            marginLeft: '4px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
