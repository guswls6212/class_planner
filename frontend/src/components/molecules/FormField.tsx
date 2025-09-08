import React from 'react';
import Input from '../atoms/Input';
import Label from '../atoms/Label';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  required?: boolean;
  error?: string;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode; // 커스텀 입력 요소를 위한 children prop
}

// 유틸리티 함수들 (테스트 가능)
// eslint-disable-next-line react-refresh/only-export-components
export const getFormFieldStyles = (): React.CSSProperties => {
  return { marginBottom: '16px' };
};

// eslint-disable-next-line react-refresh/only-export-components
export const shouldUseCustomInput = (children?: React.ReactNode): boolean => {
  return Boolean(children);
};

// eslint-disable-next-line react-refresh/only-export-components
export const getLabelProps = (
  name: string,
  required: boolean,
  size: 'small' | 'medium' | 'large',
  disabled: boolean,
) => {
  return {
    htmlFor: name,
    required,
    size,
    disabled,
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const getInputProps = (
  type: 'text' | 'email' | 'password' | 'number',
  placeholder: string | undefined,
  value: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  disabled: boolean,
  size: 'small' | 'medium' | 'large',
  error: string | undefined,
) => {
  return {
    type,
    placeholder,
    value,
    onChange,
    disabled,
    size,
    error: Boolean(error),
  };
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateFormFieldType = (type: string): boolean => {
  const validTypes = ['text', 'email', 'password', 'number'];
  return validTypes.includes(type);
};

// eslint-disable-next-line react-refresh/only-export-components
export const validateFormFieldSize = (size: string): boolean => {
  const validSizes = ['small', 'medium', 'large'];
  return validSizes.includes(size);
};

// eslint-disable-next-line react-refresh/only-export-components
export const hasError = (error?: string): boolean => {
  return Boolean(error);
};

// eslint-disable-next-line react-refresh/only-export-components
export const isFormFieldDisabled = (disabled: boolean): boolean => {
  return Boolean(disabled);
};

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
  const formFieldStyles = getFormFieldStyles();
  const useCustomInput = shouldUseCustomInput(children);
  const labelProps = getLabelProps(name, required, size, disabled);
  const inputProps = getInputProps(
    type,
    placeholder,
    value,
    onChange,
    disabled,
    size,
    error,
  );

  return (
    <div style={formFieldStyles}>
      <Label {...labelProps}>{label}</Label>
      {useCustomInput ? children : <Input {...inputProps} />}
    </div>
  );
}
