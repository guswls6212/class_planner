import React from 'react';
import Label from '../atoms/Label';
import Input from '../atoms/Input';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  required?: boolean;
  error?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode; // 커스텀 입력 요소를 위한 children prop
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  disabled = false,
  size = 'medium',
  children,
}: FormFieldProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <Label htmlFor={name} required={required} size={size} disabled={disabled}>
        {label}
      </Label>
      {children || (
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          size={size}
          error={error}
        />
      )}
    </div>
  );
}
