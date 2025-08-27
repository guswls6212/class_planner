import React from 'react';

interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  value,
  onChange,
  onKeyPress,
  className = '',
  style = {},
}) => {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      className={className}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)',
        fontSize: '14px',
        width: '200px',
        ...style,
      }}
    />
  );
};

export default Input;
